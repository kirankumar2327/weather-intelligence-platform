# Weather Intelligence & Forecast Analytics Platform

A full-stack weather analytics dashboard built with React, Node.js and Express using the OpenWeather API. 

## Features
- Live city weather: temperature, feels-like, humidity, pressure, visibility and wind
- Air Quality Index (AQI)

n
- 5-day forecast and rain probability
- Sunrise / sunset
- Personalized clothing, travel and outdoor-activity recommendations
- AI-generated weather summary through Gemini when `GEMINI_API_KEY` is configured
- Built-in smart recommendation fallback when Gemini is not configured
- Responsive modern dashboard

## Project structure

```text
weather-intelligence-platform/
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       └── styles.css
└── README.md
```

## Run locally

### 1. Backend
```bash
cd backend
npm install
npm run dev 
```


### 2. Frontend
Open a **second VS Code terminal**:
```bash
cd frontend
npm install
npm run dev
```

