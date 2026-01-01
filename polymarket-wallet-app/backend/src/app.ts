import express from "express";
import cors from "cors";
import walletsRouter from "./routes/wallets.js";
import marketsRouter from "./routes/markets.js";
import copyRouter from "./routes/copy.js";
import tradeRouter from "./routes/trade.js";
import { notFound, errorHandler } from "./utils/errors.js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/wallets", walletsRouter);
app.use("/api/markets", marketsRouter);
app.use("/api/copy", copyRouter);
app.use("/api/trade", tradeRouter);

app.use(notFound);
app.use(errorHandler);

export default app;