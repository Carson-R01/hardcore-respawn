import type { MojangProfile } from '../types'

export type MojangLookupErrorType = 'not-found' | 'rate-limited' | 'network' | 'invalid-username' | 'unknown'

export class MojangLookupError extends Error {
  type: MojangLookupErrorType

  constructor(type: MojangLookupErrorType, message: string) {
    super(message)
    this.type = type
    this.name = 'MojangLookupError'
  }
}

interface PlayerDbResponse {
  code?: string
  message?: string
  success?: boolean
  data?: {
    player?: {
      id?: string
      username?: string
      avatar?: string
    }
  }
}

/**
 * Resolves a Minecraft Java username to its UUID.
 *
 * Uses playerdb.co (a CORS-enabled public wrapper around Mojang's profile
 * lookup) instead of api.mojang.com directly, since Mojang's API does not
 * send CORS headers and can't be called from a browser.
 */
export async function lookupPlayerUuid(username: string): Promise<MojangProfile> {
  const trimmed = username.trim()
  if (!/^[A-Za-z0-9_]{1,16}$/.test(trimmed)) {
    throw new MojangLookupError(
      'invalid-username',
      'That doesn\'t look like a valid Minecraft username (1-16 letters, numbers, or underscores).',
    )
  }

  let response: Response
  try {
    response = await fetch(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(trimmed)}`, {
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new MojangLookupError(
      'network',
      'Could not reach the Minecraft username lookup service. Check your internet connection and try again.',
    )
  }

  if (response.status === 429) {
    throw new MojangLookupError('rate-limited', 'The lookup service is rate-limiting requests right now. Wait a moment and try again.')
  }

  let body: PlayerDbResponse | null = null
  try {
    body = (await response.json()) as PlayerDbResponse
  } catch {
    // fall through, handled below
  }

  if (response.status === 404 || body?.code === 'player.not_found') {
    throw new MojangLookupError('not-found', `No Minecraft account named "${trimmed}" was found.`)
  }

  if (!response.ok || body?.success === false || !body) {
    throw new MojangLookupError(
      'unknown',
      body?.message || `The lookup service returned an unexpected error (HTTP ${response.status}).`,
    )
  }

  const uuid = body.data?.player?.id
  if (!uuid) {
    throw new MojangLookupError('unknown', 'The lookup service response did not include a UUID.')
  }

  return {
    username: body.data?.player?.username || trimmed,
    uuid: uuid.toLowerCase(),
    avatarUrl: body.data?.player?.avatar,
  }
}
