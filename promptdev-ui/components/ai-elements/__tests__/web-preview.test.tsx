import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
  WebPreviewConsole,
} from '@/components/ai-elements/web-preview'

describe('WebPreview', () => {
  it('renders children', () => {
    render(
      <WebPreview>
        <span>Preview content</span>
      </WebPreview>
    )

    expect(screen.getByText('Preview content')).toBeInTheDocument()
  })

  it('renders with default URL', () => {
    render(
      <WebPreview defaultUrl="https://example.com">
        <WebPreviewUrl />
      </WebPreview>
    )

    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument()
  })
})

describe('WebPreviewNavigation', () => {
  it('renders children', () => {
    render(
      <WebPreview>
        <WebPreviewNavigation>
          <span>Nav content</span>
        </WebPreviewNavigation>
      </WebPreview>
    )

    expect(screen.getByText('Nav content')).toBeInTheDocument()
  })
})

describe('WebPreviewNavigationButton', () => {
  it('renders button', () => {
    render(
      <WebPreview>
        <WebPreviewNavigation>
          <WebPreviewNavigationButton tooltip="Back">
            ←
          </WebPreviewNavigationButton>
        </WebPreviewNavigation>
      </WebPreview>
    )

    expect(screen.getByRole('button', { name: '←' })).toBeInTheDocument()
  })

  it('renders disabled state', () => {
    render(
      <WebPreview>
        <WebPreviewNavigation>
          <WebPreviewNavigationButton disabled tooltip="Forward">
            →
          </WebPreviewNavigationButton>
        </WebPreviewNavigation>
      </WebPreview>
    )

    expect(screen.getByRole('button', { name: '→' })).toBeDisabled()
  })
})

describe('WebPreviewUrl', () => {
  it('shows URL input with placeholder', () => {
    render(
      <WebPreview>
        <WebPreviewUrl />
      </WebPreview>
    )

    expect(screen.getByPlaceholderText('Enter URL...')).toBeInTheDocument()
  })
})

describe('WebPreviewBody', () => {
  it('renders iframe', () => {
    render(
      <WebPreview defaultUrl="https://example.com">
        <WebPreviewBody />
      </WebPreview>
    )

    const iframe = screen.getByTitle('Preview')
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('src', 'https://example.com')
  })

  it('renders iframe with sandbox attribute', () => {
    render(
      <WebPreview defaultUrl="https://example.com">
        <WebPreviewBody />
      </WebPreview>
    )

    const iframe = screen.getByTitle('Preview')
    expect(iframe).toHaveAttribute('sandbox')
  })
})

describe('WebPreviewConsole', () => {
  it('renders console with no output message', () => {
    render(
      <WebPreview>
        <WebPreviewConsole />
      </WebPreview>
    )

    expect(screen.getByText('Console')).toBeInTheDocument()
  })

  it('renders console logs when open', () => {
    const logs = [
      { level: 'log' as const, message: 'Hello world', timestamp: new Date('2026-01-01T12:00:00') },
      { level: 'error' as const, message: 'Something failed', timestamp: new Date('2026-01-01T12:00:01') },
      { level: 'warn' as const, message: 'Be careful', timestamp: new Date('2026-01-01T12:00:02') },
    ]

    render(
      <WebPreview>
        <WebPreviewConsole logs={logs} />
      </WebPreview>
    )

    expect(screen.getByText('Console')).toBeInTheDocument()
  })
})
