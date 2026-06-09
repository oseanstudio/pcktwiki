import { BrowserOAuthClient, type OAuthSession } from '@atproto/oauth-client-browser'
import { Agent } from '@atproto/api'
import { getOAuthConfig } from '@/lib/config'

const SESSION_SUB_KEY = 'pckt.wiki.sessionSub'

let oauthClient: BrowserOAuthClient | null = null
let activeSession: OAuthSession | null = null

export async function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (oauthClient) return oauthClient

  const config = getOAuthConfig()

  if (import.meta.env.DEV) {
    oauthClient = new BrowserOAuthClient({
      handleResolver: config.handleResolver,
      clientMetadata: undefined,
    })
  } else {
    oauthClient = await BrowserOAuthClient.load({
      clientId: config.clientId,
      handleResolver: config.handleResolver,
    })
  }

  return oauthClient
}

export async function initializeAuth(): Promise<{
  session: OAuthSession
  agent: Agent
  did: string
  handle: string | null
} | null> {
  const client = await getOAuthClient()
  const result = await client.init()

  if (result?.session) {
    activeSession = result.session
    localStorage.setItem(SESSION_SUB_KEY, result.session.sub)
    const agent = new Agent(result.session)
    const handle = await fetchHandle(agent)
    return {
      session: result.session,
      agent,
      did: agent.accountDid,
      handle,
    }
  }

  return null
}

async function fetchHandle(agent: Agent): Promise<string | null> {
  try {
    const profile = await agent.getProfile({ actor: agent.accountDid })
    return profile.data.handle ?? null
  } catch {
    return null
  }
}

export async function signIn(handle: string): Promise<void> {
  const client = await getOAuthClient()
  await client.signInRedirect(handle)
}

export async function signOut(): Promise<void> {
  if (activeSession) {
    await activeSession.signOut()
    activeSession = null
  }
  localStorage.removeItem(SESSION_SUB_KEY)
}

export async function getAuthenticatedAgent(): Promise<Agent | null> {
  if (activeSession) {
    return new Agent(activeSession)
  }

  const storedSub = localStorage.getItem(SESSION_SUB_KEY)
  if (!storedSub) return null

  try {
    const client = await getOAuthClient()
    const session = await client.restore(storedSub)
    activeSession = session
    return new Agent(session)
  } catch {
    localStorage.removeItem(SESSION_SUB_KEY)
    return null
  }
}

export async function resolveHandleToDid(handle: string): Promise<string> {
  const agent = getPublicAgent()
  const resolved = await agent.resolveHandle({ handle: normalizeHandle(handle) })
  return resolved.data.did
}

function normalizeHandle(handle: string): string {
  return handle.startsWith('@') ? handle.slice(1) : handle
}

export function getPublicAgent(): Agent {
  return new Agent('https://public.api.bsky.app')
}

export function generateRecordKey(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
