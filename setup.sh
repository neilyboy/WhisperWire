#!/bin/bash

echo "========================================="
echo "  WhisperWire Installation Script"
echo "========================================="

# Function to check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node -v | cut -d 'v' -f 2)
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
        
        if [ "$NODE_MAJOR_VERSION" -lt 16 ]; then
            echo "Node.js version $NODE_VERSION is not supported."
            echo "WhisperWire requires Node.js v16 or higher (v18+ recommended)."
            return 1
        else
            echo "Using Node.js version: $(node -v)"
            return 0
        fi
    else
        echo "Node.js is not installed."
        return 1
    fi
}

# Function to setup NVM and Node.js
setup_nvm() {
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
        return 1
    fi
    
    # Verify NVM is working
    if ! command_exists nvm; then
        echo "Error: NVM command not available after sourcing."
        echo "Please try running these commands manually:"
        echo "  export NVM_DIR=\"$HOME/.nvm\""
        echo "  [ -s \"$NVM_DIR/nvm.sh\" ] && \\. \"$NVM_DIR/nvm.sh\""
        echo "  [ -s \"$NVM_DIR/bash_completion\" ] && \\. \"$NVM_DIR/bash_completion\""
        return 1
    fi
    
    echo "Installing Node.js v18 LTS..."
    nvm install 18
    nvm use 18
    nvm alias default 18
    
    echo "NVM successfully loaded."
    return 0
}

# Function to install Node.js using system package manager
install_nodejs_system() {
    echo "Installing Node.js using system package manager..."
    echo "WARNING: This method may conflict with existing Node.js installations."
    echo "If you encounter errors, please use the NVM method instead."
    echo ""
    
    # Check for existing Node.js installations that might conflict
    if command_exists apt && dpkg -l | grep -q libnode-dev; then
        echo "WARNING: Detected libnode-dev package which may conflict with new Node.js installation."
        echo "It's recommended to remove it first with: sudo apt remove libnode-dev"
        echo "Or use the NVM installation method instead."
        echo ""
        echo "Would you like to continue anyway? (y/n)"
        read -r continue_anyway
        if [[ ! "$continue_anyway" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo "Aborting system-wide installation. Please try the NVM method instead."
            return 1
        fi
    fi
    
    # Detect OS and use appropriate package manager
    if command_exists apt; then
        # Debian/Ubuntu
        echo "Detected Debian/Ubuntu system, using apt..."
        sudo apt update
        sudo apt install -y curl
        
        # Try to remove conflicting packages first
        echo "Removing potentially conflicting packages..."
        sudo apt remove -y nodejs nodejs-doc libnode-dev || true
        
        # Install Node.js 18
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    elif command_exists dnf; then
        # Fedora
        echo "Detected Fedora system, using dnf..."
        sudo dnf remove -y nodejs || true
        sudo dnf install -y curl
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo dnf install -y nodejs
    elif command_exists yum; then
        # CentOS/RHEL
        echo "Detected CentOS/RHEL system, using yum..."
        sudo yum remove -y nodejs || true
        sudo yum install -y curl
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    elif command_exists pacman; then
        # Arch Linux
        echo "Detected Arch Linux system, using pacman..."
        sudo pacman -R --noconfirm nodejs npm || true
        sudo pacman -S --noconfirm nodejs npm
    elif command_exists brew; then
        # macOS with Homebrew
        echo "Detected macOS with Homebrew, using brew..."
        brew uninstall node || true
        brew install node@18
        brew link --force node@18
    else
        echo "Could not determine package manager. Please install Node.js v18 manually."
        echo "For more information, visit: https://nodejs.org/"
        echo "Or consider using NVM: https://github.com/nvm-sh/nvm"
        return 1
    fi
    
    # Verify installation
    if ! command_exists node; then
        echo "Failed to install Node.js. Please try the NVM method instead."
        return 1
    fi
    
    if ! command_exists npm; then
        echo "Failed to install npm. Please try the NVM method instead."
        return 1
    fi
    
    return 0
}

# Function to install dependencies
install_dependencies() {
    # Install root project dependencies
    echo "Installing root project dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Warning: Could not install root project dependencies"
        # Continue anyway, as this might not be critical
    fi
    
    # Install server dependencies
    echo "Installing server dependencies..."
    cd server
    npm install
    if [ $? -ne 0 ]; then
        echo "Error installing server dependencies!"
        return 1
    fi
    
    # Setup server environment if needed
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        echo "Creating server environment file from example..."
        cp .env.example .env
        echo "IMPORTANT: Please edit server/.env to set secure passwords before deployment!"
    fi
    
    echo "Server dependencies installed successfully."
    
    # Install client dependencies
    echo "Installing client dependencies..."
    cd ../client
    npm install
    if [ $? -ne 0 ]; then
        echo "Error installing client dependencies!"
        return 1
    fi
    echo "Client dependencies installed successfully."
    
    # Return to root directory
    cd ..
    return 0
}

# Main installation process
main() {
    # Check if Node.js is already installed with correct version
    if check_node_version; then
        echo "Node.js is already installed with a compatible version."
    else
        echo "WhisperWire requires Node.js v16 or higher (v18+ recommended)."
        echo "How would you like to install Node.js?"
        echo "1) Use NVM (RECOMMENDED - avoids conflicts with existing installations)"
        echo "2) Use system package manager (may conflict with existing Node.js)"
        echo "3) Skip (I'll install Node.js manually)"
        read -p "Enter your choice (1-3) [Default: 1]: " choice
        
        # Default to NVM if no choice is made
        choice=${choice:-1}
        
        case $choice in
            1)
                setup_nvm || exit 1
                ;;
            2)
                echo "\nNote: System-wide installation may conflict with existing Node.js installations."
                echo "If you encounter errors, please use option 1 (NVM) instead.\n"
                install_nodejs_system || {
                    echo "\nSystem-wide installation failed. Would you like to try NVM instead? (y/n) [Default: y]"
                    read -r try_nvm
                    try_nvm=${try_nvm:-y}
                    if [[ "$try_nvm" =~ ^([yY][eE][sS]|[yY])$ ]]; then
                        setup_nvm || exit 1
                    else
                        echo "Please install Node.js v18 manually and run this script again."
                        exit 1
                    fi
                }
                ;;
            3)
                echo "Skipping Node.js installation."
                echo "Please install Node.js v18 manually and run this script again."
                exit 0
                ;;
            *)
                echo "Invalid choice. Using NVM (default)."
                setup_nvm || exit 1
                ;;
        esac
    fi
    
    # Check npm
    if ! command_exists npm; then
        echo "npm is not installed. Please install npm."
        exit 1
    fi
    
    echo "Using Node.js version: $(node -v)"
    echo "Using npm version: $(npm -v)"
    
    # Install dependencies
    install_dependencies || exit 1
    
    # Create docs directory for screenshots if it doesn't exist
    mkdir -p docs/images
    
    echo ""
    echo "========================================="
    echo "Installation complete!"
    echo ""
    echo "Default Credentials:"
    echo "- Server Password: whisperwire_dev_server (change this in production!)"
    echo ""
    echo "To start the application:"
    echo "  npm run dev (from project root)"
    echo ""
    echo "Or start components separately:"
    echo "  cd server && npm start  # Start the server"
    echo "  cd client && npm start  # Start the client"
    echo ""
    echo "Then open your browser to: http://localhost:3000"
    echo ""
    if command_exists nvm; then
        echo "IMPORTANT: Since you installed with NVM, always run 'nvm use 18'"
        echo "before working with WhisperWire"
    fi
    echo "========================================="
}

# Run the main function
main
