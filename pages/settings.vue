<template>
  <div>
    <div class="mb-6">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" to="/">Dashboard</UButton>
    </div>

    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>

    <div v-if="settingsStore.settings" class="space-y-8 max-w-lg">
      <!-- General -->
      <section>
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">General</h3>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
            <select
              v-model="form.timezone"
              class="w-full mt-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option v-for="tz in commonTimezones" :key="tz" :value="tz">{{ tz }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Digest Hour</label>
            <select
              v-model="form.dailyDigestHour"
              class="w-full mt-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option v-for="h in 24" :key="h - 1" :value="h - 1">
                {{ formatHour(h - 1) }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <!-- Telegram -->
      <section>
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Telegram</h3>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Chat ID</label>
            <UInput v-model="form.chatId" type="number" placeholder="Your Telegram chat ID" class="w-full mt-1" />
          </div>
          <UButton
            variant="outline"
            color="neutral"
            size="sm"
            :loading="testingNotification"
            @click="handleTestNotification"
          >
            Send test notification
          </UButton>
          <p v-if="testResult" class="text-sm" :class="testResult.success ? 'text-green-600' : 'text-red-500'">
            {{ testResult.message }}
          </p>
        </div>
      </section>

      <!-- AI -->
      <section>
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">AI Model</h3>
        <div>
          <select
            v-model="form.aiModel"
            class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="deepseek/deepseek-chat">DeepSeek-V3</option>
            <option value="deepseek/deepseek-r1">DeepSeek-R1</option>
            <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
            <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku</option>
            <option value="meta-llama/llama-4-maverick">Llama 4 Maverick</option>
          </select>
        </div>
      </section>

      <!-- Reminder Presets -->
      <section>
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Reminder Presets</h3>
        <div class="space-y-2">
          <div
            v-for="(preset, idx) in form.reminderPresets"
            :key="idx"
            class="flex items-center gap-2"
          >
            <UInput
              v-model="preset.label"
              placeholder="Label"
              size="sm"
              class="flex-1"
            />
            <UInput
              v-model.number="preset.minutes"
              type="number"
              placeholder="Minutes"
              size="sm"
              class="w-24"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="red"
              size="xs"
              @click="removePreset(idx)"
            />
          </div>
          <UButton
            variant="outline"
            color="neutral"
            size="xs"
            icon="i-lucide-plus"
            @click="addPreset"
          >
            Add preset
          </UButton>
        </div>
      </section>

      <!-- Save -->
      <div class="pt-4 border-t border-gray-200 dark:border-gray-800">
        <UButton
          color="primary"
          :loading="settingsStore.isLoading"
          @click="handleSave"
        >
          Save settings
        </UButton>
      </div>

      <!-- Notification Log -->
      <section>
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Notification Log
        </h3>
        <div v-if="logs.length === 0" class="text-sm text-gray-400">No errors logged.</div>
        <div v-else class="space-y-2">
          <div
            v-for="log in logs"
            :key="log.id"
            class="text-xs bg-gray-100 dark:bg-gray-800 rounded p-2 flex items-start gap-2"
          >
            <UBadge :color="eventTypeColor(log.eventType)" variant="soft" size="xs" class="flex-shrink-0 mt-0.5">
              {{ log.eventType }}
            </UBadge>
            <div class="flex-1 min-w-0">
              <p class="text-gray-700 dark:text-gray-300 truncate">{{ log.errorMessage }}</p>
              <p class="text-gray-400 mt-0.5">{{ formatDate(log.createdAt) }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Loading fallback -->
    <div v-else-if="settingsStore.isLoading" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-6 h-6 animate-spin text-gray-400" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReminderPreset } from '~/stores/useSettingsStore';

const settingsStore = useSettingsStore();
const toast = useToast();

const testingNotification = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);
const logs = ref<any[]>([]);

const form = reactive<{
  chatId: number | null;
  timezone: string;
  dailyDigestHour: number;
  aiModel: string;
  reminderPresets: ReminderPreset[];
}>({
  chatId: null,
  timezone: 'UTC',
  dailyDigestHour: 9,
  aiModel: 'deepseek/deepseek-chat',
  reminderPresets: [],
});

const commonTimezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
];

// Populate form from store
watch(() => settingsStore.settings, (s) => {
  if (!s) return;
  form.chatId = s.chatId;
  form.timezone = s.timezone || 'UTC';
  form.dailyDigestHour = s.dailyDigestHour ?? 9;
  form.aiModel = s.aiModel || 'deepseek/deepseek-chat';
  form.reminderPresets = JSON.parse(JSON.stringify(s.reminderPresets || []));
}, { immediate: true });

onMounted(async () => {
  await Promise.all([
    settingsStore.fetchSettings(),
    fetchLogs(),
  ]);
});

async function fetchLogs() {
  try {
    logs.value = await $fetch('/api/logs', { query: { limit: '50' } });
  } catch { /* ignore */ }
}

function formatHour(h: number): string {
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

function formatDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString();
}

function eventTypeColor(type: string): string {
  switch (type) {
    case 'daily_digest': return 'blue';
    case 'deadline_reminder': return 'amber';
    case 'recurring_reminder': return 'purple';
    case 'ai_enhance': return 'green';
    default: return 'gray';
  }
}

function addPreset() {
  form.reminderPresets.push({ label: '', minutes: 0 });
}

function removePreset(idx: number) {
  form.reminderPresets.splice(idx, 1);
}

async function handleTestNotification() {
  testingNotification.value = true;
  testResult.value = null;
  try {
    await settingsStore.sendTestNotification();
    testResult.value = { success: true, message: 'Test notification sent!' };
  } catch (err: any) {
    testResult.value = { success: false, message: err.statusMessage || 'Failed to send' };
  } finally {
    testingNotification.value = false;
  }
}

async function handleSave() {
  try {
    await settingsStore.updateSettings({
      chatId: form.chatId,
      timezone: form.timezone,
      dailyDigestHour: form.dailyDigestHour,
      aiModel: form.aiModel,
      reminderPresets: form.reminderPresets,
    });
    toast.add({ title: 'Settings saved', color: 'success', timeout: 2000 });
    await fetchLogs();
  } catch (err: any) {
    toast.add({ title: 'Failed to save settings', color: 'error', timeout: 3000 });
  }
}
</script>
