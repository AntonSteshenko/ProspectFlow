# Development Dockerfile for Vite + React
FROM node:20-alpine

WORKDIR /app

# Expose Vite dev server port
EXPOSE 5173

# Copy package files first for better caching
COPY package*.json ./

# Start script will install dependencies and run dev server
CMD sh -c "npm install && npm run dev -- --host 0.0.0.0"
