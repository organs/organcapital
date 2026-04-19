# Organ Capital — Treasury Management App

A full-stack treasury management dashboard for a systematic credit hedge fund. Built with FastAPI, React, and Claude AI.

## Overview

Organ Capital tracks daily cash positions across prime brokers, monitors upcoming obligations (trade settlements, margin calls, redemptions), and provides AI-assisted cash management via a Claude-powered chatbot.

## Features

- **Dashboard** — KPI cards, 30-day cash history, 7-day forecast
- **Cash Positions** — Custodian balance cards with sparklines
- **Portfolio** — Holdings table with pie chart by asset type
- **Obligations** — Sortable/filterable table of upcoming cash needs
- **AI Assistant** — Chat with Claude using live treasury context and prompt caching

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | React + TypeScript + Tailwind CSS |
| Database | SQLite (seeded with synthetic data) |
| AI | Claude claude-sonnet-4-6 via Anthropic API |
| Containerization | Docker + Docker Compose |

## Quickstart (Docker)

```bash
# 1. Copy and fill in your API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 2. Run
docker compose up --build
```

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

## Local Dev (no Docker)

### Backend

```bash
cd backend
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_key_here
python seed.py        # generate the SQLite database (run once)
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

## Synthetic Data

`seed.py` generates `organ_capital.db` with:

- 4 custodians (Goldman Sachs Prime, Morgan Stanley Prime, BNY Mellon, State Street)
- 730 days of time dimension data (2024–2025)
- ~1,800 daily cash position records
- ~18,000 daily asset mark-to-market records (40 positions × 450 business days)
- 400–600 cash obligation records (trade settlements, margin calls, redemptions)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Required for the AI chatbot |

Copy `.env.example` to `.env` and fill in your key. Never commit `.env`.

## Getting an Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up / log in
3. Create a key under "API Keys"
