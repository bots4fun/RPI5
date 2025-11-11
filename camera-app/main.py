import io
import time
import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder, Quality
from picamera2.outputs import FileOutput
from gpiozero import PWMLED
from threading import Condition
from contextlib import asynccontextmanager
import RPi.GPIO as gpio


# -----------------------
# LED Setup (global) and ultrasonic
# -----------------------
@asynccontextmanager  
async def lifespan(app: FastAPI):
    global led, TRIG, ECHO
    led = PWMLED(17)
  

    TRIG = 13
    ECHO = 15
    gpio.setmode(gpio.BOARD)
    gpio.setup(TRIG, gpio.OUT)
    gpio.setup(ECHO, gpio.IN)
    yield

app = FastAPI(lifespan=lifespan)


# -----------------------
# Camera Classes
# -----------------------
class StreamingOutput(io.BufferedIOBase):
    def __init__(self):
        super().__init__()
        self.frame = None
        self.condition = Condition()

    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.condition.notify_all()

    async def read(self):
        with self.condition:
            self.condition.wait()
            return self.frame

class JpegStream:
    def __init__(self):
        self.active = False
        self.connections = set()
        self.picam2 = None
        self.task = None

    async def stream_jpeg(self):
        self.picam2 = Picamera2()
        video_config = self.picam2.create_video_configuration(main={"size": (640, 480)})
        self.picam2.configure(video_config)
        output = StreamingOutput()
        self.picam2.start_recording(MJPEGEncoder(), FileOutput(output), Quality.MEDIUM)

        try:
            while self.active:
                jpeg_data = await output.read()
                tasks = [ws.send_bytes(jpeg_data) for ws in self.connections.copy()]
                await asyncio.gather(*tasks, return_exceptions=True)
        finally:
            self.picam2.stop_recording()
            self.picam2.close()
            self.picam2 = None

    async def start(self):
        if not self.active:
            self.active = True
            self.task = asyncio.create_task(self.stream_jpeg())

    async def stop(self):
        if self.active:
            self.active = False
            if self.task:
                await self.task
                self.task = None

jpeg_stream = JpegStream()

# -----------------------
# FastAPI App
# -----------------------


# Allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# Ultrasonic Endpoint 
# -----------------------
@app.get("/distance")
def get_distance():
    # Trigger the ultrasonic sensor
    gpio.output(TRIG, 0)
    time.sleep(0.000002)
    gpio.output(TRIG, 1)
    time.sleep(0.00001)
    gpio.output(TRIG, 0)

    start_time = time.time()
    stop_time = time.time() 
    timeout = start_time + 1  # 40 ms timeout

    # Save start time
    while gpio.input(ECHO) == 0:
        start_time = time.time()
        if time.time() > timeout:
            return {"error": "Timeout waiting for echo start"}

    # Save arrival time of echo
    while gpio.input(ECHO) == 1:
        stop_time = time.time()
        if time.time() > timeout:
            return {"error": "Timeout waiting for echo end"}

    # Calculate distance
    elapsed_time = stop_time - start_time
    distance = (elapsed_time * 34300) / 2  # in cm

    print(f"Distance: {distance:.2f} cm")

    return {"distance_cm": round(distance, 2)}


# -----------------------
# LED Endpoint
# -----------------------
@app.put("/brightness/{brightness}")
def update_item(brightness: float):
    led.value = brightness / 100
    return {"brightness": brightness}

# -----------------------
# Camera WebSocket
# -----------------------
@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    jpeg_stream.connections.add(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep connection alive
    except:
        pass
    finally:
        jpeg_stream.connections.remove(websocket)
        if not jpeg_stream.connections:
            await jpeg_stream.stop()

# -----------------------
# Start / Stop Streaming
# -----------------------
@app.post("/start")
async def start_stream():
    await jpeg_stream.start()
    return {"message": "Stream started"}

@app.post("/stop")
async def stop_stream():
    await jpeg_stream.stop()
    return {"message": "Stream stopped"}
