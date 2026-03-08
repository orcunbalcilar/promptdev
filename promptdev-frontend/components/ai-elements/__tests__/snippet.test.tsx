import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import {
  Snippet,
  SnippetAddon,
  SnippetText,
  SnippetInput,
  SnippetCopyButton,
} from '@/components/ai-elements/snippet'

describe('Snippet', () => {
  it('renders children', () => {
    render(
      <Snippet code="npm install test">
        <span>child content</span>
      </Snippet>,
    )

    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Snippet code="test" data-testid="snippet" className="my-class">
        <span>content</span>
      </Snippet>,
    )

    expect(screen.getByTestId('snippet')).toHaveClass('my-class')
  })
})

describe('SnippetText', () => {
  it('renders text', () => {
    render(
      <Snippet code="test">
        <SnippetText>$</SnippetText>
      </Snippet>,
    )

    expect(screen.getByText('$')).toBeInTheDocument()
  })
})

describe('SnippetInput', () => {
  it('renders input with code value', () => {
    render(
      <Snippet code="npm install react">
        <SnippetInput />
      </Snippet>,
    )

    const input = screen.getByDisplayValue('npm install react')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('readonly')
  })
})

describe('SnippetAddon', () => {
  it('renders children', () => {
    render(
      <Snippet code="test">
        <SnippetAddon>
          <span>addon content</span>
        </SnippetAddon>
      </Snippet>,
    )

    expect(screen.getByText('addon content')).toBeInTheDocument()
  })
})

describe('SnippetCopyButton', () => {
  it('copies text to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText },
    })

    render(
      <Snippet code="npm install react">
        <SnippetCopyButton />
      </Snippet>,
    )

    const button = screen.getByRole('button', { name: 'Copy' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('npm install react')
    })
  })

  it('calls onCopy callback after copying', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText },
    })
    const onCopy = vi.fn()

    render(
      <Snippet code="test-code">
        <SnippetCopyButton onCopy={onCopy} />
      </Snippet>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => {
      expect(onCopy).toHaveBeenCalled()
    })
  })

  it('calls onError when clipboard is unavailable', () => {
    Object.assign(navigator, {
      clipboard: undefined,
    })
    const onError = vi.fn()

    render(
      <Snippet code="test">
        <SnippetCopyButton onError={onError} />
      </Snippet>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(onError).toHaveBeenCalled()
  })
})
