import { describe, expect, it } from 'vitest'
import { buildYouTubeEmbedHtml, parseYouTubeId } from '@/lib/youtube'

describe('parseYouTubeId', () => {
  it('accepts a bare 11-character id', () => {
    expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('accepts a watch URL with extra query params', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s')).toBe('dQw4w9WgXcQ')
  })

  it('accepts a scheme-less watch URL', () => {
    expect(parseYouTubeId('youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('accepts a youtu.be short URL', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('accepts a youtu.be URL with a query string', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ')
  })

  it('accepts an embed URL', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('accepts a shorts URL', () => {
    expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('accepts a live URL', () => {
    expect(parseYouTubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('trims surrounding whitespace', () => {
    expect(parseYouTubeId('  dQw4w9WgXcQ \n')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for empty input', () => {
    expect(parseYouTubeId('')).toBeNull()
    expect(parseYouTubeId('   ')).toBeNull()
  })

  it('returns null for a too-short id', () => {
    expect(parseYouTubeId('short')).toBeNull()
  })

  it('returns null for unrelated text', () => {
    expect(parseYouTubeId('not a video link')).toBeNull()
  })

  it('returns null for a watch URL without a v param', () => {
    expect(parseYouTubeId('https://youtube.com/watch?list=PLabc')).toBeNull()
  })
})

describe('buildYouTubeEmbedHtml', () => {
  it('emits a nocookie iframe for a valid id', () => {
    const html = buildYouTubeEmbedHtml('dQw4w9WgXcQ')
    expect(html).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(html).toContain('allowfullscreen')
    expect(html).toContain('class="yt-iframe"')
  })

  it('extracts the id from a pasted URL', () => {
    expect(buildYouTubeEmbedHtml('https://youtu.be/dQw4w9WgXcQ')).toContain(
      'embed/dQw4w9WgXcQ',
    )
  })

  it('returns an empty string for garbage so the shortcode is left intact', () => {
    expect(buildYouTubeEmbedHtml('not a video')).toBe('')
  })
})
