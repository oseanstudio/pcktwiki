import { describe, expect, it } from 'vitest'
import { prepareImageUploadPreset } from '@/lib/media/prepare-image-upload'

describe('prepareImageUploadPreset', () => {
  it('exposes article / thumb / header / icon defaults', () => {
    expect(prepareImageUploadPreset('article').maxEdge).toBe(1600)
    expect(prepareImageUploadPreset('thumb').maxEdge).toBe(640)
    expect(prepareImageUploadPreset('header').maxEdge).toBe(800)
    expect(prepareImageUploadPreset('icon').maxEdge).toBe(256)
  })
})
