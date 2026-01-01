import mongoose, { InferSchemaType } from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    follower: { type: String, index: true, required: true },
    leader: { type: String, index: true, required: true },
    riskMultiplier: { type: Number, default: 1 },
    maxSlippageBps: { type: Number, default: 50 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

subscriptionSchema.index({ follower: 1, leader: 1 }, { unique: true });

export type SubscriptionDoc = InferSchemaType<typeof subscriptionSchema>;

const Subscription = mongoose.model<SubscriptionDoc>("Subscription", subscriptionSchema);

export default Subscription;