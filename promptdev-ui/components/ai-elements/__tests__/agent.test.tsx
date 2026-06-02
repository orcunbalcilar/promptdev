import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/ai-elements/code-block', () => ({
  CodeBlock: ({ code, language }: { code: string; language: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}))

import type { Tool } from 'ai'

import {
  Agent,
  AgentHeader,
  AgentContent,
  AgentInstructions,
  AgentTools,
  AgentTool,
  AgentOutput,
} from '@/components/ai-elements/agent'

describe('Agent', () => {
  it('renders children with base classes', () => {
    render(
      <Agent data-testid="agent">
        <span>agent content</span>
      </Agent>,
    )

    const el = screen.getByTestId('agent')
    expect(el).toBeInTheDocument()
    expect(el).toHaveClass('not-prose', 'w-full', 'rounded-md', 'border')
    expect(screen.getByText('agent content')).toBeInTheDocument()
  })

  it('passes custom className', () => {
    render(<Agent data-testid="agent" className="custom-class" />)

    expect(screen.getByTestId('agent')).toHaveClass('custom-class')
  })
})

describe('AgentHeader', () => {
  it('shows name', () => {
    render(<AgentHeader name="TestAgent" />)

    expect(screen.getByText('TestAgent')).toBeInTheDocument()
  })

  it('shows model Badge when provided', () => {
    render(<AgentHeader name="TestAgent" model="gpt-4" />)

    expect(screen.getByText('gpt-4')).toBeInTheDocument()
  })

  it('hides Badge when no model', () => {
    render(<AgentHeader name="TestAgent" />)

    expect(screen.queryByText('gpt-4')).not.toBeInTheDocument()
  })

  it('renders BotIcon svg', () => {
    const { container } = render(<AgentHeader name="TestAgent" />)

    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('AgentContent', () => {
  it('renders children', () => {
    render(
      <AgentContent data-testid="content">
        <span>inner content</span>
      </AgentContent>,
    )

    expect(screen.getByTestId('content')).toBeInTheDocument()
    expect(screen.getByText('inner content')).toBeInTheDocument()
  })

  it('passes custom className', () => {
    render(<AgentContent data-testid="content" className="extra" />)

    expect(screen.getByTestId('content')).toHaveClass('extra')
  })
})

describe('AgentInstructions', () => {
  it('renders text content in paragraph', () => {
    render(<AgentInstructions>Do something useful</AgentInstructions>)

    expect(screen.getByText('Do something useful')).toBeInTheDocument()
  })

  it('renders Instructions label', () => {
    render(<AgentInstructions>text</AgentInstructions>)

    expect(screen.getByText('Instructions')).toBeInTheDocument()
  })
})

describe('AgentOutput', () => {
  it('renders with schema text in CodeBlock', () => {
    render(<AgentOutput schema='{ "type": "string" }' />)

    const codeBlock = screen.getByTestId('code-block')
    expect(codeBlock).toBeInTheDocument()
    expect(codeBlock).toHaveTextContent('{ "type": "string" }')
    expect(codeBlock).toHaveAttribute('data-language', 'typescript')
  })

  it('renders Output Schema label', () => {
    render(<AgentOutput schema="test" />)

    expect(screen.getByText('Output Schema')).toBeInTheDocument()
  })
})

describe('AgentTools', () => {
  it('renders Tools label and accordion wrapper', () => {
    render(
      <AgentTools type="single">
        <div>tool item</div>
      </AgentTools>,
    )

    expect(screen.getByText('Tools')).toBeInTheDocument()
  })
})

describe('AgentTool', () => {
  it('renders tool description as trigger text', () => {
    const tool = {
      description: 'Searches the web',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
    }

    render(
      <AgentTools type="single">
        <AgentTool tool={tool as unknown as Tool} value="search" />
      </AgentTools>,
    )

    expect(screen.getByText('Searches the web')).toBeInTheDocument()
  })

  it('renders "No description" when tool has no description', () => {
    const tool = {
      inputSchema: { type: 'object' },
    }

    render(
      <AgentTools type="single">
        <AgentTool tool={tool as unknown as Tool} value="noname" />
      </AgentTools>,
    )

    expect(screen.getByText('No description')).toBeInTheDocument()
  })

  it('prefers jsonSchema over inputSchema when present', () => {
    const tool = {
      description: 'test tool',
      jsonSchema: { type: 'object', properties: { a: { type: 'number' } } },
      inputSchema: { type: 'object', properties: { b: { type: 'string' } } },
    }

    render(
      <AgentTools type="single" defaultValue="tool1">
        <AgentTool tool={tool as unknown as Tool} value="tool1" />
      </AgentTools>,
    )

    const codeBlock = screen.getByTestId('code-block')
    expect(codeBlock).toHaveTextContent('"a"')
    expect(codeBlock).not.toHaveTextContent('"b"')
  })
})
