import mongoose, { Schema, Document } from "mongoose";

export interface IBlogPost extends Document {
  title: string;
  summary?: string;
  content?: string;
  coverImage?: string;
  createdAt?: Date;
}

const BlogPostSchema = new Schema<IBlogPost>({
  title: { type: String, required: true },
  summary: String,
  content: String,
  coverImage: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);