import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log("✅ MongoDB connected");
    } catch (error) {
        console.error("❌ MongoDB connection failed", error);
        process.exit(1);
    }
};