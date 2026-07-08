import { defineStore } from 'pinia';

export interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string | null;
  reminderOffsets: string;
  recurringCron: string | null;
  lastNotified: string | null;
  finishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const filter = ref<'pending' | 'finished'>('pending');
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const filteredTasks = computed(() => {
    let result = filter.value === 'finished'
      ? tasks.value.filter(t => t.finishedAt)
      : tasks.value.filter(t => !t.finishedAt);

    // Sort: deadline ascending (nulls last), then created_at descending
    return [...result].sort((a, b) => {
      if (!a.deadline && !b.deadline) return (b.createdAt || '').localeCompare(a.createdAt || '');
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  });

  async function fetchTasks() {
    isLoading.value = true;
    error.value = null;
    try {
      const show = filter.value === 'finished' ? 'finished' : 'pending';
      tasks.value = await $fetch<Task[]>('/api/tasks', { query: { show } });
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch tasks';
    } finally {
      isLoading.value = false;
    }
  }

  async function createTask(data: {
    title: string;
    description?: string;
    deadline?: string | null;
    reminderOffsets?: number[];
    recurringCron?: string | null;
  }) {
    const result = await $fetch<Task>('/api/tasks', { method: 'POST', body: data });
    tasks.value.push(result);
    return result;
  }

  async function updateTask(id: number, data: Record<string, any>) {
    const idx = tasks.value.findIndex(t => t.id === id);
    const current = idx >= 0 ? tasks.value[idx] : undefined;
    const previous = current ? { ...current } : null;

    // Optimistic update
    if (current) {
      if (data.title !== undefined) current.title = data.title;
      if (data.description !== undefined) current.description = data.description;
      if (data.deadline !== undefined) current.deadline = data.deadline;
      if (data.reminderOffsets !== undefined) {
        current.reminderOffsets = JSON.stringify(data.reminderOffsets);
      }
      if (data.recurringCron !== undefined) current.recurringCron = data.recurringCron;
      if (data.finished !== undefined) {
        current.finishedAt = data.finished ? new Date().toISOString() : null;
      }
    }

    try {
      const result = await $fetch<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: data });
      if (idx >= 0) tasks.value[idx] = result;
      return result;
    } catch (err: any) {
      // Rollback
      if (idx >= 0 && previous) tasks.value[idx] = previous;
      throw err;
    }
  }

  async function toggleComplete(id: number) {
    const task = tasks.value.find(t => t.id === id);
    if (!task) return;
    const newFinished = !task.finishedAt;
    return updateTask(id, { finished: newFinished });
  }

  return { tasks, filter, isLoading, error, filteredTasks, fetchTasks, createTask, updateTask, toggleComplete };
});
