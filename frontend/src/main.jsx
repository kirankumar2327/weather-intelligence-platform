import React from 'react';
import ReactDOM from 'react-dom/client';
import { Search, MapPin, Wind, Droplets, Gauge, Eye, Sun, Sunrise, Sunset, Umbrella, Shirt, Plane, Activity, RefreshCw, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './styles.css';

const API_ICON = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

const getGradientByTemp = (temp) => {
  if (temp <= 0) return 'linear-gradient(135deg, #001a4d 0%, #0d47a1 25%, #1565c0 50%, #1976d2 75%, #1a237e 100%)'; // Cold/Blue
  if (temp <= 10) return 'linear-gradient(135deg, #0d47a1 0%, #1976d2 25%, #42a5f5 50%, #64b5f6 75%, #1e3a8a 100%)'; // Cool/Light Blue
  if (temp <= 18) return 'linear-gradient(135deg, #1565c0 0%, #42a5f5 25%, #90caf9 50%, #81d4fa 75%, #0277bd 100%)'; // Mild/Cyan
  if (temp <= 25) return 'linear-gradient(135deg, #0f0c29 0%, #302b63 25%, #24243e 50%, #1a1a2e 75%, #0f0f1e 100%)'; // Pleasant/Purple
  if (temp <= 32) return 'linear-gradient(135deg, #f57c00 0%, #ff9800 25%, #ffb74d 50%, #ffe082 75%, #e65100 100%)'; // Warm/Orange
  return 'linear-gradient(135deg, #d32f2f 0%, #ff5252 25%, #ff7043 50%, #ff8a65 75%, #bf360c 100%)'; // Hot/Red
};

function App() {
  const [city, setCity] = React.useState('Delhi');
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [chatOpen, setChatOpen] = React.useState(true);
  const [chatInput, setChatInput] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState([{ role: 'bot', text: 'Hey! 👋 Ask me anything about the weather.' }]);
  const chatEndRef = React.useRef(null);
  const cacheRef = React.useRef({});
  const timeoutRef = React.useRef(null);

  const search = React.useCallback(async (target = city) => {
    const value = target.trim();
    if (!value) return;
    
    if (cacheRef.current[value]) {
      setData(cacheRef.current[value]);
      setError('');
      return;
    }
    
    setLoading(true); setError('');
    try {
      const response = await fetch(`https://weather-intelligence-platform-o4x5.onrender.com/api/weather?city=${encodeURIComponent(value)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Could not load weather.');
      cacheRef.current[value] = body;
      setData(body);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, [city]);

  const debouncedSearch = React.useCallback((value) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(value), 500);
  }, [search]);

  React.useEffect(() => { search('Delhi'); }, []);

  const time = (unix, timezone) => new Date((unix + timezone) * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
  const date = (unix, timezone) => new Date((unix + timezone) * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

  React.useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  const [chatSending, setChatSending] = React.useState(false);

  const sendChat = React.useCallback(async (preset) => {
    const text = (preset ?? chatInput).trim();
    if (!text || chatSending) return;
    setChatMessages(prev => [...prev, { role: 'user', text }]);
    setChatInput('');
    setChatSending(true);
    try {
      const response = await fetch('https://weather-intelligence-platform-o4x5.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, weather: data })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Chat service unavailable.');
      setChatMessages(prev => [...prev, { role: 'bot', text: body.reply, ai: body.generatedBy === 'Gemini' }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'bot', text: `Sorry, I couldn't process that right now. ${e.message}` }]);
    } finally {
      setChatSending(false);
    }
  }, [chatInput, chatSending, data]);

  React.useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  return <div className="app-shell" style={{ background: data ? getGradientByTemp(data.current.temp) : 'linear-gradient(135deg, #0f0c29 0%, #302b63 25%, #24243e 50%, #1a1a2e 75%, #0f0f1e 100%)', transition: 'background 0.6s ease' }}>
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Sun size={20}/></div><div><strong>WeatherIQ</strong><span>Forecast Intelligence</span></div></div>
      <div className="live-pill"><span className="live-dot"/> Live weather data</div>
    </header>

    <main className="container">
      <section className="hero">
        <div>
          <p className="eyebrow">WEATHER INTELLIGENCE & FORECAST ANALYTICS</p>
          <h1>Know the weather.<br/><em>Plan smarter.</em></h1>
        </div>
        <form className="search" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <MapPin size={19}/><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Search city..."/><button aria-label="Search"><Search size={19}/></button>
        </form>
      </section>

      {loading && <div className="loading"><RefreshCw className="spin" size={20}/> Fetching live weather intelligence...</div>}
      {error && <div className="error">{error}<button onClick={() => search()}>Try again</button></div>}

      {data && <>
        <section className="overview-grid">
          <div className="current-card panel">
            <div className="location"><MapPin size={16}/><span>{data.location.name}{data.location.state ? `, ${data.location.state}` : ''}, {data.location.country}</span></div>
            <div className="current-main"><img src={API_ICON(data.current.icon)} alt=""/><div><div className="temp">{Math.round(data.current.temp)}<sup>°C</sup></div><div className="condition">{data.current.description}</div></div></div>
            <div className="date-line">{date(data.current.timestamp, data.location.timezone)} · {time(data.current.timestamp, data.location.timezone)}</div>
            <div className="mini-row"><span>Feels like <b>{Math.round(data.current.feelsLike)}°</b></span><span>Rain chance <b>{data.current.rainChance}%</b></span></div>
          </div>

          <Metric icon={<Droplets/>} label="Humidity" value={`${data.current.humidity}%`} note="Relative humidity" />
          <Metric icon={<Gauge/>} label="Pressure" value={`${data.current.pressure} hPa`} note="Atmospheric pressure" />
          <Metric icon={<Eye/>} label="Visibility" value={`${data.current.visibility} km`} note="Current visibility" />
          <Metric icon={<Wind/>} label="Wind" value={`${data.current.wind} km/h`} note="Near-surface wind" />
          <Metric icon={<Activity/>} label="Air Quality" value={data.aqi.value ? `${data.aqi.value}/5` : 'N/A'} note={data.aqi.label} />
        </section>

        <section className="two-col">
          <div className="panel chart-panel">
            <SectionTitle title="Hourly temperature" sub="Next 30 hours" />
            <div className="chart"><ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.hourly} margin={{ left: -15, right: 5, top: 12, bottom: 0 }}>
                <defs><linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopOpacity={0.35}/><stop offset="100%" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.16}/><XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}/><YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="°"/><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #243247', background: '#0e1828' }}/><Area type="monotone" dataKey="temp" strokeWidth={3} fill="url(#tempFill)"/>
              </AreaChart>
            </ResponsiveContainer></div>
          </div>

          <div className="panel insight-panel">
            <div className="ai-badge"><Sparkles size={15}/> {data.generatedBy}</div>
            <SectionTitle title={data.insight.title} sub="Personalized weather guidance" />
            <p className="summary">{data.insight.summary}</p>
            <div className="tips">{data.insight.tips.map((tip, i) => <div className="tip" key={i}><span>{['✦','→','✓','◌','+'][i % 5]}</span>{tip}</div>)}</div>
          </div>
        </section>

        <section className="panel forecast-panel">
          <SectionTitle title="5-day forecast" sub="Daily outlook from OpenWeather" />
          <div className="forecast-grid">{data.daily.map((day, i) => <div className="day" key={i}><b>{i === 0 ? 'Today' : day.date}</b><img src={API_ICON(day.icon)} alt=""/><strong>{day.max}° <small>{day.min}°</small></strong><span>{day.description}</span><label><Umbrella size={13}/> {day.rainChance}%</label></div>)}</div>
        </section>

        <section className="planning-grid">
          <PlanCard icon={<Shirt/>} title="Clothing" text={clothing(data.current.temp, data.current.rainChance)}/>
          <PlanCard icon={<Plane/>} title="Travel" text={travel(data.current.rainChance, data.current.wind, data.current.visibility)}/>
          <PlanCard icon={<Activity/>} title="Outdoor activity" text={outdoor(data.current.temp, data.current.rainChance, data.aqi.value)}/>
          <div className="panel sun-panel"><div className="sun-item"><Sunrise/><div><span>Sunrise</span><b>{time(data.current.sunrise, data.location.timezone)}</b></div></div><div className="sun-item"><Sunset/><div><span>Sunset</span><b>{time(data.current.sunset, data.location.timezone)}</b></div></div></div>
        </section>
      </>}
      {chatOpen && (
        <section className="weather-chat" aria-label="Weather chat">
          <div className="chat-header">
            <div><strong>✧ Weather Chat</strong><span>Ask about the current weather</span></div>
            <button className="chat-close" onClick={() => setChatOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div className="chat-messages">
            {chatMessages.map((message, index) => (
              <div className={`chat-row ${message.role}`} key={index}><div className="chat-bubble">{message.text}{message.ai && <span className="chat-ai-badge">✦ Gemini</span>}</div></div>
            ))}
            {chatSending && <div className="chat-row bot"><div className="chat-bubble typing"><span></span><span></span><span></span></div></div>}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-suggestions">
            {['TEMP TODAY', 'Will it rain?', 'What should I wear?'].map(s => <button key={s} onClick={() => sendChat(s)}>{s}</button>)}
          </div>
          <form className="chat-input" onSubmit={e => { e.preventDefault(); sendChat(); }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask anything..." aria-label="Ask about weather" />
            <button type="submit" aria-label="Send message">➤</button>
          </form>
        </section>
      )}
      {!chatOpen && <button className="chat-reopen" onClick={() => setChatOpen(true)}>✧ Weather Chat</button>}

      <footer>Powered by OpenWeather · Built with React + Node.js + Express @ copyrights - Kirankumar</footer>
    </main>
  </div>
}

function Metric({ icon, label, value, note }) { return <div className="metric panel"><div className="metric-icon">{React.cloneElement(icon, { size: 18 })}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></div> }
function SectionTitle({ title, sub }) { return <div className="section-title"><div><h2>{title}</h2><span>{sub}</span></div></div> }
function PlanCard({ icon, title, text }) { return <div className="panel plan"><div className="plan-icon">{React.cloneElement(icon, {size: 19})}</div><div><h3>{title}</h3><p>{text}</p></div></div> }

function clothing(t, rain) { if (rain >= 50) return 'Carry a rain layer or umbrella. Choose breathable clothing if it is warm.'; if (t >= 32) return 'Light, breathable clothing is best. Sunglasses and sunscreen are recommended.'; if (t <= 18) return 'Wear a light jacket or warm layer, especially in the morning and evening.'; return 'Light, comfortable clothing should be suitable for the day.'; }
function travel(rain, wind, visibility) { if (visibility < 3) return 'Reduced visibility: allow extra travel time and use caution on the road.'; if (rain >= 60) return 'Rain is likely. Keep an umbrella handy and build extra buffer into outdoor travel.'; if (wind >= 35) return 'Windy conditions: take care with two-wheelers and exposed routes.'; return 'Travel conditions look generally favorable. Keep checking the hourly outlook.'; }
function outdoor(t, rain, aqi) { if (aqi >= 4) return 'Air quality is poor. Prefer indoor exercise or keep outdoor sessions light.'; if (rain >= 60) return 'Wet conditions are likely. Consider indoor activities or wait for a clearer window.'; if (t >= 35) return 'High heat: prefer early morning/evening activity, hydrate well and take shade breaks.'; return 'Conditions are reasonably suitable for outdoor activity. Stay hydrated and check the forecast before heading out.'; }

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
