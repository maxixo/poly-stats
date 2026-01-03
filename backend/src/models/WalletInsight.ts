import mongoose, { InferSchemaType } from "mongoose";

const walletInsightSchema = new mongoose.Schema(
  {
    scope: { type: String, required: true, index: true },
    wallet: { type: String, index: true },
    rangeStart: { type: Date, required: true },
    rangeEnd: { type: Date, required: true },
    rangeDays: { type: Number },
    model: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

walletInsightSchema.index({ scope: 1, wallet: 1, rangeStart: 1, rangeEnd: 1 });

export type WalletInsightDoc = InferSchemaType<typeof walletInsightSchema>;

const WalletInsight = mongoose.model<WalletInsightDoc>("WalletInsight", walletInsightSchema);

export default WalletInsight;
