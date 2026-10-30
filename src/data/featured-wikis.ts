export type {
  DidYouKnowItem,
  FeaturedWiki,
  FeaturedWikiDetail,
  FeaturedWikiHighlight,
  FeaturedWikiReference,
  PortalWikiSelection,
  WikiPortalStats,
} from '@/lib/lichen/featured-wiki-loader'

export {
  accentColorForSlug,
  buildDidYouKnowItem,
  buildFeaturedWikiDetail,
  buildPortalWikiSelection,
  findCachedFeaturedWiki,
  getCachedFeaturedWikis,
  getDidYouKnowItems,
  getFeaturedWiki,
  getSpotlightWikis,
  getWikiPortalStats,
  growingWikis,
  listFeaturedWikiReferences,
  listSpotlightReferences,
  loadFeaturedWikis,
  notePath,
  parseFeaturedWikiHandle,
  shuffledCopy,
  sortWikisByNoteCount,
  wikiPath,
} from '@/lib/lichen/featured-wiki-loader'

export {
  FEATURED_SPOTLIGHT_HANDLES,
  FEATURED_WIKI_HANDLES,
  type FeaturedWikiHandle,
} from '@/data/featured-wiki-catalog'
