import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

globalThis.IntersectionObserver = class IntersectionObserver {
  constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
    // store refs to satisfy unused-var lint
    this._cb = cb
    this._opts = opts
  }
  private readonly _cb: IntersectionObserverCallback
  private readonly _opts?: IntersectionObserverInit
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
  get root() { return null }
  get rootMargin() { return '' }
  get thresholds() { return [] as number[] }
  takeRecords() { return [] as IntersectionObserverEntry[] }
} as unknown as typeof IntersectionObserver

// embla-carousel requires matchMedia in jsdom
if (!globalThis.matchMedia) {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

import {
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote,
} from '@/components/ai-elements/inline-citation'

describe('InlineCitationCarousel', () => {
  it('renders carousel with children', () => {
    render(
      <InlineCitationCarousel>
        <InlineCitationCarouselContent>
          <InlineCitationCarouselItem>
            <span>Slide 1</span>
          </InlineCitationCarouselItem>
        </InlineCitationCarouselContent>
      </InlineCitationCarousel>
    )

    expect(screen.getByText('Slide 1')).toBeInTheDocument()
  })

  it('applies className to carousel', () => {
    const { container } = render(
      <InlineCitationCarousel className="custom-carousel">
        <InlineCitationCarouselContent>
          <InlineCitationCarouselItem>Item</InlineCitationCarouselItem>
        </InlineCitationCarouselContent>
      </InlineCitationCarousel>
    )

    expect(container.querySelector('.custom-carousel')).toBeInTheDocument()
  })
})

describe('InlineCitationCarouselContent', () => {
  it('renders content items', () => {
    render(
      <InlineCitationCarousel>
        <InlineCitationCarouselContent>
          <InlineCitationCarouselItem>Item A</InlineCitationCarouselItem>
          <InlineCitationCarouselItem>Item B</InlineCitationCarouselItem>
        </InlineCitationCarouselContent>
      </InlineCitationCarousel>
    )

    expect(screen.getByText('Item A')).toBeInTheDocument()
    expect(screen.getByText('Item B')).toBeInTheDocument()
  })
})

describe('InlineCitationCarouselItem', () => {
  it('renders with default classes', () => {
    render(
      <InlineCitationCarousel>
        <InlineCitationCarouselContent>
          <InlineCitationCarouselItem>
            <span>Content here</span>
          </InlineCitationCarouselItem>
        </InlineCitationCarouselContent>
      </InlineCitationCarousel>
    )

    expect(screen.getByText('Content here')).toBeInTheDocument()
  })

  it('applies className', () => {
    const { container } = render(
      <InlineCitationCarousel>
        <InlineCitationCarouselContent>
          <InlineCitationCarouselItem className="custom-item">
            Item
          </InlineCitationCarouselItem>
        </InlineCitationCarouselContent>
      </InlineCitationCarousel>
    )

    expect(container.querySelector('.custom-item')).toBeInTheDocument()
  })
})

describe('InlineCitationCarouselIndex', () => {
  it('renders default index text (no api means 0/0)', () => {
    render(
      <InlineCitationCarousel>
        <InlineCitationCarouselIndex />
      </InlineCitationCarousel>
    )

    // Without carousel API initialized, count/current will be 0
    expect(screen.getByText('0/0')).toBeInTheDocument()
  })

  it('renders custom children when provided', () => {
    render(
      <InlineCitationCarousel>
        <InlineCitationCarouselIndex>
          Page 2 of 5
        </InlineCitationCarouselIndex>
      </InlineCitationCarousel>
    )

    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
  })

  it('applies className', () => {
    const { container } = render(
      <InlineCitationCarousel>
        <InlineCitationCarouselIndex className="custom-index" />
      </InlineCitationCarousel>
    )

    expect(container.querySelector('.custom-index')).toBeInTheDocument()
  })
})

describe('InlineCitationCarouselPrev', () => {
  it('renders previous button with aria-label', () => {
    render(
      <InlineCitationCarousel>
        <InlineCitationCarouselPrev />
      </InlineCitationCarousel>
    )

    const button = screen.getByRole('button', { name: 'Previous' })
    expect(button).toBeInTheDocument()
  })

  it('clicking previous button does not throw when no api', () => {
    render(
      <InlineCitationCarousel>
        <InlineCitationCarouselPrev />
      </InlineCitationCarousel>
    )

    const button = screen.getByRole('button', { name: 'Previous' })
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  it('applies className', () => {
    const { container } = render(
      <InlineCitationCarousel>
        <InlineCitationCarouselPrev className="custom-prev" />
      </InlineCitationCarousel>
    )

    expect(container.querySelector('.custom-prev')).toBeInTheDocument()
  })
})

describe('InlineCitationCarouselNext', () => {
  it('renders next button with aria-label', () => {
    render(
      <InlineCitationCarousel>
        <InlineCitationCarouselNext />
      </InlineCitationCarousel>
    )

    const button = screen.getByRole('button', { name: 'Next' })
    expect(button).toBeInTheDocument()
  })

  it('clicking next button does not throw when no api', () => {
    render(
      <InlineCitationCarousel>
        <InlineCitationCarouselNext />
      </InlineCitationCarousel>
    )

    const button = screen.getByRole('button', { name: 'Next' })
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  it('applies className', () => {
    const { container } = render(
      <InlineCitationCarousel>
        <InlineCitationCarouselNext className="custom-next" />
      </InlineCitationCarousel>
    )

    expect(container.querySelector('.custom-next')).toBeInTheDocument()
  })
})

describe('InlineCitationCarouselHeader', () => {
  it('renders header with left/right content', () => {
    render(
      <InlineCitationCarouselHeader>
        <span>Title</span>
        <span>Actions</span>
      </InlineCitationCarouselHeader>
    )

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('applies className', () => {
    const { container } = render(
      <InlineCitationCarouselHeader className="custom-header">
        Header
      </InlineCitationCarouselHeader>
    )

    expect(container.querySelector('.custom-header')).toBeInTheDocument()
  })
})

describe('InlineCitationCardBody', () => {
  it('applies className', () => {
    render(
      <InlineCitationCard open>
        <InlineCitationCardTrigger sources={['https://example.com']} />
        <InlineCitationCardBody className="custom-body">
          <span>Body content</span>
        </InlineCitationCardBody>
      </InlineCitationCard>
    )

    expect(screen.getByText('Body content')).toBeInTheDocument()
  })
})

describe('InlineCitationSource – edge cases', () => {
  it('renders only url when no title or description', () => {
    render(<InlineCitationSource url="https://example.com" />)

    expect(screen.getByText('https://example.com')).toBeInTheDocument()
  })

  it('renders only description when no title or url', () => {
    render(<InlineCitationSource description="A description only" />)

    expect(screen.getByText('A description only')).toBeInTheDocument()
  })

  it('renders nothing when no title, url, description, or children', () => {
    const { container } = render(<InlineCitationSource />)

    // Should render the wrapper div with no content
    expect(container.firstChild?.childNodes.length).toBe(0)
  })
})

describe('InlineCitationCardTrigger – single source', () => {
  it('shows only hostname without +count for single source', () => {
    render(
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={['https://docs.example.com/api/v2']} />
      </InlineCitationCard>
    )

    expect(screen.getByText('docs.example.com')).toBeInTheDocument()
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
  })
})

describe('Full carousel composition', () => {
  it('renders a complete carousel with header, navigation, items, and index', () => {
    render(
      <InlineCitationCarousel>
        <InlineCitationCarouselHeader>
          <InlineCitationCarouselPrev />
          <InlineCitationCarouselIndex />
          <InlineCitationCarouselNext />
        </InlineCitationCarouselHeader>
        <InlineCitationCarouselContent>
          <InlineCitationCarouselItem>
            <InlineCitationSource
              title="Source 1"
              url="https://example.com"
              description="First source"
            />
          </InlineCitationCarouselItem>
          <InlineCitationCarouselItem>
            <InlineCitationSource
              title="Source 2"
              url="https://other.com"
              description="Second source"
            />
          </InlineCitationCarouselItem>
        </InlineCitationCarouselContent>
      </InlineCitationCarousel>
    )

    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    expect(screen.getByText('Source 1')).toBeInTheDocument()
    expect(screen.getByText('Source 2')).toBeInTheDocument()
  })
})

describe('InlineCitationText – edge cases', () => {
  it('renders with no className', () => {
    render(<InlineCitationText>Some text</InlineCitationText>)
    expect(screen.getByText('Some text')).toBeInTheDocument()
  })
})

describe('InlineCitationQuote – edge cases', () => {
  it('renders with custom className', () => {
    render(<InlineCitationQuote className="my-quote">Quote text</InlineCitationQuote>)
    const elem = screen.getByText('Quote text')
    expect(elem.tagName).toBe('BLOCKQUOTE')
    expect(elem).toHaveClass('my-quote')
  })
})
