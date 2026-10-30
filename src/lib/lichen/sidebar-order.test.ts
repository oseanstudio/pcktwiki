import { describe, expect, it } from 'vitest'
import { noteNavLabel } from '@/lib/lichen/sidebar-order'

describe('noteNavLabel', () => {
  it('prefers a custom navTitle when set', () => {
    expect(noteNavLabel({ title: 'Osean World', navTitle: 'Home' })).toBe('Home')
  })

  it('falls back to title when navTitle is blank', () => {
    expect(noteNavLabel({ title: 'Osean World', navTitle: '  ' })).toBe('Osean World')
    expect(noteNavLabel({ title: 'Osean World' })).toBe('Osean World')
  })
})
