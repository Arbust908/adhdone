import { defineStore } from 'pinia';

export interface ReminderPreset {
  label: string;
  minutes: number;
}

export interface Settings {
  id: number;
  chatId: number | null;
  timezone: string;
  dailyDigestHour: number;
  aiModel: string;
  reminderPresets: ReminderPreset[];
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSettings() {
    isLoading.value = true;
    error.value = null;
    try {
      settings.value = await $fetch<Settings>('/api/settings');
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch settings';
    } finally {
      isLoading.value = false;
    }
  }

  async function updateSettings(data: Partial<Settings>) {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await $fetch<Settings>('/api/settings', { method: 'PATCH', body: data });
      settings.value = result;
      return result;
    } catch (err: any) {
      error.value = err.message || 'Failed to update settings';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function sendTestNotification() {
    await $fetch('/api/telegram-test', { method: 'POST' });
  }

  return { settings, isLoading, error, fetchSettings, updateSettings, sendTestNotification };
});
