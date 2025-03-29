#!/bin/bash

# Get the server's IP address
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Detected server IP: $SERVER_IP"

# Export it as an environment variable
export SERVER_IP

# Create server .env file if it doesn't exist
if [ ! -f ./server/.env ]; then
  echo "Creating server .env file..."
  cp ./server/.env.example ./server/.env
  
  # Update the MEDIASOUP_ANNOUNCED_IP in the .env file
  sed -i "s/MEDIASOUP_ANNOUNCED_IP=.*/MEDIASOUP_ANNOUNCED_IP=$SERVER_IP/g" ./server/.env
  
  echo "Server .env file created with IP: $SERVER_IP"
fi

# Run Docker Compose
echo "Starting WhisperWire with SERVER_IP=$SERVER_IP"
docker compose down
docker compose up -d

echo "\nWhisperWire is now running!"
echo "----------------------------"
echo "Client URL: http://$SERVER_IP:3000"
echo "Server URL: http://$SERVER_IP:5000"
echo "API Documentation: http://$SERVER_IP:5000/api-docs"
echo "\nDefault credentials:"
echo "Server Password: change_this_server_password"
echo "Admin Key: change_this_admin_key"
echo "\nYou can change these in server/.env"
echo "----------------------------"
