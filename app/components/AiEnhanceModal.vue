<template>
  <UModal v-model:open="isOpen" title="Enhance with AI" :ui="{ content: 'max-w-lg' }">
    <template #body>
      <div class="space-y-4">
        <!-- Step: Loading questions -->
        <div v-if="step === 'loading-questions'" class="flex flex-col items-center py-8 gap-3">
          <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
          <p class="text-md text-gray-500 dark:text-gray-400">Asking clarifying questions...</p>
        </div>

        <!-- Step: Questions -->
        <div v-else-if="step === 'questions'">
          <h3 class="font-medium text-gray-900 dark:text-white mb-3">Clarifying Questions</h3>
          <ul class="space-y-3 mb-4">
            <li v-for="(q, i) in questions" :key="i" class="text-md text-gray-600 dark:text-gray-300 flex gap-2">
              <span class="font-medium text-gray-900 dark:text-white shrink-0">{{ i + 1 }}.</span>
              <span>{{ q }}</span>
            </li>
          </ul>
          <UTextarea v-model="answers" placeholder="Type your answers here..." :rows="4" class="w-full" />
          <div class="flex justify-end mt-3">
            <UButton color="primary" @click="handleGenerate" :disabled="!answers.trim()">
              Generate
            </UButton>
          </div>
        </div>

        <!-- Step: Loading enhance -->
        <div v-else-if="step === 'loading-enhance'" class="flex flex-col items-center py-8 gap-3">
          <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
          <p class="text-md text-gray-500 dark:text-gray-400">Generating enhanced task...</p>
        </div>

        <!-- Step: Preview -->
        <div v-else-if="step === 'preview'">
          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Original
                Title</label>
              <p class="text-md text-red-500 line-through mt-1">{{ originalTitle }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">New
                Title</label>
              <UInput v-model="previewTitle" class="w-full mt-1" />
            </div>
            <div v-if="originalDescription">
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Original
                Description</label>
              <p class="text-md text-red-500 line-through mt-1">{{ originalDescription }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">New
                Description</label>
              <UTextarea v-model="previewDescription" :rows="4" class="w-full mt-1" />
            </div>
          </div>
          <div class="flex justify-between mt-4">
            <UButton variant="outline" color="neutral" @click="() => { step = 'questions' }">Back</UButton>
            <div class="flex gap-2">
              <UButton variant="outline" color="neutral" @click="handleRetry">Retry</UButton>
              <UButton color="primary" @click="handleApply">Apply</UButton>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="errorMsg" class="text-md text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded">
          {{ errorMsg }}
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  description?: string;
}>();

const emit = defineEmits<{
  apply: [data: { title: string; description: string }];
}>();

const isOpen = defineModel<boolean>('open', { required: true });
const step = ref<'loading-questions' | 'questions' | 'loading-enhance' | 'preview'>('loading-questions');
const questions = ref<string[]>([]);
const answers = ref('');
const previewTitle = ref('');
const previewDescription = ref('');
const originalTitle = ref(props.title);
const originalDescription = ref(props.description || '');
const errorMsg = ref('');

// Fetch questions when modal opens
watch(isOpen, async (open) => {
  if (!open) return;
  step.value = 'loading-questions';
  errorMsg.value = '';
  questions.value = [];
  answers.value = '';
  originalTitle.value = props.title;
  originalDescription.value = props.description || '';

  try {
    const res = await $fetch('/api/ai/ask', {
      method: 'POST',
      body: { title: props.title, description: props.description },
    });
    questions.value = (res as any).questions;
    if (questions.value.length === 0) {
      // No questions — go straight to enhance with empty answers
      await handleGenerate();
    } else {
      step.value = 'questions';
    }
  } catch (err: any) {
    errorMsg.value = err.statusMessage || err.message || 'Failed to get clarifying questions';
    step.value = 'questions'; // stay on questions, user can see error
  }
});

async function handleGenerate() {
  step.value = 'loading-enhance';
  errorMsg.value = '';
  try {
    const res = await $fetch('/api/ai/enhance', {
      method: 'POST',
      body: {
        title: originalTitle.value,
        description: originalDescription.value || undefined,
        answers: answers.value || 'No answers provided',
      },
    });
    previewTitle.value = (res as any).title;
    previewDescription.value = (res as any).description;
    step.value = 'preview';
  } catch (err: any) {
    errorMsg.value = err.statusMessage || err.message || 'Failed to enhance task';
    step.value = 'questions';
  }
}

async function handleRetry() {
  // Re-submit with same answers
  await handleGenerate();
}

function handleApply() {
  emit('apply', {
    title: previewTitle.value,
    description: previewDescription.value,
  });
  isOpen.value = false;
}
</script>
