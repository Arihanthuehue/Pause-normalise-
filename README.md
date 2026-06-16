# Pause Normalizer

A minimal full-stack web application that normalizes pauses in a speech audio file.

## Requirements

1. **Python 3.7+**
2. **FFmpeg**: `pydub` requires FFmpeg to decode and encode audio files (such as MP3, M4A, etc.).
   - **Windows**: Install via Chocolatey (`choco install ffmpeg`), winget (`winget install Gygax.FFmpeg`), or download from [ffmpeg.org](https://ffmpeg.org/) and add it to your system PATH.
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt install ffmpeg`

## Installation and Execution

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```
