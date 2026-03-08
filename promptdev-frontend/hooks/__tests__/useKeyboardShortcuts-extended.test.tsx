import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

describe('useKeyboardShortcuts – extended', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fires handler when matching key is pressed', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler },
    ]))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not fire handler when key does not match', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler },
    ]))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', metaKey: true }))
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not fire handler when meta modifier is wrong', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler },
    ]))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: false }))
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('supports ctrlKey modifier', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'n', ctrlKey: true, handler },
    ]))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true }))
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('supports shiftKey modifier', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'p', shiftKey: true, handler },
    ]))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', shiftKey: true }))
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('supports altKey modifier', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'a', altKey: true, handler },
    ]))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', altKey: true }))
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores shortcuts when typing in INPUT by default', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler },
    ]))

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      Object.defineProperty(event, 'target', { value: input })
      window.dispatchEvent(event)
    })
    expect(handler).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('ignores shortcuts when typing in TEXTAREA by default', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler },
    ]))

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      Object.defineProperty(event, 'target', { value: textarea })
      window.dispatchEvent(event)
    })
    expect(handler).not.toHaveBeenCalled()
    document.body.removeChild(textarea)
  })

  it('fires handler in inputs when ignoreInputs is false', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler, ignoreInputs: false },
    ]))

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      Object.defineProperty(event, 'target', { value: input })
      window.dispatchEvent(event)
    })
    expect(handler).toHaveBeenCalledTimes(1)
    document.body.removeChild(input)
  })

  it('prevents default behavior when shortcut matches', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler },
    ]))

    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true })
    const preventSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })
    expect(preventSpy).toHaveBeenCalled()
  })

  it('handles case-insensitive key matching', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'K', metaKey: true, handler },
    ]))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('handles multiple shortcuts', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', metaKey: true, handler: handler1 },
      { key: 'n', metaKey: true, handler: handler2 },
    ]))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', metaKey: true }))
    })
    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).toHaveBeenCalledTimes(1)
  })

  it('cleans up event listener on unmount', () => {
    const handler = vi.fn()
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useKeyboardShortcuts([
      { key: 'k', handler },
    ]))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('does not fire when ctrl is pressed and ctrlKey is not required', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', handler },
    ]))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    })
    expect(handler).not.toHaveBeenCalled()
  })
})
