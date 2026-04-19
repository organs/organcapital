FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Seed the database on first run if it doesn't exist
CMD ["sh", "-c", "[ ! -f /data/organ_capital.db ] && python seed.py; uvicorn main:app --host 0.0.0.0 --port 8000"]
