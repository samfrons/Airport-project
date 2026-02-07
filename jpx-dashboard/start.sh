#!/bin/bash

# JPX Dashboard Startup Script
# Starts both the API server and frontend dev server

echo "Starting JPX Airport Dashboard..."

# Check for existing processes
if lsof -i :3001 > /dev/null 2>&1; then
    echo "Warning: Port 3001 (API) is already in use"
fi

if lsof -i :5173 > /dev/null 2>&1; then
    echo "Warning: Port 5173 (Frontend) is already in use"
fi

# Start API server in background
echo "Starting API server on port 3001..."
cd api && npm run dev &
API_PID=$!

# Wait for API to start
sleep 2

# Start frontend dev server
echo "Starting frontend dev server on port 5173..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "==================================="
echo " JPX Dashboard is now running!"
echo "==================================="
echo " Frontend: http://localhost:5173"
echo " API:      http://localhost:3001"
echo "==================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $API_PID $FRONTEND_PID
