<script setup lang="ts">
import { ref } from 'vue'
import AlertBanner from './AlertBanner.vue'
import ProgressBar from './ProgressBar.vue'
import { lookupPlayerUuid, MojangLookupError } from '../api/mojang'
import type { MojangProfile } from '../types'

const emit = defineEmits<{
  found: [profile: MojangProfile]
}>()

const username = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)

async function submit() {
  if (loading.value) return
  errorMessage.value = null

  const trimmed = username.value.trim()
  if (!trimmed) {
    errorMessage.value = 'Enter a Minecraft username first.'
    return
  }

  loading.value = true
  try {
    const profile = await lookupPlayerUuid(trimmed)
    emit('found', profile)
  } catch (err) {
    errorMessage.value =
      err instanceof MojangLookupError
        ? err.message
        : 'Something went wrong looking up that username. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="player-lookup">
    <label class="field-label" for="mc-username">Minecraft Username</label>
    <div class="lookup-row">
      <input
        id="mc-username"
        v-model="username"
        type="text"
        placeholder="ExamplePlayer"
        autocomplete="off"
        maxlength="16"
        :disabled="loading"
        @keyup.enter="submit"
      />
      <button type="button" class="button" :disabled="loading" @click="submit">
        {{ loading ? 'Looking up…' : 'Look Up UUID' }}
      </button>
    </div>
    <ProgressBar v-if="loading" label="Looking up UUID…" />
    <AlertBanner v-if="errorMessage" type="error">{{ errorMessage }}</AlertBanner>
  </div>
</template>

<style scoped>
.field-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.4rem;
}
.lookup-row {
  display: flex;
  gap: 0.5rem;
}
.lookup-row input {
  flex: 1;
}
</style>
