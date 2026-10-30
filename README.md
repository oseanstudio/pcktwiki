# pckt.wiki

Your personal wiki on the open social web — a sister app to [pckt.blog](https://pckt.blog), built on the same AT Protocol lexicons as [Lichen](https://lichen.wiki/).

## Lichen-compatible records

Everything that makes up a wiki is stored in the [Lichen lexicons](https://tangled.org/juprodh.me/lichen.wiki), unchanged:

| Collection | Purpose |
|---|---|
| `wiki.lichen.wiki` | Wiki metadata (name, visibility, language) |
| `wiki.lichen.note` | Notes (slug + title; content lives in revisions) |
| `wiki.lichen.noteRevision` | Content stored as diff-match-patch diffs |
| `wiki.lichen.membership` | Access control (admin / contributor / viewer) |
| `wiki.lichen.memberRequest` | Requests to join a wiki |

Wikis created here interoperate with [lichen.wiki](https://lichen.wiki/) and any other app using these records.

### pckt lexicons

Features Lichen has no record type for get their own namespace rather than
inventing names inside `wiki.lichen.*`, which pckt does not own:

| Collection | Purpose |
|---|---|
| `wiki.pckt.bookmark` | Portable wiki follows (synced when watching) |
| `wiki.pckt.mapProgress` | Per-reader fog-of-war map discoveries |
| `wiki.pckt.policy` | Per-wiki collaboration policy (who can propose, image rules) |
| `wiki.pckt.pageGrant` | Per-article permission grants for individual members |
| `wiki.pckt.suggestion` | Proposed edits / photo submissions filed in the author's repo |
| `wiki.pckt.approvedMedia` | Photos approved for embedding in a wiki |

### Collaboration & permissions

AT Protocol repos have a single writer, and every wiki record lives in the
wiki owner's repo — so the owner publishes, and everyone else contributes by
suggestion: proposed edits and photo submissions are written as
`wiki.pckt.suggestion` records in each contributor's own repo (discovered via
Constellation backlinks) and published by the owner from the wiki's
**Suggested edits** review queue. Settings → Collaboration controls:

- **Who can propose edits** — members only, members + people the owner follows
  (checked against the Bluesky follow graph), or anyone signed in.
- **Edit-on-approval** — contributors' edits queue for review; admins and
  per-article admins approve/reject with a visual diff.
- **Photo ladder** — contributors may embed any photo, only photos from the
  wiki's approved library (`wiki.pckt.approvedMedia`), or none (text-only).
  Separately, photo *submissions* can be accepted for approval even when
  direct embedding is off; approving one copies the blob from the author's
  PDS into the wiki's repo.
- **Article permissions** — `wiki.pckt.pageGrant` gives one person a role on
  one article (admin / editor / suggester / viewer), overriding the wiki-wide
  policy for that page.

## Features

### Wiki core
- **Wikilinks & backlinks** — `[[note-slug]]`, `[[label|note]]`, `[[@handle/wiki/note]]`
- **Revision history** — every save writes a `wiki.lichen.noteRevision` diff; visual diff view
- **Edit summaries** — optional `message` on each revision (Wikipedia-style)
- **Table of contents** — auto-generated from headings
- **Categories** — `[[Category:Name]]` or YAML frontmatter
- **Redirects** — frontmatter `redirect: slug` or `redirect: slug` as first line
- **Infoboxes** — `{{infobox key=value|key2=value2}}` in note body
- **Talk pages** — notes with slug `talk:note-slug` (discussion)
- **Search** — full-text search within a wiki
- **Recent changes** — wiki-wide activity feed
- **Random note** — discovery button
- **Watchlist & bookmarks** — local watchlist + `wiki.pckt.bookmark` on your PDS
- **Follow feed** — aggregated activity from watched wikis at `/feed`
- **Wiki library** — owned, forked, watched, cached, and local drafts at `/library`
- **Membership invites** — handle typeahead, join requests (`wiki.lichen.memberRequest`), invite links
- **Collaboration policy** — propose access for members / followers / anyone, photo ladder, approved-media library
- **Edit-on-approval** — outside contributions queue as `wiki.pckt.suggestion` records for owner review
- **Article permissions** — per-note grants (`wiki.pckt.pageGrant`) with admin / editor / suggester / viewer roles
- **Note templates** — Character / Place / Event / Faction / Session / Inbox starters
- **Maintenance** — wanted pages, stubs, drafts, orphan notes
- **Suggest edits** — per-note review branches with accept/reject
- **Relationships & timeline** — `[[rel:type:slug]]` graph + event chronology
- **Canon filters** — `canon: main|au|spoilers` with reader toggle
- **Fork sync** — 3-way merge UI, batch accept, manual conflict editor
- **Branch notes** — slug convention `branch:parent/branch-name` with merge-to-main
- **Export/import** — `.pcktwiki.zip` portable bundles (markdown + static HTML/CSS site)
- **AT-URI permalinks** — copy canonical `at://` links from the wiki toolbar
- **Theme packs** — preset skins + export/import JSON theme packs
- **Media library** — scan wiki images, upload blobs to your PDS
- **Offline read cache** — pin wikis for offline reading (IndexedDB)
- **Local draft wikis** — create without signing in; publish on login
- **Mirror snapshots** — static JSON fallbacks (`npm run build:mirrors`)

### pckt-specific
- **pckt.blog sync** — create wiki stubs from blog posts via `blog-path` frontmatter
- **Bidirectional blog links** — blog embed shows “Wiki notes” when a stub exists
- **Lichen badge** — interoperable with lichen.wiki
- **Share to Bluesky** — intent link with OG meta tags on public notes
- **Offline edit queue** — PWA queues saves and syncs to your PDS when back online

### Platform
- **Access control** — public/private wikis with membership roles
- **Firehose sync** — Jetstream WebSocket updates while viewing a wiki
- **PWA** — installable, offline shell, GitHub Pages deploy

## Content conventions (no new lexicon types)

All extensions live in note **content** or use existing note **slug** / revision **message** fields:

```markdown
---
redirect: canonical-slug
categories:
  - Recipes
status: draft
template: character
canon: main
date: 1247-03-12
era: Age of Ash
map-x: 42
map-y: 58
map-reveal: 12
map-unlock: 2026-12-01
map-teaser: A broken spire
map-image: /ow-map.webp
map-fog: dark
blog-path: /posts/my-post
---

[[Category:Recipes]]

{{infobox name=Tiramisu|type=Recipe}}

# My note

Link to [[other-note]] and [[@handle/wiki/note]].
Typed relationship: [[rel:allied_with:house-vale|House Vale]].
Embed a blurb: {{embed:character-slug#Appearance}}
```

| Convention | Purpose |
|---|---|
| YAML frontmatter | `redirect`, `categories`, `status`, `template`, `canon`, `date`, `era`, `map-x`/`map-y`, `blog-path` |
| Map fog of war | `map-reveal` (reveal radius, % of map width), `map-locked` / `map-unlock` (canon release gate), `map-teaser` (hint shown while undiscovered), `map-fog` (fog colour — set `dark` for art on a black ground) |
| Map image | `map-image` accepts an `https://` URL, a root-relative site asset (`/ow-map.webp`), or a PDS blob CID |
| `[[Category:Name]]` | Category tag (links to category browse) |
| `{{infobox key=value}}` | Sidebar infobox |
| `[[rel:type:slug]]` | Typed relationship edge |
| `{{embed:slug}}` / `{{embed:slug#Heading}}` | Transclude note (or section) |
| `talk:slug` note slug | Discussion page for `slug` |
| `:::comment @handle ISO…` blocks | Threaded talk comments |
| `branch:parent/name` note slug | Editable branch; merge to main from editor |
| `branch:parent/suggestion-*` | Proposed edit awaiting review |
| Revision `message` | Edit summary (existing Lichen field) |

## Development

```bash
npm install
npm run dev
npm run build:mirrors   # optional: build public/mirrors/*.json fallbacks
```

Use `http://127.0.0.1:5173` (not `localhost`) for AT Protocol OAuth loopback —
dev signs in with AT Protocol's loopback client, so no deployment URL is needed.

## Run your own copy

Fork the repo and the app deploys under your own name — with or without a domain
of your own. One value decides everything: **the URL the site is served from**.
Vite's base path, the PWA manifest, the OAuth client id, and the `CNAME` file are
all derived from it, so there is nothing else to keep in sync.

### On GitHub Pages, without buying a domain

1. Fork this repository.
2. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the *Deploy to GitHub Pages* workflow by hand).

Your wiki is live at `https://<you>.github.io/<repo>/`. The workflow asks GitHub
where the site is published and builds for that exact URL, including the `/<repo>/`
subpath — no configuration, no edits to any file.

### With your own domain

1. Point DNS at GitHub Pages ([their instructions](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)).
2. Enter the domain under **Settings → Pages → Custom domain**.
3. Re-run the deploy workflow.

The same detection now reports your domain instead, and the build serves from `/`
and writes a matching `CNAME`. Moving between a project page and a domain later
is just a re-run — nothing in the repository names either one.

### Somewhere else (Netlify, Cloudflare Pages, your own server)

Set `VITE_SITE_URL` to the deployed URL and build:

```bash
VITE_SITE_URL=https://my.wiki/ npm run build
```

Serve `dist/` with an SPA fallback to `index.html` (`dist/404.html` is a copy, which
is what makes deep links work on GitHub Pages). See [`.env.example`](.env.example)
for the other build-time options.

### Why the URL matters

Signing in uses AT Protocol OAuth, where the client id *is* a URL: your PDS fetches
`<your site>/client-metadata.json` and refuses the login if the document does not
describe the site asking for it. That file is generated at build time from
`VITE_SITE_URL` rather than committed, which is what lets a fork deploy anywhere
without a hardcoded `pckt.wiki` breaking sign-in.

### Donations (optional)

The site can carry a live `/donate` page — one-time and monthly support through
Stripe, live totals, and a supporters wall where donors who opt in appear with
their name or company, in the style of fund.blender.org. The wiki itself is
static, so payments run through a tiny companion API (Cloudflare Worker + D1)
that fronts Stripe; see [`worker/README.md`](worker/README.md) for setup. Without
`VITE_DONATIONS_API_URL` the page and its nav link simply don't ship.

## Reference

- [Lichen source](https://tangled.org/juprodh.me/lichen.wiki)
- Lexicon definitions in [`lexicons/`](lexicons/)

## License

MIT
