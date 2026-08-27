<script setup lang="ts">
import { ref } from 'vue'
import AlertBanner from './AlertBanner.vue'
import type { MojangProfile, PlayerDataDir, VirtualFile } from '../types'

defineProps<{
  profile: MojangProfile
  dir: PlayerDataDir
  datFile: VirtualFile | undefined
  datOldFile: VirtualFile | undefined
  processing: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const avatarFailed = ref(false)

function fileName(vf: VirtualFile): string {
  return vf.relativePath.split('/').pop() ?? vf.relativePath
}
</script>

<template>
  <div class="review">
    <h3>Player Found</h3>
    <div class="profile-header">
      <img
        v-if="profile.avatarUrl && !avatarFailed"
        :src="profile.avatarUrl"
        :alt="`${profile.username}'s Minecraft avatar`"
        class="avatar"
        width="56"
        height="56"
        @error="avatarFailed = true"
      />
      <div v-else class="avatar avatar--placeholder" aria-hidden="true">?</div>
      <dl class="profile-summary">
        <dt>Username</dt>
        <dd>{{ profile.username }}</dd>
        <dt>UUID</dt>
        <dd><code>{{ profile.uuid }}</code></dd>
      </dl>
    </div>

    <template v-if="datFile || datOldFile">
      <h4>Files found</h4>
      <ul class="file-list">
        <li v-if="datFile"><code>{{ datFile.relativePath }}</code></li>
        <li v-if="datOldFile"><code>{{ datOldFile.relativePath }}</code></li>
      </ul>

      <AlertBanner v-if="!datFile || !datOldFile" type="warning">
        Only one of the two player files was found. That's normal:
        {{ !datFile ? 'no .dat file exists yet for this player' : 'no .dat_old backup exists yet' }}.
        The file that was found will still be removed.
      </AlertBanner>

      <div class="confirm-box">
        <h4>Reset {{ profile.username }}?</h4>
        <p>The following files will be removed from the repaired copy:</p>
        <ul class="file-list">
          <li v-if="datFile"><code>{{ fileName(datFile) }}</code></li>
          <li v-if="datOldFile"><code>{{ fileName(datOldFile) }}</code></li>
        </ul>
        <p>
          This will reset this player's saved data. Their inventory, XP, position, health,
          gamemode, ender chest, and any mod data stored in these files will be lost and recreated
          fresh the next time they join.
        </p>
        <p>Your original world files are never modified. A backup of these exact files is included in the download.</p>
        <div class="button-row">
          <button type="button" class="button button--ghost" :disabled="processing" @click="emit('cancel')">
            Cancel
          </button>
          <button type="button" class="button button--danger" :disabled="processing" @click="emit('confirm')">
            {{ processing ? 'Processing…' : 'Reset Player' }}
          </button>
        </div>
      </div>
    </template>

    <AlertBanner v-else type="error">
      No saved data was found for {{ profile.username }} ({{ profile.uuid }}) in
      <code>{{ dir.dirRelativePath }}</code>. This player may not have joined this world yet, or
      their data may already have been reset. Nothing will be changed.
    </AlertBanner>
  </div>
</template>

<style scoped>
.profile-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.5rem 0 1rem;
}
.avatar {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
  image-rendering: pixelated;
}
.avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 1.4rem;
}
.profile-summary {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 1rem;
  row-gap: 0.3rem;
  margin: 0;
}
.profile-summary dt {
  color: var(--text-muted);
}
.profile-summary dd {
  margin: 0;
}
.file-list {
  margin: 0.25rem 0 1rem;
  padding-left: 1.25rem;
}
.confirm-box {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  background: var(--surface-muted);
  margin-top: 1rem;
}
.button-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}
</style>
