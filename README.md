# 🤖 AI Agent Imputer — Autonomous Spatio-Temporal Missing Data Recovery

An intelligent, self-governing AI agent that autonomously detects and fills missing data gaps in Vietnamese meteorological time-series datasets. The system dynamically routes imputation tasks to the most suitable algorithm based on gap characteristics.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-green)

## 🏗️ Architecture

```
AI_AGENT_IMPUTATION/
├── backend/               # FastAPI server
│   ├── main.py            # Entry point & CORS config
│   ├── data_manager.py    # Data loading & station metadata
│   ├── requirements.txt   # Python dependencies
│   └── routers/
│       ├── evaluation.py  # EDA, Correlation, Gap Evaluation APIs
│       └── live_imputation.py  # Real-time OpenWeather + AI imputation
├── frontend/              # React + Vite + Tailwind v4
│   ├── src/
│   │   ├── App.jsx        # Main layout, tab navigation
│   │   ├── index.css      # Glassmorphism design system
│   │   └── components/
│   │       ├── AgentKnowledge.jsx   # Tab 1: EDA, Map, Correlation
│   │       ├── ModelArena.jsx       # Tab 2: Model evaluation pipeline
│   │       └── LiveImputation.jsx   # Tab 3: Real-time monitoring
│   └── package.json
├── dataset/               # CSV data files (43 Vietnamese weather stations)
└── notebook/              # Research notebooks & scripts
```

## ✨ Features

### Tab 1 — Knowledge EDA
- Interactive **Leaflet map** of 43 Vietnamese weather stations (color-coded by temperature)
- **Data Completeness Heatmap** showing missing data density across time
- **Spatial Correlation Bridges** (Pearson + Spearman hybrid, threshold > 0.8)
- Temperature distribution & time-series charts

### Tab 2 — Model Arena
- Evaluate imputation models (Linear, KNN, Random Forest, LightGBM) against synthetic gaps
- **Step-by-step pipeline progress bar** during evaluation
- Comparison table with RMSE, R², FB, FSD metrics + Agent Score
- Imputation visualization chart

### Tab 3 — Live Mode
- Real-time weather data from **OpenWeather API** for all 43 stations
- ~20% sensor failure simulation to demonstrate AI imputation power
- **Spatial KNN + inverse-distance weighted** imputation for missing signals
- Live FB/FSD metrics computed against hidden ground truth

## 🚀 Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🔑 Environment

The app uses an OpenWeather API key for live weather data (Tab 3).
The key is currently hardcoded in `backend/routers/live_imputation.py`.
For production, move it to an environment variable.

## 📊 Data Source

- `dataset/data_43_temp.csv` — Temperature time-series (2014–2019, 3h intervals)
- `dataset/vietnam_stations_43.csv` — Station metadata (name, lat, lon, WMO code)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, Recharts, Leaflet |
| Backend | FastAPI, Pandas, NumPy, Scikit-learn, LightGBM |
| API | OpenWeather API (live weather data) |
| Design | Glassmorphism, Outfit font, CSS animations |
