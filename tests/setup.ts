/**
 * Vitest global setup file
 * Runs before all tests
 */

import { config } from "dotenv";
import path from "node:path";

// Load test environment variables
config({ path: path.resolve(__dirname, "../.env.test") });

// Global test setup
export function setup() {
  // Set test environment
  process.env.NODE_ENV = "test";

  // Suppress console output in tests (optional)
  if (process.env.SUPPRESS_TEST_LOGS === "true") {
    global.console = {
      ...console,
      log: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
  }
}

// Global test teardown
export function teardown() {
  // Cleanup after all tests
}
