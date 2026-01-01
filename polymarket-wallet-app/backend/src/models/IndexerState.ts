import mongoose, { InferSchemaType } from "mongoose";

const indexerStateSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    value: { type: String, required: true }
  },
  { timestamps: true }
);

export type IndexerStateDoc = InferSchemaType<typeof indexerStateSchema>;

const IndexerState = mongoose.model<IndexerStateDoc>("IndexerState", indexerStateSchema);

export default IndexerState;