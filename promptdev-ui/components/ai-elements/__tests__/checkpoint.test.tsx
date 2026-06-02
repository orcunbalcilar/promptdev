import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'

import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from '@/components/ai-elements/checkpoint'

const renderWithTooltip = (ui: React.ReactElement) =>
  render(<TooltipProvider>{ui}</TooltipProvider>)

describe('Checkpoint', () => {
  it('renders children', () => {
    render(
      <Checkpoint data-testid="checkpoint">
        <span>checkpoint content</span>
      </Checkpoint>,
    )

    expect(screen.getByTestId('checkpoint')).toBeInTheDocument()
    expect(screen.getByText('checkpoint content')).toBeInTheDocument()
  })

  it('renders a Separator alongside children', () => {
    const { container } = render(
      <Checkpoint>
        <span>text</span>
      </Checkpoint>,
    )

    expect(container.querySelector('[data-slot="separator"]')).toBeInTheDocument()
  })
})

describe('CheckpointIcon', () => {
  it('renders default BookmarkIcon svg', () => {
    const { container } = render(<CheckpointIcon />)

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders custom children instead of icon', () => {
    render(<CheckpointIcon><span>custom icon</span></CheckpointIcon>)

    expect(screen.getByText('custom icon')).toBeInTheDocument()
  })
})

describe('CheckpointTrigger', () => {
  it('renders children as button', () => {
    render(<CheckpointTrigger>Click me</CheckpointTrigger>)

    const btn = screen.getByRole('button', { name: 'Click me' })
    expect(btn).toBeInTheDocument()
  })

  it('renders tooltip when tooltip prop is provided', async () => {
    renderWithTooltip(
      <CheckpointTrigger tooltip="Bookmark this">Save</CheckpointTrigger>,
    )

    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn).toBeInTheDocument()
  })

  it('renders without tooltip wrapper when tooltip prop is absent', () => {
    render(<CheckpointTrigger>No tooltip</CheckpointTrigger>)

    const btn = screen.getByRole('button', { name: 'No tooltip' })
    expect(btn).toBeInTheDocument()
  })
})
