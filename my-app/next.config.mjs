const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/py/:path*',
        destination: 'http://192.168.1.45:8000/:path*',
      },
    ]
  },
};



export default nextConfig;