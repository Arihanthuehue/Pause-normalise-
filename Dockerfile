# Use official Python 3.11 slim image
FROM python:3.11-slim

# Install system dependencies (ffmpeg is required for pydub to decode/encode audio)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files
COPY . .

# Run the app with gunicorn binding to 0.0.0.0 and the PORT environment variable
CMD gunicorn -b 0.0.0.0:$PORT app:app
