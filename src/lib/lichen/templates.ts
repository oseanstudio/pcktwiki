/** Note templates for worldbuilding / logging. Stored as frontmatter `template:`. */

export type NoteTemplateId =
  | 'blank'
  | 'character'
  | 'place'
  | 'event'
  | 'faction'
  | 'session'
  | 'inbox'
  | 'landing'

export interface NoteTemplate {
  id: NoteTemplateId
  label: string
  description: string
  defaultTitle: string
  /** Suggested slug prefix when creating from picker. */
  slugHint: string
  buildContent: (title: string) => string
}

function fm(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`)
  return `---\n${lines.join('\n')}\n---\n\n`
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Empty note',
    defaultTitle: 'Untitled',
    slugHint: 'untitled',
    buildContent: () => '',
  },
  {
    id: 'character',
    label: 'Character',
    description: 'Person, creature, or POV',
    defaultTitle: 'New character',
    slugHint: 'character',
    buildContent: (title) =>
      fm({
        template: 'character',
        status: 'stub',
        canon: 'main',
      }) +
      `{{infobox type=Character|name=${title}|affiliation=|status=}}\n\n` +
      `## Appearance\n\n\n## Personality\n\n\n## History\n\n\n## Relationships\n\n` +
      `<!-- Use [[rel:allied_with:slug|Label]] for typed links -->\n`,
  },
  {
    id: 'place',
    label: 'Place',
    description: 'Location, region, or landmark',
    defaultTitle: 'New place',
    slugHint: 'place',
    buildContent: (title) =>
      fm({
        template: 'place',
        status: 'stub',
        canon: 'main',
      }) +
      `{{infobox type=Place|name=${title}|region=|climate=}}\n\n` +
      `## Overview\n\n\n## Notable features\n\n\n## History\n\n`,
  },
  {
    id: 'event',
    label: 'Event',
    description: 'In-world event for the timeline',
    defaultTitle: 'New event',
    slugHint: 'event',
    buildContent: (title) =>
      fm({
        template: 'event',
        status: 'stub',
        canon: 'main',
        date: '',
        era: '',
      }) +
      `{{infobox type=Event|name=${title}|date=|era=}}\n\n` +
      `## Summary\n\n\n## Participants\n\n\n## Aftermath\n\n`,
  },
  {
    id: 'faction',
    label: 'Faction',
    description: 'House, guild, nation, or group',
    defaultTitle: 'New faction',
    slugHint: 'faction',
    buildContent: (title) =>
      fm({
        template: 'faction',
        status: 'stub',
        canon: 'main',
      }) +
      `{{infobox type=Faction|name=${title}|leader=|seat=}}\n\n` +
      `## Overview\n\n\n## Goals\n\n\n## Members\n\n`,
  },
  {
    id: 'session',
    label: 'Session log',
    description: 'Play or writing session notes',
    defaultTitle: 'Session log',
    slugHint: 'session',
    buildContent: (title) =>
      fm({
        template: 'session',
        status: 'draft',
        canon: 'main',
        date: new Date().toISOString().slice(0, 10),
      }) +
      `# ${title}\n\n## What happened\n\n\n## Characters involved\n\n\n## Open threads\n\n`,
  },
  {
    id: 'landing',
    label: 'Landing page',
    description: 'Front page built from layout sections',
    defaultTitle: 'Home',
    slugHint: 'home',
    buildContent: (title) =>
      fm({
        template: 'landing',
        status: 'draft',
      }) +
      [
        `:::hero eyebrow="Welcome" title="${title}"`,
        'One line about what this place is.',
        ':::',
        '',
        ':::grid cols=3 title="Start here"',
        ':::card title="First thing" meta="What it is"',
        '![](https://)',
        ':::',
        ':::card title="Second thing" meta="What it is"',
        '![](https://)',
        ':::',
        ':::card title="Third thing" meta="What it is"',
        '![](https://)',
        ':::',
        ':::',
        '',
        ':::split title="The main event"',
        ':::pane',
        '![](https://)',
        ':::',
        ':::pane',
        'A paragraph about the thing on the left.',
        '',
        ':::actions',
        '[Read it](https://) [Get it](https://)',
        ':::',
        ':::',
        ':::',
        '',
        ':::posts title="Recent updates"',
        ':::post date="Today" title="First update" href="/"',
        'A sentence or two of summary.',
        ':::',
        ':::',
        '',
        ':::meter title="Goal" value=15 max=100 label=supporters',
        'What happens when the goal is reached.',
        ':::',
        '',
        ':::columns cols=3 title="Credits"',
        ':::column title="First group"',
        '- Name',
        ':::',
        ':::column title="Second group"',
        '- Name',
        ':::',
        ':::',
        '',
      ].join('\n'),
  },
  {
    id: 'inbox',
    label: 'Quick capture',
    description: 'Inbox dump to file later',
    defaultTitle: 'Inbox',
    slugHint: 'inbox',
    buildContent: () =>
      fm({
        template: 'inbox',
        status: 'draft',
      }) + `## Captures\n\n- \n`,
  },
]

export function getNoteTemplate(id: string | undefined | null): NoteTemplate | null {
  if (!id) return null
  return NOTE_TEMPLATES.find((item) => item.id === id) ?? null
}

export function templateLabel(id: string | undefined | null): string | null {
  return getNoteTemplate(id)?.label ?? null
}
