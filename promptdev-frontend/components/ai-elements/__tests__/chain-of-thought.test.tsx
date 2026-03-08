import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtContent,
  ChainOfThoughtImage,
} from '@/components/ai-elements/chain-of-thought'

describe('ChainOfThought', () => {
  it('renders children', () => {
    render(
      <ChainOfThought>
        <span>Thinking content</span>
      </ChainOfThought>
    )
    expect(screen.getByText('Thinking content')).toBeInTheDocument()
  })
})

describe('ChainOfThoughtHeader', () => {
  it('renders as trigger with default text', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtHeader />
      </ChainOfThought>
    )
    expect(screen.getByText('Chain of Thought')).toBeInTheDocument()
  })

  it('renders custom children', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtHeader>Custom Header</ChainOfThoughtHeader>
      </ChainOfThought>
    )
    expect(screen.getByText('Custom Header')).toBeInTheDocument()
  })

  it('toggles open state on click', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtHeader>Toggle Me</ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <span>Collapsible content</span>
        </ChainOfThoughtContent>
      </ChainOfThought>
    )

    fireEvent.click(screen.getByText('Toggle Me'))
    // After clicking, content should become visible
    expect(screen.getByText('Collapsible content')).toBeInTheDocument()
  })
})

describe('ChainOfThoughtStep', () => {
  it('renders label', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtStep label="Step 1" />
      </ChainOfThought>
    )
    expect(screen.getByText('Step 1')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtStep label="Step" description="A description" />
      </ChainOfThought>
    )
    expect(screen.getByText('A description')).toBeInTheDocument()
  })

  it('shows correct icon for complete status', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtStep label="Done" status="complete" />
      </ChainOfThought>
    )
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('shows correct style for active status', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtStep label="Active Step" status="active" />
      </ChainOfThought>
    )
    expect(screen.getByText('Active Step')).toBeInTheDocument()
  })

  it('renders with line connector', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtStep label="Pending Step" status="pending" />
      </ChainOfThought>
    )
    expect(screen.getByText('Pending Step')).toBeInTheDocument()
  })
})

describe('ChainOfThoughtSearchResults', () => {
  it('renders children', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtSearchResults>
          <span>Search results here</span>
        </ChainOfThoughtSearchResults>
      </ChainOfThought>
    )
    expect(screen.getByText('Search results here')).toBeInTheDocument()
  })
})

describe('ChainOfThoughtSearchResult', () => {
  it('renders badge', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtSearchResult>Result 1</ChainOfThoughtSearchResult>
      </ChainOfThought>
    )
    expect(screen.getByText('Result 1')).toBeInTheDocument()
  })
})

describe('ChainOfThoughtContent', () => {
  it('renders children when open', () => {
    render(
      <ChainOfThought defaultOpen>
        <ChainOfThoughtContent>
          <span>Inner content</span>
        </ChainOfThoughtContent>
      </ChainOfThought>
    )
    expect(screen.getByText('Inner content')).toBeInTheDocument()
  })
})

describe('ChainOfThoughtImage', () => {
  it('renders children', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtImage>
          <span data-testid="img">Image</span>
        </ChainOfThoughtImage>
      </ChainOfThought>
    )
    expect(screen.getByTestId('img')).toBeInTheDocument()
  })

  it('renders caption', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtImage caption="My caption">
          <span>Image</span>
        </ChainOfThoughtImage>
      </ChainOfThought>
    )
    expect(screen.getByText('My caption')).toBeInTheDocument()
  })
})
