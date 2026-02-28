import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  title: string;
  shortDescription?: string;
  description?: string;
  image?: string;
  images?: string[];
  liveLink?: string;
  githubLink?: string;
  tags?: string[];
  createdAt?: Date;
}

const ProjectSchema = new Schema<IProject>({
  title: { type: String, required: true },
  shortDescription: String,
  description: String,
  image: String,
  images: [String],
  liveLink: String,
  githubLink: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IProject>("Project", ProjectSchema);