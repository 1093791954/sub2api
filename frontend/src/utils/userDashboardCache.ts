import type { UserDashboardStats } from "@/api/usage";
import type {
  ModelStat,
  PlatformQuotaItem,
  TrendDataPoint,
  UsageLog,
} from "@/types";

const CACHE_VERSION = 1;
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_KEY_PREFIX = "sub2api.user-dashboard.v1.";

export interface UserDashboardCacheData {
  stats: UserDashboardStats;
  trendData: TrendDataPoint[];
  modelStats: ModelStat[];
  recentUsage: UsageLog[];
  platformQuotas: PlatformQuotaItem[];
}

interface UserDashboardCacheRecord extends UserDashboardCacheData {
  version: number;
  userId: number;
  cachedAt: number;
  startDate: string;
  endDate: string;
  granularity: string;
}

type DashboardCacheStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

function defaultStorage(): DashboardCacheStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function cacheKey(userId: number): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

export function readUserDashboardCache(
  userId: number,
  startDate: string,
  endDate: string,
  granularity: string,
  storage: DashboardCacheStorage | null = defaultStorage(),
  now = Date.now(),
): UserDashboardCacheData | null {
  if (!storage || !Number.isInteger(userId) || userId <= 0) return null;
  try {
    const raw = storage.getItem(cacheKey(userId));
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<UserDashboardCacheRecord>;
    const age = now - Number(cached.cachedAt);
    if (
      cached.version !== CACHE_VERSION ||
      cached.userId !== userId ||
      cached.startDate !== startDate ||
      cached.endDate !== endDate ||
      cached.granularity !== granularity ||
      !cached.stats ||
      !Array.isArray(cached.trendData) ||
      !Array.isArray(cached.modelStats) ||
      !Array.isArray(cached.recentUsage) ||
      !Array.isArray(cached.platformQuotas) ||
      !Number.isFinite(age) ||
      age < 0 ||
      age > MAX_CACHE_AGE_MS
    ) {
      return null;
    }
    return {
      stats: cached.stats,
      trendData: cached.trendData,
      modelStats: cached.modelStats,
      recentUsage: cached.recentUsage,
      platformQuotas: cached.platformQuotas,
    };
  } catch {
    storage.removeItem(cacheKey(userId));
    return null;
  }
}

export function writeUserDashboardCache(
  userId: number,
  startDate: string,
  endDate: string,
  granularity: string,
  data: UserDashboardCacheData,
  storage: DashboardCacheStorage | null = defaultStorage(),
  now = Date.now(),
): void {
  if (!storage || !Number.isInteger(userId) || userId <= 0) return;
  try {
    const record: UserDashboardCacheRecord = {
      version: CACHE_VERSION,
      userId,
      cachedAt: now,
      startDate,
      endDate,
      granularity,
      ...data,
    };
    storage.setItem(cacheKey(userId), JSON.stringify(record));
  } catch {
    // The live dashboard remains authoritative if storage is unavailable.
  }
}
