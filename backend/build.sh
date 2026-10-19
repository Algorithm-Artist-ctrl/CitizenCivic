#!/usr/bin/env bash
# Exit on error
set -o errexit

# 1. Build React frontend if npm is available
if command -v npm >/dev/null 2>&1; then
  echo "Building React frontend..."
  if [ -d "../frontend" ]; then
    npm --prefix ../frontend install && npm --prefix ../frontend run build
  elif [ -d "frontend" ]; then
    npm --prefix frontend install && npm --prefix frontend run build
  fi
fi

# Activate venv if present locally
if [ -d "venv" ]; then
  source venv/bin/activate
fi

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Collect static files (including React SPA assets)
python manage.py collectstatic --noinput

# 4. Run database migrations
python manage.py migrate
