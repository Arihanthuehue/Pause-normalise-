import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execFile } from 'child_process';
import { randomUUID } from 'crypto';

const ffmpegPath = 'C:\\Users\\Admin\\Downloads\\WORKKK\\Pause Normalise\\node_modules\\ffmpeg-static\\ffmpeg.exe';

export const dynamic = 'force-dynamic';

function execFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      return reject(new Error('FFmpeg binary path not found. Please ensure ffmpeg-static is installed correctly.'));
    }
    const child = spawn(ffmpegPath!, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}. Stderr: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function getAudioDurationMs(filePath: string): Promise<number> {
  try {
    const child = spawn(ffmpegPath!, ['-i', filePath]);
    let stderr = '';
    await new Promise((resolve) => {
      child.stderr.on('data', (data) => { stderr += data.toString(); });
      child.on('close', resolve);
    });

    const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const ms = parseFloat("0." + match[4]) * 1000;
      return (hours * 3600 + minutes * 60 + seconds) * 1000 + ms;
    }
  } catch (e) {
    console.error("Failed to parse duration", e);
  }
  return 0;
}

function cleanupOldFiles(dir: string, maxAgeMs: number = 600 * 1000) {
  try {
    if (!fs.existsSync(dir)) return;
    const now = Date.now();
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error(`Cleanup failed for ${dir}:`, err);
  }
}

export async function POST(req: NextRequest) {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const outputsDir = path.join(process.cwd(), 'outputs');

  // Ensure output/upload folders exist
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(outputsDir, { recursive: true });

  // Clean up old files (older than 10 mins)
  cleanupOldFiles(uploadsDir, 600 * 1000);
  cleanupOldFiles(outputsDir, 600 * 1000);

  let tempInputWav: string | null = null;
  let segmentsDir: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (ext !== '.mp3' && ext !== '.wav' && ext !== '.m4a') {
      return NextResponse.json({ error: 'Unsupported file type. Only mp3, wav, and m4a are allowed.' }, { status: 400 });
    }

    // Save uploaded file
    const fileId = randomUUID();
    const originalFilename = `${fileId}${ext}`;
    const processedFilename = `${fileId}_processed${ext}`;

    const originalPath = path.join(uploadsDir, originalFilename);
    const processedPath = path.join(outputsDir, processedFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(originalPath, buffer);

    // Convert input to temporary lossless WAV for precise frame processing
    tempInputWav = path.join(os.tmpdir(), `temp_input_${fileId}.wav`);
    await execFFmpeg(['-y', '-i', originalPath, tempInputWav]);

    // STEP 2 - pydub silence detection subprocess call
    const silenceData = await new Promise<[number, number][]>((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'detect_silence.py');
      const pythonPath = 'C:\\Users\\Admin\\AppData\\Local\\Programs\\Python\\Python311\\python.exe';
      execFile(pythonPath, [scriptPath, originalPath], (error, stdout, stderr) => {
        console.log('[PY stderr]', stderr);
        if (error) {
          console.error('Python error:', error.message);
          console.error('Python stderr:', stderr);
          return reject(new Error('Python detection failed: ' + error.message));
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error('Failed to parse Python output: ' + stdout));
        }
      });
    });
    const totalDurationMs = await getAudioDurationMs(tempInputWav);
    const totalDurationSec = totalDurationMs / 1000;

    // silenceData is array of [start_ms, end_ms] pairs — already filtered to 150ms+
    const qualifyingPauses = silenceData.map(([start, end]) => ({
      start: start / 1000,
      end: end / 1000,
      duration: end - start
    }));
    const originalDurations = qualifyingPauses.map(s => Math.round(s.duration));
    const numPauses = qualifyingPauses.length;

    // Log to console after detection
    console.log(`[Silence Detection] Total silences detected before filtering: N/A (Filtered in Python)`);
    console.log(`[Silence Detection] Qualifying pauses after 150ms filter: ${numPauses}`);
    console.log(`[Silence Detection] Durations: [${originalDurations.join(', ')}]`);

    // Skip normalization if fewer than 2 qualifying pauses
    if (numPauses < 2) {
      console.log(`[Silence Detection] Target ms chosen: 0 (Skipped)`);
      fs.copyFileSync(originalPath, processedPath);
      
      // Clean up temp wav file
      if (tempInputWav && fs.existsSync(tempInputWav)) {
        fs.unlinkSync(tempInputWav);
      }

      return NextResponse.json({
        success: true,
        stats: {
          num_pauses: numPauses,
          original_durations: originalDurations,
          target_duration: 0,
          skipped: true,
        },
        original_url: `/api/audio?filename=${originalFilename}&type=uploads`,
        processed_url: `/api/audio?filename=${processedFilename}&type=outputs`,
      });
    }

    // Shortest pause is our target duration
    const targetMs = Math.round(Math.min(...originalDurations));
    console.log(`[Silence Detection] Target ms chosen: ${targetMs}`);

    // Create a temporary directory for audio segments
    segmentsDir = path.join(os.tmpdir(), `segments_${fileId}`);
    fs.mkdirSync(segmentsDir, { recursive: true });

    const concatLines: string[] = [];
    let lastEnd = 0;
    let segmentIdx = 0;

    for (let i = 0; i < qualifyingPauses.length; i++) {
      const silence = qualifyingPauses[i];

      // Speech segment before pause (keep untouched)
      if (silence.start > lastEnd + 0.01) {
        const speechPath = path.join(segmentsDir, `segment_${segmentIdx}.wav`);
        await execFFmpeg([
          '-y',
          '-ss', lastEnd.toString(),
          '-to', silence.start.toString(),
          '-i', tempInputWav,
          '-c', 'copy',
          speechPath
        ]);
        concatLines.push(`file '${speechPath.replace(/\\/g, '/')}'`);
        segmentIdx++;
      }

      // Pause segment
      if (silence.duration > targetMs + 1) { // allow 1ms delta
        // Trim from center
        const trimStart = silence.start + (silence.duration - targetMs) / 2 / 1000;
        const trimEnd = trimStart + targetMs / 1000;

        const pausePath = path.join(segmentsDir, `segment_${segmentIdx}.wav`);

        // Apply 10ms afade in/out
        const fadeOutStart = (targetMs - 10) / 1000;
        await execFFmpeg([
          '-y',
          '-ss', trimStart.toString(),
          '-to', trimEnd.toString(),
          '-i', tempInputWav,
          '-filter_complex', `afade=t=in:st=0:d=0.01,afade=t=out:st=${fadeOutStart}:d=0.01`,
          pausePath
        ]);

        concatLines.push(`file '${pausePath.replace(/\\/g, '/')}'`);
        segmentIdx++;
      } else {
        // Keep shortest pause as-is
        const pausePath = path.join(segmentsDir, `segment_${segmentIdx}.wav`);
        await execFFmpeg([
          '-y',
          '-ss', silence.start.toString(),
          '-to', silence.end.toString(),
          '-i', tempInputWav,
          '-c', 'copy',
          pausePath
        ]);
        concatLines.push(`file '${pausePath.replace(/\\/g, '/')}'`);
        segmentIdx++;
      }

      lastEnd = silence.end;
    }

    // Final speech segment (keep untouched)
    if (lastEnd < totalDurationSec - 0.01) {
      const finalPath = path.join(segmentsDir, `segment_${segmentIdx}.wav`);
      await execFFmpeg([
        '-y',
        '-ss', lastEnd.toString(),
        '-i', tempInputWav,
        '-c', 'copy',
        finalPath
      ]);
      concatLines.push(`file '${finalPath.replace(/\\/g, '/')}'`);
    }

    // Write concat list
    const concatPath = path.join(segmentsDir, 'concat.txt');
    fs.writeFileSync(concatPath, concatLines.join('\n'));

    // Concatenate WAV segments
    const tempOutputWav = path.join(segmentsDir, 'concatenated.wav');
    await execFFmpeg([
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatPath,
      '-c', 'copy',
      tempOutputWav
    ]);

    // Encode WAV back to original extension
    await execFFmpeg(['-y', '-i', tempOutputWav, processedPath]);

    // Cleanup segment files and folder
    fs.rmSync(segmentsDir, { recursive: true, force: true });
    
    // Cleanup temporary wav input
    if (tempInputWav && fs.existsSync(tempInputWav)) {
      fs.unlinkSync(tempInputWav);
    }

    return NextResponse.json({
      success: true,
      stats: {
        num_pauses: numPauses,
        original_durations: originalDurations,
        target_duration: targetMs,
        skipped: false,
      },
      original_url: `/api/audio?filename=${originalFilename}&type=uploads`,
      processed_url: `/api/audio?filename=${processedFilename}&type=outputs`,
    });

  } catch (err) {
    console.error('Audio processing failed:', err);

    // Make sure we clean up temp files on error
    if (tempInputWav && fs.existsSync(tempInputWav)) {
      try { fs.unlinkSync(tempInputWav); } catch {}
    }
    if (segmentsDir && fs.existsSync(segmentsDir)) {
      try { fs.rmSync(segmentsDir, { recursive: true, force: true }); } catch {}
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Audio processing error: ${message}` }, { status: 500 });
  }
}
