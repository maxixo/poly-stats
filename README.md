# Polymarket Wallet Analytics and Copy Trading

## Project overview
Polymarket Wallet Analytics is a monorepo that indexes Polygon prediction market trades, analyzes wallet performance, and builds non-custodial copy-trading transactions. The frontend is a dark-mode React dashboard built with Vite, Tailwind, and TypeScript. The backend is an Express API in TypeScript with a Polygon event indexer, analytics engine, and copy-trade builder backed by MongoDB. The UI supports MetaMask and Phantom (EVM) wallets on Polygon...

## Architecture diagram

```
+----------------------+        REST        +-----------------------+
|  React + Vite (TS)   | <----------------> |  Express API (TS)      |
|  Tailwind, Recharts  |                    |  Zod validation        |
+----------+-----------+                    +-----------+-----------+
           |                                               |
           | Wallet signing (MetaMask)                     | Mongoose
           v                                               v
+----------------------+                    +-----------------------+
| Polygon RPC Provider | <----------------> | MongoDB               |
| On-chain events      |     Indexer        | Trades, subscriptions |
+----------------------+                    +-----------------------+
```

## Setup instructions

### Prerequisites
- Node.js 18+
- MongoDB instance (local or hosted)
- Polygon RPC URL
- Polymarket-style exchange contract address on Polygon

### Backend

```
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend

```
cd frontend
cp .env.example .env
npm install
npm run dev
```

Enable Google provider in Firebase Authentication and add `http://localhost:5173` to the authorized domains list.

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3001` by default.

## Environment variables

### Backend (`backend/.env`)
- `MONGO_URI`: MongoDB connection string.
- `POLYGON_RPC`: Polygon JSON-RPC URL.
- `POLYMARKET_EXCHANGE`: Exchange contract address that emits Trade events.
- `PORT`: Backend port (default `3001`).
- `INDEXER_START_BLOCK`: Optional starting block for backfills.
- `INDEXER_CONFIRMATIONS`: Number of confirmations before indexing (default `3`).
- `INDEXER_POLL_INTERVAL_MS`: Polling interval in ms (default `15000`).
- `PRICE_DECIMALS`: Price decimals for trade parsing (default `6`).
- `SIZE_DECIMALS`: Size decimals for trade parsing (default `6`).

### Frontend (`frontend/.env`)
- `VITE_API_URL`: Backend base URL (default `http://localhost:3001`).
- `VITE_FIREBASE_API_KEY`: Firebase Web API key.
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase auth domain.
- `VITE_FIREBASE_PROJECT_ID`: Firebase project ID.
- `VITE_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID.
- `VITE_FIREBASE_APP_ID`: Firebase app ID.

## Running the app

- Backend: `npm run dev`
- Frontend: `npm run dev`

## Security considerations
- No private keys are stored or transmitted by the backend.
- All transactions are built by the backend and signed client-side via MetaMask.
- All API inputs are validated with Zod schemas.
- Firebase authentication is handled client-side; restrict authorized domains in the Firebase console.
- Use trusted RPC endpoints and secure your MongoDB credentials.
