import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

const IS_TURSO_CONFIGURED = !!process.env.TURSO_DATABASE_URL;

// --- DEVELOPMENT CONFIGURATION ---
// This is used for local push/migration when TURSO keys are absent.
const DEV_CONFIG = {
  dialect: 'sqlite' as const,
  dbCredentials: {
    url: 'sqlite.db', // Points to your local file
  },
};

// --- PRODUCTION CONFIGURATION ---
// This is used when TURSO keys are present (during deployment build).
const PROD_CONFIG = {
  dialect: 'turso' as const,
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
};

// Use TURSO config if keys are present, otherwise use local config
const config = IS_TURSO_CONFIGURED ? PROD_CONFIG : DEV_CONFIG;

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  // Spread the selected configuration
  ...config, 
});