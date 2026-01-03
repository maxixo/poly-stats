import "dotenv/config";
import app from "./app.js";
import { connectDb } from "./utils/db.js";
import { startIndexer } from "./workers/indexerWorker.js";
import { startPolymarketSync } from "./workers/polymarketWorker.js";

const PORT = process.env.PORT || 3001;

const start = async () => {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log(`Backend listening on ${PORT}`);
    });
    startIndexer();
    startPolymarketSync();
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

start();
