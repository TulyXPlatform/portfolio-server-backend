import mongoose, { Schema, Document } from "mongoose";

export interface ISocialLink extends Document {
  platform: string;
  url: string;
  icon?: string;
}

const SocialLinkSchema = new Schema<ISocialLink>({
  platform: { type: String, required: true },
  url: { type: String, required: true },
  icon: String
});

export default mongoose.model<ISocialLink>("SocialLink", SocialLinkSchema);