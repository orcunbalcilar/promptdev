import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/components/ui/hover-card', () => ({
  HoverCard: ({ children }: any) => <div data-testid="hover-card">{children}</div>,
  HoverCardTrigger: ({ children }: any) => <div data-testid="hover-card-trigger">{children}</div>,
  HoverCardContent: ({ children, className }: any) => <div data-testid="hover-card-content" className={className}>{children}</div>,
}))

import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
  AttachmentHoverCard,
  AttachmentHoverCardTrigger,
  AttachmentHoverCardContent,
  AttachmentEmpty,
  getMediaCategory,
  getAttachmentLabel,
} from '@/components/ai-elements/attachments'

const makeFileAttachment = (overrides: Record<string, unknown> = {}) => ({
  id: 'file-1',
  type: 'file' as const,
  mediaType: 'image/png',
  filename: 'photo.png',
  url: 'https://example.com/photo.png',
  data: undefined,
  ...overrides,
})

const makeSourceAttachment = (overrides: Record<string, unknown> = {}) => ({
  id: 'source-1',
  type: 'source-document' as const,
  title: 'My Document',
  filename: 'doc.pdf',
  sourceDocument: {
    id: 'source-1',
    mediaType: 'application/pdf',
    title: 'My Document',
    uri: 'https://example.com/doc.pdf',
  },
  ...overrides,
})

describe('Attachments', () => {
  it('renders children with grid variant', () => {
    render(
      <Attachments variant="grid">
        <span>Grid items</span>
      </Attachments>
    )
    expect(screen.getByText('Grid items')).toBeInTheDocument()
  })

  it('renders with inline variant', () => {
    const { container } = render(
      <Attachments variant="inline">
        <span>Inline items</span>
      </Attachments>
    )
    expect(screen.getByText('Inline items')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('flex-wrap')
  })

  it('renders with list variant', () => {
    const { container } = render(
      <Attachments variant="list">
        <span>List items</span>
      </Attachments>
    )
    expect(screen.getByText('List items')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('flex-col')
  })
})

describe('Attachment', () => {
  it('renders children', () => {
    render(
      <Attachments>
        <Attachment data={makeFileAttachment()}>
          <span>Attachment content</span>
        </Attachment>
      </Attachments>
    )
    expect(screen.getByText('Attachment content')).toBeInTheDocument()
  })
})

describe('AttachmentPreview', () => {
  it('renders preview for image', () => {
    const { container } = render(
      <Attachments>
        <Attachment data={makeFileAttachment()}>
          <AttachmentPreview />
        </Attachment>
      </Attachments>
    )
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img?.getAttribute('src')).toBe('https://example.com/photo.png')
  })

  it('renders icon fallback for document', () => {
    const { container } = render(
      <Attachments variant="inline">
        <Attachment data={makeFileAttachment({ mediaType: 'application/pdf', url: undefined })}>
          <AttachmentPreview />
        </Attachment>
      </Attachments>
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})

describe('AttachmentInfo', () => {
  it('renders info for inline variant', () => {
    render(
      <Attachments variant="inline">
        <Attachment data={makeFileAttachment()}>
          <AttachmentInfo />
        </Attachment>
      </Attachments>
    )
    expect(screen.getByText('photo.png')).toBeInTheDocument()
  })

  it('returns null for grid variant', () => {
    const { container } = render(
      <Attachments variant="grid">
        <Attachment data={makeFileAttachment()}>
          <AttachmentInfo />
        </Attachment>
      </Attachments>
    )
    expect(container.querySelector('.min-w-0')).not.toBeInTheDocument()
  })
})

describe('AttachmentRemove', () => {
  it('calls onRemove callback', () => {
    const onRemove = vi.fn()
    render(
      <Attachments>
        <Attachment data={makeFileAttachment()} onRemove={onRemove}>
          <AttachmentRemove />
        </Attachment>
      </Attachments>
    )
    const removeButton = screen.getByRole('button', { name: 'Remove' })
    fireEvent.click(removeButton)
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('returns null when no onRemove provided', () => {
    const { container } = render(
      <Attachments>
        <Attachment data={makeFileAttachment()}>
          <AttachmentRemove />
        </Attachment>
      </Attachments>
    )
    expect(container.querySelector('button[aria-label="Remove"]')).not.toBeInTheDocument()
  })
})

describe('AttachmentHoverCard', () => {
  it('renders hover card components', () => {
    render(
      <AttachmentHoverCard>
        <AttachmentHoverCardTrigger>
          <span>Trigger</span>
        </AttachmentHoverCardTrigger>
        <AttachmentHoverCardContent>
          <span>Content</span>
        </AttachmentHoverCardContent>
      </AttachmentHoverCard>
    )
    expect(screen.getByText('Trigger')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})

describe('AttachmentEmpty', () => {
  it('renders empty state', () => {
    render(<AttachmentEmpty />)
    expect(screen.getByText('No attachments')).toBeInTheDocument()
  })

  it('renders custom children', () => {
    render(<AttachmentEmpty>Nothing here</AttachmentEmpty>)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
})

describe('getMediaCategory', () => {
  it('returns correct category for MIME types', () => {
    expect(getMediaCategory(makeFileAttachment({ mediaType: 'image/png' }))).toBe('image')
    expect(getMediaCategory(makeFileAttachment({ mediaType: 'video/mp4' }))).toBe('video')
    expect(getMediaCategory(makeFileAttachment({ mediaType: 'audio/mpeg' }))).toBe('audio')
    expect(getMediaCategory(makeFileAttachment({ mediaType: 'application/pdf' }))).toBe('document')
    expect(getMediaCategory(makeFileAttachment({ mediaType: 'text/plain' }))).toBe('document')
    expect(getMediaCategory(makeFileAttachment({ mediaType: '' }))).toBe('unknown')
    expect(getMediaCategory(makeSourceAttachment())).toBe('source')
  })
})

describe('getAttachmentLabel', () => {
  it('returns correct label', () => {
    expect(getAttachmentLabel(makeFileAttachment())).toBe('photo.png')
    expect(getAttachmentLabel(makeFileAttachment({ filename: undefined }))).toBe('Image')
    expect(getAttachmentLabel(makeFileAttachment({ mediaType: 'application/pdf', filename: undefined }))).toBe('Attachment')
    expect(getAttachmentLabel(makeSourceAttachment())).toBe('My Document')
    expect(getAttachmentLabel(makeSourceAttachment({ title: undefined, filename: 'doc.pdf' }))).toBe('doc.pdf')
    expect(getAttachmentLabel(makeSourceAttachment({ title: undefined, filename: undefined }))).toBe('Source')
  })
})

// ── Additional branch coverage ──────────────────────────────────

describe('AttachmentPreview – video branch', () => {
  it('renders video element for video attachment with URL', () => {
    const { container } = render(
      <Attachments>
        <Attachment data={makeFileAttachment({ mediaType: 'video/mp4', url: 'https://example.com/video.mp4' })}>
          <AttachmentPreview />
        </Attachment>
      </Attachments>
    )
    const video = container.querySelector('video')
    expect(video).toBeInTheDocument()
    expect(video?.getAttribute('src')).toBe('https://example.com/video.mp4')
  })

  it('renders icon for video without URL', () => {
    const { container } = render(
      <Attachments>
        <Attachment data={makeFileAttachment({ mediaType: 'video/mp4', url: undefined })}>
          <AttachmentPreview />
        </Attachment>
      </Attachments>
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders icon for audio type', () => {
    const { container } = render(
      <Attachments>
        <Attachment data={makeFileAttachment({ mediaType: 'audio/mpeg', url: undefined })}>
          <AttachmentPreview />
        </Attachment>
      </Attachments>
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders fallbackIcon when provided', () => {
    render(
      <Attachments>
        <Attachment data={makeFileAttachment({ mediaType: 'text/plain', url: undefined })}>
          <AttachmentPreview fallbackIcon={<span data-testid="custom-icon">custom</span>} />
        </Attachment>
      </Attachments>
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
})

describe('AttachmentPreview – variant sizing', () => {
  it('uses correct sizing for list variant', () => {
    const { container } = render(
      <Attachments variant="list">
        <Attachment data={makeFileAttachment({ mediaType: 'application/pdf', url: undefined })}>
          <AttachmentPreview />
        </Attachment>
      </Attachments>
    )
    expect(container.querySelector('.size-12')).toBeInTheDocument()
  })
})

describe('AttachmentInfo – showMediaType branch', () => {
  it('renders mediaType when showMediaType is true', () => {
    render(
      <Attachments variant="inline">
        <Attachment data={makeFileAttachment({ mediaType: 'image/png' })}>
          <AttachmentInfo showMediaType />
        </Attachment>
      </Attachments>
    )
    expect(screen.getByText('image/png')).toBeInTheDocument()
  })

  it('does not render mediaType when showMediaType is false', () => {
    render(
      <Attachments variant="inline">
        <Attachment data={makeFileAttachment({ mediaType: 'image/png' })}>
          <AttachmentInfo showMediaType={false} />
        </Attachment>
      </Attachments>
    )
    expect(screen.queryByText('image/png')).not.toBeInTheDocument()
  })

  it('does not render mediaType when data has no mediaType', () => {
    render(
      <Attachments variant="list">
        <Attachment data={makeSourceAttachment()}>
          <AttachmentInfo showMediaType />
        </Attachment>
      </Attachments>
    )
    expect(screen.getByText('My Document')).toBeInTheDocument()
  })
})

describe('AttachmentRemove – variant styles', () => {
  it('renders remove button with list variant styles', () => {
    const onRemove = vi.fn()
    render(
      <Attachments variant="list">
        <Attachment data={makeFileAttachment()} onRemove={onRemove}>
          <AttachmentRemove />
        </Attachment>
      </Attachments>
    )
    const removeButton = screen.getByRole('button', { name: 'Remove' })
    expect(removeButton).toBeInTheDocument()
    fireEvent.click(removeButton)
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('renders custom children in remove button', () => {
    const onRemove = vi.fn()
    render(
      <Attachments>
        <Attachment data={makeFileAttachment()} onRemove={onRemove}>
          <AttachmentRemove label="Delete"><span data-testid="custom-x">X</span></AttachmentRemove>
        </Attachment>
      </Attachments>
    )
    expect(screen.getByTestId('custom-x')).toBeInTheDocument()
  })
})

describe('Attachment – list variant class', () => {
  it('renders with list variant classes', () => {
    const { container } = render(
      <Attachments variant="list">
        <Attachment data={makeFileAttachment()}>
          <span>Content</span>
        </Attachment>
      </Attachments>
    )
    expect(container.querySelector('.w-full')).toBeInTheDocument()
  })
})

describe('getMediaCategory – edge cases', () => {
  it('returns unknown for undefined mediaType', () => {
    expect(getMediaCategory(makeFileAttachment({ mediaType: undefined }))).toBe('unknown')
  })

  it('returns document for text/* types', () => {
    expect(getMediaCategory(makeFileAttachment({ mediaType: 'text/html' }))).toBe('document')
  })

  it('returns unknown for custom MIME type', () => {
    expect(getMediaCategory(makeFileAttachment({ mediaType: 'model/gltf-binary' }))).toBe('unknown')
  })
})

describe('useAttachmentContext error', () => {
  it('throws when used outside Attachment', () => {
    // Suppress React error boundary console output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function BarePreview() {
      return <AttachmentPreview />
    }
    expect(() =>
      render(
        <Attachments>
          <BarePreview />
        </Attachments>
      )
    ).toThrow('Attachment components must be used within <Attachment>')
    spy.mockRestore()
  })
})
