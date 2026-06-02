import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Edit2Icon } from 'lucide-react'

import {
  Artifact,
  ArtifactHeader,
  ArtifactClose,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
} from '@/components/ai-elements/artifact'

describe('Artifact', () => {
  it('renders children', () => {
    render(
      <Artifact data-testid="artifact">
        <span>artifact child</span>
      </Artifact>,
    )

    expect(screen.getByTestId('artifact')).toBeInTheDocument()
    expect(screen.getByText('artifact child')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Artifact data-testid="artifact" className="custom" />)

    expect(screen.getByTestId('artifact')).toHaveClass('custom')
  })
})

describe('ArtifactHeader', () => {
  it('renders children', () => {
    render(
      <ArtifactHeader data-testid="header">
        <span>header content</span>
      </ArtifactHeader>,
    )

    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByText('header content')).toBeInTheDocument()
  })
})

describe('ArtifactClose', () => {
  it('renders with sr-only "Close" text', () => {
    render(<ArtifactClose />)

    const btn = screen.getByRole('button', { name: 'Close' })
    expect(btn).toBeInTheDocument()
  })

  it('renders default XIcon when no children', () => {
    const { container } = render(<ArtifactClose />)

    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders custom children', () => {
    render(<ArtifactClose>Custom close</ArtifactClose>)

    const btn = screen.getByRole('button', { name: /Custom close/i })
    expect(btn).toBeInTheDocument()
    expect(screen.getByText('Custom close')).toBeInTheDocument()
  })
})

describe('ArtifactTitle', () => {
  it('renders text', () => {
    render(<ArtifactTitle>My Artifact</ArtifactTitle>)

    expect(screen.getByText('My Artifact')).toBeInTheDocument()
  })

  it('renders as p element', () => {
    render(<ArtifactTitle data-testid="title">Title</ArtifactTitle>)

    expect(screen.getByTestId('title').tagName).toBe('P')
  })
})

describe('ArtifactDescription', () => {
  it('renders text', () => {
    render(<ArtifactDescription>Some description</ArtifactDescription>)

    expect(screen.getByText('Some description')).toBeInTheDocument()
  })

  it('renders as p element', () => {
    render(<ArtifactDescription data-testid="desc">desc</ArtifactDescription>)

    expect(screen.getByTestId('desc').tagName).toBe('P')
  })
})

describe('ArtifactActions', () => {
  it('renders children', () => {
    render(
      <ArtifactActions data-testid="actions">
        <button>action 1</button>
      </ArtifactActions>,
    )

    expect(screen.getByTestId('actions')).toBeInTheDocument()
    expect(screen.getByText('action 1')).toBeInTheDocument()
  })
})

describe('ArtifactAction', () => {
  it('renders with icon', () => {
    render(<ArtifactAction icon={Edit2Icon} label="Edit" />)

    const btn = screen.getByRole('button', { name: 'Edit' })
    expect(btn).toBeInTheDocument()
    expect(btn.querySelector('svg')).toBeInTheDocument()
  })

  it('renders children when no icon', () => {
    render(<ArtifactAction label="Do thing">Click me</ArtifactAction>)

    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('renders tooltip when tooltip prop given', () => {
    render(<ArtifactAction icon={Edit2Icon} tooltip="Edit this" />)

    const btn = screen.getByRole('button', { name: 'Edit this' })
    expect(btn).toBeInTheDocument()
  })

  it('renders without tooltip when tooltip prop not given', () => {
    render(<ArtifactAction icon={Edit2Icon} label="Edit" />)

    const btn = screen.getByRole('button', { name: 'Edit' })
    expect(btn).toBeInTheDocument()
  })

  it('uses tooltip as sr-only text when label is not provided', () => {
    render(<ArtifactAction icon={Edit2Icon} tooltip="Edit tooltip" />)

    expect(screen.getByText('Edit tooltip', { selector: '.sr-only' })).toBeInTheDocument()
  })
})

describe('ArtifactContent', () => {
  it('renders children', () => {
    render(
      <ArtifactContent data-testid="content">
        <div>content area</div>
      </ArtifactContent>,
    )

    expect(screen.getByTestId('content')).toBeInTheDocument()
    expect(screen.getByText('content area')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<ArtifactContent data-testid="content" className="extra" />)

    expect(screen.getByTestId('content')).toHaveClass('extra')
  })
})
