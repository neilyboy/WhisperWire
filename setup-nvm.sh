#!/bin/bash

# WhisperWire NVM Setup Script
echo "========================================="
echo "  WhisperWire NVM Installation Script"
echo "========================================="

# Load or install NVM
echo "Setting up NVM (Node Version Manager)..."

# Define NVM directory
export NVM_DIR="$HOME/.nvm"

# Check if NVM directory exists
if [ ! -d "$NVM_DIR" ]; then
    echo "Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
fi

# Source NVM
if [ -s "$NVM_DIR/nvm.sh" ]; then
    echo "Loading NVM into current session..."
    \. "$NVM_DIR/nvm.sh"
    \. "$NVM_DIR/bash_completion" 2>/dev/null
else
    echo "Error: NVM installation failed or NVM script not found."
    echo "Please install NVM manually: https://github.com/nvm-sh/nvm"
    exit 1
fi

# Verify NVM is working
if ! command -v nvm &>/dev/null; then
    echo "Error: NVM command not available after sourcing."
    echo "Please try running these commands manually:"
    echo "  export NVM_DIR=\"$HOME/.nvm\""
    echo "  [ -s \"$NVM_DIR/nvm.sh\" ] && \\. \"$NVM_DIR/nvm.sh\""
    echo "  [ -s \"$NVM_DIR/bash_completion\" ] && \\. \"$NVM_DIR/bash_completion\""
    exit 1
fi

echo "NVM successfully loaded."

echo "NVM is installed. Installing Node.js v18 LTS..."

# Install Node.js v18 LTS
nvm install 18
nvm use 18

# Display Node.js and npm versions
echo "Using Node.js version: $(node -v)"
echo "Using npm version: $(npm -v)"

# Install root project dependencies
echo ""
echo "Installing root project dependencies..."
cd /home/neil/Desktop/WhisperWire
npm install
if [ $? -ne 0 ]; then
    echo "Warning: Could not install root project dependencies"
fi

# Install server dependencies
echo ""
echo "Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "Error installing server dependencies!"
    exit 1
fi
echo "Server dependencies installed successfully."

# Install client dependencies
echo ""
echo "Installing client dependencies..."
cd ../client
npm install
if [ $? -ne 0 ]; then
    echo "Error installing client dependencies!"
    exit 1
fi
echo "Client dependencies installed successfully."

echo ""
echo "========================================="
echo "Installation complete!"
echo ""
echo "To start the server:"
echo "  cd server && npm start"
echo ""
echo "To start the client:"
echo "  cd client && npm start"
echo ""
echo "For development mode with both:"
echo "  npm run dev (from project root)"
echo ""
echo "IMPORTANT: Always run 'nvm use 18' before working with WhisperWire"
echo "========================================="
