import { Pool } from "pg";

import { env } from "./env.js";

// Shared by better-auth and the instance-settings reader. Lives in its own
// module so settings.ts can be imported by auth.ts without a cycle.
export const authPool = new Pool({
  connectionString: env.DATABASE_URL,
});
