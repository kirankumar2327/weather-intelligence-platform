import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const OWM = 'https://api.openweathermap.org';

app.use(cors());
app.use(express.json());

const requireWeatherKey = () => {
  if (!process.env.OPENWEATHER_API_KEY) {
    const error = new Error('OPENWEATHER_API_KEY is missing. Add it to backend/.env');
    error.status = 500;
    throw error;
  }
  return process.env.OPENWEATHER_API_KEY;
};

const getJson = async (url, params) => {
  const response = await axios.get(url, { params, timeout: 12000 });
  return response.data;
};

const formatHour = (unix, timezone = 0) => {
  const date = new Date((unix + timezone) * 1000);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' }).format(date);
};

const formatDate = (unix, timezone = 0) => {
  const date = new Date((unix + timezone) * 1000);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
};

const dayKey = (unix, timezone = 0) => {
  const date = new Date((unix + timezone) * 1000);
  return date.toISOString().slice(0, 10);
};

const buildDailyForecast = (list, timezone) => {
  const groups = new Map();
  for (const item of list) {
    const key = dayKey(item.dt, timezone);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  return [...groups.values()].slice(0, 5).map((items) => {
    const min = Math.min(...items.map((x) => x.main.temp_min));
    const max = Math.max(...items.map((x) => x.main.temp_max));
    const representative = items.reduce((best, item) => {
      const distance = Math.abs((new Date((item.dt + timezone) * 1000)).getUTCHours() - 12);
      const bestDistance = Math.abs((new Date((best.dt + timezone) * 1000)).getUTCHours() - 12);
      return distance < bestDistance ? item : best;
    }, items[0]);

    return {
      date: formatDate(representative.dt, timezone),
      min: Math.round(min),
      max: Math.round(max),
      description: representative.weather?.[0]?.description || 'Forecast',
      icon: representative.weather?.[0]?.icon || '01d',
      rainChance: Math.round(Math.max(...items.map((x) => (x.pop || 0) * 100)))
    };
  });
};

const buildHourly = (list, timezone) => list.slice(0, 10).map((item) => ({
  time: formatHour(item.dt, timezone),
  temp: Math.round(item.main.temp),
  feels: Math.round(item.main.feels_like),
  icon: item.weather?.[0]?.icon || '01d',
  description: item.weather?.[0]?.description || 'Forecast',
  rainChance: Math.round((item.pop || 0) * 100)
}));

const aqiLabel = (aqi) => ({
  1: 'Good',
  2: 'Fair',
  3: 'Moderate',
  4: 'Poor',
  5: 'Very Poor'
}[aqi] || 'Unavailable');

const fallbackInsight = ({ city, current, aqi, uv }) => {
  const temp = current.temp;
  const humidity = current.humidity;
  const rain = current.rainChance || 0;
  const wind = current.wind;
  const tips = [];

  if (rain >= 50) tips.push('Carry an umbrella and keep outdoor plans flexible.');
  else if (rain >= 25) tips.push('A light rain layer is worth carrying for outdoor activities.');
  else tips.push('Conditions look suitable for most outdoor activities.');

  if (temp >= 32) tips.push('Choose breathable clothing, stay hydrated, and avoid prolonged midday exposure.');
  else if (temp <= 18) tips.push('A light jacket or warm layer should be comfortable.');
  else tips.push('Light, comfortable clothing should work well today.');

  if (uv >= 7) tips.push('UV exposure may be high, so use sunscreen and seek shade around midday.');
  if (aqi?.value >= 4) tips.push('Air quality is poor; consider reducing strenuous outdoor exercise.');
  if (wind >= 35) tips.push('Winds are noticeable, so secure loose items and take care with cycling.');

  return {
    title: `Weather plan for ${city}`,
    summary: `${city} is currently ${current.description} at ${Math.round(temp)}°C, with ${humidity}% humidity. ${rain}% chance of rain is expected in the near-term forecast.`,
    tips
  };
};

async function generateGeminiInsight(payload) {
  if (!process.env.GEMINI_API_KEY) return null;

  const prompt = `You are a concise weather assistant. Create a useful personalized weather plan using ONLY the supplied data. Return valid JSON with keys title, summary, tips (array of 3 to 5 short strings). Mention travel, clothing, and outdoor activity only when relevant. Do not invent values.\n\nDATA:\n${JSON.stringify(payload)}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;

  const response = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, responseMimeType: 'application/json' }
  }, {
    timeout: 15000,
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }
  });

  const text = response.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'weather-intelligence-api' }));

app.get('/api/weather', async (req, res) => {
  try {
    const city = String(req.query.city || '').trim();
    if (!city) return res.status(400).json({ message: 'City is required.' });
    const key = requireWeatherKey();

    const geo = await getJson(`${OWM}/geo/1.0/direct`, { q: city, limit: 1, appid: key });
    if (!geo.length) return res.status(404).json({ message: `Could not find a city named "${city}".` });

    const { lat, lon, name, country, state } = geo[0];
    
    // Fetch main weather data
    const [current, forecast] = await Promise.all([
      getJson(`${OWM}/data/2.5/weather`, { lat, lon, appid: key, units: 'metric' }),
      getJson(`${OWM}/data/2.5/forecast`, { lat, lon, appid: key, units: 'metric' })
    ]);

    // Fetch optional data in parallel
    const [airResult, uvResult] = await Promise.all([
      getJson(`${OWM}/data/2.5/air_pollution`, { lat, lon, appid: key }).catch(() => null),
      getJson(`${OWM}/data/3.0/onecall`, {
        lat, lon, appid: key, units: 'metric', exclude: 'minutely,alerts'
      }).catch(() => null)
    ]);

    let air = airResult;
    let uv = uvResult?.current?.uvi ?? null;

    const timezone = current.timezone || 0;
    const rainChance = Math.round(((forecast.list?.[0]?.pop || 0)) * 100);
    const aqiValue = air?.list?.[0]?.main?.aqi ?? null;

    const result = {
      location: { name, country, state: state || '', lat, lon, timezone },
      current: {
        temp: current.main.temp,
        feelsLike: current.main.feels_like,
        humidity: current.main.humidity,
        pressure: current.main.pressure,
        visibility: Math.round((current.visibility || 0) / 1000 * 10) / 10,
        wind: Math.round((current.wind?.speed || 0) * 3.6 * 10) / 10,
        windDirection: current.wind?.deg ?? 0,
        description: current.weather?.[0]?.description || 'Unknown',
        icon: current.weather?.[0]?.icon || '01d',
        sunrise: current.sys.sunrise,
        sunset: current.sys.sunset,
        timestamp: current.dt,
        rainChance
      },
      aqi: { value: aqiValue, label: aqiLabel(aqiValue) },
      uv: uv === null ? null : Math.round(uv * 10) / 10,
      hourly: buildHourly(forecast.list || [], timezone),
      daily: buildDailyForecast(forecast.list || [], timezone)
    };

    const payload = {
      city: name,
      current: result.current,
      aqi: result.aqi,
      uv: result.uv
    };

    const insight = fallbackInsight(payload);

    res.json({ ...result, insight, generatedBy: 'Smart recommendation engine' });
  } catch (error) {
    const status = error.response?.status || error.status || 500;
    const apiMessage = error.response?.data?.message;
    console.error(error.message);
    res.status(status).json({ message: apiMessage || error.message || 'Unable to fetch weather data.' });
  }
});


app.post('/api/chat', async (req, res) => {
  try {
    const question = String(req.body?.question || '').trim();
    const weather = req.body?.weather;
    if (!question) return res.status(400).json({ message: 'Question is required.' });
    if (!weather) return res.status(400).json({ message: 'Load a city weather report before chatting.' });

    const c = weather.current || {};
    const city = weather.location?.name || 'the selected city';
    const rain = c.rainChance ?? 0;
    const aqi = weather.aqi?.value;
    const uv = weather.uv;

    const fallback = () => {
      const q = question.toLowerCase();
      if (/^(hi|hello|hey|hii|good morning|good afternoon|good evening)\\b/.test(q)) return `Hi! 👋 I have the latest weather for ${city}. Ask me about temperature, rain, AQI, UV, wind, clothing, travel, or outdoor activities.`;
      if (q.includes('temp') || q.includes('temperature') || q.includes('hot') || q.includes('cold')) return `${city} is currently ${Math.round(c.temp)}°C and feels like ${Math.round(c.feelsLike)}°C, with ${c.description}.`;
      if (q.includes('rain') || q.includes('umbrella')) return `${city} has about a ${rain}% near-term chance of rain. ${rain >= 50 ? 'Carry an umbrella and keep outdoor plans flexible.' : 'Rain does not look like a major concern right now.'}`;
      if (q.includes('humidity')) return `Humidity in ${city} is ${c.humidity}%.`;
      if (q.includes('aqi') || q.includes('air quality') || q.includes('pollution')) return aqi ? `The AQI in ${city} is ${aqi}/5 (${weather.aqi.label}).` : `AQI data is unavailable for ${city}.`;
      if (q.includes('uv')) return uv == null ? 'UV Index is unavailable because OpenWeather One Call 3.0 is not enabled.' : `The UV Index in ${city} is ${uv}.`;
      if (q.includes('wind')) return `Wind in ${city} is around ${c.wind} km/h.`;
      if (q.includes('visibility')) return `Visibility in ${city} is ${c.visibility} km.`;
      if (q.includes('pressure')) return `Pressure in ${city} is ${c.pressure} hPa.`;
      if (q.includes('wear') || q.includes('clothing') || q.includes('clothes')) return rain >= 50 ? 'Carry an umbrella or rain layer. Choose breathable clothing if it is warm.' : c.temp >= 32 ? 'Wear light, breathable clothing and consider sunglasses and sunscreen.' : c.temp <= 18 ? 'A light jacket or warm layer should be comfortable.' : 'Light, comfortable clothing should work well today.';
      if (q.includes('travel') || q.includes('drive') || q.includes('road')) return c.visibility < 3 ? 'Visibility is reduced, so allow extra travel time and use caution on the road.' : rain >= 60 ? 'Rain is likely. Carry an umbrella and allow extra travel time.' : 'Travel conditions look generally favorable.';
      if (q.includes('outdoor') || q.includes('exercise') || q.includes('sport')) return aqi >= 4 ? 'Air quality is poor, so prefer indoor exercise or keep outdoor activity light.' : c.temp >= 35 ? 'It is hot. Prefer early morning or evening activity, hydrate well, and take shade breaks.' : 'Conditions are reasonably suitable for outdoor activity.';
      if (q.includes('forecast') || q.includes('tomorrow') || q.includes('today')) return (weather.daily || []).slice(0,3).map(d => `${d.date}: ${d.max}°/${d.min}°, ${d.description}, rain ${d.rainChance}%`).join(' | ') || 'Forecast data is unavailable.';
      return `I can help with ${city}'s temperature, rain, humidity, AQI, UV, wind, visibility, forecast, clothing, travel, and outdoor plans.`;
    };

    if (!process.env.GEMINI_API_KEY) return res.json({ reply: fallback(), generatedBy: 'Smart recommendation engine' });

    const prompt = `You are WeatherIQ, a friendly weather assistant. Answer the user's question using ONLY the supplied current weather and forecast data. Be concise (2-5 sentences or short bullets), natural, and useful. Never invent weather values. If the user asks something unrelated to weather, politely say you are focused on weather. Mention the city when useful.\n\nCITY WEATHER DATA:\n${JSON.stringify(weather)}\n\nUSER QUESTION:\n${question}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;
    const response = await axios.post(url,
      { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } },
      { timeout: 15000, headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY } }
    );
    const reply = response.data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (!reply) throw new Error('Gemini returned an empty response.');
    res.json({ reply, generatedBy: 'Gemini' });
  } catch (error) {
    console.warn('Gemini chat unavailable:', error.response?.data || error.message);
    const detail = error.response?.data?.error?.message || error.message;
    res.status(502).json({ message: `Gemini chat is temporarily unavailable. ${detail}` });
  }
});

app.listen(PORT, () => {
  console.log(`Weather Intelligence API running on http://localhost:${PORT}`);
});
