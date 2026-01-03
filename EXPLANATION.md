# Wallet Explorer Implementation Notes

## Summary
- Added a full leaderboard + analytics pipeline, new wallet endpoints, and Gemini AI insights.
- Rebuilt the Wallet Explorer UI to show top performers, detailed metrics, charts, trade analysis, and AI insights.

## Data Model Updates
- Trade model now supports multiple sources with `source`, `tradeId`, `maker`, `taker`, and optional `txHash/logIndex/blockNumber`.
- New Market model stores metadata (question, category, slug) for category analytics.
- New WalletInsight model caches Gemini outputs for a configurable TTL.

## Data Processing Pipeline
1) Data collection
   - `syncPolymarketTrades()` pulls recent trades from the Polymarket CLOB API.
   - Field names are configurable via env (see below) to match upstream payloads.
2) Market metadata
   - `syncMarkets()` and `syncMarketsByIds()` pull Gamma API market metadata.
3) Wallet ranking
   - Leaderboard filters wallets by min trades + min win rate + min profit.
   - Score = `netProfit * winRate * tradeCount`.
4) Deep analysis
   - Per-wallet analytics: profit factor, Sharpe, volatility, hold times, category stats, top trades.
5) AI analysis
   - Aggregated payload is sent to Gemini and cached in MongoDB.

## Analytics Assumptions (Important)
- PnL uses a mark price derived from the latest market trade prices (same heuristic as the existing analytics).
- Hold time is approximated using the first and last trade per market for a wallet.
- Active positions count uses `ACTIVE_POSITION_DAYS` to classify “recently traded” markets.

## Gemini Integration
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=API_KEY`
- JSON mode enabled via `generationConfig.response_mime_type = "application/json"`.
- Prompt used in code mirrors the requested template:
  - Common patterns, category win rates, hold time recommendations, risk analysis.

Relevant docs:
- Gemini API: https://ai.google.dev/gemini-api/docs
- Polymarket Gamma: https://gamma-api.polymarket.com
- Polymarket CLOB: https://clob.polymarket.com

## New/Updated Backend Endpoints
- `GET /api/wallets/leaderboard`
- `GET /api/wallets/:address/analysis`
- `GET /api/wallets/insights`
- `POST /api/wallets/sync` (optional, guarded by `SYNC_TOKEN`)
- `GET /api/markets/categories`

## Frontend Updates
- Wallet Explorer now includes:
  - Filters (time range, min profit, market category).
  - Sortable top-wallet table (Top 20).
  - Performance metrics, risk metrics, and trading behavior.
  - Profit curve, category breakdown, hold time distribution.
  - Top trades + trade history.
  - Gemini insights panel.

## Console Debugging
Logged in backend + UI for traceability:
- `[wallets] leaderboard` request params
- `[polymarket] trades page` + `[polymarket] markets page`
- `[gemini] generating insights`
- `[wallets] analysis request` (frontend)

## Environment Variables (Backend)
Core:
- `POLYMARKET_SYNC_ENABLED`, `POLYMARKET_SYNC_INTERVAL_MS`
- `POLYMARKET_MARKET_SYNC_ENABLED`, `POLYMARKET_MARKET_LIMIT`, `POLYMARKET_MARKET_PAGES`
- `POLYMARKET_TRADES_PATH`, `POLYMARKET_TRADES_DAYS`, `POLYMARKET_TRADES_LIMIT`, `POLYMARKET_TRADES_MAX_PAGES`
- `POLYMARKET_TRADES_START_PARAM`, `POLYMARKET_TRADES_END_PARAM`, `POLYMARKET_TRADES_CURSOR_PARAM`
- `POLYMARKET_TRADE_ID_FIELD`, `POLYMARKET_TRADE_WALLET_FIELD`, `POLYMARKET_TRADE_MARKET_FIELD`
- `POLYMARKET_TRADE_SIDE_FIELD`, `POLYMARKET_TRADE_PRICE_FIELD`, `POLYMARKET_TRADE_SIZE_FIELD`, `POLYMARKET_TRADE_TIMESTAMP_FIELD`
- `POLYMARKET_TRADE_MAKER_FIELD`, `POLYMARKET_TRADE_TAKER_FIELD`
- `ACTIVE_POSITION_DAYS`

Gemini:
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_API_URL`, `GEMINI_TIMEOUT_MS`, `GEMINI_INSIGHT_TTL_MINUTES`

Manual sync:
- `SYNC_TOKEN` (optional header `x-sync-token`)

## Verification Steps
1) Backend: set env vars and run `npm run dev` in `backend/`.
2) Frontend: run `npm run dev` in `frontend/`.
3) Trigger sync (optional): `POST /api/wallets/sync` with `x-sync-token`.
4) Visit `/wallets` and verify leaderboard, analytics, and insights populate.
