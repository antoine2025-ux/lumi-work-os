#!/bin/bash

# Lumi Work OS - Setup WITHOUT Docker (Alternative)
# This script sets up the app using a cloud database instead of Docker

set -e  # Exit on any error

echo "🚀 Lumi Work OS - Setup WITHOUT Docker"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git from https://git-scm.com/"
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f ".env.local" ]; then
        cp env.template .env.local
        print_success "Created .env.local from template"
    else
        print_warning ".env.local already exists, skipping creation"
    fi
    
    # Generate a random secret for NextAuth
    NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "your-secret-key-$(date +%s)")
    sed -i.bak "s/your-secret-key-here/$NEXTAUTH_SECRET/" .env.local
    rm .env.local.bak 2>/dev/null || true
    
    print_success "Updated .env.local with NextAuth secret"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
    
    npm install
    print_success "Dependencies installed successfully"
}

# Setup cloud database
setup_cloud_database() {
    print_status "Setting up cloud database..."
    
    echo ""
    echo "🌐 We'll use a free cloud database instead of Docker:"
    echo ""
    echo "1. Go to https://supabase.com or https://neon.tech"
    echo "2. Create a free account and new project"
    echo "3. Get your database connection string"
    echo "4. Update DATABASE_URL in .env.local"
    echo ""
    
    # Try to detect if they already have a database URL
    if grep -q "postgresql://" .env.local; then
        print_warning "Database URL already configured in .env.local"
        read -p "Do you want to update it? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Please update DATABASE_URL in .env.local with your cloud database connection string"
        fi
    else
        echo "Please update DATABASE_URL in .env.local with your cloud database connection string"
    fi
    
    echo ""
    echo "Example DATABASE_URL format:"
    echo "DATABASE_URL=\"postgresql://username:password@host:port/database?sslmode=require\""
    echo ""
    
    read -p "Press Enter when you've updated .env.local with your database URL..."
}

# Setup database schema
setup_database_schema() {
    print_status "Setting up database schema..."
    
    # Test database connection first
    print_status "Testing database connection..."
    if npx prisma db push --accept-data-loss; then
        print_success "Database schema setup completed"
    else
        print_error "Database connection failed. Please check your DATABASE_URL in .env.local"
        echo ""
        echo "Common issues:"
        echo "- Make sure your database URL is correct"
        echo "- Ensure your database is accessible from your IP"
        echo "- Check if SSL is required (add ?sslmode=require to URL)"
        exit 1
    fi
}

# Seed database
seed_database() {
    print_status "Seeding database with test data..."
    
    npm run seed
    print_success "Database seeded with test data"
}

# Final instructions
show_final_instructions() {
    echo ""
    echo "🎉 Setup Complete!"
    echo "=================="
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Start the development server:"
    echo "   ${GREEN}npm run dev${NC}"
    echo ""
    echo "2. Open your browser and go to:"
    echo "   ${GREEN}http://localhost:3000${NC}"
    echo ""
    echo "3. Test the application using the TESTING_GUIDE.md"
    echo ""
    echo "📚 For detailed testing instructions, see TESTING_GUIDE.md"
    echo ""
    echo "🐛 If you encounter any issues:"
    echo "   - Check the console for error messages"
    echo "   - Ensure DATABASE_URL is correct in .env.local"
    echo "   - Verify your cloud database is running"
    echo ""
    echo "💡 Cloud Database Options:"
    echo "   - Supabase (https://supabase.com) - Free tier available"
    echo "   - Neon (https://neon.tech) - Free tier available"
    echo "   - Railway (https://railway.app) - Free tier available"
    echo ""
}

# Main execution
main() {
    echo "Starting Lumi Work OS setup (No Docker)..."
    echo ""
    
    check_prerequisites
    setup_environment
    install_dependencies
    setup_cloud_database
    setup_database_schema
    seed_database
    show_final_instructions
}

# Run main function
main "$@"
