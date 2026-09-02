<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import WorldSelector from './components/WorldSelector.vue'
import PlayerLookup from './components/PlayerLookup.vue'
import ReviewAndConfirm from './components/ReviewAndConfirm.vue'
import ResultDownload from './components/ResultDownload.vue'
import AlertBanner from './components/AlertBanner.vue'
import StepIndicator from './components/StepIndicator.vue'
import ProgressBar from './components/ProgressBar.vue'
import { buildWorldData, findPlayerDataDirs, matchPlayerFiles } from './utils/worldFs'
import { buildResetZip } from './utils/zipBuilder'
import type { MojangProfile, PlayerDataDir, VirtualFile, WorldData } from './types'

type Step = 'world' | 'select-dir' | 'player' | 'review' | 'done'
type ActionMode = 'delete' | 'revive'

const step = ref<Step>('world')

const world = ref<WorldData | null>(null)
const worldError = ref<string | null>(null)
const candidateDirs = ref<PlayerDataDir[]>([])
const selectedDir = ref<PlayerDataDir | null>(null)

const profile = ref<MojangProfile | null>(null)

const processing = ref(false)
const zipProgress = ref<number | null>(null)
const zipError = ref<string | null>(null)
const zipUrl = ref<string | null>(null)
const zipFileName = ref('')
const lastActionMode = ref<ActionMode>('delete')

const matched = computed(() => {
  if (!selectedDir.value || !profile.value) return null
  return matchPlayerFiles(selectedDir.value, profile.value.uuid)
})

function onWorldSelected(files: File[]) {
  worldError.value = null
  const data = buildWorldData(files)
  world.value = data

  const dirs = findPlayerDataDirs(data)
  if (dirs.length === 0) {
    worldError.value =
      "We couldn't find a playerdata (or players/data) folder inside what you selected. " +
      "Select your world's save folder (the one containing level.dat), or select the " +
      'playerdata folder directly.'
    return
  }

  candidateDirs.value = dirs
  if (dirs.length === 1) {
    selectedDir.value = dirs[0]
    step.value = 'player'
  } else {
    step.value = 'select-dir'
  }
}

function chooseDir(dir: PlayerDataDir) {
  selectedDir.value = dir
  step.value = 'player'
}

function onProfileFound(found: MojangProfile) {
  profile.value = found
  step.value = 'review'
}

function cancelReview() {
  profile.value = null
  zipError.value = null
  step.value = 'player'
}

async function runZipBuild(buildFn: () => Promise<Blob>) {
  processing.value = true
  zipProgress.value = 0
  zipError.value = null
  try {
    const blob = await buildFn()

    // Force the bar to a visible 100% and let it actually paint before
    // switching steps. Otherwise the final update and the step change can
    // land in the same render tick and the bar never appears full.
    zipProgress.value = 100
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 350))

    if (zipUrl.value) URL.revokeObjectURL(zipUrl.value)
    zipUrl.value = URL.createObjectURL(blob)
    const verb = lastActionMode.value === 'revive' ? 'Revive' : 'Reset'
    zipFileName.value = `Hardcore-Player-${verb}-${profile.value?.username ?? 'player'}.zip`
    step.value = 'done'
  } catch {
    zipError.value = 'Failed to generate the ZIP file. You can try again, or reload the page and start over.'
  } finally {
    processing.value = false
    zipProgress.value = null
  }
}

async function confirmDelete() {
  const m = matched.value
  if (!world.value || !m) return
  const removeFiles = [m.datFile, m.datOldFile].filter((f): f is VirtualFile => !!f)
  if (removeFiles.length === 0) return

  lastActionMode.value = 'delete'
  await runZipBuild(() =>
    buildResetZip({
      world: world.value!,
      removeFiles,
      onProgress: (percent) => {
        zipProgress.value = percent
      },
    }),
  )
}

async function confirmRevive(bytes: Uint8Array) {
  const datFile = matched.value?.datFile
  if (!world.value || !datFile) return

  lastActionMode.value = 'revive'
  await runZipBuild(() =>
    buildResetZip({
      world: world.value!,
      replaceFiles: [{ file: datFile, newBytes: bytes }],
      onProgress: (percent) => {
        zipProgress.value = percent
      },
    }),
  )
}

function restart() {
  if (zipUrl.value) URL.revokeObjectURL(zipUrl.value)
  step.value = 'world'
  world.value = null
  worldError.value = null
  candidateDirs.value = []
  selectedDir.value = null
  profile.value = null
  processing.value = false
  zipProgress.value = null
  zipError.value = null
  zipUrl.value = null
  zipFileName.value = ''
  lastActionMode.value = 'delete'
}

onBeforeUnmount(() => {
  if (zipUrl.value) URL.revokeObjectURL(zipUrl.value)
})
</script>

<template>
  <main class="app">
    <header class="app-header">
      <h1><span class="app-header__icon" aria-hidden="true">💀</span>Hardcore Respawn</h1>
      <p class="subtitle">Reset one dead player's saved data in a modded Minecraft world.</p>
    </header>

    <StepIndicator :current="step" />

    <section v-if="step === 'world'" class="step">
      <h2>1. Select World Folder</h2>
      <WorldSelector @selected="onWorldSelected" />
      <AlertBanner v-if="worldError" type="error">{{ worldError }}</AlertBanner>
    </section>

    <section v-else-if="step === 'select-dir'" class="step">
      <h2>Multiple player-data folders found</h2>
      <p>Choose the one for the world this player is in:</p>
      <ul class="dir-list">
        <li v-for="dir in candidateDirs" :key="dir.dirRelativePath">
          <button type="button" class="button" @click="chooseDir(dir)">
            {{ dir.dirRelativePath }}
          </button>
        </li>
      </ul>
    </section>

    <section v-else-if="step === 'player'" class="step">
      <h2>2. Find the Player</h2>
      <PlayerLookup @found="onProfileFound" />
    </section>

    <section v-else-if="step === 'review' && profile && selectedDir" class="step">
      <h2>3. Review &amp; Confirm</h2>
      <ReviewAndConfirm
        :profile="profile"
        :dir="selectedDir"
        :dat-file="matched?.datFile"
        :dat-old-file="matched?.datOldFile"
        :processing="processing"
        @confirm-delete="confirmDelete"
        @confirm-revive="confirmRevive"
        @cancel="cancelReview"
      />
      <ProgressBar
        v-if="processing"
        :percent="zipProgress ?? undefined"
        label="Generating ZIP…"
      />
      <AlertBanner v-if="zipError" type="error">{{ zipError }}</AlertBanner>
    </section>

    <section v-else-if="step === 'done' && profile && selectedDir && world && zipUrl" class="step">
      <h2>4. Done</h2>
      <ResultDownload
        :zip-url="zipUrl"
        :zip-file-name="zipFileName"
        :profile="profile"
        :dir="selectedDir"
        :root-name="world.rootName"
        :mode="lastActionMode"
        @restart="restart"
      />
    </section>

    <footer class="app-footer">
      Your world is never uploaded. The only network request this tool makes is sending the
      username you type to a public Minecraft UUID lookup service (playerdb.co).
    </footer>
  </main>
</template>

<style scoped>
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
}
.app-header {
  margin-bottom: 1.75rem;
}
.app-header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.85rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}
.app-header__icon {
  font-size: 1.5rem;
}
.subtitle {
  margin: 0;
  color: var(--text-muted);
}
.step h2 {
  font-size: 1.15rem;
  margin: 0 0 1rem;
}
.dir-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.app-footer {
  margin-top: 2.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
