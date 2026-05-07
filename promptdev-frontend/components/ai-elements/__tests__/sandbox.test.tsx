import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/ai-elements/tool', () => ({
  getStatusBadge: (state: string) => (
    <span data-testid="status-badge">{state}</span>
  ),
}))

import {
  Sandbox,
  SandboxHeader,
  SandboxContent,
  SandboxTabs,
  SandboxTabsBar,
  SandboxTabsList,
  SandboxTabsTrigger,
  SandboxTabContent,
} from '@/components/ai-elements/sandbox'

describe('Sandbox', () => {
  it('renders children', () => {
    render(
      <Sandbox>
        <span>sandbox child</span>
      </Sandbox>,
    )

    expect(screen.getByText('sandbox child')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Sandbox data-testid="sandbox" className="custom">
        <span>content</span>
      </Sandbox>,
    )

    expect(screen.getByTestId('sandbox')).toHaveClass('custom')
  })
})

describe('SandboxHeader', () => {
  it('renders children with title and state badge', () => {
    render(
      <Sandbox>
        <SandboxHeader title="My Sandbox" state="output-available" />
      </Sandbox>,
    )

    expect(screen.getByText('My Sandbox')).toBeInTheDocument()
    expect(screen.getByTestId('status-badge')).toHaveTextContent(
      'output-available',
    )
  })
})

describe('SandboxContent', () => {
  it('renders children', () => {
    render(
      <Sandbox defaultOpen>
        <SandboxContent>
          <span>content area</span>
        </SandboxContent>
      </Sandbox>,
    )

    expect(screen.getByText('content area')).toBeInTheDocument()
  })
})

describe('SandboxTabs', () => {
  it('renders children', () => {
    render(
      <SandboxTabs defaultValue="tab1">
        <span>tabs content</span>
      </SandboxTabs>,
    )

    expect(screen.getByText('tabs content')).toBeInTheDocument()
  })
})

describe('SandboxTabsTrigger', () => {
  it('renders label', () => {
    render(
      <SandboxTabs defaultValue="tab1">
        <SandboxTabsList>
          <SandboxTabsTrigger value="tab1">Preview</SandboxTabsTrigger>
        </SandboxTabsList>
      </SandboxTabs>,
    )

    expect(screen.getByText('Preview')).toBeInTheDocument()
  })
})

describe('SandboxTabsBar', () => {
  it('renders children', () => {
    render(
      <SandboxTabsBar>
        <span>bar content</span>
      </SandboxTabsBar>,
    )

    expect(screen.getByText('bar content')).toBeInTheDocument()
  })
})

describe('SandboxTabContent', () => {
  it('renders children when active', () => {
    render(
      <SandboxTabs defaultValue="preview">
        <SandboxTabsList>
          <SandboxTabsTrigger value="preview">Preview</SandboxTabsTrigger>
        </SandboxTabsList>
        <SandboxTabContent value="preview">
          <span>preview content</span>
        </SandboxTabContent>
      </SandboxTabs>,
    )

    expect(screen.getByText('preview content')).toBeInTheDocument()
  })
})
