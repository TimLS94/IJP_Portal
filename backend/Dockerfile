# Playwright-fähiges Docker Image für Render
FROM python:3.11-slim

WORKDIR /app

# System dependencies für Playwright/Chromium
RUN apt-get update && apt-get install -y \
    gcc \
    # Playwright/Chromium Dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    # Fonts
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright Browser installieren (nur Chromium, spart Platz)
RUN playwright install chromium

# Copy application
COPY . .

# Create directories
RUN mkdir -p uploads
RUN mkdir -p app/data/anabin_pdfs

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
