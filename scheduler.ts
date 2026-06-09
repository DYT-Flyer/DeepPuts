import cron from "node-cron";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(__dirname, ".env.local") });

import { runRefreshCycle } from "./src/lib/scheduler/pipeline";

console.log("[scheduler] DeepPuts scheduler starting...");

// Run immediately on startup
runRefreshCycle().catch(console.error);

// Then run every 15 minutes
cron.schedule("*/15 * * * *", () => {
  runRefreshCycle().catch(console.error);
});

console.log("[scheduler] Scheduled to run every 15 minutes. Press Ctrl+C to stop.");
