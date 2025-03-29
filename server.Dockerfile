FROM node:18-alpine

WORKDIR /app

# Install build dependencies for mediasoup
RUN apk add --no-cache python3 make g++ gcc libc-dev linux-headers python3-dev py3-pip

# Create a symlink for python
RUN ln -sf python3 /usr/bin/python

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy server source code
COPY server/ ./

# Create environment file from example if it doesn't exist
RUN if [ ! -f ./.env ]; then cp ./.env.example ./.env; fi

# Expose server port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
