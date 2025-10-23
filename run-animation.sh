#!/bin/bash

# Default values
LINE_COLOR="#333366"
LINE_WIDTH=1
NODE_SIZE=12
RADIUS=180
OUTPUT_FILE="network_animation.mp4"
FPS=30
DURATION=10
BACKGROUND_COLOR="transparent"
PATTERN="circular"

# Help message
show_help() {
  echo "Usage: ./run-animation.sh [options]"
  echo ""
  echo "Options:"
  echo "  -c, --color COLOR      Line color (hex code, default: #333366)"
  echo "  -w, --width WIDTH      Line width (default: 1)"
  echo "  -n, --node-size SIZE   Node size (default: 12)"
  echo "  -r, --radius RADIUS    Circle radius (default: 180)"
  echo "  -o, --output FILE      Output file (default: network_animation.mp4)"
  echo "  -f, --fps FPS          Frames per second (default: 30)"
  echo "  -d, --duration SECS    Duration in seconds (default: 10)"
  echo "  -b, --background COLOR Background color (hex code or 'transparent', default: transparent)"
  echo "  -p, --pattern TYPE     Node addition pattern (circular, opposite, alternating, default: circular)"
  echo "  -h, --help             Show this help message"
  echo ""
  echo "Example:"
  echo "  ./run-animation.sh --color '#0066CC' --width 1.5 --pattern alternating --background '#F0E1C6'"
}

# Parse arguments
while (( "$#" )); do
  case "$1" in
    -c|--color)
      LINE_COLOR="$2"
      shift 2
      ;;
    -w|--width)
      LINE_WIDTH="$2"
      shift 2
      ;;
    -n|--node-size)
      NODE_SIZE="$2"
      shift 2
      ;;
    -r|--radius)
      RADIUS="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    -f|--fps)
      FPS="$2"
      shift 2
      ;;
    -d|--duration)
      DURATION="$2"
      shift 2
      ;;
    -b|--background)
      BACKGROUND_COLOR="$2"
      shift 2
      ;;
    -p|--pattern)
      PATTERN="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    -*|--*=)
      echo "Error: Unsupported flag $1" >&2
      show_help
      exit 1
      ;;
    *)
      shift
      ;;
  esac
done

# Make sure node is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required but not installed. Please install Node.js first."
  exit 1
fi

# Check for required npm packages
echo "Checking for required npm packages..."
if ! node -e "require('canvas'); require('tmp'); require('fluent-ffmpeg');" &> /dev/null; then
  echo "Installing required npm packages..."
  npm install canvas tmp fluent-ffmpeg
fi

# Run the generator script
echo "Running network animation generator..."
node network-animation-generator.js "$LINE_COLOR" "$LINE_WIDTH" "$NODE_SIZE" "$RADIUS" "$OUTPUT_FILE" "$FPS" "$DURATION" "$BACKGROUND_COLOR" "$PATTERN"
