<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  current: 'world' | 'select-dir' | 'player' | 'review' | 'done'
}>()

const steps = [
  { key: 'world', label: 'Select World' },
  { key: 'player', label: 'Find Player' },
  { key: 'review', label: 'Confirm' },
  { key: 'done', label: 'Done' },
] as const

const currentIndex = computed(() => {
  const normalized = props.current === 'select-dir' ? 'world' : props.current
  return steps.findIndex((s) => s.key === normalized)
})
</script>

<template>
  <ol class="stepper">
    <li
      v-for="(s, i) in steps"
      :key="s.key"
      class="stepper__item"
      :class="{
        'stepper__item--done': i < currentIndex,
        'stepper__item--active': i === currentIndex,
      }"
    >
      <span class="stepper__dot">{{ i < currentIndex ? '✓' : i + 1 }}</span>
      <span class="stepper__label">{{ s.label }}</span>
    </li>
  </ol>
</template>

<style scoped>
.stepper {
  list-style: none;
  display: flex;
  padding: 0;
  margin: 0 0 1.75rem;
}
.stepper__item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}
.stepper__item:not(:last-child)::after {
  content: '';
  flex: 1;
  height: 2px;
  background: var(--border);
  margin: 0 0.6rem;
  transition: background-color 0.2s ease;
}
.stepper__dot {
  width: 26px;
  height: 26px;
  min-width: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 2px solid var(--border);
  color: var(--text-muted);
  font-size: 0.78rem;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}
.stepper__item--active .stepper__dot {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.stepper__item--active .stepper__label {
  color: var(--text);
}
.stepper__item--done .stepper__dot {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.stepper__item--done::after {
  background: var(--accent);
}
.stepper__label {
  white-space: nowrap;
}
@media (max-width: 560px) {
  .stepper__label {
    display: none;
  }
}
</style>
