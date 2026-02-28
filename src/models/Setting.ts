import mongoose, { Schema, Document } from "mongoose";

export interface ISetting extends Document {
  keyName: string;
  value: string;
}

const SettingSchema = new Schema<ISetting>({
  keyName: { type: String, required: true, unique: true },
  value: { type: String }
});

export default mongoose.model<ISetting>("Setting", SettingSchema);