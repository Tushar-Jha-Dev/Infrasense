import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

const createAdmin = async () => {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      "Missing required environment variables: ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set."
    );
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("Missing required environment variable: MONGO_URI");
    process.exit(1);
  }

  let exitCode = 0;

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Admin already exists");
    } else {
      await User.create({
        name,
        email,
        password,
        role: "admin",
      });
      console.log(`Admin created: ${email}`);
    }
  } catch (error) {
    console.error("Failed to create admin:", error.message);
    exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    process.exit(exitCode);
  }
};

createAdmin();
