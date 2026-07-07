<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
    <div class="w-full max-w-sm">
      <h1 class="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">ADHDone</h1>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <UInput
            ref="pinInput"
            v-model="pin"
            type="password"
            placeholder="Enter PIN"
            size="lg"
            class="w-full"
            :disabled="isLoading"
            autocomplete="off"
            inputmode="numeric"
            maxlength="10"
          />
        </div>
        <UButton
          type="submit"
          color="primary"
          size="lg"
          block
          :loading="isLoading"
        >
          Sign in
        </UButton>
      </form>
      <p v-if="error" class="mt-4 text-sm text-red-500 text-center">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false });

const pin = ref('');
const error = ref('');
const isLoading = ref(false);
const pinInput = ref();

onMounted(() => {
  pinInput.value?.input?.focus();
});

async function handleLogin() {
  if (!pin.value.trim()) {
    error.value = 'PIN is required';
    return;
  }
  isLoading.value = true;
  error.value = '';

  try {
    await $fetch('/api/auth', { method: 'POST', body: { pin: pin.value } });
    await navigateTo('/');
  } catch (err: any) {
    if (err.status === 401) {
      error.value = 'Invalid PIN';
    } else {
      error.value = 'Something went wrong. Try again.';
    }
  } finally {
    isLoading.value = false;
  }
}
</script>
