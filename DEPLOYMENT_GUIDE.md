# Deployment Guide: GitHub to Render

## Step 1: Push Your Code to GitHub

### 1.1 Initialize Git (if not already done)
```bash
cd c:\Users\rawad\OneDrive\Desktop\weather-intelligence-platform-chat-fixed
git init
git add .
git commit -m "Initial commit: Weather Intelligence Platform"
```

### 1.2 Create a GitHub Repository
1. Go to https://github.com/new
2. Create a new repository named `weather-intelligence-platform`
3. Copy the repository URL (HTTPS)

### 1.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/weather-intelligence-platform.git
git branch -M main
git push -u origin main
```

---

## Step 2: Prepare Backend for Deployment

### 2.1 Check Backend Files
Make sure your `backend/` folder has:
- `server.js` ✅
- `package.json` ✅
- `.env` file (for local testing only - don't push this)

### 2.2 Create `.env` in Render
The `.env` file should NOT be pushed to GitHub. Instead, add environment variables in Render dashboard.

Required variables:
- `OPENWEATHER_API_KEY` - Your OpenWeather API key
- `GEMINI_API_KEY` - Your Gemini API key (optional)
- `PORT` - Set to 5000

---

## Step 3: Deploy Backend to Render

### 3.1 Go to Render.com
1. Visit https://render.com
2. Click "Sign up" (or login if you have an account)
3. Sign up with GitHub or email

### 3.2 Create a New Web Service
1. Click "New +" → "Web Service"
2. Click "Connect a repository" → Select your GitHub repo
3. Configure:
   - **Name**: `weather-api` (or any name)
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node server.js`
   - **Instance Type**: `Free` (for testing)

### 3.3 Add Environment Variables
1. Scroll to "Environment"
2. Click "Add Environment Variable"
3. Add these one by one:
   - `OPENWEATHER_API_KEY` = `YOUR_API_KEY`
   - `GEMINI_API_KEY` = `YOUR_GEMINI_KEY` (optional)
   - `PORT` = `5000`

### 3.4 Deploy
1. Click "Create Web Service"
2. Wait for deployment (2-5 minutes)
3. Once deployed, you'll get a URL like: `https://weather-api-xxxx.onrender.com`
4. **Copy this URL - you'll need it for frontend**

---

## Step 4: Update Frontend with Backend URL

### 4.1 Update Fetch Calls
In `frontend/src/main.jsx`, replace all API calls:

**Current code:**
```javascript
const response = await fetch(`/api/weather?city=${encodeURIComponent(value)}`);
```

**Change to:**
```javascript
const response = await fetch(`https://weather-api-xxxx.onrender.com/api/weather?city=${encodeURIComponent(value)}`);
```

Replace these 2 locations:
1. Line ~23 - Weather search
2. Line ~52 - Chat API

### 4.2 Push Changes to GitHub
```bash
git add .
git commit -m "Update API endpoints for Render deployment"
git push origin main
```

---

## Step 5: Deploy Frontend to Render

### 5.1 Create Frontend Web Service
1. In Render dashboard, click "New +" → "Web Service"
2. Select the same GitHub repo
3. Configure:
   - **Name**: `weather-app` (or any name)
   - **Environment**: `Node`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Start Command**: `cd frontend && npx vite preview --host 0.0.0.0`
   - **Instance Type**: `Free`

### 5.2 Deploy
1. Click "Create Web Service"
2. Wait for deployment
3. Get your frontend URL: `https://weather-app-xxxx.onrender.com`

---

## Step 6: Enable CORS (Important!)

### 6.1 Update Backend for CORS
Your backend already has CORS enabled, but verify `backend/server.js` line has:
```javascript
app.use(cors());
```

### 6.2 Test the Connection
1. Visit your frontend URL
2. Search for a city
3. Check browser console (F12) for any errors
4. Data should load from the deployed backend

---

## Step 7: Get Your Final Links

After deployment, you'll have:
- **Frontend**: `https://weather-app-xxxx.onrender.com` ← Share this link!
- **Backend API**: `https://weather-api-xxxx.onrender.com`

---

## Troubleshooting

### App won't load data
- Check browser console (F12) for CORS errors
- Verify API keys are set in Render environment
- Check Render logs for backend errors

### Slow response
- Free tier instances go to sleep after 15 min of inactivity
- First request after sleep takes 30 seconds
- Upgrade to paid plan for faster performance

### 500 Error on API call
1. Go to Render dashboard
2. Click on `weather-api` service
3. Scroll down to "Logs"
4. Check error messages
5. Common fixes:
   - API key is wrong/missing
   - OpenWeather API quota exceeded

---

## Optional: Custom Domain

To use your own domain (e.g., weather.yourdomain.com):
1. In Render, click your service
2. Go to "Settings" → "Custom Domains"
3. Add your domain and follow DNS instructions

---

## Quick Command Reference

```bash
# Push to GitHub
git add .
git commit -m "Your message"
git push origin main

# Check current directory
pwd

# Change to project
cd c:\Users\rawad\OneDrive\Desktop\weather-intelligence-platform-chat-fixed
```

---

## Summary Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed to Render
- [ ] Backend URL copied
- [ ] Frontend API calls updated with backend URL
- [ ] Frontend changes pushed to GitHub
- [ ] Frontend deployed to Render
- [ ] Tested weather search works
- [ ] Got final Render link

**Done! Your app is now live! 🚀**
