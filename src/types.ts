export interface VirtualFile {
  /** Path relative to the folder the user selected, using '/' separators. */
  relativePath: string
  file: File
}

export interface WorldData {
  rootName: string
  files: VirtualFile[]
}

export interface PlayerDataDir {
  /** Path (relative to the selected folder) of the discovered playerdata / players/data directory. */
  dirRelativePath: string
  /** Files found directly inside that directory. */
  files: VirtualFile[]
}

export interface MojangProfile {
  username: string
  uuid: string
  /** Rendered face/avatar image URL, if the lookup service provided one. */
  avatarUrl?: string
}

export interface MatchedFiles {
  datFile?: VirtualFile
  datOldFile?: VirtualFile
}
