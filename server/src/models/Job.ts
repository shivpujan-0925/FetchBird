import { Schema, model, Document } from "mongoose";

export interface IJob extends Document {
  url: string;
  title?: string;
  thumbnail?: string;
  formatId?: string;
  status: "pending" | "downloading" | "merging" | "ready" | "failed";
  progress: number;
  filePath?: string;
  errorMessage?: string;
  createdAt: Date;
}

const JobSchema = new Schema<IJob>({
  url: { type: String, required: true },
  title: String,
  thumbnail: String,
  formatId: String,
  status: {
    type: String,
    enum: ["pending", "downloading", "merging", "ready", "failed"],
    default: "pending",
  },
  progress: { type: Number, default: 0 }, // 0–100
  filePath: String,
  errorMessage: String,
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // TTL index
});

export default model<IJob>("Job", JobSchema);
