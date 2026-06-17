# Pause Normalizer (Next.js Version)

A full-stack Next.js web application that normalizes pauses in speech audio files.

## Tech Stack

- **Frontend & Backend**: Next.js (App Router, TypeScript, React 19)
- **Audio Processing**: `ffmpeg-static` (npm) to bundle the FFmpeg binary directly in the application (no system-wide FFmpeg installation required).
- **Execution**: Spawns FFmpeg directly from Node.js route handlers.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run the Development Server**:
   ```bash
   npm run dev
   ```

3. **Open the Application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment Notes

- **Important**: This application **requires a Node.js server runtime** (such as Render, Railway, or VPS). 
- It **cannot** be deployed to serverless Edge runtimes or static hosting platforms (like Vercel serverless/Edge, Netlify, or GitHub Pages) because it relies on local filesystem storage (`uploads/`, `outputs/`, OS temp directory) and spawns FFmpeg as a local child process (`child_process.spawn`).
