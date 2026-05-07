import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorItem,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorName,
  ModelSelectorLogo,
} from '@/components/ai-elements/model-selector'

describe('ModelSelector', () => {
  it('renders children', () => {
    render(
      <ModelSelector>
        <ModelSelectorTrigger>
          <button>Select model</button>
        </ModelSelectorTrigger>
      </ModelSelector>
    )

    expect(screen.getByText('Select model')).toBeInTheDocument()
  })
})

describe('ModelSelectorTrigger', () => {
  it('renders trigger button', () => {
    render(
      <ModelSelector>
        <ModelSelectorTrigger>
          <button>Choose</button>
        </ModelSelectorTrigger>
      </ModelSelector>
    )

    expect(screen.getByText('Choose')).toBeInTheDocument()
  })
})

describe('ModelSelectorContent', () => {
  it('renders content when dialog is open', () => {
    render(
      <ModelSelector open>
        <ModelSelectorContent>
          <ModelSelectorItem>GPT-4</ModelSelectorItem>
        </ModelSelectorContent>
      </ModelSelector>
    )

    expect(screen.getByText('GPT-4')).toBeInTheDocument()
  })
})

describe('ModelSelectorItem', () => {
  it('renders item', () => {
    render(
      <ModelSelector open>
        <ModelSelectorContent>
          <ModelSelectorItem>Claude 3.5</ModelSelectorItem>
        </ModelSelectorContent>
      </ModelSelector>
    )

    expect(screen.getByText('Claude 3.5')).toBeInTheDocument()
  })
})

describe('ModelSelectorEmpty', () => {
  it('renders empty message', () => {
    render(
      <ModelSelector open>
        <ModelSelectorContent>
          <ModelSelectorEmpty>No models found</ModelSelectorEmpty>
        </ModelSelectorContent>
      </ModelSelector>
    )

    expect(screen.getByText('No models found')).toBeInTheDocument()
  })
})

describe('ModelSelectorGroup', () => {
  it('renders group', () => {
    render(
      <ModelSelector open>
        <ModelSelectorContent>
          <ModelSelectorGroup heading="OpenAI">
            <ModelSelectorItem>GPT-4</ModelSelectorItem>
          </ModelSelectorGroup>
        </ModelSelectorContent>
      </ModelSelector>
    )

    expect(screen.getByText('GPT-4')).toBeInTheDocument()
  })
})

describe('ModelSelectorName', () => {
  it('renders name text', () => {
    render(<ModelSelectorName>GPT-4 Turbo</ModelSelectorName>)

    expect(screen.getByText('GPT-4 Turbo')).toBeInTheDocument()
  })
})

describe('ModelSelectorLogo', () => {
  it('renders logo img with correct src for known providers', () => {
    render(<ModelSelectorLogo provider="openai" />)

    const img = screen.getByAltText('openai logo')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://models.dev/logos/openai.svg')
  })

  it('renders logo for anthropic provider', () => {
    render(<ModelSelectorLogo provider="anthropic" />)

    const img = screen.getByAltText('anthropic logo')
    expect(img).toHaveAttribute(
      'src',
      'https://models.dev/logos/anthropic.svg'
    )
  })

  it('renders logo for google provider', () => {
    render(<ModelSelectorLogo provider="google" />)

    const img = screen.getByAltText('google logo')
    expect(img).toHaveAttribute('src', 'https://models.dev/logos/google.svg')
  })

  it('applies className', () => {
    render(<ModelSelectorLogo provider="openai" className="custom-logo" />)

    expect(screen.getByAltText('openai logo')).toHaveClass('custom-logo')
  })
})
