#!/usr/bin/env node

/**
 * Network Diagram Animation Generator
 * 
 * This script creates an MP4 animation showing a network diagram 
 * evolving from 3 to 48 nodes. It uses canvas for rendering and
 * ffmpeg for video creation.
 * 
 * Requirements:
 * - Node.js
 * - ffmpeg installed and in your PATH
 * - npm packages: canvas, tmp, fluent-ffmpeg
 * 
 * Install dependencies:
 * npm install canvas tmp fluent-ffmpeg
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const tmp = require('tmp');
const ffmpeg = require('fluent-ffmpeg');
const { execSync } = require('child_process');

// Check for ffmpeg
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
} catch (error) {
  console.error('Error: ffmpeg is not installed or not in your PATH. Please install ffmpeg first.');
  process.exit(1);
}

// Configuration
const nodeColors = [
  '#3a725e', // green
  '#375d8f', // blue
  '#89c4f4', // light blue
  '#b84c38', // red
  '#e6964e', // orange
  '#8b5e3c', // brown
  '#f1a99b'  // pink
];

// Parse command line arguments
const args = process.argv.slice(2);
const lineColor = args[0] || '#333366';
const lineWidth = parseFloat(args[1]) || 1;
const nodeSize = parseFloat(args[2]) || 12;
const radius = parseFloat(args[3]) || 180;
const outputFile = args[4] || 'network_animation.mp4';
const fps = parseInt(args[5]) || 30;
const duration = parseInt(args[6]) || 10; // in seconds
const backgroundColor = args[7] || 'transparent'; // transparent by default, can be a hex color like '#F0E1C6'
const pattern = args[8] || 'circular'; // node addition pattern: 'circular', 'opposite', or 'alternating'

console.log(`Generating network animation with:`);
console.log(`- Line color: ${lineColor}`);
console.log(`- Line width: ${lineWidth}`);
console.log(`- Node size: ${nodeSize}`);
console.log(`- Radius: ${radius}`);
console.log(`- Output file: ${outputFile}`);
console.log(`- FPS: ${fps}`);
console.log(`- Duration: ${duration} seconds`);
console.log(`- Background color: ${backgroundColor}`);
console.log(`- Node addition pattern: ${pattern}`);

// Calculate canvas size
const canvasSize = 2 * (radius + nodeSize + 20);

// Calculate total frames
const totalFrames = fps * duration;

// Calculate frames per node count increment
const framesPerNodeCount = Math.floor(totalFrames / (48 - 3));

// Create temporary directory for frames
const tmpDir = tmp.dirSync({ unsafeCleanup: true });
console.log(`Created temporary directory: ${tmpDir.name}`);

// Calculate node positions in a circle using different patterns
function calculateNodePositions(count, patternType = 'circular') {
  const positions = [];
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;
  
  switch (patternType) {
    case 'circular':
      // Original circular pattern - nodes added sequentially around the circle
      const angleStep = (2 * Math.PI) / count;
      for (let i = 0; i < count; i++) {
        const angle = i * angleStep;
        positions.push({
          x: radius * Math.sin(angle) + centerX,
          y: radius * Math.cos(angle) + centerY,
        });
      }
      break;
      
    case 'opposite':
      // Opposite pattern - nodes added across from each other to maintain balance
      {
        const angleStep = (2 * Math.PI) / count;
        // Create array of indices in opposite pattern order
        const indices = [];
        
        // Special case for the first 2 nodes
        if (count >= 1) indices.push(0);
        if (count >= 2) indices.push(Math.floor(count / 2));
        
        // For remaining nodes, add in a pattern that balances the circle
        let leftSide = 1;
        let rightSide = Math.floor(count / 2) + 1;
        
        while (indices.length < count) {
          if (leftSide < Math.floor(count / 2) && indices.length < count) {
            indices.push(leftSide++);
          }
          if (rightSide < count && indices.length < count) {
            indices.push(rightSide++);
          }
        }
        
        // Now place nodes based on the calculated indices
        for (let i = 0; i < count; i++) {
          const angle = indices[i] * angleStep;
          positions.push({
            x: radius * Math.sin(angle) + centerX,
            y: radius * Math.cos(angle) + centerY,
          });
        }
      }
      break;
      
    case 'alternating':
      // Alternating pattern - adds nodes left-right-left-right
      {
        const angleStep = (2 * Math.PI) / count;
        const indices = [];
        
        // Start with a few nodes evenly distributed (typically the first 3)
        for (let i = 0; i < Math.min(3, count); i++) {
          indices.push(i);
        }
        
        // For the rest, alternate adding to left and right sides
        if (count > 3) {
          let left = true;  // Start with left
          let leftPos = 3;  // Position to add on left side
          let rightPos = count - 1;  // Position to add on right side
          
          for (let i = 3; i < count; i++) {
            if (left) {
              indices.push(leftPos++);
            } else {
              indices.push(rightPos--);
            }
            left = !left;  // Toggle left/right
          }
        }
        
        // Now place nodes based on calculated indices
        for (let i = 0; i < count; i++) {
          const angle = indices[i] * angleStep;
          positions.push({
            x: radius * Math.sin(angle) + centerX,
            y: radius * Math.cos(angle) + centerY,
          });
        }
      }
      break;
      
    default:
      // Default to circular pattern
      return calculateNodePositions(count, 'circular');
  }
  
  return positions;
}

// Generate connections between nodes
function generateConnections(positions, type = 'chord') {
  const connections = [];
  
  if (type === 'chord') {
    // Chord diagram - connect nodes based on pattern similar to the image
    const n = positions.length;
    for (let i = 0; i < n; i++) {
      for (let step = 1; step < Math.floor(n/2) + 1; step++) {
        const j = (i + step) % n;
        connections.push({
          x1: positions[i].x,
          y1: positions[i].y,
          x2: positions[j].x,
          y2: positions[j].y,
        });
      }
    }
  }
  
  return connections;
}

// Linear interpolation between two values
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Interpolate between node positions
function interpolateNodePositions(positionsA, positionsB, t) {
  if (positionsA.length === positionsB.length) {
    return positionsA.map((pos, i) => ({
      x: lerp(pos.x, positionsB[i].x, t),
      y: lerp(pos.y, positionsB[i].y, t)
    }));
  }
  
  // More complex interpolation for different counts
  const result = [];
  const countA = positionsA.length;
  const countB = positionsB.length;
  
  // For existing nodes, interpolate positions
  for (let i = 0; i < Math.min(countA, countB); i++) {
    result.push({
      x: lerp(positionsA[i].x, positionsB[i].x, t),
      y: lerp(positionsA[i].y, positionsB[i].y, t)
    });
  }
  
  // For new nodes, gradually fade them in
  if (countB > countA) {
    for (let i = countA; i < countB; i++) {
      // Scale factor affects opacity and size
      const scale = t;
      result.push({
        x: positionsB[i].x,
        y: positionsB[i].y,
        scale: scale  // Used for rendering
      });
    }
  }
  
  return result;
}

  // Generate a single frame
function generateFrame(nodeCount, nextNodeCount, transitionProgress, frameIndex) {
    // Create canvas and context
    const canvas = createCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext('2d');
    
    // Clear canvas and set background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background if not transparent
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Calculate node positions for current and next counts using the selected pattern
    const currentPositions = calculateNodePositions(nodeCount, pattern);
    const nextPositions = calculateNodePositions(nextNodeCount, pattern);
  
  // Interpolate positions
  const interpolatedPositions = interpolateNodePositions(
    currentPositions, 
    nextPositions, 
    transitionProgress
  );
  
  // Generate connections for interpolated positions
  // For simplicity, we're using all visible nodes for connections
  const visibleCount = Math.floor(nodeCount + (nextNodeCount - nodeCount) * transitionProgress);
  const visiblePositions = interpolatedPositions.slice(0, visibleCount);
  const connections = generateConnections(visiblePositions, 'chord');
  
  // Draw connections (lines)
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  connections.forEach(conn => {
    ctx.beginPath();
    ctx.moveTo(conn.x1, conn.y1);
    ctx.lineTo(conn.x2, conn.y2);
    ctx.stroke();
  });
  
  // Draw nodes (circles)
  interpolatedPositions.forEach((pos, idx) => {
    const scale = pos.scale !== undefined ? pos.scale : 1;
    const nodeColor = nodeColors[idx % nodeColors.length];
    
    ctx.globalAlpha = scale;  // Adjust opacity for new nodes
    ctx.fillStyle = nodeColor;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, nodeSize * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;  // Reset opacity
  });
  
  // Save frame as PNG
  const framePath = path.join(tmpDir.name, `frame_${frameIndex.toString().padStart(5, '0')}.png`);
  const out = fs.createWriteStream(framePath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  
  return new Promise((resolve, reject) => {
    out.on('finish', () => resolve(framePath));
    out.on('error', reject);
  });
}

// Generate all frames
async function generateFrames() {
  let frameIndex = 0;
  const framePaths = [];
  
  console.log('Generating frames...');
  
  for (let currentNodeCount = 3; currentNodeCount < 48; currentNodeCount++) {
    const nextNodeCount = currentNodeCount + 1;
    
    for (let i = 0; i < framesPerNodeCount; i++) {
      const progress = i / framesPerNodeCount;
      
      // Smooth easing function (ease-in-out)
      let easing = progress;
      if (progress < 0.5) {
        easing = 2 * progress * progress;
      } else {
        easing = 1 - Math.pow(-2 * progress + 2, 2) / 2;
      }
      
      const framePath = await generateFrame(
        currentNodeCount, 
        nextNodeCount, 
        easing, 
        frameIndex
      );
      
      framePaths.push(framePath);
      frameIndex++;
      
      // Log progress every 10 frames
      if (frameIndex % 10 === 0) {
        console.log(`Generated ${frameIndex} of ${totalFrames} frames (${Math.round(frameIndex/totalFrames*100)}%)`);
      }
    }
  }
  
  // Generate final frame
  const finalFramePath = await generateFrame(48, 48, 0, frameIndex);
  framePaths.push(finalFramePath);
  
  console.log(`Generated all ${framePaths.length} frames`);
  return framePaths;
}

// Convert frames to video
function createVideo(framePaths) {
  return new Promise((resolve, reject) => {
    console.log('Creating video...');
    
    const framePattern = path.join(tmpDir.name, 'frame_%05d.png');
    
    ffmpeg()
      .input(framePattern)
      .inputFPS(fps)
      .videoCodec('libx264')
      .outputOptions([
        '-pix_fmt yuv420p',
        '-crf 23',  // Quality setting (lower = higher quality)
        '-preset medium'  // Encoding speed/compression ratio
      ])
      .output(outputFile)
      .on('progress', (progress) => {
        console.log(`Processing: ${Math.floor(progress.percent)}% done`);
      })
      .on('end', () => {
        console.log(`Video saved to: ${outputFile}`);
        resolve();
      })
      .on('error', (err) => {
        console.error('Error creating video:', err);
        reject(err);
      })
      .run();
  });
}

// Main execution
async function main() {
  try {
    const framePaths = await generateFrames();
    await createVideo(framePaths);
    console.log('Animation completed successfully!');
    
    // Clean up temp directory
    tmpDir.removeCallback();
    console.log('Temporary files cleaned up');
  } catch (error) {
    console.error('Error generating animation:', error);
    process.exit(1);
  }
}

main();
