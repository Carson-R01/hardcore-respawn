<script setup lang="ts">
import { ref } from 'vue'
import AlertBanner from './AlertBanner.vue'
import ProgressBar from './ProgressBar.vue'

const emit = defineEmits<{
  selected: [files: File[]]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isScanning = ref(false)

function setInputRef(el: Element | null) {
  const input = el as HTMLInputElement | null
  inputRef.value = input
  if (input) {
    // Not part of the standard HTMLInputElement typings, so set imperatively.
    input.setAttribute('webkitdirectory', 'true')
    input.setAttribute('directory', 'true')
  }
}

function openPicker() {
  inputRef.value?.click()
}

async function onChange(event: Event) {
  const target = event.target as HTMLInputElement
  // Copy into a plain array *before* resetting target.value below — in some
  // browsers, clearing an <input type="file">'s value also empties out the
  // live FileList that .files returns, which would silently zero out any
  // reference to it taken beforehand.
  const files = target.files ? Array.from(target.files) : []
  target.value = ''
  if (files.length === 0) return

  isScanning.value = true
  // Yield a frame so the "scanning" state paints before the (synchronous)
  // FileList processing potentially blocks the main thread for large worlds.
  await new Promise((resolve) => setTimeout(resolve, 0))
  emit('selected', files)
  isScanning.value = false
}
</script>

<template>
  <div class="world-selector">
    <AlertBanner type="info">
      Your Minecraft world is processed locally in your browser and is not uploaded anywhere.
    </AlertBanner>

    <div class="dropzone">
      <p class="dropzone__title">Select your Minecraft world folder</p>
      <p class="dropzone__hint">
        Choose the world save folder (the one containing <code>level.dat</code>), or the
        <code>playerdata</code> / <code>players/data</code> folder directly. The download you get
        back mirrors whatever you select here, so you can drop it back in as a full replacement —
        selecting just the <code>playerdata</code> folder keeps that download small and fast;
        selecting the whole world works too, but it copies everything (region files included), so
        it will take longer and use more memory for large worlds.
      </p>
      <button type="button" class="button" :disabled="isScanning" @click="openPicker">
        {{ isScanning ? 'Reading folder…' : 'Choose Folder' }}
      </button>
      <input :ref="setInputRef" type="file" class="visually-hidden" multiple @change="onChange" />
      <ProgressBar v-if="isScanning" label="Reading folder…" />
    </div>

    <p class="note">
      Works best in Chrome, Edge, or Firefox. Nothing is read from a file until it's needed — large
      world files (regions, chunks) are never loaded into memory, only their names.
    </p>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 2rem 1.5rem;
  text-align: center;
  background: var(--surface-muted);
}
.dropzone__title {
  font-weight: 600;
  font-size: 1.05rem;
  margin: 0 0 0.35rem;
}
.dropzone__hint {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0 0 1rem;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.note {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.75rem;
}
</style>
