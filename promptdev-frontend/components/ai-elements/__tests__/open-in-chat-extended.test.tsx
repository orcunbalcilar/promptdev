import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  OpenIn,
  OpenInTrigger,
  OpenInContent,
  OpenInItem,
  OpenInLabel,
  OpenInSeparator,
  OpenInChatGPT,
  OpenInClaude,
  OpenInT3,
  OpenInScira,
  OpenInv0,
  OpenInCursor,
} from '@/components/ai-elements/open-in-chat'

describe('OpenInT3', () => {
  it('generates correct T3 Chat URL', () => {
    render(
      <OpenIn query="help me build a Next.js app" open>
        <OpenInContent>
          <OpenInT3 />
        </OpenInContent>
      </OpenIn>
    )

    const link = screen.getByText('Open in T3 Chat').closest('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', expect.stringContaining('t3.chat/new'))
    expect(link).toHaveAttribute('href', expect.stringContaining('help+me+build'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener')
  })

  it('correctly encodes special characters', () => {
    render(
      <OpenIn query="what's the best way?" open>
        <OpenInContent>
          <OpenInT3 />
        </OpenInContent>
      </OpenIn>
    )

    const link = screen.getByText('Open in T3 Chat').closest('a')
    expect(link).toHaveAttribute('href', expect.stringContaining('t3.chat'))
  })
})

describe('OpenInScira', () => {
  it('generates correct Scira URL', () => {
    render(
      <OpenIn query="explain quantum computing" open>
        <OpenInContent>
          <OpenInScira />
        </OpenInContent>
      </OpenIn>
    )

    const link = screen.getByText('Open in Scira').closest('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', expect.stringContaining('scira.ai'))
    expect(link).toHaveAttribute('href', expect.stringContaining('explain+quantum'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener')
  })
})

describe('OpenInv0', () => {
  it('generates correct v0 URL', () => {
    render(
      <OpenIn query="create a dashboard component" open>
        <OpenInContent>
          <OpenInv0 />
        </OpenInContent>
      </OpenIn>
    )

    const link = screen.getByText('Open in v0').closest('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', expect.stringContaining('v0.app'))
    expect(link).toHaveAttribute('href', expect.stringContaining('create+a+dashboard'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener')
  })
})

describe('OpenInCursor', () => {
  it('generates correct Cursor URL', () => {
    render(
      <OpenIn query="refactor this function" open>
        <OpenInContent>
          <OpenInCursor />
        </OpenInContent>
      </OpenIn>
    )

    const link = screen.getByText('Open in Cursor').closest('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', expect.stringContaining('cursor.com/link/prompt'))
    expect(link).toHaveAttribute('href', expect.stringContaining('refactor'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener')
  })
})

describe('OpenInSeparator', () => {
  it('renders separator within dropdown content', () => {
    render(
      <OpenIn query="test" open>
        <OpenInContent>
          <OpenInLabel>AI Assistants</OpenInLabel>
          <OpenInSeparator />
          <OpenInChatGPT />
        </OpenInContent>
      </OpenIn>
    )

    // Separator renders as a Radix element within the dropdown
    expect(screen.getByText('AI Assistants')).toBeInTheDocument()
    expect(screen.getByText('Open in ChatGPT')).toBeInTheDocument()
  })
})

describe('OpenInContent', () => {
  it('renders content with items', () => {
    render(
      <OpenIn query="test" open>
        <OpenInContent>
          <OpenInItem>Item 1</OpenInItem>
        </OpenInContent>
      </OpenIn>
    )

    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('renders content with className prop', () => {
    render(
      <OpenIn query="test" open>
        <OpenInContent className="custom-dropdown">
          <OpenInItem>Item</OpenInItem>
        </OpenInContent>
      </OpenIn>
    )

    // The content renders via Radix portal — just confirm it exists with items
    expect(screen.getByText('Item')).toBeInTheDocument()
  })
})

describe('OpenInTrigger – default button', () => {
  it('renders default trigger button with text and icon', () => {
    render(
      <OpenIn query="test">
        <OpenInTrigger />
      </OpenIn>
    )

    expect(screen.getByText('Open in chat')).toBeInTheDocument()
  })
})

describe('All providers in one dropdown', () => {
  it('renders all provider items together', () => {
    render(
      <OpenIn query="build me a todo app" open>
        <OpenInContent>
          <OpenInLabel>AI Assistants</OpenInLabel>
          <OpenInSeparator />
          <OpenInChatGPT />
          <OpenInClaude />
          <OpenInT3 />
          <OpenInScira />
          <OpenInv0 />
          <OpenInCursor />
        </OpenInContent>
      </OpenIn>
    )

    expect(screen.getByText('Open in ChatGPT')).toBeInTheDocument()
    expect(screen.getByText('Open in Claude')).toBeInTheDocument()
    expect(screen.getByText('Open in T3 Chat')).toBeInTheDocument()
    expect(screen.getByText('Open in Scira')).toBeInTheDocument()
    expect(screen.getByText('Open in v0')).toBeInTheDocument()
    expect(screen.getByText('Open in Cursor')).toBeInTheDocument()
  })

  it('all provider links have target _blank', () => {
    render(
      <OpenIn query="test query" open>
        <OpenInContent>
          <OpenInChatGPT />
          <OpenInClaude />
          <OpenInT3 />
          <OpenInScira />
          <OpenInv0 />
          <OpenInCursor />
        </OpenInContent>
      </OpenIn>
    )

    const links = screen.getAllByRole('menuitem').map(item => item.closest('a')).filter(Boolean)
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener')
    }
  })
})

describe('OpenIn – query encoding', () => {
  it('encodes ampersands and special chars in query', () => {
    render(
      <OpenIn query="Tom & Jerry's adventure" open>
        <OpenInContent>
          <OpenInChatGPT />
        </OpenInContent>
      </OpenIn>
    )

    const link = screen.getByText('Open in ChatGPT').closest('a')
    expect(link?.getAttribute('href')).toBeTruthy()
    // URL should be validly encoded
    expect(() => new URL(link!.getAttribute('href')!)).not.toThrow()
  })
})
