import { describe, expect, it } from 'vitest'
import { applyAction, type EditorActionId } from '@/lib/editor/actions'

/** Apply an action and return the resulting document plus where the caret ends. */
function run(doc: string, from: number, to: number, id: EditorActionId) {
  const patch = applyAction(doc, from, to, id)
  return {
    text: doc.slice(0, patch.from) + patch.insert + doc.slice(patch.to),
    collapsed: patch.selectionStart === patch.selectionEnd,
    caret: patch.selectionStart,
    selected: patch.insert.slice(
      patch.selectionStart - patch.from,
      patch.selectionEnd - patch.from,
    ),
  }
}

describe('headings on a blank line', () => {
  it('arms the marker so typing continues inside it', () => {
    const result = run('', 0, 0, 'h2')
    expect(result.text).toBe('## ')
    // A selection here would mean the next keystroke replaces the marker.
    expect(result.collapsed).toBe(true)
    expect(result.caret).toBe(3)
  })

  it('handles each level', () => {
    expect(run('', 0, 0, 'h1').text).toBe('# ')
    expect(run('', 0, 0, 'h3').text).toBe('### ')
  })

  it('preserves indentation', () => {
    expect(run('  ', 2, 2, 'h2').text).toBe('  ## ')
  })

  it('works on a blank line after existing text', () => {
    const result = run('Intro\n', 6, 6, 'h2')
    expect(result.text).toBe('Intro\n## ')
    expect(result.collapsed).toBe(true)
  })
})

describe('headings on text', () => {
  it('adds the marker', () => {
    expect(run('Title', 0, 0, 'h2').text).toBe('## Title')
  })

  it('toggles off at the same level', () => {
    expect(run('## Title', 0, 0, 'h2').text).toBe('Title')
  })

  it('switches level rather than stacking markers', () => {
    expect(run('## Title', 0, 0, 'h1').text).toBe('# Title')
  })

  it('leaves blank separators alone across a multi-line selection', () => {
    expect(run('a\n\nb', 0, 4, 'h2').text).toBe('## a\n\n## b')
  })
})

describe('lists and quotes on a blank line', () => {
  it('arms each marker with a collapsed caret', () => {
    expect(run('', 0, 0, 'bullet')).toMatchObject({ text: '- ', collapsed: true })
    expect(run('', 0, 0, 'numbered')).toMatchObject({ text: '1. ', collapsed: true })
    expect(run('', 0, 0, 'task')).toMatchObject({ text: '- [ ] ', collapsed: true })
    expect(run('', 0, 0, 'quote')).toMatchObject({ text: '> ', collapsed: true })
  })
})

describe('lists on text', () => {
  it('adds and removes bullets', () => {
    expect(run('one', 0, 0, 'bullet').text).toBe('- one')
    expect(run('- one', 0, 0, 'bullet').text).toBe('one')
  })

  it('adds and removes quotes', () => {
    expect(run('q', 0, 0, 'quote').text).toBe('> q')
    expect(run('> q', 0, 0, 'quote').text).toBe('q')
  })

  it('numbers sequentially across a selection', () => {
    expect(run('a\nb\nc', 0, 5, 'numbered').text).toBe('1. a\n2. b\n3. c')
  })

  it('skips blank lines inside a selection', () => {
    expect(run('a\n\nb', 0, 4, 'bullet').text).toBe('- a\n\n- b')
  })
})

describe('inline marks', () => {
  it('inserts a placeholder that typing replaces', () => {
    const result = run('', 0, 0, 'bold')
    expect(result.text).toBe('**bold text**')
    // Selected, so the first keystroke overwrites the placeholder.
    expect(result.collapsed).toBe(false)
    expect(result.selected).toBe('bold text')
  })

  it('wraps a selection', () => {
    expect(run('word', 0, 4, 'bold').text).toBe('**word**')
  })

  it('unwraps an already-marked selection', () => {
    expect(run('**word**', 2, 6, 'bold').text).toBe('word')
  })

  it('expands a bare caret to the surrounding word', () => {
    expect(run('word', 2, 2, 'italic').text).toBe('_word_')
  })
})

describe('youtube', () => {
  it('inserts a template with the placeholder selected on a blank line', () => {
    const result = run('', 0, 0, 'youtube')
    expect(result.text).toBe('{{youtube VIDEO_ID}}')
    expect(result.collapsed).toBe(false)
    expect(result.selected).toBe('VIDEO_ID')
  })

  it('collapses a selected bare id into a shortcode', () => {
    const result = run('dQw4w9WgXcQ', 0, 11, 'youtube')
    expect(result.text).toBe('{{youtube dQw4w9WgXcQ}}')
    // The whole shortcode is selected so the author can delete/replace it.
    expect(result.selected).toBe('{{youtube dQw4w9WgXcQ}}')
  })

  it('wraps a selected watch URL after extracting the id', () => {
    const result = run('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 0, 43, 'youtube')
    expect(result.text).toBe('{{youtube dQw4w9WgXcQ}}')
  })

  it('wraps a selected youtu.be URL', () => {
    const result = run('https://youtu.be/dQw4w9WgXcQ', 0, 28, 'youtube')
    expect(result.text).toBe('{{youtube dQw4w9WgXcQ}}')
  })
})
