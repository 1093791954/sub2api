import { describe, expect, it } from "vitest";
import type { UserDashboardStats } from "@/api/usage";
import {
  readUserDashboardCache,
  writeUserDashboardCache,
} from "../userDashboardCache";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const stats = {
  total_api_keys: 2,
  active_api_keys: 1,
  total_requests: 4,
  total_input_tokens: 10,
  total_output_tokens: 5,
  total_cache_creation_tokens: 0,
  total_cache_read_tokens: 0,
  total_tokens: 15,
  total_cost: 1,
  total_actual_cost: 0.5,
  today_requests: 1,
  today_input_tokens: 2,
  today_output_tokens: 1,
  today_cache_creation_tokens: 0,
  today_cache_read_tokens: 0,
  today_tokens: 3,
  today_cost: 0.2,
  today_actual_cost: 0.1,
  average_duration_ms: 500,
  rpm: 0,
  tpm: 0,
} satisfies UserDashboardStats;

describe("user dashboard cache", () => {
  it("restores only a matching user and date range", () => {
    const storage = memoryStorage();
    const data = {
      stats,
      trendData: [],
      modelStats: [],
      recentUsage: [],
      platformQuotas: [],
    };
    writeUserDashboardCache(
      7,
      "2026-08-04",
      "2026-08-10",
      "day",
      data,
      storage,
      1_000,
    );

    expect(
      readUserDashboardCache(
        7,
        "2026-08-04",
        "2026-08-10",
        "day",
        storage,
        2_000,
      )?.stats,
    ).toEqual(stats);
    expect(
      readUserDashboardCache(
        8,
        "2026-08-04",
        "2026-08-10",
        "day",
        storage,
        2_000,
      ),
    ).toBeNull();
    expect(
      readUserDashboardCache(
        7,
        "2026-08-03",
        "2026-08-10",
        "day",
        storage,
        2_000,
      ),
    ).toBeNull();
    expect(
      readUserDashboardCache(
        7,
        "2026-08-04",
        "2026-08-10",
        "hour",
        storage,
        2_000,
      ),
    ).toBeNull();
  });

  it("rejects snapshots older than seven days", () => {
    const storage = memoryStorage();
    const data = {
      stats,
      trendData: [],
      modelStats: [],
      recentUsage: [],
      platformQuotas: [],
    };
    writeUserDashboardCache(
      7,
      "2026-08-04",
      "2026-08-10",
      "day",
      data,
      storage,
      1_000,
    );

    expect(
      readUserDashboardCache(
        7,
        "2026-08-04",
        "2026-08-10",
        "day",
        storage,
        8 * 86400000,
      ),
    ).toBeNull();
  });
});
