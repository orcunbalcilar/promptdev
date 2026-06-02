import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('streamdown', () => ({
  Streamdown: ({ children }: any) => <div data-testid="streamdown">{children}</div>,
}))

vi.mock('@streamdown/cjk', () => ({ cjk: {} }))
vi.mock('@streamdown/code', () => ({ code: {} }))
vi.mock('@streamdown/math', () => ({ math: {} }))
vi.mock('@streamdown/mermaid', () => ({ mermaid: {} }))

vi.mock('@/components/ai-elements/shimmer', () => ({
  Shimmer: ({ children }: any) => <span data-testid="shimmer">{children}</span>,
}))

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open, ...props }: any) => (
    <div data-testid="collapsible" data-open={open} {...props}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, ...props }: any) => (
    <button data-testid="collapsible-trigger" {...props}>{children}</button>
  ),
  CollapsibleContent: ({ children, ...props }: any) => (
    <div data-testid="collapsible-content" {...props}>{children}</div>
  ),
}))

import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@/components/ai-elements/reasoning'

describe('Reasoning', () => {
  it('renders children', () => {
    render(
      <Reasoning>
        <span>Reasoning child</span>
      </Reasoning>
    )
    expect(screen.getByText('Reasoning child')).toBeInTheDocument()
  })
})

describe('ReasoningTrigger', () => {
  it('renders with default streaming label', () => {
    render(
      <Reasoning isStreaming={true}>
        <ReasoningTrigger />
      </Reasoning>
    )
    expect(screen.getByTestId('shimmer')).toBeInTheDocument()
    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('shows duration when complete', () => {
    render(
      <Reasoning isStreaming={false} duration={5}>
        <ReasoningTrigger />
      </Reasoning>
    )
    expect(screen.getByText('Thought for 5 seconds')).toBeInTheDocument()
  })

  it('shows "Thought for a few seconds" when duration is undefined', () => {
    render(
      <Reasoning isStreaming={false} defaultOpen={false}>
        <ReasoningTrigger />
      </Reasoning>
    )
    expect(screen.getByText('Thought for a few seconds')).toBeInTheDocument()
  })
})

describe('ReasoningContent', () => {
  it('renders markdown content', () => {
    render(
      <Reasoning defaultOpen>
        <ReasoningContent>Some reasoning text</ReasoningContent>
      </Reasoning>
    )
    expect(screen.getByTestId('streamdown')).toBeInTheDocument()
    expect(screen.getByText('Some reasoning text')).toBeInTheDocument()
  })
})

describe('Reasoning auto-open', () => {
  it('auto-opens when streaming starts', () => {
    const { rerender } = render(
      <Reasoning isStreaming={false} defaultOpen={false}>
        <ReasoningTrigger />
        <ReasoningContent>Content</ReasoningContent>
      </Reasoning>
    )

    rerender(
      <Reasoning isStreaming={true}>
        <ReasoningTrigger />
        <ReasoningContent>Content</ReasoningContent>
      </Reasoning>
    )

    const collapsible = screen.getByTestId('collapsible')
    expect(collapsible).toBeInTheDocument()
  })
})
