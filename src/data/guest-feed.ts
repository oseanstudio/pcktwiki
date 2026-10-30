/**
 * Guest feed curation — edit this file to choose which wikis appear in the
 * logged-out discovery feed and how they relate across PDS instances.
 *
 * Each entry is fetched live from the author's PDS when guests visit /learn
 * or the homepage feed section.
 */

export interface GuestFeedWiki {
  handle: string
  slug: string
  /** Short pitch shown in the feed and constellation map */
  blurb: string
  /** Group wikis by theme; keys match GUEST_FEED_TOPICS */
  topics: string[]
}

export interface GuestFeedRelation {
  from: { handle: string; slug: string }
  to: { handle: string; slug: string }
  /** How these wikis connect — shown on the cross-wiki map */
  label: string
}

export interface GuestFeedTopic {
  id: string
  label: string
  description: string
}

export const GUEST_FEED_TOPICS: GuestFeedTopic[] = [
  {
    id: 'at-protocol',
    label: 'AT Protocol',
    description: 'Specs, errata, and how decentralized identity works',
  },
  {
    id: 'community',
    label: 'Community wikis',
    description: 'Shared wikis built with friends, fans, and collaborators',
  },
  {
    id: 'lore',
    label: 'Worldbuilding & lore',
    description: 'Community universes and creative wikis',
  },
  {
    id: 'garden',
    label: 'Digital gardens',
    description: 'Personal knowledge bases that grow over time',
  },
  {
    id: 'personal',
    label: 'Personal wikis',
    description: 'Single-author notebooks and solo projects',
  },
  {
    id: 'getting-started',
    label: 'Getting started',
    description: 'Intro wikis for new readers and authors',
  },
]

/** Wikis included in the guest feed — add or remove entries here. */
export const GUEST_FEED_WIKIS: GuestFeedWiki[] = [
  {
    handle: 'juprodh.me',
    slug: 'welcome-to-lichen',
    blurb: 'Introduction to Lichen wikis on AT Protocol',
    topics: ['at-protocol', 'community', 'getting-started'],
  },
  {
    handle: 'mfzx.net',
    slug: 'at-protocol-paper-errata-and-details',
    blurb: 'Errata and deep dives on the AT Protocol paper',
    topics: ['at-protocol'],
  },
  {
    handle: 'stellapent.wiki',
    slug: 'stellapent-cier-community-wiki',
    blurb: 'Shared lore for the Stellapent Cier universe',
    topics: ['lore', 'community'],
  },
  {
    handle: 'rechargednintendo.eurosky.social',
    slug: 'florets-retreat',
    blurb: 'Floret\'s Retreat HDG AU wiki on a self-hosted PDS',
    topics: ['lore', 'community'],
  },
  {
    handle: 'windfreaker.dev',
    slug: 'digital-garden',
    blurb: 'A cozy personal digital garden',
    topics: ['garden', 'personal'],
  },
  {
    handle: 'myrkvi.no',
    slug: 'test',
    blurb: 'A small starter wiki for trying Lichen on your PDS',
    topics: ['getting-started', 'personal'],
  },
]

/** Curated cross-wiki connections — augment with wikilinks discovered at fetch time. */
export const GUEST_FEED_RELATIONS: GuestFeedRelation[] = [
  {
    from: { handle: 'juprodh.me', slug: 'welcome-to-lichen' },
    to: { handle: 'mfzx.net', slug: 'at-protocol-paper-errata-and-details' },
    label: 'Learn AT Protocol after Lichen basics',
  },
  {
    from: { handle: 'juprodh.me', slug: 'welcome-to-lichen' },
    to: { handle: 'windfreaker.dev', slug: 'digital-garden' },
    label: 'See a personal wiki in practice',
  },
  {
    from: { handle: 'stellapent.wiki', slug: 'stellapent-cier-community-wiki' },
    to: { handle: 'rechargednintendo.eurosky.social', slug: 'florets-retreat' },
    label: 'Another community lore wiki on a different PDS',
  },
  {
    from: { handle: 'juprodh.me', slug: 'welcome-to-lichen' },
    to: { handle: 'myrkvi.no', slug: 'test' },
    label: 'Try a small wiki after the Lichen intro',
  },
  {
    from: { handle: 'myrkvi.no', slug: 'test' },
    to: { handle: 'windfreaker.dev', slug: 'digital-garden' },
    label: 'From a starter wiki to a personal garden',
  },
]

export function wikiKey(handle: string, slug: string): string {
  return `${handle.toLowerCase()}:${slug}`
}

export function findGuestFeedWiki(handle: string, slug: string): GuestFeedWiki | undefined {
  return GUEST_FEED_WIKIS.find(
    (wiki) => wiki.handle.toLowerCase() === handle.toLowerCase() && wiki.slug === slug,
  )
}

export function getTopicById(id: string): GuestFeedTopic | undefined {
  return GUEST_FEED_TOPICS.find((topic) => topic.id === id)
}
