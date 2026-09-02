/**
 * Minimal generic NBT (Named Binary Tag) reader, just enough to locate
 * specific top-level fields inside a Minecraft player-data file by byte
 * offset without needing to understand every tag's contents.
 *
 * Every tag type is still structurally skipped correctly (including
 * unknown/mod-added compounds, lists, and arrays), so walking past parts of
 * the file we don't care about can never misalign or corrupt them.
 */

export const NbtTagType = {
  End: 0,
  Byte: 1,
  Short: 2,
  Int: 3,
  Long: 4,
  Float: 5,
  Double: 6,
  ByteArray: 7,
  String: 8,
  List: 9,
  Compound: 10,
  IntArray: 11,
  LongArray: 12,
} as const

export type NbtTagType = (typeof NbtTagType)[keyof typeof NbtTagType]

export interface NbtSpan {
  type: NbtTagType
  /** Byte offset where this tag's payload starts. */
  start: number
  /** Byte offset just past this tag's payload. */
  end: number
}

/** Advances past one NBT payload of the given type, returning the offset just after it. */
export function skipNbtPayload(view: DataView, offset: number, type: NbtTagType): number {
  switch (type) {
    case NbtTagType.End:
      return offset
    case NbtTagType.Byte:
      return offset + 1
    case NbtTagType.Short:
      return offset + 2
    case NbtTagType.Int:
      return offset + 4
    case NbtTagType.Long:
      return offset + 8
    case NbtTagType.Float:
      return offset + 4
    case NbtTagType.Double:
      return offset + 8
    case NbtTagType.ByteArray: {
      const length = view.getInt32(offset, false)
      return offset + 4 + length
    }
    case NbtTagType.String: {
      const length = view.getUint16(offset, false)
      return offset + 2 + length
    }
    case NbtTagType.List: {
      const elementType = view.getUint8(offset) as NbtTagType
      const count = view.getInt32(offset + 1, false)
      let cursor = offset + 5
      if (elementType !== NbtTagType.End) {
        for (let i = 0; i < count; i++) {
          cursor = skipNbtPayload(view, cursor, elementType)
        }
      }
      return cursor
    }
    case NbtTagType.Compound: {
      let cursor = offset
      for (;;) {
        const childType = view.getUint8(cursor) as NbtTagType
        cursor += 1
        if (childType === NbtTagType.End) break
        const nameLength = view.getUint16(cursor, false)
        cursor += 2 + nameLength
        cursor = skipNbtPayload(view, cursor, childType)
      }
      return cursor
    }
    case NbtTagType.IntArray: {
      const count = view.getInt32(offset, false)
      return offset + 4 + count * 4
    }
    case NbtTagType.LongArray: {
      const count = view.getInt32(offset, false)
      return offset + 4 + count * 8
    }
    default:
      throw new Error(`Unsupported NBT tag type ${type} at byte ${offset}.`)
  }
}

/** Reads the direct named children of a compound tag whose payload starts at `offset`. */
export function readCompoundChildren(
  view: DataView,
  bytes: Uint8Array,
  offset: number,
): { fields: Map<string, NbtSpan>; end: number } {
  const fields = new Map<string, NbtSpan>()
  const decoder = new TextDecoder('utf-8')
  let cursor = offset
  for (;;) {
    const childType = view.getUint8(cursor) as NbtTagType
    cursor += 1
    if (childType === NbtTagType.End) break
    const nameLength = view.getUint16(cursor, false)
    cursor += 2
    const name = decoder.decode(bytes.subarray(cursor, cursor + nameLength))
    cursor += nameLength
    const start = cursor
    const end = skipNbtPayload(view, cursor, childType)
    fields.set(name, { type: childType, start, end })
    cursor = end
  }
  return { fields, end: cursor }
}

/** Parses an NBT file's root compound tag, returning its direct children by name. */
export function readRootCompound(bytes: Uint8Array): { view: DataView; fields: Map<string, NbtSpan> } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const rootType = view.getUint8(0) as NbtTagType
  if (rootType !== NbtTagType.Compound) {
    throw new Error('Root NBT tag is not a compound.')
  }
  const rootNameLength = view.getUint16(1, false)
  const childrenStart = 1 + 2 + rootNameLength
  const { fields } = readCompoundChildren(view, bytes, childrenStart)
  return { view, fields }
}

function assertCompressionStreamsSupported() {
  if (typeof DecompressionStream === 'undefined' || typeof CompressionStream === 'undefined') {
    throw new Error(
      'Your browser does not support the compression APIs this needs. Try a recent Chrome, Edge, or Firefox, or use the Delete option instead.',
    )
  }
}

export async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  assertCompressionStreamsSupported()
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function gzip(data: Uint8Array): Promise<Uint8Array> {
  assertCompressionStreamsSupported()
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
