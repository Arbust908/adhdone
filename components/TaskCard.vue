<template>
  <div
    class="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 transition-shadow hover:shadow-sm cursor-pointer"
    :class="{ 'opacity-60': task.finishedAt }"
    @click="$emit('edit', task)"
  >
    <div class="flex items-start gap-3">
      <!-- Checkbox -->
      <button
        class="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center"
        :class="task.finishedAt
          ? 'bg-green-500 border-green-500 text-white'
          : 'border-gray-300 dark:border-gray-600 hover:border-green-400'"
        @click.stop="$emit('toggle', task)"
        :aria-label="task.finishedAt ? 'Mark as pending' : 'Mark as finished'"
      >
        <span v-if="task.finishedAt" class="text-xs">✓</span>
      </button>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-gray-900 dark:text-white truncate" :class="{ 'line-through': task.finishedAt }">
          {{ task.title }}
        </h3>
        <p
          v-if="task.description"
          class="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2"
        >
          {{ task.description }}
        </p>

        <!-- Badges -->
        <div class="flex flex-wrap items-center gap-1.5 mt-2">
          <!-- Recurring badge -->
          <UBadge v-if="task.recurringCron" color="purple" variant="soft" size="xs">
            🔄 Recurring
          </UBadge>

          <!-- Deadline badge -->
          <UBadge
            v-if="task.deadline && !task.finishedAt"
            :color="deadlineColor"
            variant="soft"
            size="xs"
          >
            {{ deadlineLabel }}
          </UBadge>

          <!-- Reminder badge -->
          <UBadge
            v-if="hasReminders && !task.finishedAt"
            color="amber"
            variant="soft"
            size="xs"
          >
            🔔 {{ parsedOffsets.length }} reminder{{ parsedOffsets.length > 1 ? 's' : '' }}
          </UBadge>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Task } from '~/stores/useTaskStore';

const props = defineProps<{ task: Task }>();
defineEmits<{ edit: [task: Task]; toggle: [task: Task] }>();

const parsedOffsets = computed(() => {
  try { return JSON.parse(props.task.reminderOffsets || '[]'); }
  catch { return []; }
});

const hasReminders = computed(() => parsedOffsets.value.length > 0);

const deadlineColor = computed(() => {
  if (!props.task.deadline) return 'blue';
  const dl = new Date(props.task.deadline);
  const now = new Date();
  const diffHours = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) return 'red';       // overdue
  if (diffHours < 6) return 'amber';     // soon (< 6h)
  return 'blue';                          // upcoming
});

const deadlineLabel = computed(() => {
  if (!props.task.deadline) return '';
  const dl = new Date(props.task.deadline);
  const now = new Date();
  const diffHours = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) {
    const days = Math.abs(Math.round(diffHours / 24));
    return days > 0 ? `${days}d overdue` : 'Overdue';
  }
  if (diffHours < 1) return '< 1h left';
  if (diffHours < 24) return `${Math.round(diffHours)}h left`;

  // Show date
  return dl.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
});
</script>
