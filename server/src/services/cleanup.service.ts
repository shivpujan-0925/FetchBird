import fs from "fs";
import path from "path";

export async function cleanupExpiredFiles(): Promise<number> {
  const tempDir = path.resolve(process.env.TEMP_DIR || "./tmp");
  const ttlMinutes = Number(process.env.FILE_TTL_MINUTES || 60);
  const ttlMs = ttlMinutes * 60 * 1000;
  const now = Date.now();

  if (!fs.existsSync(tempDir)) {
    return 0;
  }

  let deletedCount = 0;
  try {
    const files = await fs.promises.readdir(tempDir);

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.isFile()) {
          const fileAgeMs = now - stats.mtimeMs;
          if (fileAgeMs > ttlMs) {
            await fs.promises.unlink(filePath);
            deletedCount++;
            console.log(`[Cleanup] Deleted expired file: ${file} (age: ${Math.round(fileAgeMs / 60000)}m)`);
          }
        }
      } catch (fileErr) {
        console.warn(`[Cleanup] Could not inspect file ${file}:`, fileErr);
      }
    }
  } catch (err) {
    console.error("[Cleanup] Error during directory scan:", err);
  }

  return deletedCount;
}

export function startCleanupScheduler(intervalMinutes = 15): NodeJS.Timeout {
  console.log(`[Cleanup] Scheduler active. Checking for expired files every ${intervalMinutes} minutes.`);
  // Run on startup
  cleanupExpiredFiles().catch((err) => console.error("[Cleanup] Initial sweep failed:", err));

  return setInterval(() => {
    cleanupExpiredFiles().catch((err) => console.error("[Cleanup] Sweep failed:", err));
  }, intervalMinutes * 60 * 1000);
}
