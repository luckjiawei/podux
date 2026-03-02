#!/bin/bash
set -e

# Docker build script for frpc-hub with multi-architecture support
# Usage: ./docker-build.sh [options]

# Configuration
IMAGE_NAME="frpc-hub"
VERSION=${VERSION:-$(git describe --tags --always --dirty 2>/dev/null || echo "latest")}
BUILD_TIME=$(date -u '+%Y-%m-%d_%H:%M:%S')
REGISTRY=${REGISTRY:-""}  # Set your registry here, e.g., "docker.io/username"
PLATFORMS="linux/amd64,linux/arm64"
PUSH=false
LATEST=false

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -r, --registry <registry>   Docker registry (e.g., docker.io/username)"
    echo "  -v, --version <version>     Image version tag (default: git tag or 'latest')"
    echo "  -p, --platforms <platforms> Target platforms (default: linux/amd64,linux/arm64)"
    echo "  --push                      Push image to registry after build"
    echo "  --latest                    Also tag as 'latest'"
    echo "  --no-cache                  Build without cache"
    echo "  -h, --help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                          # Build for local use"
    echo "  $0 --push --latest                          # Build and push with latest tag"
    echo "  $0 -r docker.io/myuser -v 1.0.0 --push      # Build and push to registry"
    echo "  $0 -p linux/amd64                           # Build for specific platform"
}

# Parse command line arguments
NO_CACHE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -p|--platforms)
            PLATFORMS="$2"
            shift 2
            ;;
        --push)
            PUSH=true
            shift
            ;;
        --latest)
            LATEST=true
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Construct full image name
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}"
fi

# Navigate to project root
cd "$(dirname "$0")/.."

print_header "Docker Build for ${IMAGE_NAME}"
print_info "Version: ${VERSION}"
print_info "Build time: ${BUILD_TIME}"
print_info "Platforms: ${PLATFORMS}"
print_info "Image name: ${FULL_IMAGE_NAME}:${VERSION}"

# Check if buildx is available
if ! docker buildx version &> /dev/null; then
    print_error "Docker buildx is not available. Please install it first."
    exit 1
fi

# Create builder if it doesn't exist
if ! docker buildx ls | grep -q "frpc-hub-builder"; then
    print_info "Creating buildx builder..."
    docker buildx create --name frpc-hub-builder --use
else
    print_info "Using existing buildx builder..."
    docker buildx use frpc-hub-builder
fi

# Bootstrap builder
docker buildx inspect --bootstrap

# Prepare build arguments
BUILD_ARGS=(
    "--build-arg" "VERSION=${VERSION}"
    "--build-arg" "BUILD_TIME=${BUILD_TIME}"
    "--platform" "${PLATFORMS}"
    "--file" "Dockerfile"
    "--tag" "${FULL_IMAGE_NAME}:${VERSION}"
)

# Add latest tag if requested
if [ "$LATEST" = true ]; then
    BUILD_ARGS+=("--tag" "${FULL_IMAGE_NAME}:latest")
    print_info "Also tagging as: ${FULL_IMAGE_NAME}:latest"
fi

# Add push flag if requested
if [ "$PUSH" = true ]; then
    BUILD_ARGS+=("--push")
    print_warn "Images will be pushed to registry"
else
    BUILD_ARGS+=("--load")
fi

# Add no-cache flag if requested
if [ -n "$NO_CACHE" ]; then
    BUILD_ARGS+=("$NO_CACHE")
fi

# Build the image
print_header "Building Docker Image"
docker buildx build "${BUILD_ARGS[@]}" .

if [ $? -eq 0 ]; then
    print_header "Build Successful!"
    print_info "Image: ${FULL_IMAGE_NAME}:${VERSION}"

    if [ "$PUSH" = true ]; then
        print_info "Image pushed to registry"
    else
        print_info "Image loaded locally"
        echo ""
        print_info "To run the container:"
        echo "  docker run -d -p 8090:8090 -v frpc-hub-data:/app/pb_data ${FULL_IMAGE_NAME}:${VERSION}"
        echo ""
        print_info "Or use docker-compose:"
        echo "  docker-compose up -d"
    fi
else
    print_error "Build failed!"
    exit 1
fi
