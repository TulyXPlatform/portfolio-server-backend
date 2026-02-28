import mongoose, { Schema, Document } from "mongoose";

export interface ISkill extends Document {
  name: string;
  logo?: string;
  category: "good_at" | "know";
}

const SkillSchema = new Schema<ISkill>({
  name: { type: String, required: true },
  logo: String,
  category: { type: String, enum: ["good_at", "know"], required: true }
});

export default mongoose.model<ISkill>("Skill", SkillSchema);