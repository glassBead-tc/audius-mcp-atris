# Use official Node.js runtime as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built files
COPY build ./build

# Expose port (will be set by PORT environment variable)
EXPOSE 3000

# Set environment variable to indicate HTTP transport mode
ENV MCP_TRANSPORT=http

# Start the HTTP server
CMD ["node", "build/http-server.js"]