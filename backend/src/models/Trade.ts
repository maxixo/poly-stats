import mongoose, { InferSchemaType } from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    wallet: { type: String, index: true, required: true },
    marketId: { type: String, index: true, required: true },
    side: { type: String, enum: ["YES", "NO"], required: true },
    price: { type: Number, required: true },
    size: { type: Number, required: true },
    txHash: { type: String },
    logIndex: { type: Number },
    blockNumber: { type: Number },
    timestamp: { type: Date, required: true }
  },
  { timestamps: true }
);

tradeSchema.add({
  source: { type: String, default: "indexer", index: true },
  tradeId: { type: String, index: true },
  maker: { type: String },
  taker: { type: String }
});

tradeSchema.index(
  { txHash: 1, logIndex: 1 },
  {
    unique: true,
    partialFilterExpression: { txHash: { $exists: true }, logIndex: { $exists: true } }
  }
);
tradeSchema.index(
  { source: 1, tradeId: 1 },
  {
    unique: true,
    partialFilterExpression: { tradeId: { $exists: true } }
  }
);

export type TradeDoc = InferSchemaType<typeof tradeSchema>;

const Trade = mongoose.model<TradeDoc>("Trade", tradeSchema);

export default Trade;
