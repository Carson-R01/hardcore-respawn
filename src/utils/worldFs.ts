import type { MatchedFiles, PlayerDataDir, VirtualFile, WorldData } from '../types'

/** Reads files gathered from a directory picker without loading any file contents. */
export function buildWorldData(selectedFiles: File[]): WorldData {
  const files: VirtualFile[] = []
  let rootName = ''

  for (const file of selectedFiles) {
    const withPath = file as File & { webkitRelativePath?: string }
    const relativePath = withPath.webkitRelativePath || file.name
    if (!rootName) {
      rootName = relativePath.split('/')[0] || 'world'
    }
    files.push({ relativePath, file })
  }

  return { rootName, files }
}

function isPlayerDataDirPath(dirSegments: string[]): boolean {
  const last = dirSegments[dirSegments.length - 1]?.toLowerCase()
  if (last === 'playerdata') return true
  const secondToLast = dirSegments[dirSegments.length - 2]?.toLowerCase()
  if (last === 'data' && secondToLast === 'players') return true
  return false
}

/**
 * Scans the whole selected tree for directories that look like a player-data
 * directory, recognizing both vanilla Minecraft's `playerdata/` and the
 * `players/data/` layout. Returns one entry per matching directory found.
 */
export function findPlayerDataDirs(world: WorldData): PlayerDataDir[] {
  const byDir = new Map<string, VirtualFile[]>()

  for (const vf of world.files) {
    const segments = vf.relativePath.split('/')
    if (segments.length < 2) continue
    const dirSegments = segments.slice(0, -1)
    if (!isPlayerDataDirPath(dirSegments)) continue

    const dirPath = dirSegments.join('/')
    const bucket = byDir.get(dirPath)
    if (bucket) {
      bucket.push(vf)
    } else {
      byDir.set(dirPath, [vf])
    }
  }

  return Array.from(byDir.entries()).map(([dirRelativePath, files]) => ({ dirRelativePath, files }))
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Finds the `.dat` and `.dat_old` files for a given UUID inside a player-data directory. */
export function matchPlayerFiles(dir: PlayerDataDir, uuid: string): MatchedFiles {
  if (!UUID_PATTERN.test(uuid)) {
    throw new Error(`Refusing to match against a malformed UUID: "${uuid}"`)
  }
  const lowerUuid = uuid.toLowerCase()

  let datFile: VirtualFile | undefined
  let datOldFile: VirtualFile | undefined

  for (const vf of dir.files) {
    const name = vf.relativePath.split('/').pop()?.toLowerCase()
    if (name === `${lowerUuid}.dat`) {
      datFile = vf
    } else if (name === `${lowerUuid}.dat_old`) {
      datOldFile = vf
    }
  }

  return { datFile, datOldFile }
}
