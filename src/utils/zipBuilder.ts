import JSZip from 'jszip'
import type { VirtualFile, WorldData } from '../types'

export interface ZipBuildOptions {
  world: WorldData
  datFile?: VirtualFile
  datOldFile?: VirtualFile
  /** Called with 0-100 as JSZip reads and packs each file. */
  onProgress?: (percent: number) => void
}

/**
 * Builds the downloadable ZIP.
 *
 * RESET/<same relative path as the source> mirrors the *entire* folder the
 * user selected, with only the target player's files removed — so it's a
 * complete, drop-in replacement for whatever folder was selected.
 *
 * BACKUP/<same relative path> contains untouched copies of exactly the
 * files that were removed, so the user can restore them if needed.
 *
 * Files are handed to JSZip as-is (not pre-read into ArrayBuffers) so JSZip
 * streams each one from disk during generateAsync rather than holding every
 * file's bytes in memory at once — important once "world" can mean an
 * entire save folder, including multi-hundred-MB region files.
 */
export async function buildResetZip(options: ZipBuildOptions): Promise<Blob> {
  const { world, datFile, datOldFile, onProgress } = options
  const removed = [datFile, datOldFile].filter((f): f is VirtualFile => f !== undefined)
  const removedPaths = new Set(removed.map((f) => f.relativePath))

  const zip = new JSZip()

  for (const vf of world.files) {
    if (removedPaths.has(vf.relativePath)) continue
    zip.file(`RESET/${vf.relativePath}`, vf.file)
  }

  for (const vf of removed) {
    zip.file(`BACKUP/${vf.relativePath}`, vf.file)
  }

  // Minecraft's own files (region/chunk data especially) are already
  // internally compressed, so re-compressing them costs a lot of time for
  // very little size benefit. STORE keeps large-world exports fast.
  return zip.generateAsync({ type: 'blob', compression: 'STORE' }, (metadata) => {
    onProgress?.(metadata.percent)
  })
}
