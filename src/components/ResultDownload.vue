<script setup lang="ts">
import AlertBanner from './AlertBanner.vue'
import type { MojangProfile, PlayerDataDir } from '../types'

defineProps<{
  zipUrl: string
  zipFileName: string
  profile: MojangProfile
  dir: PlayerDataDir
  rootName: string
}>()

const emit = defineEmits<{
  restart: []
}>()
</script>

<template>
  <div class="result">
    <AlertBanner type="success">
      {{ profile.username }}'s saved player data has been removed from a copy of
      <code>{{ dir.dirRelativePath }}</code>. Your original world files were never touched.
    </AlertBanner>

    <a class="button button--primary" :href="zipUrl" :download="zipFileName">
      Download {{ zipFileName }}
    </a>

    <div class="instructions">
      <h4>What to do with this ZIP</h4>
      <ol>
        <li>Unzip <code>{{ zipFileName }}</code> somewhere on your computer.</li>
        <li>
          <code>RESET/{{ rootName }}</code> is a complete copy of everything you selected, with
          only {{ profile.username }}'s player-data file(s) removed — nothing else was changed.
          You can replace the original folder you selected with this one entirely.
        </li>
        <li>
          <strong>Important:</strong> only do a full replace if nobody has played the world since
          you exported it — a full replace overwrites anything that changed since then (other
          players logging in, world progress, etc.). If you're not sure, it's safer to just
          manually delete the file(s) listed above from your live world's
          <code>{{ dir.dirRelativePath }}</code> folder instead — that has the same effect without
          touching anything else.
        </li>
        <li>
          The <code>BACKUP/</code> folder contains untouched copies of exactly the file(s) that
          were removed. Keep it — if anything looks wrong, put those files back to restore
          {{ profile.username }}'s original data.
        </li>
      </ol>
    </div>

    <button type="button" class="button button--ghost" @click="emit('restart')">Start Over</button>
  </div>
</template>

<style scoped>
.button--primary {
  display: inline-block;
  margin: 0.5rem 0 1rem;
  text-decoration: none;
}
.instructions {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  background: var(--surface-muted);
  margin-bottom: 1.25rem;
}
.instructions ol {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
}
.instructions li + li {
  margin-top: 0.6rem;
}
</style>
