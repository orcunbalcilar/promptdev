import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return { ...actual, createPortal: (children: React.ReactNode) => children }
})

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

Element.prototype.scrollIntoView = vi.fn()

import {
  VoiceSelector,
  VoiceSelectorTrigger,
  VoiceSelectorContent,
  VoiceSelectorList,
  VoiceSelectorItem,
  VoiceSelectorGender,
  VoiceSelectorAccent,
} from '@/components/ai-elements/voice-selector'

describe('VoiceSelector', () => {
  it('renders children', () => {
    render(
      <VoiceSelector>
        <VoiceSelectorTrigger>
          <button>Choose voice</button>
        </VoiceSelectorTrigger>
      </VoiceSelector>
    )

    expect(screen.getByText('Choose voice')).toBeInTheDocument()
  })
})

describe('VoiceSelectorTrigger', () => {
  it('renders trigger', () => {
    render(
      <VoiceSelector>
        <VoiceSelectorTrigger>
          <span>Select Voice</span>
        </VoiceSelectorTrigger>
      </VoiceSelector>
    )

    expect(screen.getByText('Select Voice')).toBeInTheDocument()
  })
})

describe('VoiceSelectorItem', () => {
  it('renders item within content', () => {
    render(
      <VoiceSelector open>
        <VoiceSelectorContent>
          <VoiceSelectorList>
            <VoiceSelectorItem value="alloy">Alloy</VoiceSelectorItem>
          </VoiceSelectorList>
        </VoiceSelectorContent>
      </VoiceSelector>
    )

    expect(screen.getByText('Alloy')).toBeInTheDocument()
  })
})

describe('VoiceSelectorGender', () => {
  it('renders male icon', () => {
    const { container } = render(<VoiceSelectorGender value="male" />)
    expect(container.querySelector('span')).toBeInTheDocument()
  })

  it('renders female icon', () => {
    const { container } = render(<VoiceSelectorGender value="female" />)
    expect(container.querySelector('span')).toBeInTheDocument()
  })

  it('renders default icon for unknown value', () => {
    const { container } = render(<VoiceSelectorGender />)
    expect(container.querySelector('span')).toBeInTheDocument()
  })

  it('renders custom children instead of icon', () => {
    render(<VoiceSelectorGender value="male">Custom Label</VoiceSelectorGender>)
    expect(screen.getByText('Custom Label')).toBeInTheDocument()
  })
})

describe('VoiceSelectorAccent', () => {
  it('renders American flag emoji', () => {
    render(<VoiceSelectorAccent value="american" />)
    expect(screen.getByText('🇺🇸')).toBeInTheDocument()
  })

  it('renders British flag emoji', () => {
    render(<VoiceSelectorAccent value="british" />)
    expect(screen.getByText('🇬🇧')).toBeInTheDocument()
  })

  it('renders Japanese flag emoji', () => {
    render(<VoiceSelectorAccent value="japanese" />)
    expect(screen.getByText('🇯🇵')).toBeInTheDocument()
  })

  it('renders nothing for unknown accent', () => {
    const { container } = render(<VoiceSelectorAccent value="unknown-accent" />)
    expect(container.querySelector('span')).toBeInTheDocument()
    expect(container.querySelector('span')!.textContent).toBe('')
  })

  it('renders custom children instead of emoji', () => {
    render(<VoiceSelectorAccent value="american">US English</VoiceSelectorAccent>)
    expect(screen.getByText('US English')).toBeInTheDocument()
  })
})
