import mongoose, { Schema, Document } from "mongoose";

export interface IExperience extends Document {
  title: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

const ExperienceSchema = new Schema<IExperience>({
  title: { type: String, required: true },
  organization: { type: String, required: true },
  startDate: String,
  endDate: String,
  description: String
});

export default mongoose.model<IExperience>("Experience", ExperienceSchema);