<script setup lang="ts">
import { ref } from 'vue'
import AlertBanner from './AlertBanner.vue'
import ProgressBar from './ProgressBar.vue'
import { analyzeForRevive, buildRevivedBytes, describeGameType, type ParsedRevive } from '../utils/reviveNbt'
import type { MojangProfile, PlayerDataDir, VirtualFile } from '../types'

const props = defineProps<{
  profile: MojangProfile
  dir: PlayerDataDir
  datFile: VirtualFile | undefined
  datOldFile: VirtualFile | undefined
  processing: boolean
}>()

const emit = defineEmits<{
  'confirm-delete': []
  'confirm-revive': [bytes: Uint8Array]
  cancel: []
}>()

const avatarFailed = ref(false)

type Mode = 'delete' | 'revive'
const mode = ref<Mode>('delete')

const reviveState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const reviveError = ref<string | null>(null)
const reviveParsed = ref<ParsedRevive | null>(null)
const reviveBytes = ref<Uint8Array | null>(null)

async function loadRevivePreview() {
  const datFile = props.datFile
  if (!datFile) return
  reviveState.value = 'loading'
  reviveError.value = null
  try {
    const parsed = await analyzeForRevive(datFile.file)
    const bytes = await buildRevivedBytes(parsed)
    reviveParsed.value = parsed
    reviveBytes.value = bytes
    reviveState.value = 'ready'
  } catch (err) {
    reviveError.value = err instanceof Error ? err.message : 'Failed to read this player-data file.'
    reviveState.value = 'error'
  }
}

function selectMode(next: Mode) {
  mode.value = next
  if (next === 'revive' && reviveState.value === 'idle') {
    void loadRevivePreview()
  }
}

function confirmRevive() {
  if (reviveBytes.value) {
    emit('confirm-revive', reviveBytes.value)
  }
}

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
        {{
          datFile
            ? 'The file that was found will still be removed if you choose Delete.'
            : 'Only Delete is available here, since Revive needs an existing .dat file to edit.'
        }}
      </AlertBanner>

      <div v-if="datFile" class="mode-tabs" role="tablist">
        <button
          type="button"
          class="mode-tab"
          :class="{ 'mode-tab--active': mode === 'delete' }"
          role="tab"
          :aria-selected="mode === 'delete'"
          @click="selectMode('delete')"
        >
          Delete Data
        </button>
        <button
          type="button"
          class="mode-tab"
          :class="{ 'mode-tab--active': mode === 'revive' }"
          role="tab"
          :aria-selected="mode === 'revive'"
          @click="selectMode('revive')"
        >
          Keep Items (Revive)
        </button>
      </div>

      <div v-if="mode === 'delete'" class="confirm-box">
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
          <button type="button" class="button button--danger" :disabled="processing" @click="emit('confirm-delete')">
            {{ processing ? 'Processing…' : 'Delete Player Data' }}
          </button>
        </div>
      </div>

      <div v-else-if="datFile" class="confirm-box">
        <h4>Revive {{ profile.username }}?</h4>
        <p>
          This edits <code>{{ fileName(datFile) }}</code> directly instead of deleting it. It only
          clears the "dead" state (Spectator gamemode and 0 health left over from a Hardcore
          death) and resets the death/hurt timers. Inventory, ender chest, XP, position, and any
          mod data are left exactly as they are.
        </p>

        <ProgressBar v-if="reviveState === 'loading'" label="Reading player data…" />

        <template v-if="reviveState === 'ready' && reviveParsed">
          <ul class="revive-summary">
            <li>
              Gamemode: <code>{{ describeGameType(reviveParsed.plan.beforeGameType) }}</code>
              <template v-if="reviveParsed.plan.willChangeGameType">
                → <code>{{ describeGameType(reviveParsed.plan.afterGameType) }}</code>
              </template>
              <span v-else class="revive-summary__note">(no change needed)</span>
            </li>
            <li>
              Health: <code>{{ reviveParsed.plan.beforeHealth ?? 'unknown' }}</code>
              <template v-if="reviveParsed.plan.willChangeHealth">
                → <code>{{ reviveParsed.plan.afterHealth }}</code>
              </template>
              <span v-else class="revive-summary__note">(no change needed)</span>
            </li>
          </ul>

          <AlertBanner v-if="!reviveParsed.plan.willChangeGameType && !reviveParsed.plan.willChangeHealth" type="info">
            This player doesn't look dead in this file (not in Spectator mode, health above 0).
            Reviving will still reset their death/hurt timers, but nothing else will change.
          </AlertBanner>

          <AlertBanner v-if="reviveParsed.plan.willChangeHealth" type="warning">
            Health is set to a flat 20 (vanilla default) when reviving, since reading a
            health-boosting mod's actual max health isn't supported. If this world uses one, you
            may need to heal further afterward.
          </AlertBanner>

          <p>Your original file is never modified. A backup of it is included in the download.</p>

          <div class="button-row">
            <button type="button" class="button button--ghost" :disabled="processing" @click="emit('cancel')">
              Cancel
            </button>
            <button type="button" class="button" :disabled="processing" @click="confirmRevive">
              {{ processing ? 'Processing…' : 'Revive Player' }}
            </button>
          </div>
        </template>

        <AlertBanner v-else-if="reviveState === 'error'" type="error">
          {{ reviveError }} Only Delete is available for this file.
        </AlertBanner>
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
.mode-tabs {
  display: flex;
  gap: 1.25rem;
  margin: 1.25rem 0 0;
  border-bottom: 1px solid var(--border);
}
.mode-tab {
  appearance: none;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.6rem 0.1rem;
  margin-bottom: -1px;
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-muted);
  cursor: pointer;
}
.mode-tab:hover {
  color: var(--text);
}
.mode-tab--active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.revive-summary {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.95rem;
}
.revive-summary__note {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-left: 0.35rem;
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
