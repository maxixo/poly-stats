import mongoose, { InferSchemaType } from "mongoose";

const tradeSchema = new mongoose.Schema(
  {
    wallet: { type: String, index: true, required: true },
    marketId: { type: String, index: true, required: true },
    side: { type: String, enum: ["YES", "NO"], required: true },
    price: { type: Number, required: true },
    size: { type: Number, required: true },
    txHash: { type: String, required: true },
    logIndex: { type: Number, required: true },
    blockNumber: { type: Number, required: true },
    timestamp: { type: Date, required: true }
  },
  { timestamps: true }
);

tradeSchema.index({ txHash: 1, logIndex: 1 }, { unique: true });

export type TradeDoc = InferSchemaType<typeof tradeSchema>;

const Trade = mongoose.model<TradeDoc>("Trade", tradeSchema);

export default Trade;