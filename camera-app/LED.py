from fastapi import FastAPI
from gpiozero import PWMLED
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    global led
    led = PWMLED(17)
    yield

app = FastAPI(lifespan=lifespan)

@app.put("/brightness/{brightness}")
def update_item(brightness: float):
    led.value = brightness/100
    return {"brightness": brightness}

