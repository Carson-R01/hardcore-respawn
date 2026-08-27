<script setup lang="ts">
defineProps<{
  type?: 'error' | 'warning' | 'info' | 'success'
}>()
</script>

<template>
  <div class="alert" :class="`alert--${type ?? 'info'}`">
    <slot />
  </div>
</template>

<style scoped>
.alert {
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.925rem;
  line-height: 1.5;
  border: 1px solid transparent;
  margin: 0.75rem 0;
}
.alert :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
.alert--info {
  background: var(--alert-info-bg);
  border-color: var(--alert-info-border);
  color: var(--alert-info-text);
}
.alert--success {
  background: var(--alert-success-bg);
  border-color: var(--alert-success-border);
  color: var(--alert-success-text);
}
.alert--warning {
  background: var(--alert-warning-bg);
  border-color: var(--alert-warning-border);
  color: var(--alert-warning-text);
}
.alert--error {
  background: var(--alert-error-bg);
  border-color: var(--alert-error-border);
  color: var(--alert-error-text);
}
</style>
