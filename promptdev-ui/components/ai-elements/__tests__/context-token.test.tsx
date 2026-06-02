import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('tokenlens', () => ({
  getUsage: vi.fn().mockReturnValue({
    costUSD: { totalUSD: 0.003 },
  }),
}))

vi.mock('@/components/ui/hover-card', () => ({
  HoverCard: ({ children }: any) => <div data-testid="hover-card">{children}</div>,
  HoverCardTrigger: ({ children, asChild }: any) => <div data-testid="hover-card-trigger">{asChild ? children : <button>{children}</button>}</div>,
  HoverCardContent: ({ children, className }: any) => <div data-testid="hover-card-content" className={className}>{children}</div>,
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value} />,
}))

import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
} from '@/components/ai-elements/context'

const defaultContextProps = {
  usedTokens: 5000,
  maxTokens: 10000,
  usage: {
    inputTokens: 3000,
    outputTokens: 1500,
    reasoningTokens: 500,
    cachedInputTokens: 200,
    totalTokens: 5000,
    promptTokens: 3000,
    completionTokens: 1500,
  },
  modelId: 'gpt-4',
}

describe('Context', () => {
  it('renders children', () => {
    render(
      <Context {...defaultContextProps}>
        <span>Context child</span>
      </Context>
    )
    expect(screen.getByText('Context child')).toBeInTheDocument()
  })
})

describe('ContextTrigger', () => {
  it('shows usage percentage', () => {
    render(
      <Context {...defaultContextProps}>
        <ContextTrigger />
      </Context>
    )
    expect(screen.getByText('50%')).toBeInTheDocument()
  })
})

describe('ContextContentHeader', () => {
  it('renders default header with percentage and token count', () => {
    render(
      <Context {...defaultContextProps}>
        <ContextContentHeader />
      </Context>
    )
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('5K / 10K')).toBeInTheDocument()
    expect(screen.getByTestId('progress')).toBeInTheDocument()
  })

  it('renders custom children', () => {
    render(
      <Context {...defaultContextProps}>
        <ContextContentHeader>
          <span>Custom header</span>
        </ContextContentHeader>
      </Context>
    )
    expect(screen.getByText('Custom header')).toBeInTheDocument()
  })
})

describe('ContextContentBody', () => {
  it('renders children', () => {
    render(
      <Context {...defaultContextProps}>
        <ContextContentBody>
          <span>Body content</span>
        </ContextContentBody>
      </Context>
    )
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })
})

describe('ContextInputUsage', () => {
  it('shows input tokens', () => {
    render(
      <Context {...defaultContextProps}>
        <ContextInputUsage />
      </Context>
    )
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText(/3K/)).toBeInTheDocument()
  })

  it('returns null when no input tokens', () => {
    const { container } = render(
      <Context
        {...defaultContextProps}
        usage={{ ...defaultContextProps.usage, inputTokens: 0 }}
      >
        <ContextInputUsage />
      </Context>
    )
    expect(container.querySelector('.flex')).not.toBeInTheDocument()
  })
})

describe('ContextOutputUsage', () => {
  it('shows output tokens', () => {
    render(
      <Context {...defaultContextProps}>
        <ContextOutputUsage />
      </Context>
    )
    expect(screen.getByText('Output')).toBeInTheDocument()
    expect(screen.getByText(/1\.5K/)).toBeInTheDocument()
  })

  it('returns null when no output tokens', () => {
    const { container } = render(
      <Context
        {...defaultContextProps}
        usage={{ ...defaultContextProps.usage, outputTokens: 0 }}
      >
        <ContextOutputUsage />
      </Context>
    )
    expect(container.querySelector('.flex')).not.toBeInTheDocument()
  })
})

describe('ContextReasoningUsage', () => {
  it('shows reasoning tokens', () => {
    render(
      <Context {...defaultContextProps}>
        <ContextReasoningUsage />
      </Context>
    )
    expect(screen.getByText('Reasoning')).toBeInTheDocument()
  })

  it('returns null when no reasoning tokens', () => {
    const { container } = render(
      <Context
        {...defaultContextProps}
        usage={{ ...defaultContextProps.usage, reasoningTokens: 0 }}
      >
        <ContextReasoningUsage />
      </Context>
    )
    expect(container.querySelector('.flex')).not.toBeInTheDocument()
  })
})

describe('ContextCacheUsage', () => {
  it('shows cache info', () => {
    render(
      <Context {...defaultContextProps}>
        <ContextCacheUsage />
      </Context>
    )
    expect(screen.getByText('Cache')).toBeInTheDocument()
  })

  it('returns null when no cache tokens', () => {
    const { container } = render(
      <Context
        {...defaultContextProps}
        usage={{ ...defaultContextProps.usage, cachedInputTokens: 0 }}
      >
        <ContextCacheUsage />
      </Context>
    )
    expect(container.querySelector('.flex')).not.toBeInTheDocument()
  })
})

describe('ContextContent', () => {
  it('renders content wrapper', () => {
    render(
      <Context {...defaultContextProps}>
        <ContextContent>
          <span>Content inside</span>
        </ContextContent>
      </Context>
    )
    expect(screen.getByText('Content inside')).toBeInTheDocument()
  })
})

describe('ContextContentFooter', () => {
  it('renders default footer with total cost', () => {
    render(
      <Context {...defaultContextProps}>
        <ContextContentFooter />
      </Context>
    )
    expect(screen.getByText('Total cost')).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })
})
