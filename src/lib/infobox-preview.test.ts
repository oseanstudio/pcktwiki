import { describe, expect, it } from 'vitest'
import { buildInfoboxPreviewHtml } from '@/lib/infobox-preview'

describe('buildInfoboxPreviewHtml', () => {
  it('renders a title and label/value rows', () => {
    const html = buildInfoboxPreviewHtml('{{infobox name=Ada|role=Mathematician}}')
    expect(html).toContain('class="infobox-title">Ada<')
    expect(html).toContain('<th>role</th><td>Mathematician</td>')
  })

  it('renders an image at the top when an image field is present', () => {
    const html = buildInfoboxPreviewHtml(
      '{{infobox name=Ada|image=https://example.com/ada.png|role=Math}}',
    )
    expect(html.indexOf('class="infobox-image"')).toBeLessThan(
      html.indexOf('class="infobox-title"'),
    )
    expect(html).toContain('src="https://example.com/ada.png"')
    // The image field must not also appear as a data row.
    expect(html).not.toContain('<th>image</th>')
  })

  it('renders a caption between the image and the title', () => {
    const html = buildInfoboxPreviewHtml(
      '{{infobox name=Ada|image=https://x/y.png|caption=Portrait|role=Math}}',
    )
    const imgIdx = html.indexOf('class="infobox-image"')
    const capIdx = html.indexOf('class="infobox-caption">Portrait<')
    const titleIdx = html.indexOf('class="infobox-title"')
    expect(capIdx).toBeGreaterThan(imgIdx)
    expect(titleIdx).toBeGreaterThan(capIdx)
    expect(html).not.toContain('<th>caption</th>')
  })

  it('accepts img as an alias for image', () => {
    const html = buildInfoboxPreviewHtml('{{infobox name=Ada|img=https://x/y.png}}')
    expect(html).toContain('class="infobox-image"')
  })

  it('omits the image and caption blocks when absent', () => {
    const html = buildInfoboxPreviewHtml('{{infobox name=Ada|role=Math}}')
    expect(html).not.toContain('infobox-image')
    expect(html).not.toContain('infobox-caption')
  })

  it('shows no data table when only reserved fields are present', () => {
    const html = buildInfoboxPreviewHtml('{{infobox name=Ada|image=https://x/y.png}}')
    expect(html).toContain('class="infobox-title">Ada<')
    expect(html).not.toContain('<th>')
  })
})
