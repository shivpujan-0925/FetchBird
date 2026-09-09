import mongoose from "mongoose";

let mongod: any = null;

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/fetchbird";

  try {
    // Attempt standard connection with a short timeout to avoid blocking on startup
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] Connected successfully to MongoDB at ${uri}`);
  } catch (err: any) {
    console.warn(`[Database] Could not connect to primary MongoDB (${err.message}). Starting in-memory fallback...`);
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log(`[Database] Connected to in-memory fallback MongoDB at ${memUri}`);
    } catch (memErr: any) {
      console.error("[Database] Failed to initialize in-memory database:", memErr);
      throw memErr;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}
