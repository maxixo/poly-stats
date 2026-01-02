# Setup and Testing Guide for Polymarket Wallet Analytics

## Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **Node.js 18+** installed (check with `node --version`)
- [ ] **MongoDB** instance running (local or hosted)
- [ ] **Polygon RPC URL** (get from [Polygon RPC providers](https://docs.polygon.technology/tools/rpc/))
- [ ] **Firebase project** configured (for authentication)
- [ ] **Polymarket Exchange Contract Address** on Polygon

---

## Step 1: Install Dependencies

### Backend Setup

```bash
cd backend
npm install
```

This will install:
- Express (web framework)
- Mongoose (MongoDB ODM)
- Ethers.js (blockchain interaction)
- Zod (validation)
- TypeScript dependencies

### Frontend Setup

```bash
cd frontend
npm install
```

This will install:
- React & React Router
- Vite (build tool)
- Tailwind CSS (styling)
- Firebase (authentication)
- Ethers.js (wallet connection)
- Recharts (data visualization)

---

## Step 2: Configure Environment Variables

### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your values:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/poly-stats

# Polygon Network
POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/48DLST8ny663erCpyQ78y

# Polymarket Contract
POLYMARKET_EXCHANGE=0x4bfB41d157f0e2A8938854c6Cf3AF9EC6ca5073C

# Polymarket APIs
POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_API_URL=https://clob.polymarket.com
POLYMARKET_API_TIMEOUT_MS=12000

# Server Configuration
PORT=3001

# Indexer Settings
INDEXER_START_BLOCK=50000000
INDEXER_CONFIRMATIONS=3
INDEXER_POLL_INTERVAL_MS=15000
INDEXER_MAX_RANGE=1000
PRICE_DECIMALS=6
SIZE_DECIMALS=6
```

### Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env` with your values:

```env
# Backend API
VITE_API_URL=http://localhost:3001

# Firebase Configuration (Get from Firebase Console)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## Step 3: Set Up MongoDB

### Option A: Local MongoDB (Windows)

1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Install and start MongoDB service:
   ```bash
   # Open MongoDB as administrator
   net start MongoDB
   ```

### Option B: MongoDB Atlas (Cloud)

1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string and add to `MONGO_URI` in `.env`

### Option C: Docker

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

---

## Step 4: Set Up Firebase (Optional - for Authentication)

1. Go to https://console.firebase.google.com/
2. Create a new project
3. Enable Authentication → Sign-in method → Google
4. Add `http://localhost:5173` to authorized domains in Firebase Console
5. Get your Firebase config values and add to `frontend/.env`

---

## Step 5: Start the Application

### Start Backend (Terminal 1)

```bash
cd backend
npm run dev
```

Expected output:
```
Server running on port 3001
Connected to MongoDB
Indexer started, scanning from block 50000000
```

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.4.2  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 6: Test the Application

### Test Backend API

Open a browser or use curl to test:

```bash
# Test backend health
curl http://localhost:3001/

# Test markets endpoint
curl http://localhost:3001/api/markets

# Test trades endpoint
curl http://localhost:3001/api/trades

# Test Polymarket Gamma markets
curl "http://localhost:3001/api/markets/gamma?limit=5"

# Test Polymarket CLOB markets
curl "http://localhost:3001/api/markets/clob?limit=5"
```

### Test Frontend

1. Open browser to `http://localhost:5173`
2. You should see the dark-themed dashboard
3. Navigate through pages:
   - Dashboard (overview stats)
   - Wallet Explorer
   - Copy Trading
   - Trade Panel

### Test Wallet Connection

1. Install MetaMask browser extension
2. Connect MetaMask to Polygon testnet or mainnet
3. Click "Connect Wallet" in the app
4. Approve the connection in MetaMask
5. Your wallet address should appear in the UI

### Test Data Flow

1. The backend indexer should start collecting trade events
2. Check MongoDB to verify data:
   ```bash
   # If using local MongoDB
   mongosh
   use poly-stats
   show collections
   db.trades.find().limit(5)
   ```

3. Refresh the frontend to see indexed data

---

## Common Issues and Solutions

### Issue: MongoDB Connection Failed

**Solution:**
- Verify MongoDB is running: `net start MongoDB` (Windows)
- Check connection string in `.env`
- Ensure MongoDB is accessible on port 27017

### Issue: Polygon RPC Connection Error

**Solution:**
- Try different RPC URLs:
  - `https://polygon-rpc.com`
  - `https://rpc.ankr.com/polygon`
  - `https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY`

### Issue: Frontend Can't Connect to Backend

**Solution:**
- Verify backend is running on port 3001
- Check CORS configuration in `backend/src/app.ts`
- Ensure `VITE_API_URL` in frontend matches backend URL

### Issue: TypeScript Build Errors

**Solution:**
```bash
# Run typecheck to see specific errors
cd backend
npm run typecheck

cd frontend
npm run typecheck
```

### Issue: Port Already in Use

**Solution:**
```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

---

## Development Workflow

1. Make changes to backend or frontend code
2. Backend auto-reloads with `tsx watch`
3. Frontend hot-reloads with Vite HMR
4. Test changes immediately in browser
5. When satisfied, commit to feature branch:
   ```bash
   git add .
   git commit -m "your changes"
   git push
   ```

---

## Production Deployment (Future)

### Backend
- Build TypeScript: `npx tsc`
- Use Node.js process manager (PM2)
- Deploy to VPS or cloud provider

### Frontend
- Build: `npm run build`
- Deploy dist/ folder to Vercel, Netlify, or any static host

---

## Getting Help

If you encounter issues:

1. Check the terminal logs for error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB and other services are running
4. Check GitHub Issues or create a new one

---

## Next Steps

1. ✓ Install dependencies
2. ✓ Configure environment variables
3. ✓ Start MongoDB
4. ✓ Run backend and frontend
5. ✓ Test wallet connection
6. ✓ Explore the dashboard
7. Start building features!
