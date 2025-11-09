FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source code
COPY server.js ./

# Cloud Run will set PORT environment variable
EXPOSE 8080

# Start the server
CMD [ "node", "server.js" ]
