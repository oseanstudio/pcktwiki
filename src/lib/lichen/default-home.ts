export function defaultHomeContent(wikiName: string): string {
  const title = wikiName.trim() || 'your wiki'
  return `# Welcome to ${title}

This wiki uses [Lichen](https://lichen.wiki/) records on AT Protocol.

## Get started

- Link articles with [[wikilinks]] and [[Category:Topics]]
- Every save creates a revision diff in your PDS
- Embed your [[blog|pckt.blog posts]] if you publish on pckt.blog
- Use \`talk:note-slug\` for discussions and \`{{infobox key=value}}\` for sidebars

Your data is portable — it lives in your account, not on our servers.`
}
