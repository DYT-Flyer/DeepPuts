import cron from "node-cron";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(__dirname, ".env.local") });

import { runRefreshCycle } from "./src/lib/scheduler/pipeline";

let isRunning = false;
let isShuttingDown = false;

async function executeCycle() {
  if (isShuttingDown) {
    console.log("[scheduler] Skipping cycle due to shutdown.");
    return;
  }
  
  if (isRunning) {
    console.warn("[scheduler] Previous cycle is still running. Skipping this interval.");
    return;
  }

  isRunning = true;
  try {
    await runRefreshCycle();
  } catch (error) {
    console.error("[scheduler] Error during refresh cycle:", error);
  } finally {
    isRunning = false;
    if (isShuttingDown) {
      console.log("[scheduler] Final cycle completed. Exiting safely.");
      process.exit(0);
    }
  }
}

console.log("[scheduler] DeepPuts scheduler starting...");

// Run immediately on startup
executeCycle();

// Then run every 15 minutes
const task = cron.schedule("*/15 * * * *", () => {
  executeCycle();
});

console.log("[scheduler] Scheduled to run every 15 minutes. Press Ctrl+C to stop.");

// Graceful Shutdown
function handleShutdown(signal: string) {
  console.log(`\n[scheduler] Received ${signal}. Initiating graceful shutdown...`);
  isShuttingDown = true;
  task.stop();

  if (!isRunning) {
    console.log("[scheduler] No active cycle running. Exiting immediately.");
    process.exit(0);
  } else {
    console.log("[scheduler] Waiting for active cycle to finish before exiting...");
    // The finally block in executeCycle will handle the process.exit(0)
    
    // Safety timeout to prevent hanging indefinitely
    setTimeout(() => {
      console.error("[scheduler] Graceful shutdown timed out after 60s. Force exiting.");
      process.exit(1);
    }, 60000);
  }
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
