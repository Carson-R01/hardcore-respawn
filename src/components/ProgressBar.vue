<script setup lang="ts">
defineProps<{
  /** 0-100. Omit for an indeterminate (unknown-duration) bar. */
  percent?: number
  label?: string
}>()

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value))
}
</script>

<template>
  <div
    class="progress"
    role="progressbar"
    :aria-valuenow="percent !== undefined ? Math.round(percent) : undefined"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div v-if="label" class="progress__label">
      <span>{{ label }}</span>
      <span v-if="percent !== undefined">{{ Math.round(percent) }}%</span>
    </div>
    <div class="progress__track">
      <div
        class="progress__fill"
        :class="{ 'progress__fill--indeterminate': percent === undefined }"
        :style="percent !== undefined ? { width: `${clamp(percent)}%` } : undefined"
      />
    </div>
  </div>
</template>

<style scoped>
.progress {
  margin: 0.85rem 0;
}
.progress__label {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0 0 0.4rem;
}
.progress__track {
  height: 8px;
  border-radius: 999px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  overflow: hidden;
}
.progress__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  transition: width 0.25s ease;
}
.progress__fill--indeterminate {
  width: 35%;
  animation: progress-indeterminate 1.15s ease-in-out infinite;
}
@keyframes progress-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(285%);
  }
}
</style>
