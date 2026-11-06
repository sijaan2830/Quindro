#!/bin/bash

# Exit on error
set -e

# Check platform
platform=$(uname)

if [[ "$platform" == "Darwin" ]]; then
    echo "Running on macOS. Note that the AppImage created will only work on Linux systems."
    if ! command -v docker &> /dev/null; then
        echo "Docker Desktop for Mac is not installed. Please install it from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
elif [[ "$platform" == "Linux" ]]; then
    echo "Running on Linux. Proceeding with AppImage creation..."
else
    echo "This script is intended to run on macOS or Linux. Current platform: $platform"
    exit 1
fi

# Enable BuildKit
export DOCKER_BUILDKIT=1

BUILD_IMAGE_NAME="quindro-appimage-builder"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Check and install Buildx if needed
if ! docker buildx version >/dev/null 2>&1; then
    echo "Installing Docker Buildx..."
    mkdir -p ~/.docker/cli-plugins/
    curl -SL https://github.com/docker/buildx/releases/download/v0.13.1/buildx-v0.13.1.linux-amd64 -o ~/.docker/cli-plugins/docker-buildx
    chmod +x ~/.docker/cli-plugins/docker-buildx
fi

# Download appimagetool if not present
if [ ! -f "appimagetool" ]; then
    echo "Downloading appimagetool..."
    wget -O appimagetool "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
    chmod +x appimagetool
fi

# Delete any existing AppImage to avoid bloating the build
rm -f Quindro-x86_64.AppImage

# Create build Dockerfile
echo "Creating build Dockerfile..."
cat > Dockerfile.build << 'EOF'
# syntax=docker/dockerfile:1
FROM ubuntu:20.04

# Install required dependencies
RUN apt-get update && apt-get install -y \
    libfuse2 \
    libglib2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libasound2 \
    libdrm2 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
EOF

# Create .dockerignore file
echo "Creating .dockerignore file..."
cat > .dockerignore << EOF
Dockerfile.build
.dockerignore
.git
.gitignore
.DS_Store
*~
*.swp
*.swo
*.tmp
*.bak
*.log
*.err
node_modules/
venv/
*.egg-info/
*.tox/
dist/
EOF

# Build Docker image without cache
echo "Building Docker image (no cache)..."
docker build --no-cache -t "$BUILD_IMAGE_NAME" -f Dockerfile.build .

# Create AppImage using local appimagetool
echo "Creating AppImage..."
docker run --rm --privileged -v "$(pwd):/app" "$BUILD_IMAGE_NAME" bash -c '
cd /app && \
rm -rf QuindroApp.AppDir && \
mkdir -p QuindroApp.AppDir/usr/bin QuindroApp.AppDir/usr/lib QuindroApp.AppDir/usr/share/applications && \
find . -maxdepth 1 ! -name QuindroApp.AppDir ! -name "." ! -name ".." -exec cp -r {} QuindroApp.AppDir/usr/bin/ \; && \
cp quindro.png QuindroApp.AppDir/ && \
echo "[Desktop Entry]" > QuindroApp.AppDir/quindro.desktop && \
echo "Name=Quindro" >> QuindroApp.AppDir/quindro.desktop && \
echo "Comment=Open source AI code editor." >> QuindroApp.AppDir/quindro.desktop && \
echo "GenericName=Text Editor" >> QuindroApp.AppDir/quindro.desktop && \
echo "Exec=quindro %F" >> QuindroApp.AppDir/quindro.desktop && \
echo "Icon=quindro" >> QuindroApp.AppDir/quindro.desktop && \
echo "Type=Application" >> QuindroApp.AppDir/quindro.desktop && \
echo "StartupNotify=false" >> QuindroApp.AppDir/quindro.desktop && \
echo "StartupWMClass=Quindro" >> QuindroApp.AppDir/quindro.desktop && \
echo "Categories=TextEditor;Development;IDE;" >> QuindroApp.AppDir/quindro.desktop && \
echo "MimeType=application/x-quindro-workspace;" >> QuindroApp.AppDir/quindro.desktop && \
echo "Keywords=quindro;" >> QuindroApp.AppDir/quindro.desktop && \
echo "Actions=new-empty-window;" >> QuindroApp.AppDir/quindro.desktop && \
echo "[Desktop Action new-empty-window]" >> QuindroApp.AppDir/quindro.desktop && \
echo "Name=New Empty Window" >> QuindroApp.AppDir/quindro.desktop && \
echo "Name[de]=Neues leeres Fenster" >> QuindroApp.AppDir/quindro.desktop && \
echo "Name[es]=Nueva ventana vacía" >> QuindroApp.AppDir/quindro.desktop && \
echo "Name[fr]=Nouvelle fenêtre vide" >> QuindroApp.AppDir/quindro.desktop && \
echo "Name[it]=Nuova finestra vuota" >> QuindroApp.AppDir/quindro.desktop && \
echo "Name[ja]=新しい空のウィンドウ" >> QuindroApp.AppDir/quindro.desktop && \
echo "Name[ko]=새 빈 창" >> QuindroApp.AppDir/quindro.desktop && \
echo "Name[ru]=Новое пустое окно" >> QuindroApp.AppDir/quindro.desktop && \
echo "Name[zh_CN]=新建空窗口" >> QuindroApp.AppDir/quindro.desktop && \
echo "Name[zh_TW]=開新空視窗" >> QuindroApp.AppDir/quindro.desktop && \
echo "Exec=quindro --new-window %F" >> QuindroApp.AppDir/quindro.desktop && \
echo "Icon=quindro" >> QuindroApp.AppDir/quindro.desktop && \
chmod +x QuindroApp.AppDir/quindro.desktop && \
cp QuindroApp.AppDir/quindro.desktop QuindroApp.AppDir/usr/share/applications/ && \
echo "[Desktop Entry]" > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "Name=Quindro - URL Handler" > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "Comment=Open source AI code editor." > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "GenericName=Text Editor" > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "Exec=quindro --open-url %U" > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "Icon=quindro" > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "Type=Application" > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "NoDisplay=true" > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "StartupNotify=true" > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "Categories=Utility;TextEditor;Development;IDE;" > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "MimeType=x-scheme-handler/quindro;" > QuindroApp.AppDir/quindro-url-handler.desktop && \
echo "Keywords=quindro;" > QuindroApp.AppDir/quindro-url-handler.desktop && \
chmod +x QuindroApp.AppDir/quindro-url-handler.desktop && \
cp QuindroApp.AppDir/quindro-url-handler.desktop QuindroApp.AppDir/usr/share/applications/ && \
echo "#!/bin/bash" > QuindroApp.AppDir/AppRun && \
echo "HERE=\$(dirname \"\$(readlink -f \"\${0}\")\")" >> QuindroApp.AppDir/AppRun && \
echo "export PATH=\${HERE}/usr/bin:\${PATH}" >> QuindroApp.AppDir/AppRun && \
echo "export LD_LIBRARY_PATH=\${HERE}/usr/lib:\${LD_LIBRARY_PATH}" >> QuindroApp.AppDir/AppRun && \
echo "exec \${HERE}/usr/bin/quindro --no-sandbox \"\$@\"" >> QuindroApp.AppDir/AppRun && \
chmod +x QuindroApp.AppDir/AppRun && \
chmod -R 755 QuindroApp.AppDir && \

# Strip unneeded symbols from the binary to reduce size
strip --strip-unneeded QuindroApp.AppDir/usr/bin/quindro

ls -la QuindroApp.AppDir/ && \
ARCH=x86_64 ./appimagetool -n QuindroApp.AppDir Quindro-x86_64.AppImage
'

# Clean up
rm -rf QuindroApp.AppDir .dockerignore appimagetool

echo "AppImage creation complete! Your AppImage is: Quindro-x86_64.AppImage"
