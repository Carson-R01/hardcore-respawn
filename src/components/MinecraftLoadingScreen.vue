<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

const props = defineProps<{
  /** 0-100. Omit for an indeterminate (unknown) state, shown as a static half-filled icon. */
  percent?: number
}>()

onMounted(() => {
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

function clampedPercent(): number {
  if (props.percent === undefined) return 50
  return Math.min(100, Math.max(0, props.percent))
}
</script>

<template>
  <div class="mc-loading" role="alert" aria-live="polite">
    <p class="mc-loading__percent">{{ percent !== undefined ? `${Math.round(clampedPercent())}%` : '' }}</p>

    <div class="mc-icon">
      <div class="mc-icon__slot">
        <div class="mc-icon__fill-area">
          <div class="mc-icon__fill" :style="{ height: `${clampedPercent()}%` }">
            <div class="mc-icon__fill-edge" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mc-loading {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background:
    radial-gradient(ellipse at center, #2b2b2b 0%, #0c0c0c 75%),
    repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.015) 0px,
      rgba(255, 255, 255, 0.015) 2px,
      transparent 2px,
      transparent 4px
    );
}

.mc-loading__percent {
  font-family: 'Press Start 2P', ui-monospace, monospace;
  font-size: 0.9rem;
  color: #f0f0f0;
  margin: 0;
}

.mc-icon {
  width: 168px;
  height: 168px;
  background: #000;
  padding: 10px;
  box-sizing: border-box;
  image-rendering: pixelated;
}

.mc-icon__slot {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #8b8b8b;
  border-top: 6px solid #3a3a3a;
  border-left: 6px solid #3a3a3a;
  border-bottom: 6px solid #d8d8d8;
  border-right: 6px solid #d8d8d8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mc-icon__fill-area {
  position: relative;
  width: 60%;
  height: 60%;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.mc-icon__fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: #f5f5f5;
  transition: height 0.2s steps(16);
}

.mc-icon__fill-edge {
  position: absolute;
  top: -5px;
  left: 0;
  right: 0;
  height: 5px;
  background-color: #3ad83a;
  background-image: repeating-linear-gradient(90deg, #3ad83a 0 5px, transparent 5px 10px);
}
</style>
