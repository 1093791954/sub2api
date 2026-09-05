<template>
  <AppLayout>
    <div class="space-y-6">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
      <template v-else-if="stats">
        <UserDashboardStats
          :stats="stats"
          :balance="user?.balance || 0"
          :is-simple="authStore.isSimpleMode"
          :platform-quotas="platformQuotas"
        />
        <UserDashboardCharts
          v-model:startDate="startDate"
          v-model:endDate="endDate"
          v-model:granularity="granularity"
          :loading="loadingCharts"
          :trend="trendData"
          :models="modelStats"
          @dateRangeChange="loadDateRange"
          @granularityChange="loadCharts"
          @refresh="refreshAll"
        />
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <UserDashboardRecentUsage
              :data="recentUsage"
              :loading="loadingUsage"
            />
          </div>
          <div class="lg:col-span-1"><UserDashboardQuickActions /></div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  usageAPI,
  type UserDashboardStats as UserStatsType,
} from "@/api/usage";
import { getMyPlatformQuotas } from "@/api/user";
import AppLayout from "@/components/layout/AppLayout.vue";
import LoadingSpinner from "@/components/common/LoadingSpinner.vue";
import UserDashboardCharts from "@/components/user/dashboard/UserDashboardCharts.vue";
import UserDashboardQuickActions from "@/components/user/dashboard/UserDashboardQuickActions.vue";
import UserDashboardRecentUsage from "@/components/user/dashboard/UserDashboardRecentUsage.vue";
import UserDashboardStats from "@/components/user/dashboard/UserDashboardStats.vue";
import { useAuthStore } from "@/stores/auth";
import type {
  ModelStat,
  PlatformQuotaItem,
  TrendDataPoint,
  UsageLog,
} from "@/types";
import { formatDateLocalInput } from "@/utils/format";
import {
  readUserDashboardCache,
  writeUserDashboardCache,
} from "@/utils/userDashboardCache";

const authStore = useAuthStore();
const user = computed(() => authStore.user);
const stats = ref<UserStatsType | null>(null);
const loading = ref(true);
const loadingUsage = ref(false);
const loadingCharts = ref(false);
const trendData = ref<TrendDataPoint[]>([]);
const modelStats = ref<ModelStat[]>([]);
const recentUsage = ref<UsageLog[]>([]);
const platformQuotas = ref<PlatformQuotaItem[] | null>(null);

const startDate = ref(
  formatDateLocalInput(new Date(Date.now() - 6 * 86400000)),
);
const endDate = ref(formatDateLocalInput(new Date()));
const granularity = ref("day");

function persistCache() {
  const userId = user.value?.id;
  if (!userId || !stats.value) return;
  writeUserDashboardCache(
    userId,
    startDate.value,
    endDate.value,
    granularity.value,
    {
      stats: stats.value,
      trendData: trendData.value,
      modelStats: modelStats.value,
      recentUsage: recentUsage.value,
      platformQuotas: platformQuotas.value ?? [],
    },
  );
}

async function loadStats() {
  loading.value = stats.value === null;
  try {
    stats.value = await usageAPI.getDashboardStats();
    persistCache();
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
  } finally {
    loading.value = false;
  }
}

async function loadCharts() {
  loadingCharts.value = true;
  try {
    const snapshot = await usageAPI.getDashboardSnapshotV2({
      start_date: startDate.value,
      end_date: endDate.value,
      granularity: granularity.value as "day" | "hour",
      include_trend: true,
      include_model_stats: true,
      include_group_stats: false,
    });
    trendData.value = snapshot.trend ?? [];
    modelStats.value = snapshot.models ?? [];
    persistCache();
  } catch (error) {
    console.error("Failed to load charts:", error);
  } finally {
    loadingCharts.value = false;
  }
}

async function loadRecent() {
  loadingUsage.value = true;
  try {
    const response = await usageAPI.getByDateRange(
      startDate.value,
      endDate.value,
    );
    recentUsage.value = response.items.slice(0, 5);
    persistCache();
  } catch (error) {
    console.error("Failed to load recent usage:", error);
  } finally {
    loadingUsage.value = false;
  }
}

async function loadPlatformQuotas() {
  try {
    const data = await getMyPlatformQuotas();
    platformQuotas.value = data.platform_quotas ?? [];
    persistCache();
  } catch (error) {
    console.warn("Failed to load platform quotas:", error);
    if (platformQuotas.value === null) platformQuotas.value = [];
  }
}

function refreshAll() {
  void loadStats();
  void loadCharts();
  void loadRecent();
  void loadPlatformQuotas();
}

function loadDateRange() {
  void loadCharts();
  void loadRecent();
}

onMounted(() => {
  const userId = user.value?.id;
  if (userId) {
    const cached = readUserDashboardCache(
      userId,
      startDate.value,
      endDate.value,
      granularity.value,
    );
    if (cached) {
      stats.value = cached.stats;
      trendData.value = cached.trendData;
      modelStats.value = cached.modelStats;
      recentUsage.value = cached.recentUsage;
      platformQuotas.value = cached.platformQuotas;
      loading.value = false;
    }
  }
  refreshAll();
});
</script>
