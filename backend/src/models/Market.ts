import mongoose, { InferSchemaType } from "mongoose";

const marketSchema = new mongoose.Schema(
  {
    marketId: { type: String, unique: true, required: true, index: true },
    slug: { type: String },
    question: { type: String },
    category: { type: String },
    active: { type: Boolean },
    source: { type: String },
    lastUpdated: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

export type MarketDoc = InferSchemaType<typeof marketSchema>;

const Market = mongoose.model<MarketDoc>("Market", marketSchema);

export default Market;
