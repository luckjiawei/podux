#!/bin/bash
set -e

# Build script for frpc-hub - Multi-architecture support
# Usage: ./build.sh [options]
# Options:
#   --arch <arch>    Build for specific architecture (linux-amd64, linux-arm64, darwin-amd64, darwin-arm64, windows-amd64, all)
#   --output <dir>   Output directory (default: ./dist)
#   --skip-frontend  Skip frontend build
#   --help           Show this help message

# Configuration
APP_NAME="frpc-hub"
VERSION=${VERSION:-$(git describe --tags --always --dirty 2>/dev/null || echo "dev")}
BUILD_TIME=$(date -u '+%Y-%m-%d_%H:%M:%S')
SITE_DIR="../site"
PUBLIC_DIR="../pb_public"
OUTPUT_DIR="./dist"
SKIP_FRONTEND=false

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Platform configurations
# Format: GOOS-GOARCH
PLATFORMS=(
    "linux-amd64"
    "linux-arm64"
    "linux-arm"
    "darwin-amd64"
    "darwin-arm64"
    "windows-amd64"
)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --arch)
            SELECTED_ARCH="$2"
            shift 2
            ;;
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --arch <arch>    Build for specific architecture (linux-amd64, linux-arm64, darwin-amd64, darwin-arm64, windows-amd64, all)"
            echo "  --output <dir>   Output directory (default: ./dist)"
            echo "  --skip-frontend  Skip frontend build"
            echo "  --help           Show this help message"
            echo ""
            echo "Available architectures:"
            for platform in "${PLATFORMS[@]}"; do
                echo "  - $platform"
            done
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Functions
print_header() {
    echo -e "${BLUE}=========================================="
    echo -e "$1"
    echo -e "==========================================${NC}"
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Build frontend
build_frontend() {
    if [ "$SKIP_FRONTEND" = true ]; then
        print_warn "Skipping frontend build"
        return
    fi

    print_header "Building Frontend"

    if [ ! -d "$SITE_DIR" ]; then
        print_error "Directory '$SITE_DIR' not found."
        exit 1
    fi

    cd "$SITE_DIR"

    # Check for package manager and build
    if command -v pnpm &> /dev/null; then
        print_info "Using pnpm..."
        pnpm install
        pnpm run build
    elif command -v npm &> /dev/null; then
        print_info "Using npm..."
        npm install
        npm run build
    else
        print_error "Neither npm nor pnpm found. Please install Node.js."
        exit 1
    fi

    cd - > /dev/null

    # Prepare static files
    print_info "Preparing static files..."
    rm -rf "$PUBLIC_DIR"
    mkdir -p "$PUBLIC_DIR"

    if [ -d "$SITE_DIR/dist" ]; then
        cp -r "$SITE_DIR/dist/." "$PUBLIC_DIR/"
        print_info "Frontend assets copied to $PUBLIC_DIR"
    else
        print_error "Frontend build directory '$SITE_DIR/dist' not found."
        exit 1
    fi
}

# Build binary for specific platform
build_binary() {
    local platform=$1
    local goos=$(echo $platform | cut -d'-' -f1)
    local goarch=$(echo $platform | cut -d'-' -f2)

    local output_name="${APP_NAME}"
    if [ "$goos" = "windows" ]; then
        output_name="${output_name}.exe"
    fi

    local output_path="${OUTPUT_DIR}/${platform}/${output_name}"

    print_info "Building for $platform..."

    mkdir -p "${OUTPUT_DIR}/${platform}"

    # Build with version information
    GOOS=$goos GOARCH=$goarch CGO_ENABLED=0 go build \
        -trimpath \
        -ldflags "-s -w -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME}" \
        -o "$output_path" \
        ../main.go

    if [ $? -eq 0 ]; then
        # Get file size
        local size=$(du -h "$output_path" | cut -f1)
        print_info "✓ Built $platform ($size): $output_path"

        # Create archive
        cd "${OUTPUT_DIR}/${platform}"
        if [ "$goos" = "windows" ]; then
            zip -q "${APP_NAME}-${VERSION}-${platform}.zip" "$output_name"
            print_info "✓ Created ${APP_NAME}-${VERSION}-${platform}.zip"
        else
            tar -czf "${APP_NAME}-${VERSION}-${platform}.tar.gz" "$output_name"
            print_info "✓ Created ${APP_NAME}-${VERSION}-${platform}.tar.gz"
        fi
        cd - > /dev/null
    else
        print_error "Failed to build for $platform"
        return 1
    fi
}

# Main build process
main() {
    print_header "Starting Build Process for ${APP_NAME} v${VERSION}"

    # Navigate to project root
    cd "$(dirname "$0")"

    # Clean output directory
    rm -rf "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR"

    # Build frontend
    build_frontend

    # Tidy go modules
    print_info "Tidying Go modules..."
    cd ..
    go mod tidy
    cd build

    print_header "Building Binaries"

    # Build for selected platforms
    if [ -n "$SELECTED_ARCH" ]; then
        if [ "$SELECTED_ARCH" = "all" ]; then
            for platform in "${PLATFORMS[@]}"; do
                build_binary "$platform"
            done
        else
            build_binary "$SELECTED_ARCH"
        fi
    else
        # Default: build for current platform
        CURRENT_OS=$(go env GOOS)
        CURRENT_ARCH=$(go env GOARCH)
        build_binary "${CURRENT_OS}-${CURRENT_ARCH}"
    fi

    print_header "Build Complete!"
    print_info "Output directory: $OUTPUT_DIR"
    print_info "Version: $VERSION"
    print_info "Build time: $BUILD_TIME"

    # List all built archives
    echo ""
    print_info "Built packages:"
    find "$OUTPUT_DIR" -type f \( -name "*.tar.gz" -o -name "*.zip" \) -exec ls -lh {} \;
}

# Run main
main
