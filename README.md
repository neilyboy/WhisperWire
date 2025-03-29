# WhisperWire

WhisperWire is a low-latency, real-time audio communication system designed for live production environments. It provides a robust server-side application and a user-friendly, mobile-optimized client interface.

![WhisperWire Login Screen](docs/images/login-screen.png)

## Features

### Server-Side Application
- **Channel Management**: Create and manage multiple communication channels
- **Client Management**: Secure client authentication and authorization
- **Permission Matrix**: Granular talk/listen permissions for each client across channels
- **Audio Mixing and Routing**: Virtual audio mixer with channel control
- **API**: Comprehensive API for integration with Bitfocus Companion

### Client-Side Application
- **User-Friendly Interface**: Clean, intuitive design optimized for both desktop and mobile
- **Real-Time Audio**: Low-latency audio communication with minimal setup
- **Channel Selection**: Easy navigation between available channels
- **Connection Status**: Live monitoring of network performance and audio quality
- **Dark Mode**: Eye-friendly interface for use in dark production environments

## Technical Highlights
- Built with Node.js, Express, React, and Socket.IO
- WebRTC-based audio streaming using mediasoup
- JWT authentication for secure client-server communication
- Responsive design for all device sizes

## Requirements
- Node.js v18 or higher
- npm v10 or higher
- Modern web browser with WebRTC support

## Installation

### Docker Installation (Recommended)

The easiest way to run WhisperWire is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/neilyboy/WhisperWire.git
cd WhisperWire

# Create server environment file
cp server/.env.example server/.env

# Edit the environment file (optional but recommended)
nano server/.env

# Start WhisperWire using Docker Compose
docker-compose up -d
```

Access the application at http://localhost:3000

### Production Docker Setup

For production environments, we provide a separated client/server setup:

```bash
# Start the production stack
docker-compose -f docker-compose.prod.yml up -d
```

### Local Installation

#### Quick Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/WhisperWire.git
cd WhisperWire

# Run the setup script
./setup.sh
```

#### Manual Setup

1. **Install Node.js v18+ using NVM (recommended)**

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Close and reopen your terminal, then run:
nvm install 18
nvm use 18
```

2. **Install dependencies**

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Install root dependencies
cd ..
npm install
```

## Configuration

1. **Server Configuration**

```bash
cd server
cp .env.example .env
```

Edit the `.env` file to configure your server:

```
PORT=5000
SERVER_PASSWORD=your_secure_password  # Change this!
JWT_SECRET=your_jwt_secret            # Change this!
```

## Running the Application

### Development Mode

```bash
# Make sure you're using Node.js v18
nvm use 18

# Start both client and server in development mode
npm run dev
```

### Production Mode

```bash
# Build the client
cd client
npm run build

# Start the server in production mode
cd ../server
npm run start:prod
```

## Default Credentials

- **Server Password**: `whisperwire_dev_server` (development only - change this in production!)
- **Admin Login**: Use the Admin Login tab with the server password
- **Client Login**: Enter any name and the server password

## Usage

1. Open your browser to http://localhost:3000
2. Log in as a client or admin
3. For clients: Connect to available channels and start communicating
4. For admins: Manage channels, clients, and permissions

## Security Considerations

- Change the default server password and JWT secret before deploying to production
- Use HTTPS in production environments
- Implement proper access controls for admin functionality

## Troubleshooting

### Node.js Version Issues

If you encounter errors related to Node.js compatibility:

```bash
# Check your Node.js version
node -v

# If it's below v18, use NVM to switch:
nvm use 18
```

### Missing Dependencies

If you encounter "module not found" errors:

```bash
# Reinstall dependencies
cd server && npm install
cd ../client && npm install
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

- **User-Friendly Interface**: Clean, intuitive, mobile-optimized design with dark mode
- **Communication Modes**: Duplex and Push-to-Talk (PTT) options
- **Channel Control**: Quick mute/unmute and volume adjustment
- **Robust Connectivity**: Reliable connection with graceful handling of disruptions

## Technical Highlights
- Low-latency audio streaming using WebRTC
- Broadcast-quality audio output
- Secure communication channels
- OBS integration via VLC source
- Cross-platform compatibility

## Project Structure
```
WhisperWire/
├── server/           # Server-side application
│   ├── src/          # Source code
│   ├── config/       # Configuration files
│   ├── api/          # API endpoints
│   └── tests/        # Server tests
├── client/           # Client-side web application
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── tests/        # Client tests
├── docs/             # Documentation
│   └── api/          # API documentation
└── README.md         # Project overview
```

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Modern web browser with WebRTC support

### Server Setup
```bash
cd server
npm install
npm start
```

### Client Setup
```bash
cd client
npm install
npm start
```

## API Documentation
API documentation is available in the `docs/api` directory and through the server's API explorer.

## Integrations
- OBS Studio (via VLC source)
- Bitfocus Companion (via API)

## License
[MIT License](LICENSE)
