#!/bin/bash

# Lumi Work OS - Quick Setup Script for Testers
# This script automates the setup process for testing the application

set -e  # Exit on any error

echo "🚀 Lumi Work OS - Quick Setup for Testers"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. You'll need to set up PostgreSQL manually."
        DOCKER_AVAILABLE=false
    else
        DOCKER_AVAILABLE=true
        print_success "Docker is available"
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
    
    # Update the environment file with generated values
    if [ "$DOCKER_AVAILABLE" = true ]; then
        # Use Docker PostgreSQL configuration
        sed -i.bak "s/your-secure-postgres-password/lumi_password_$(date +%s)/" .env.local
        sed -i.bak "s/your-secret-key-here/$NEXTAUTH_SECRET/" .env.local
        rm .env.local.bak 2>/dev/null || true
        print_success "Updated .env.local with Docker PostgreSQL configuration"
    else
        print_warning "Please manually configure DATABASE_URL in .env.local with your PostgreSQL credentials"
    fi
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

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    if [ "$DOCKER_AVAILABLE" = true ]; then
        print_status "Starting PostgreSQL with Docker..."
        docker-compose up -d
        
        # Wait for database to be ready
        print_status "Waiting for database to be ready..."
        sleep 10
        
        # Test database connection
        print_status "Testing database connection..."
        if docker-compose exec -T postgres psql -U lumi_user -d lumi_work_os -c "SELECT 1;" > /dev/null 2>&1; then
            print_success "Database connection successful"
        else
            print_warning "Database connection test failed, but continuing..."
        fi
    else
        print_warning "Docker not available. Please ensure PostgreSQL is running and update DATABASE_URL in .env.local"
    fi
    
    # Generate Prisma client and push schema
    print_status "Setting up database schema..."
    npx prisma generate
    npx prisma db push
    
    print_success "Database schema setup completed"
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
    echo "4. If you need to stop the database:"
    echo "   ${GREEN}docker-compose down${NC}"
    echo ""
    echo "5. If you need to restart everything:"
    echo "   ${GREEN}docker-compose down && docker-compose up -d${NC}"
    echo ""
    echo "📚 For detailed testing instructions, see TESTING_GUIDE.md"
    echo ""
    echo "🐛 If you encounter any issues:"
    echo "   - Check the console for error messages"
    echo "   - Ensure all environment variables are set in .env.local"
    echo "   - Try running: docker-compose logs postgres"
    echo ""
}

# Main execution
main() {
    echo "Starting Lumi Work OS setup..."
    echo ""
    
    check_prerequisites
    setup_environment
    install_dependencies
    setup_database
    seed_database
    show_final_instructions
}

# Run main function
main "$@"
