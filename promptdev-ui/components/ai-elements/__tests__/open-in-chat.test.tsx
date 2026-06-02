import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  OpenIn,
  OpenInTrigger,
  OpenInContent,
  OpenInItem,
  OpenInLabel,
  OpenInChatGPT,
  OpenInClaude,
} from '@/components/ai-elements/open-in-chat'

describe('OpenIn', () => {
  it('renders children', () => {
    render(
      <OpenIn query="test query">
        <OpenInTrigger />
      </OpenIn>
    )

    expect(screen.getByText('Open in chat')).toBeInTheDocument()
  })
})

describe('OpenInTrigger', () => {
  it('renders default button with text', () => {
    render(
      <OpenIn query="test">
        <OpenInTrigger />
      </OpenIn>
    )

    expect(screen.getByText('Open in chat')).toBeInTheDocument()
  })

  it('renders custom children', () => {
    render(
      <OpenIn query="test">
        <OpenInTrigger>
          <button>Custom trigger</button>
        </OpenInTrigger>
      </OpenIn>
    )

    expect(screen.getByText('Custom trigger')).toBeInTheDocument()
  })
})

describe('OpenInItem', () => {
  it('renders item with content', () => {
    render(
      <OpenIn query="test" open>
        <OpenInContent>
          <OpenInItem>
            <span>🤖</span>
            <span>Test Item</span>
          </OpenInItem>
        </OpenInContent>
      </OpenIn>
    )

    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })
})

describe('OpenInLabel', () => {
  it('renders label text', () => {
    render(
      <OpenIn query="test" open>
        <OpenInContent>
          <OpenInLabel>Open in...</OpenInLabel>
        </OpenInContent>
      </OpenIn>
    )

    expect(screen.getByText('Open in...')).toBeInTheDocument()
  })
})

describe('OpenInChatGPT', () => {
  it('generates correct ChatGPT URL', () => {
    render(
      <OpenIn query="hello world" open>
        <OpenInContent>
          <OpenInChatGPT />
        </OpenInContent>
      </OpenIn>
    )

    const link = screen.getByText('Open in ChatGPT').closest('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('chatgpt.com')
    )
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('hello+world')
    )
    expect(link).toHaveAttribute('target', '_blank')
  })
})

describe('OpenInClaude', () => {
  it('generates correct Claude URL', () => {
    render(
      <OpenIn query="hello world" open>
        <OpenInContent>
          <OpenInClaude />
        </OpenInContent>
      </OpenIn>
    )

    const link = screen.getByText('Open in Claude').closest('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('claude.ai/new')
    )
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('hello+world')
    )
    expect(link).toHaveAttribute('target', '_blank')
  })
})
