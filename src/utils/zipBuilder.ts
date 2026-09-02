import JSZip from 'jszip'
import type { VirtualFile, WorldData } from '../types'

export interface ReplacementFile {
  file: VirtualFile
  newBytes: Uint8Array
}

export interface ZipBuildOptions {
  world: WorldData
  /** Files to drop from RESET entirely (their original content is kept in BACKUP). */
  removeFiles?: VirtualFile[]
  /** Files whose RESET copy uses newBytes instead of their original content (original kept in BACKUP). */
  replaceFiles?: ReplacementFile[]
  /** Called with 0-100 as JSZip reads and packs each file. */
  onProgress?: (percent: number) => void
}

/**
 * Builds the downloadable ZIP.
 *
 * RESET/<same relative path as the source> mirrors the *entire* folder the
 * user selected. Files listed in removeFiles are left out; files listed in
 * replaceFiles are swapped for their newBytes. Everything else is copied
 * through unchanged, so it's a complete, drop-in replacement for whatever
 * folder was selected.
 *
 * BACKUP/<same relative path> contains untouched copies of exactly the
 * files that were removed or replaced, so the user can restore them if
 * needed.
 *
 * Untouched files are handed to JSZip as-is (not pre-read into
 * ArrayBuffers) so JSZip streams each one from disk during generateAsync
 * rather than holding every file's bytes in memory at once. This matters
 * once "world" can mean an entire save folder, including multi-hundred-MB
 * region files.
 */
export async function buildResetZip(options: ZipBuildOptions): Promise<Blob> {
  const { world, removeFiles = [], replaceFiles = [], onProgress } = options
  const removedPaths = new Set(removeFiles.map((f) => f.relativePath))
  const replacements = new Map(replaceFiles.map((r) => [r.file.relativePath, r.newBytes]))

  const zip = new JSZip()

  for (const vf of world.files) {
    if (removedPaths.has(vf.relativePath)) continue
    const replacement = replacements.get(vf.relativePath)
    zip.file(`RESET/${vf.relativePath}`, replacement ?? vf.file)
  }

  for (const vf of removeFiles) {
    zip.file(`BACKUP/${vf.relativePath}`, vf.file)
  }
  for (const r of replaceFiles) {
    zip.file(`BACKUP/${r.file.relativePath}`, r.file.file)
  }

  // Minecraft's own files (region/chunk data especially) are already
  // internally compressed, so re-compressing them costs a lot of time for
  // very little size benefit. STORE keeps large-world exports fast.
  return zip.generateAsync({ type: 'blob', compression: 'STORE' }, (metadata) => {
    onProgress?.(metadata.percent)
  })
}
