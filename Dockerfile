FROM node:18-alpine

WORKDIR /app

# Install build dependencies for mediasoup
RUN apk add --no-cache python3 make g++ gcc libc-dev linux-headers python3-dev py3-pip

# Create a symlink for python
RUN ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Create environment file from example if it doesn't exist
RUN if [ ! -f ./server/.env ]; then cp ./server/.env.example ./server/.env; fi

# Build client
RUN cd client && npm run build

# Expose ports
EXPOSE 3000 5000

# Start command
CMD ["npm", "run", "dev"]
