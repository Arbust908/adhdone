<template>
  <UModal
    v-model:open="isOpen"
    :title="isEditing ? 'Edit Task' : 'New Task'"
    :ui="{ content: 'max-w-lg' }"
    @update:open="handleClose"
  >
    <template #body>
      <!-- Finished banner -->
      <div
        v-if="isEditing && task?.finishedAt"
        class="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded text-sm text-amber-800 dark:text-amber-200"
      >
        This task was completed. Editing will reopen it.
      </div>

      <form @submit.prevent="handleSave" class="space-y-4">
        <!-- Title -->
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Title <span class="text-red-500">*</span></label>
          <UInput
            ref="titleInput"
            v-model="form.title"
            placeholder="What needs to be done?"
            class="w-full mt-1"
            :class="{ 'ring-red-500': titleError }"
          />
          <p v-if="titleError" class="text-xs text-red-500 mt-1">{{ titleError }}</p>
        </div>

        <!-- Description -->
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <UTextarea
            v-model="form.description"
            placeholder="Add details..."
            :rows="3"
            class="w-full mt-1"
          />
        </div>

        <!-- AI Enhance button -->
        <UButton
          type="button"
          variant="outline"
          color="neutral"
          icon="i-lucide-sparkles"
          block
          @click="aiModalOpen = true"
        >
          Enhance with AI
        </UButton>

        <!-- Collapsible: Deadline -->
        <div>
          <button
            type="button"
            class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            @click="showDeadline = !showDeadline"
          >
            <UIcon :name="showDeadline ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="w-4 h-4" />
            📅 Add deadline
          </button>
          <div v-if="showDeadline" class="mt-2">
            <UInput v-model="form.deadline" type="datetime-local" class="w-full" />
          </div>
        </div>

        <!-- Collapsible: Reminders -->
        <div>
          <button
            type="button"
            class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            @click="showReminders = !showReminders"
          >
            <UIcon :name="showReminders ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="w-4 h-4" />
            🔔 Set reminders
          </button>
          <div v-if="showReminders" class="mt-2 space-y-2">
            <div v-if="!reminderPresets.length" class="text-sm text-gray-400">No reminder presets configured. Add them in Settings.</div>
            <label
              v-for="preset in reminderPresets"
              :key="preset.minutes"
              class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="form.reminderOffsets.includes(preset.minutes)"
                @change="toggleReminder(preset.minutes)"
                class="rounded border-gray-300 dark:border-gray-600"
              />
              {{ preset.label }}
            </label>
          </div>
        </div>

        <!-- Collapsible: Recurring -->
        <div>
          <button
            type="button"
            class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            @click="showRecurring = !showRecurring"
          >
            <UIcon :name="showRecurring ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="w-4 h-4" />
            🔄 Make recurring
          </button>
          <div v-if="showRecurring" class="mt-2 space-y-2">
            <!-- Shortcut buttons -->
            <div class="flex gap-1.5 flex-wrap">
              <UButton
                v-for="shortcut in shortcuts"
                :key="shortcut.label"
                type="button"
                size="xs"
                :variant="shortcut.active ? 'solid' : 'outline'"
                :color="shortcut.active ? 'primary' : 'neutral'"
                @click="shortcut.apply"
              >
                {{ shortcut.label }}
              </UButton>
            </div>
            <!-- Day checkboxes -->
            <div class="flex gap-1.5 flex-wrap">
              <UButton
                v-for="day in days"
                :key="day.value"
                type="button"
                size="xs"
                :variant="recurringDays.includes(day.value) ? 'solid' : 'outline'"
                :color="recurringDays.includes(day.value) ? 'primary' : 'neutral'"
                @click="toggleDay(day.value)"
              >
                {{ day.label }}
              </UButton>
            </div>
            <!-- Hour dropdown -->
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500">at</span>
              <select
                v-model="recurringHour"
                class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option v-for="h in 24" :key="h - 1" :value="h - 1">
                  {{ formatHour(h - 1) }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <UButton variant="ghost" color="neutral" @click="handleClose">Cancel</UButton>
        <div class="flex gap-2">
          <UButton
            v-if="isEditing && !task?.finishedAt"
            variant="outline"
            color="green"
            @click="handleMarkDoneAndClose"
          >
            Mark Done
          </UButton>
          <UButton color="primary" @click="handleSave" :loading="isSaving">
            {{ isEditing ? 'Save' : 'Create Task' }}
          </UButton>
        </div>
      </div>
    </template>

    <!-- Nested AI modal -->
    <AiEnhanceModal
      v-model:open="aiModalOpen"
      :title="form.title || 'Task'"
      :description="form.description || undefined"
      @apply="handleAiApply"
    />
  </UModal>
</template>

<script setup lang="ts">
import type { Task } from '~/stores/useTaskStore';
import type { ReminderPreset } from '~/stores/useSettingsStore';

const props = defineProps<{
  task?: Task | null;
  reminderPresets: ReminderPreset[];
  isSaving?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [data: {
    title: string;
    description: string;
    deadline: string | null;
    reminderOffsets: number[];
    recurringCron: string | null;
  }];
  markDone: [];
}>();

const isOpen = defineModel<boolean>('open', { required: true });
const isEditing = computed(() => !!props.task);

const titleInput = ref();
const form = reactive({
  title: '',
  description: '',
  deadline: '',
  reminderOffsets: [] as number[],
});

const titleError = ref('');
const showDeadline = ref(false);
const showReminders = ref(false);
const showRecurring = ref(false);
const aiModalOpen = ref(false);

const recurringDays = ref<number[]>([]);
const recurringHour = ref(9);

const days = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 6 },
];

const shortcuts = computed(() => [
  {
    label: 'All',
    active: recurringDays.value.length === 7,
    apply: () => recurringDays.value = [0, 1, 2, 3, 4, 5, 6],
  },
  {
    label: 'Weekdays',
    active: recurringDays.value.length === 5 && !recurringDays.value.includes(5) && !recurringDays.value.includes(6),
    apply: () => recurringDays.value = [0, 1, 2, 3, 4],
  },
  {
    label: 'Weekends',
    active: recurringDays.value.length === 2 && recurringDays.value.includes(5) && recurringDays.value.includes(6),
    apply: () => recurringDays.value = [5, 6],
  },
  {
    label: 'Clear',
    active: recurringDays.value.length === 0,
    apply: () => recurringDays.value = [],
  },
]);

// Populate form when editing
watch(() => props.task, (t) => {
  if (t) {
    form.title = t.title;
    form.description = t.description || '';
    form.deadline = t.deadline ? t.deadline.slice(0, 16) : ''; // datetime-local format
    try { form.reminderOffsets = JSON.parse(t.reminderOffsets || '[]'); }
    catch { form.reminderOffsets = []; }

    // Parse recurring cron
    if (t.recurringCron) {
      showRecurring.value = true;
      const parts = t.recurringCron.split(' ');
      if (parts.length >= 5) {
        recurringHour.value = parseInt(parts[1]) || 9;
        const dayField = parts[4];
        if (dayField === '*') {
          recurringDays.value = [0, 1, 2, 3, 4, 5, 6];
        } else if (dayField.includes(',')) {
          recurringDays.value = dayField.split(',').map(Number);
        } else if (dayField.includes('-')) {
          const [start, end] = dayField.split('-').map(Number);
          recurringDays.value = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        } else {
          recurringDays.value = [parseInt(dayField)];
        }
      }
    }

    if (t.deadline) showDeadline.value = true;
    if (form.reminderOffsets.length > 0) showReminders.value = true;
  } else {
    form.title = '';
    form.description = '';
    form.deadline = '';
    form.reminderOffsets = [];
    recurringDays.value = [];
    recurringHour.value = 9;
    showDeadline.value = false;
    showReminders.value = false;
    showRecurring.value = false;
  }
  titleError.value = '';

  nextTick(() => {
    titleInput.value?.input?.focus();
  });
}, { immediate: true });

function toggleReminder(minutes: number) {
  const idx = form.reminderOffsets.indexOf(minutes);
  if (idx >= 0) {
    form.reminderOffsets.splice(idx, 1);
  } else {
    form.reminderOffsets.push(minutes);
  }
}

function toggleDay(day: number) {
  const idx = recurringDays.value.indexOf(day);
  if (idx >= 0) {
    recurringDays.value.splice(idx, 1);
  } else {
    recurringDays.value.push(day);
  }
}

function buildCron(): string | null {
  if (recurringDays.value.length === 0) return null;
  const daysStr = recurringDays.value.sort((a, b) => a - b).join(',');
  return `0 ${recurringHour.value} * * ${daysStr}`;
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function isDirty(): boolean {
  if (!props.task) {
    // Create mode: dirty if title or description has any content
    return !!form.title.trim() || !!form.description.trim() || !!form.deadline || form.reminderOffsets.length > 0 || recurringDays.value.length > 0;
  }
  // Edit mode: compare with original
  const t = props.task;
  const origReminders = (() => { try { return JSON.parse(t.reminderOffsets || '[]'); } catch { return []; } })();
  const deadlineChanged = form.deadline !== (t.deadline ? t.deadline.slice(0, 16) : '');
  const remindersChanged = JSON.stringify([...form.reminderOffsets].sort()) !== JSON.stringify([...origReminders].sort());
  const cronChanged = buildCron() !== t.recurringCron;

  return form.title !== t.title
    || form.description !== (t.description || '')
    || deadlineChanged
    || remindersChanged
    || cronChanged;
}

function handleClose() {
  if (isDirty()) {
    if (!confirm('You have unsaved changes. Close without saving?')) return;
  }
  isOpen.value = false;
  emit('close');
}

function handleSave() {
  titleError.value = '';
  if (!form.title.trim()) {
    titleError.value = 'Title is required';
    return;
  }
  emit('save', {
    title: form.title.trim(),
    description: form.description.trim(),
    deadline: form.deadline || null,
    reminderOffsets: [...form.reminderOffsets],
    recurringCron: buildCron(),
  });
}

function handleMarkDoneAndClose() {
  emit('markDone');
}

function handleAiApply(data: { title: string; description: string }) {
  form.title = data.title;
  form.description = data.description;
}
</script>
