import os
import uuid
import time
from flask import Flask, request, jsonify, render_template, send_from_directory
from pydub import AudioSegment
from pydub.silence import detect_silence

app = Flask(__name__)

# Directory setup
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'outputs')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # Limit uploads to 50MB

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'mp3', 'wav', 'm4a'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def cleanup_old_files(folder, max_age_seconds=600):
    """Deletes files in folder that are older than max_age_seconds."""
    try:
        now = time.time()
        for filename in os.listdir(folder):
            filepath = os.path.join(folder, filename)
            if os.path.isfile(filepath):
                # Check modification time
                stat = os.stat(filepath)
                if now - stat.st_mtime > max_age_seconds:
                    os.remove(filepath)
    except Exception as e:
        app.logger.error(f"Error during cleanup of {folder}: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process_file():
    # Run cleanup of files older than 10 minutes to prevent accumulation
    cleanup_old_files(UPLOAD_FOLDER, 600)
    cleanup_old_files(OUTPUT_FOLDER, 600)

    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part in the request"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"success": False, "error": "Invalid file extension. Only mp3, wav, and m4a are supported."}), 400

    # Save original file with a unique ID to prevent collisions
    file_ext = file.filename.rsplit('.', 1)[1].lower()
    unique_id = str(uuid.uuid4())
    original_filename = f"{unique_id}.{file_ext}"
    processed_filename = f"{unique_id}_processed.{file_ext}"
    
    original_path = os.path.join(app.config['UPLOAD_FOLDER'], original_filename)
    processed_path = os.path.join(app.config['OUTPUT_FOLDER'], processed_filename)

    try:
        file.save(original_path)
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to save uploaded file: {str(e)}"}), 500

    # Process the audio file
    try:
        # 1. Load the audio
        try:
            audio = AudioSegment.from_file(original_path)
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Failed to decode audio. Please ensure that FFmpeg is installed and added to your system PATH, and that the audio file is not corrupt. Details: {str(e)}"
            }), 400

        # 2. Silence threshold computation
        # -40 dBFS relative to the file. We use peak relative threshold: max_dBFS - 40.
        # If max_dBFS is extremely low (completely silent), default to -40.
        if audio.max_dBFS > -100:
            silence_thresh = audio.max_dBFS - 40
        else:
            silence_thresh = -40

        # 3. Detect pauses (we use min_silence_len=50ms to detect silences and filter manually)
        silence_ranges = detect_silence(audio, min_silence_len=50, silence_thresh=silence_thresh)
        
        # Discard silence ranges shorter than 150ms
        qualifying_pauses = [(start, end) for start, end in silence_ranges if (end - start) >= 150]
        original_durations = [end - start for start, end in qualifying_pauses]
        num_pauses = len(qualifying_pauses)

        # 4. Check if we need to skip normalization
        if num_pauses < 2:
            # Skip normalization, export original unmodified
            # Use 'ipod' format for m4a
            export_format = 'ipod' if file_ext == 'm4a' else file_ext
            audio.export(processed_path, format=export_format)
            
            stats = {
                "num_pauses": num_pauses,
                "original_durations": original_durations,
                "target_duration": 0,
                "skipped": True
            }
        else:
            # 5. Trim pauses
            target_ms = min(original_durations)
            
            chunks = []
            last_end = 0
            
            for start, end in qualifying_pauses:
                # Speech segment before pause
                if start > last_end:
                    chunks.append(audio[last_end:start])
                
                # Pause segment
                pause_len = end - start
                if pause_len > target_ms:
                    # Trim from the middle
                    keep_left = target_ms // 2
                    keep_right = target_ms - keep_left
                    
                    left_part = audio[start : start + keep_left]
                    right_part = audio[end - keep_right : end]
                    
                    # 6. Apply a 15ms fade at the cut point
                    fade_duration = min(15, keep_left, keep_right)
                    left_part = left_part.fade_out(duration=fade_duration)
                    right_part = right_part.fade_in(duration=fade_duration)
                    
                    trimmed_pause = left_part + right_part
                    chunks.append(trimmed_pause)
                else:
                    # Keep shortest pause as-is
                    chunks.append(audio[start:end])
                
                last_end = end
            
            # Final speech segment
            if last_end < len(audio):
                chunks.append(audio[last_end:])
            
            # 7. Concatenate everything
            if not chunks:
                processed_audio = audio
            else:
                processed_audio = chunks[0]
                for chunk in chunks[1:]:
                    processed_audio += chunk
            
            # Export the processed audio
            export_format = 'ipod' if file_ext == 'm4a' else file_ext
            processed_audio.export(processed_path, format=export_format)
            
            stats = {
                "num_pauses": num_pauses,
                "original_durations": original_durations,
                "target_duration": target_ms,
                "skipped": False
            }

        return jsonify({
            "success": True,
            "stats": stats,
            "original_url": f"/uploads/{original_filename}",
            "processed_url": f"/outputs/{processed_filename}"
        })

    except Exception as e:
        app.logger.error(f"Error during audio processing: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"An error occurred during processing: {str(e)}"}), 500

@app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/outputs/<filename>')
def serve_output(filename):
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename)

if __name__ == '__main__':
    # Run locally binding to 0.0.0.0 to be accessible within container
    app.run(debug=True, host='0.0.0.0', port=5000)
