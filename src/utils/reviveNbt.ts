import { type NbtSpan, gunzip, gzip, readRootCompound } from './nbt'

/**
 * "Reviving" a player edits their existing .dat file instead of deleting it:
 * it only clears the state Minecraft leaves behind after a Hardcore death
 * (Spectator gamemode, 0 health) and resets the death/hurt animation
 * timers. Inventory, ender chest, XP, position, and any mod-added data are
 * never touched.
 */

const SURVIVAL_GAME_TYPE = 0
const SPECTATOR_GAME_TYPE = 3
const DEFAULT_REVIVE_HEALTH = 20

const GAME_TYPE_LABELS: Record<number, string> = {
  0: 'Survival',
  1: 'Creative',
  2: 'Adventure',
  3: 'Spectator',
}

export function describeGameType(value: number | null): string {
  if (value === null) return 'unknown'
  return GAME_TYPE_LABELS[value] ?? `unknown (${value})`
}

export interface RevivePlan {
  hasGameTypeField: boolean
  beforeGameType: number | null
  afterGameType: number | null
  beforeHealth: number | null
  afterHealth: number | null
  willChangeGameType: boolean
  willChangeHealth: boolean
}

export interface ParsedRevive {
  /** Decompressed NBT bytes, not yet patched. */
  raw: Uint8Array
  plan: RevivePlan
  fields: {
    gameType?: NbtSpan
    previousGameType?: NbtSpan
    health?: NbtSpan
    deathTime?: NbtSpan
    hurtTime?: NbtSpan
  }
}

function readRootOrThrow(raw: Uint8Array) {
  try {
    return readRootCompound(raw)
  } catch {
    throw new Error("This doesn't look like a valid Minecraft player-data file.")
  }
}

export async function analyzeForRevive(file: File): Promise<ParsedRevive> {
  const compressed = new Uint8Array(await file.arrayBuffer())

  let raw: Uint8Array
  try {
    raw = await gunzip(compressed)
  } catch (err) {
    if (err instanceof Error && err.message.includes('compression APIs')) throw err
    throw new Error("This file couldn't be read as a compressed Minecraft player-data file.")
  }

  const { view, fields: allFields } = readRootOrThrow(raw)

  const gameType = allFields.get('playerGameType')
  const previousGameType = allFields.get('previousPlayerGameType')
  const health = allFields.get('Health')
  const deathTime = allFields.get('DeathTime')
  const hurtTime = allFields.get('HurtTime')

  const beforeGameType = gameType ? view.getInt32(gameType.start, false) : null
  const beforePreviousGameType = previousGameType ? view.getInt32(previousGameType.start, false) : null
  const beforeHealth = health ? view.getFloat32(health.start, false) : null

  const willChangeGameType = beforeGameType === SPECTATOR_GAME_TYPE
  const afterGameType = willChangeGameType
    ? beforePreviousGameType !== null && beforePreviousGameType >= 0
      ? beforePreviousGameType
      : SURVIVAL_GAME_TYPE
    : beforeGameType

  const willChangeHealth = beforeHealth !== null && beforeHealth <= 0
  const afterHealth = willChangeHealth ? DEFAULT_REVIVE_HEALTH : beforeHealth

  return {
    raw,
    plan: {
      hasGameTypeField: !!gameType,
      beforeGameType,
      afterGameType,
      beforeHealth,
      afterHealth,
      willChangeGameType,
      willChangeHealth,
    },
    fields: { gameType, previousGameType, health, deathTime, hurtTime },
  }
}

/** Applies the plan computed by analyzeForRevive and returns the re-compressed .dat bytes. */
export async function buildRevivedBytes(parsed: ParsedRevive): Promise<Uint8Array> {
  const buffer = parsed.raw.slice()
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const { fields, plan } = parsed

  if (fields.gameType && plan.willChangeGameType && plan.afterGameType !== null) {
    view.setInt32(fields.gameType.start, plan.afterGameType, false)
  }
  if (fields.health && plan.willChangeHealth && plan.afterHealth !== null) {
    view.setFloat32(fields.health.start, plan.afterHealth, false)
  }
  if (fields.deathTime) {
    view.setInt16(fields.deathTime.start, 0, false)
  }
  if (fields.hurtTime) {
    view.setInt16(fields.hurtTime.start, 0, false)
  }

  return gzip(buffer)
}
