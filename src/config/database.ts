import mongoose from "mongoose";
import env from "./env";

interface DatabaseStatus {
  isConnected: boolean;
  supportsTransactions: boolean;
  readyState: number;
  host?: string;
  name?: string;
}

let supportsTransactions: boolean | null = null;

/**
 * Checks whether the connected MongoDB instance supports multi-document transactions.
 * Multi-document transactions require a replica set or sharded cluster (mongos).
 */
export async function checkTransactionSupport(): Promise<boolean> {
  if (supportsTransactions !== null) {
    return supportsTransactions;
  }

  try {
    const adminDb = mongoose.connection.db?.admin();
    if (!adminDb) {
      supportsTransactions = false;
      return false;
    }

    const serverStatus = await adminDb.serverStatus();
    // ReplSet present indicates replica set support
    supportsTransactions = Boolean(serverStatus.repl || serverStatus.msg === "isdbgrid");
    return supportsTransactions;
  } catch (err) {
    // If command is not allowed or fails, test via a dry-run session
    try {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await session.abortTransaction();
        supportsTransactions = true;
      } catch {
        supportsTransactions = false;
      } finally {
        await session.endSession();
      }
      return supportsTransactions;
    } catch {
      supportsTransactions = false;
      return false;
    }
  }
}

/**
 * Connects to MongoDB with production-grade pool and retry settings.
 */
export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Prevent multiple connection attempts
  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve, reject) => {
      mongoose.connection.once("connected", () => resolve(mongoose));
      mongoose.connection.once("error", reject);
    });
  }

  const options: mongoose.ConnectOptions = {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  try {
    await mongoose.connect(env.MONGODB_URI, options);
    
    // Check transaction capability asynchronously without blocking startup
    checkTransactionSupport()
      .then((supported) => {
        if (!supported && env.NODE_ENV !== "test") {
          console.warn(
            "⚠️ [DATABASE] Connected MongoDB instance does not support replica set transactions. Cleanup operations will run with row-level atomic guarantees and safe fallback."
          );
        }
      })
      .catch(() => {});

    return mongoose;
  } catch (error) {
    console.error("❌ [DATABASE] Failed to connect to MongoDB:", error);
    throw error;
  }
}

/**
 * Gracefully disconnects the MongoDB connection.
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    supportsTransactions = null;
  }
}

/**
 * Returns current database health and connection state.
 */
export function getDatabaseStatus(): DatabaseStatus {
  return {
    isConnected: mongoose.connection.readyState === 1,
    supportsTransactions: supportsTransactions ?? false,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
}

// Global connection event handlers for operational visibility
mongoose.connection.on("connected", () => {
  if (env.NODE_ENV !== "test") {
    console.log(`✅ [DATABASE] Connected to MongoDB database: ${mongoose.connection.name}`);
  }
});

mongoose.connection.on("error", (err) => {
  console.error("❌ [DATABASE] MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  if (env.NODE_ENV !== "test") {
    console.log("ℹ️ [DATABASE] MongoDB disconnected");
  }
});
