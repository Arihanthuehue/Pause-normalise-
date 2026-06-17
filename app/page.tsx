"use client";

import { useState } from 'react';
import Link from 'next/link';

interface Stats {
  num_pauses: number;
  original_durations: number[];
  target_duration: number;
  skipped: boolean;
}

interface ProcessResult {
  success: boolean;
  stats: Stats;
  original_url: string;
  processed_url: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [timestamp, setTimestamp] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setProcessing(true);
    setError(null);
    setStatus('Processing...');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        setTimestamp(Date.now());
        setStatus('Processing complete!');
      } else {
        throw new Error(data.error || 'An unknown error occurred during audio processing.');
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to connect to the server or execute process.';
      setError(msg);
      setStatus(null);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        .app-container {
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          background: radial-gradient(circle at top right, #171d2b 0%, #0a0d14 100%);
          color: #f3f4f6;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 40px 20px;
        }

        .dashboard {
          width: 100%;
          max-width: 800px;
          background: rgba(18, 24, 38, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 24px;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .title-group h1 {
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0;
          background: linear-gradient(135deg, #ffffff 0%, #9ca3af 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .title-group p {
          color: #9ca3af;
          font-size: 0.95rem;
          margin: 6px 0 0 0;
          line-height: 1.5;
        }

        .docs-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(137, 191, 4, 0.1);
          color: #a7e607;
          border: 1px solid rgba(137, 191, 4, 0.3);
          text-decoration: none;
          padding: 10px 20px;
          borderRadius: 10px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .docs-btn:hover {
          background: #89bf04;
          color: #0b0f19;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(137, 191, 4, 0.25);
        }

        .upload-section {
          margin-bottom: 30px;
        }

        /* Custom Dropzone UI */
        .dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 40px 20px;
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .dropzone:hover {
          border-color: #89bf04;
          background: rgba(137, 191, 4, 0.03);
        }

        .dropzone-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
          color: rgba(255, 255, 255, 0.4);
          transition: color 0.2s ease;
        }

        .dropzone:hover .dropzone-icon {
          color: #a7e607;
        }

        .dropzone-text {
          font-weight: 500;
          font-size: 1rem;
          margin-bottom: 6px;
          color: #e5e7eb;
        }

        .dropzone-subtext {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .file-badge {
          margin-top: 15px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          font-size: 0.85rem;
          color: #e5e7eb;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          max-width: 90%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-badge-dot {
          width: 8px;
          height: 8px;
          background-color: #89bf04;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }

        .btn-submit {
          display: block;
          width: 100%;
          background: linear-gradient(135deg, #89bf04 0%, #719e03 100%);
          color: #0b0f19;
          border: none;
          padding: 16px;
          font-size: 1rem;
          font-weight: 700;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 20px;
          box-shadow: 0 4px 12px rgba(137, 191, 4, 0.2);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(137, 191, 4, 0.4);
          filter: brightness(1.08);
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Message banners */
        .banner {
          border-radius: 12px;
          padding: 16px;
          margin: 20px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
          font-size: 0.95rem;
        }

        .banner-status {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .banner-error {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        /* Results Card */
        .results-card {
          margin-top: 40px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 30px;
        }

        .results-card h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 24px 0;
          color: #ffffff;
        }

        /* Grid for stats items */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 30px;
        }

        .stat-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 16px;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 1.4rem;
          font-weight: 700;
          color: #ffffff;
        }

        .stat-value.accent {
          color: #a7e607;
        }

        .stat-value-sub {
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .notice-banner {
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.2);
          padding: 14px;
          border-radius: 10px;
          font-size: 0.9rem;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        /* Audio Player Layout */
        .audio-tracks {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        @media (min-width: 640px) {
          .audio-tracks {
            grid-template-columns: 1fr 1fr;
          }
        }

        .track-card {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 18px;
        }

        .track-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #e5e7eb;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .track-title-icon {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .track-title-icon.original { background-color: #60a5fa; }
        .track-title-icon.processed { background-color: #89bf04; }

        audio {
          width: 100%;
          height: 40px;
          outline: none;
        }

        .download-action {
          margin-top: 10px;
        }

        .btn-download {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          background: #ffffff;
          color: #0b0f19;
          text-decoration: none;
          padding: 16px;
          font-weight: 700;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
        }

        .btn-download:hover {
          background: #f3f4f6;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(255, 255, 255, 0.15);
        }

        /* Spinner for loading */
        .spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 3px solid rgba(11, 15, 25, 0.3);
          border-radius: 50%;
          border-top-color: #0b0f19;
          animation: spin 0.8s linear infinite;
          margin-right: 10px;
          vertical-align: middle;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="dashboard">
        <div className="header-bar">
          <div className="title-group">
            <h1>Pause Normalizer</h1>
            <p>Upload an audio file (.mp3, .wav, or .m4a) to detect pauses and trim them to the shortest pause duration.</p>
          </div>
          <Link href="/docs" className="docs-btn">
            <span>Swagger API Docs</span>
            <span>→</span>
          </Link>
        </div>

        <div className="upload-section">
          <form onSubmit={handleSubmit}>
            {/* Hidden Input, custom trigger via label wrapper */}
            <label htmlFor="audioFile" className="dropzone">
              <span className="dropzone-icon">🎛️</span>
              <span className="dropzone-text">
                {file ? 'Selected file' : 'Click to select audio file'}
              </span>
              <span className="dropzone-subtext">Supports MP3, WAV, or M4A formats</span>
              
              <input
                id="audioFile"
                type="file"
                accept=".mp3,.wav,.m4a"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                disabled={processing}
                style={{ display: 'none' }}
              />

              {file && (
                <div className="file-badge">
                  <span className="file-badge-dot"></span>
                  <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
              )}
            </label>

            <button type="submit" className="btn-submit" disabled={processing || !file}>
              {processing ? (
                <>
                  <span className="spinner"></span>
                  Processing Audio...
                </>
              ) : (
                'Process Audio Normalization'
              )}
            </button>
          </form>
        </div>

        {status && (
          <div className="banner banner-status">
            <span>ℹ️</span>
            <span>{status}</span>
          </div>
        )}
        
        {error && (
          <div className="banner banner-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="results-card">
            <h2>Processing Results</h2>

            {result.stats.skipped && (
              <div className="notice-banner">
                <strong>Notice:</strong> Normalization was skipped because fewer than 2 qualifying pauses (&gt; 150ms) were found in the file. The original audio was returned unmodified.
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Detected Pauses</div>
                <div className="stat-value">{result.stats.num_pauses}</div>
                <div className="stat-value-sub">pauses &gt; 150ms</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Target Duration</div>
                <div className="stat-value accent">
                  {result.stats.num_pauses > 0 ? `${result.stats.target_duration}ms` : '0ms'}
                </div>
                <div className="stat-value-sub">shortest pause value</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Pause Range</div>
                <div className="stat-value-sub" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginTop: '6px' }}>
                  {result.stats.num_pauses > 0 
                    ? `[${result.stats.original_durations.join(', ')}] ms`
                    : 'N/A'
                  }
                </div>
              </div>
            </div>

            <div className="audio-tracks">
              <div className="track-card">
                <div className="track-title">
                  <span className="track-title-icon original"></span>
                  <span>Original Audio Source</span>
                </div>
                <audio src={`${result.original_url}&t=${timestamp}`} controls />
              </div>

              <div className="track-card">
                <div className="track-title">
                  <span className="track-title-icon processed"></span>
                  <span>Processed Audio Result</span>
                </div>
                <audio src={`${result.processed_url}&t=${timestamp}`} controls />
              </div>
            </div>

            <div className="download-action">
              <a
                href={`${result.processed_url}&t=${timestamp}`}
                download={`${file?.name.replace(/(\.[^.]+)$/, '_processed$1')}`}
                className="btn-download"
              >
                <span>💾</span>
                <span>Download Processed Audio File</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
