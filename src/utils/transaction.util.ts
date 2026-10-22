import mongoose, { ClientSession } from "mongoose";
import { checkTransactionSupport } from "../config/database";

let loggedTransactionWarning = false;

/**
 * Runs an operation inside a MongoDB transaction if transactions are supported
 * by the active deployment (replica set / sharded cluster).
 *
 * If transactions are not supported (e.g. standalone MongoDB in development or local Docker),
 * it executes the callback directly without a session, maintaining row-level atomic guarantees
 * and preventing hard crashes.
 *
 * @param fn - Asynchronous operation to run
 * @param externalSession - Optional existing session to reuse
 */
export async function withTransaction<T>(
  fn: (session?: ClientSession) => Promise<T>,
  externalSession?: ClientSession
): Promise<T> {
  // 1. If already within an active transaction session, reuse it directly
  if (externalSession) {
    return fn(externalSession);
  }

  // 2. Check if the connected MongoDB deployment supports transactions
  const isSupported = await checkTransactionSupport();

  if (!isSupported) {
    if (!loggedTransactionWarning && process.env.NODE_ENV !== "test") {
      console.warn(
        "⚠️ [TRANSACTION] Replica set transactions are not available on this MongoDB host. Executing operation with row-level atomic guarantees."
      );
      loggedTransactionWarning = true;
    }
    return fn(undefined);
  }

  // 3. Execute inside a managed Mongoose transaction session
  const session = await mongoose.startSession();

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err: unknown) {
    // Check if error is due to standalone MongoDB error
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("Transaction numbers are only allowed on a replica set member") ||
      message.includes("transactions are not supported")
    ) {
      if (!loggedTransactionWarning) {
        console.warn(
          "⚠️ [TRANSACTION] Caught transaction unsupported error. Falling back to non-transactional execution:",
          message
        );
        loggedTransactionWarning = true;
      }
      return fn(undefined);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}
