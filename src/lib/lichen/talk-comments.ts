/**
 * Lightweight talk-page threading via markdown conventions.
 * Blocks look like:
 *
 * :::comment @handle 2024-01-01T00:00:00.000Z
 * message with optional @mentions
 * :::
 */

export interface TalkComment {
  authorHandle: string
  createdAt: string
  body: string
  mentions: string[]
}

const COMMENT_RE =
  /^:::comment\s+@?([^\s]+)\s+(\S+)\s*\n([\s\S]*?)^:::\s*$/gm

export function parseTalkComments(content: string): TalkComment[] {
  const comments: TalkComment[] = []
  const re = new RegExp(COMMENT_RE.source, 'gm')
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    const body = match[3].trim()
    comments.push({
      authorHandle: match[1],
      createdAt: match[2],
      body,
      mentions: extractMentions(body),
    })
  }
  return comments
}

export function extractMentions(text: string): string[] {
  const handles = new Set<string>()
  const re = /@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9.-]+\.bsky\.social)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    handles.add(match[1].toLowerCase())
  }
  return [...handles]
}

export function appendTalkComment(
  content: string,
  authorHandle: string,
  body: string,
  createdAt = new Date().toISOString(),
): string {
  const block = `\n\n:::comment @${authorHandle} ${createdAt}\n${body.trim()}\n:::\n`
  return `${content.trimEnd()}${block}`
}

export function formatTalkCommentsMarkdown(comments: TalkComment[]): string {
  return comments
    .map(
      (comment) =>
        `:::comment @${comment.authorHandle} ${comment.createdAt}\n${comment.body}\n:::`,
    )
    .join('\n\n')
}
