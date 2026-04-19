# Organ Capital Treasury App — Setup Guide

---

## Option A: Docker (Recommended — one command)

### 1. Install Docker Desktop
Download and install from: https://www.docker.com/products/docker-desktop/
(Free for personal use. Requires Windows 10/11 with WSL2 enabled.)

### 2. Set your API key and run

```bash
# In the project root (OrganCapital/)
# Windows Command Prompt:
set ANTHROPIC_API_KEY=your_key_here && docker compose up --build

# Windows PowerShell:
$env:ANTHROPIC_API_KEY="your_key_here"; docker compose up --build
```

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

The database is seeded automatically on first boot and persisted in a Docker volume.

To stop: `docker compose down`
To wipe the database and reseed: `docker compose down -v && docker compose up --build`

---

## Option B: Local Dev (no Docker)

### Prerequisites

Install these first if you haven't already:
1. **Python 3.11+** — https://www.python.org/downloads/
2. **Node.js 20+** — https://nodejs.org/

---

## Step 1: Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Set your Anthropic API key (needed for the chatbot)
# On Windows:
set ANTHROPIC_API_KEY=your_key_here
# On Mac/Linux:
export ANTHROPIC_API_KEY=your_key_here

# Generate the fake database (run once)
python seed.py

# Start the API server
uvicorn main:app --reload
```

The API will be live at http://localhost:8000
Swagger docs at http://localhost:8000/docs

---

## Step 2: Frontend Setup

Open a second terminal:

```bash
cd frontend

# Install Node dependencies
npm install

# Start the dev server
npm run dev
```

The app will be live at http://localhost:5173

---

## What gets generated

The `seed.py` script creates `organ_capital.db` with:
- **4 custodians** (Goldman Sachs Prime, Morgan Stanley Prime, BNY Mellon, State Street)
- **730 days** of time dimension data (2024–2025)
- **~1,800** daily cash position records across all custodians
- **~18,000** daily asset mark-to-market records (40 positions × 450 business days)
- **400–600** cash obligation records (trade settlements, margin calls, redemptions, etc.)

---

## Getting an Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up / log in
3. Create an API key under "API Keys"
4. The chatbot uses `claude-sonnet-4-6` with prompt caching on the live treasury context

---

## App Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | / | KPI cards, 30-day history chart, 7-day forecast |
| Cash Positions | /cash | Custodian balance cards with sparklines |
| Portfolio | /assets | Holdings table with pie chart by asset type |
| Obligations | /needs | Sortable/filterable table of upcoming needs |
| AI Assistant | /chat | Chat with Claude using live treasury context |
