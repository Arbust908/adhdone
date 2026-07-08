<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <UButton
          :variant="taskStore.filter === 'pending' ? 'solid' : 'outline'"
          :color="taskStore.filter === 'pending' ? 'primary' : 'neutral'"
          size="sm"
          @click="setFilter('pending')"
        >
          Pending
        </UButton>
        <UButton
          :variant="taskStore.filter === 'finished' ? 'solid' : 'outline'"
          :color="taskStore.filter === 'finished' ? 'primary' : 'neutral'"
          size="sm"
          @click="setFilter('finished')"
        >
          Finished
        </UButton>
      </div>
      <UButton
        v-if="taskStore.filter === 'pending'"
        icon="i-lucide-plus"
        color="primary"
        size="sm"
        @click="openCreateModal"
      >
        New Task
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="taskStore.isLoading && taskStore.tasks.length === 0" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="w-6 h-6 animate-spin text-gray-400" />
    </div>

    <!-- Empty state: no tasks at all -->
    <EmptyState
      v-else-if="taskStore.tasks.length === 0"
      icon="📝"
      title="Create your first task"
      description="You don't have any tasks yet. Start by creating one!"
    >
      <UButton icon="i-lucide-plus" color="primary" @click="openCreateModal">Create Task</UButton>
    </EmptyState>

    <!-- Empty state: all done -->
    <EmptyState
      v-else-if="taskStore.filter === 'pending' && taskStore.filteredTasks.length === 0"
      icon="🎉"
      title="All done!"
      description="You've completed all your tasks."
    >
      <UButton variant="outline" color="neutral" @click="setFilter('finished')">View finished tasks</UButton>
    </EmptyState>

    <!-- Task list -->
    <div v-else class="space-y-2">
      <TaskCard
        v-for="task in taskStore.filteredTasks"
        :key="task.id"
        :task="task"
        @edit="openEditModal"
        @toggle="handleToggle"
      />
    </div>

    <!-- Task Form Modal -->
    <TaskFormModal
      v-model:open="formModalOpen"
      :task="editingTask"
      :reminder-presets="settingsStore.settings?.reminderPresets || []"
      :is-saving="isSaving"
      @close="closeFormModal"
      @save="handleFormSave"
      @mark-done="handleMarkDone"
    />
  </div>
</template>

<script setup lang="ts">
import type { Task } from '~/stores/useTaskStore';

const taskStore = useTaskStore();
const settingsStore = useSettingsStore();

const formModalOpen = ref(false);
const editingTask = ref<Task | null>(null);
const isSaving = ref(false);

// Nuxt UI toast
const toast = useToast();

// Init: fetch data
onMounted(async () => {
  await Promise.all([
    taskStore.fetchTasks(),
    settingsStore.fetchSettings(),
  ]);
});

function setFilter(f: 'pending' | 'finished') {
  taskStore.filter = f;
  taskStore.fetchTasks();
}

function openCreateModal() {
  editingTask.value = null;
  formModalOpen.value = true;
}

function openEditModal(task: Task) {
  editingTask.value = task;
  formModalOpen.value = true;
}

function closeFormModal() {
  editingTask.value = null;
}

async function handleFormSave(data: {
  title: string;
  description: string;
  deadline: string | null;
  reminderOffsets: number[];
  recurringCron: string | null;
}) {
  isSaving.value = true;
  try {
    if (editingTask.value) {
      await taskStore.updateTask(editingTask.value.id, data);
      toast.add({ title: 'Task updated', color: 'success', duration: 2000 });
    } else {
      await taskStore.createTask(data);
      toast.add({ title: 'Task created', color: 'success', duration: 2000 });
    }
    formModalOpen.value = false;
    editingTask.value = null;
  } catch (err: any) {
    toast.add({ title: err.statusMessage || 'Something went wrong', color: 'error', duration: 3000 });
  } finally {
    isSaving.value = false;
  }
}

async function handleToggle(task: Task) {
  try {
    await taskStore.toggleComplete(task.id);
  } catch (err: any) {
    toast.add({ title: 'Failed to update task', color: 'error', duration: 3000 });
  }
}

async function handleMarkDone() {
  if (!editingTask.value) return;
  try {
    await taskStore.updateTask(editingTask.value.id, { finished: true });
    toast.add({ title: 'Task marked as done', color: 'success', duration: 2000 });
    formModalOpen.value = false;
    editingTask.value = null;
  } catch (err: any) {
    toast.add({ title: 'Failed to mark as done', color: 'error', duration: 3000 });
  }
}
</script>
