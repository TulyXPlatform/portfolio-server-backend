import mongoose, { Schema, Document } from "mongoose";

export interface IVisitor extends Document {
  ipAddress?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  isp?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  visitedAt?: Date;
}

const VisitorSchema = new Schema<IVisitor>({
  ipAddress: String,
  country: String,
  countryCode: String,
  city: String,
  region: String,
  isp: String,
  userAgent: String,
  browser: String,
  os: String,
  visitedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IVisitor>("Visitor", VisitorSchema);