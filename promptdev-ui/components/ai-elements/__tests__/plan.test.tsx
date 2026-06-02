import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/ai-elements/shimmer', () => ({
  Shimmer: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="shimmer">{children}</span>
  ),
}))

import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanAction,
  PlanContent,
  PlanFooter,
  PlanTrigger,
} from '@/components/ai-elements/plan'

describe('Plan', () => {
  it('renders children', () => {
    render(
      <Plan>
        <PlanHeader>
          <span>plan content</span>
        </PlanHeader>
      </Plan>,
    )

    expect(screen.getByText('plan content')).toBeInTheDocument()
  })

  it('renders with data-slot="plan"', () => {
    const { container } = render(
      <Plan>
        <PlanHeader>
          <span>x</span>
        </PlanHeader>
      </Plan>,
    )

    expect(container.querySelector('[data-slot="plan"]')).toBeInTheDocument()
  })
})

describe('PlanHeader', () => {
  it('renders children', () => {
    render(
      <Plan>
        <PlanHeader>
          <span>header text</span>
        </PlanHeader>
      </Plan>,
    )

    expect(screen.getByText('header text')).toBeInTheDocument()
  })

  it('has data-slot="plan-header"', () => {
    const { container } = render(
      <Plan>
        <PlanHeader data-testid="hdr">
          <span>h</span>
        </PlanHeader>
      </Plan>,
    )

    expect(container.querySelector('[data-slot="plan-header"]')).toBeInTheDocument()
  })
})

describe('PlanTitle', () => {
  it('renders text', () => {
    render(
      <Plan>
        <PlanHeader>
          <PlanTitle>My Plan Title</PlanTitle>
        </PlanHeader>
      </Plan>,
    )

    expect(screen.getByText('My Plan Title')).toBeInTheDocument()
  })

  it('renders Shimmer when isStreaming', () => {
    render(
      <Plan isStreaming>
        <PlanHeader>
          <PlanTitle>Streaming Title</PlanTitle>
        </PlanHeader>
      </Plan>,
    )

    expect(screen.getByTestId('shimmer')).toBeInTheDocument()
    expect(screen.getByText('Streaming Title')).toBeInTheDocument()
  })

  it('does not render Shimmer when not streaming', () => {
    render(
      <Plan isStreaming={false}>
        <PlanHeader>
          <PlanTitle>Static Title</PlanTitle>
        </PlanHeader>
      </Plan>,
    )

    expect(screen.queryByTestId('shimmer')).not.toBeInTheDocument()
    expect(screen.getByText('Static Title')).toBeInTheDocument()
  })
})

describe('PlanDescription', () => {
  it('renders text', () => {
    render(
      <Plan>
        <PlanHeader>
          <PlanDescription>A plan description</PlanDescription>
        </PlanHeader>
      </Plan>,
    )

    expect(screen.getByText('A plan description')).toBeInTheDocument()
  })

  it('renders Shimmer when isStreaming', () => {
    render(
      <Plan isStreaming>
        <PlanHeader>
          <PlanDescription>Streaming desc</PlanDescription>
        </PlanHeader>
      </Plan>,
    )

    const shimmers = screen.getAllByTestId('shimmer')
    expect(shimmers.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Streaming desc')).toBeInTheDocument()
  })

  it('does not render Shimmer when not streaming', () => {
    render(
      <Plan isStreaming={false}>
        <PlanHeader>
          <PlanDescription>Static desc</PlanDescription>
        </PlanHeader>
      </Plan>,
    )

    expect(screen.queryByTestId('shimmer')).not.toBeInTheDocument()
  })
})

describe('PlanAction', () => {
  it('renders children as card action', () => {
    render(
      <Plan>
        <PlanHeader>
          <PlanAction>
            <button>Do it</button>
          </PlanAction>
        </PlanHeader>
      </Plan>,
    )

    expect(screen.getByRole('button', { name: 'Do it' })).toBeInTheDocument()
  })

  it('has data-slot="plan-action"', () => {
    const { container } = render(
      <Plan>
        <PlanHeader>
          <PlanAction>
            <button>action</button>
          </PlanAction>
        </PlanHeader>
      </Plan>,
    )

    expect(container.querySelector('[data-slot="plan-action"]')).toBeInTheDocument()
  })
})

describe('PlanContent', () => {
  it('renders children inside collapsible content', () => {
    render(
      <Plan defaultOpen>
        <PlanContent>
          <span>plan body</span>
        </PlanContent>
      </Plan>,
    )

    expect(screen.getByText('plan body')).toBeInTheDocument()
  })

  it('has data-slot="plan-content"', () => {
    const { container } = render(
      <Plan defaultOpen>
        <PlanContent>
          <span>c</span>
        </PlanContent>
      </Plan>,
    )

    expect(container.querySelector('[data-slot="plan-content"]')).toBeInTheDocument()
  })
})

describe('PlanFooter', () => {
  it('renders children', () => {
    render(
      <Plan>
        <PlanFooter>
          <span>footer text</span>
        </PlanFooter>
      </Plan>,
    )

    expect(screen.getByText('footer text')).toBeInTheDocument()
  })

  it('has data-slot="plan-footer"', () => {
    const { container } = render(
      <Plan>
        <PlanFooter>
          <span>f</span>
        </PlanFooter>
      </Plan>,
    )

    expect(container.querySelector('[data-slot="plan-footer"]')).toBeInTheDocument()
  })
})

describe('PlanTrigger', () => {
  it('renders as button with sr-only text', () => {
    render(
      <Plan>
        <PlanTrigger />
      </Plan>,
    )

    const btn = screen.getByRole('button', { name: 'Toggle plan' })
    expect(btn).toBeInTheDocument()
  })

  it('has data-slot="plan-trigger"', () => {
    const { container } = render(
      <Plan>
        <PlanTrigger />
      </Plan>,
    )

    expect(container.querySelector('[data-slot="plan-trigger"]')).toBeInTheDocument()
  })

  it('renders ChevronsUpDownIcon', () => {
    const { container } = render(
      <Plan>
        <PlanTrigger />
      </Plan>,
    )

    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
