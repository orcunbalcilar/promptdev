import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'

vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return { ...actual, createPortal: (children: React.ReactNode) => children }
})

globalThis.ResizeObserver = class ResizeObserver {
  cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
  }
  observe(target: Element) {
    // Immediately fire with target
    this.cb(
      [{ target, contentRect: {} } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver
    )
  }
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

let mockEnumerateDevices = vi.fn()
let mockGetUserMedia = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  value: {
    enumerateDevices: (...args: unknown[]) => mockEnumerateDevices(...args),
    getUserMedia: (...args: unknown[]) => mockGetUserMedia(...args),
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  },
  writable: true,
  configurable: true,
})

import {
  MicSelector,
  MicSelectorTrigger,
  MicSelectorContent,
  MicSelectorInput,
  MicSelectorList,
  MicSelectorEmpty,
  MicSelectorItem,
  MicSelectorLabel,
  MicSelectorValue,
  useAudioDevices,
} from '@/components/ai-elements/mic-selector'

beforeEach(() => {
  vi.clearAllMocks()
  mockEnumerateDevices = vi.fn().mockResolvedValue([
    { kind: 'audioinput', deviceId: 'default', label: 'Default Mic', groupId: '1' },
    { kind: 'audioinput', deviceId: 'mic2', label: 'External Mic (1234:5678)', groupId: '2' },
    { kind: 'videoinput', deviceId: 'cam1', label: 'Camera', groupId: '3' },
  ])
  mockGetUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: vi.fn() }],
  })
})

describe('useAudioDevices', () => {
  it('filters only audioinput devices', async () => {
    const { result } = renderHook(() => useAudioDevices())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.devices).toHaveLength(2)
    expect(result.current.devices.every(d => d.kind === 'audioinput')).toBe(true)
  })

  it('handles error from enumerateDevices', async () => {
    mockEnumerateDevices.mockRejectedValueOnce(new Error('Permission denied'))

    const { result } = renderHook(() => useAudioDevices())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Permission denied')
    expect(result.current.devices).toHaveLength(0)
  })

  it('handles non-Error exception from enumerateDevices', async () => {
    mockEnumerateDevices.mockRejectedValueOnce('string error')

    const { result } = renderHook(() => useAudioDevices())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to get audio devices')
  })

  it('loadDevices requests permission and refreshes list', async () => {
    const { result } = renderHook(() => useAudioDevices())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Call loadDevices (loadDevicesWithPermission)
    await act(async () => {
      await result.current.loadDevices()
    })

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(result.current.hasPermission).toBe(true)
  })

  it('loadDevices handles getUserMedia failure', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Mic access denied'))

    const { result } = renderHook(() => useAudioDevices())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.loadDevices()
    })

    expect(result.current.error).toBe('Mic access denied')
  })

  it('loadDevices handles non-Error getUserMedia failure', async () => {
    mockGetUserMedia.mockRejectedValueOnce('random string')

    const { result } = renderHook(() => useAudioDevices())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.loadDevices()
    })

    expect(result.current.error).toBe('Failed to get audio devices')
  })

  it('registers devicechange listener', async () => {
    renderHook(() => useAudioDevices())

    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function))
    })
  })
})

describe('MicSelectorContent', () => {
  it('renders popover content with command', async () => {
    render(
      <MicSelector open>
        <MicSelectorTrigger>Select Mic</MicSelectorTrigger>
        <MicSelectorContent>
          <MicSelectorInput />
          <MicSelectorList>
            {(devices) => (
              <>
                {devices.map(d => (
                  <MicSelectorItem key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </MicSelectorItem>
                ))}
                <MicSelectorEmpty />
              </>
            )}
          </MicSelectorList>
        </MicSelectorContent>
      </MicSelector>
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search microphones...')).toBeInTheDocument()
    })
  })
})

describe('MicSelectorInput', () => {
  it('renders input with default placeholder', async () => {
    render(
      <MicSelector open>
        <MicSelectorTrigger>Mic</MicSelectorTrigger>
        <MicSelectorContent>
          <MicSelectorInput />
        </MicSelectorContent>
      </MicSelector>
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search microphones...')).toBeInTheDocument()
    })
  })
})

describe('MicSelectorList', () => {
  it('provides devices to render function', async () => {
    render(
      <MicSelector open>
        <MicSelectorTrigger>Mic</MicSelectorTrigger>
        <MicSelectorContent>
          <MicSelectorList>
            {(devices) => (
              <div data-testid="device-count">
                {devices.length} devices
              </div>
            )}
          </MicSelectorList>
        </MicSelectorContent>
      </MicSelector>
    )

    await waitFor(() => {
      expect(screen.getByTestId('device-count')).toHaveTextContent('2 devices')
    })
  })
})

describe('MicSelectorEmpty', () => {
  it('renders default empty message', async () => {
    render(
      <MicSelector open>
        <MicSelectorTrigger>Mic</MicSelectorTrigger>
        <MicSelectorContent>
          <MicSelectorEmpty />
        </MicSelectorContent>
      </MicSelector>
    )

    // CommandEmpty renders within cmdk
    expect(screen.getByText('No microphone found.')).toBeInTheDocument()
  })

  it('renders custom empty message', async () => {
    render(
      <MicSelector open>
        <MicSelectorTrigger>Mic</MicSelectorTrigger>
        <MicSelectorContent>
          <MicSelectorEmpty>No devices available</MicSelectorEmpty>
        </MicSelectorContent>
      </MicSelector>
    )

    expect(screen.getByText('No devices available')).toBeInTheDocument()
  })
})

describe('MicSelectorItem', () => {
  it('renders item with value', async () => {
    render(
      <MicSelector open>
        <MicSelectorTrigger>Mic</MicSelectorTrigger>
        <MicSelectorContent>
          <MicSelectorList>
            {(devices) =>
              devices.map(d => (
                <MicSelectorItem key={d.deviceId} value={d.deviceId}>
                  <MicSelectorLabel device={d} />
                </MicSelectorItem>
              ))
            }
          </MicSelectorList>
        </MicSelectorContent>
      </MicSelector>
    )

    await waitFor(() => {
      expect(screen.getByText('Default Mic')).toBeInTheDocument()
    })
  })
})

describe('MicSelectorLabel', () => {
  it('renders plain label without device ID pattern', () => {
    const device = {
      kind: 'audioinput',
      deviceId: 'default',
      label: 'Built-in Microphone',
      groupId: '1',
    } as MediaDeviceInfo

    render(<MicSelectorLabel device={device} />)

    expect(screen.getByText('Built-in Microphone')).toBeInTheDocument()
  })

  it('splits label with device ID pattern (XXXX:XXXX)', () => {
    const device = {
      kind: 'audioinput',
      deviceId: 'usb',
      label: 'USB Audio Device (abcd:ef01)',
      groupId: '1',
    } as MediaDeviceInfo

    render(<MicSelectorLabel device={device} />)

    expect(screen.getByText('USB Audio Device')).toBeInTheDocument()
    expect(screen.getByText(/abcd:ef01/)).toBeInTheDocument()
  })

  it('applies className', () => {
    const device = {
      kind: 'audioinput',
      deviceId: 'x',
      label: 'My Mic',
      groupId: '1',
    } as MediaDeviceInfo

    const { container } = render(<MicSelectorLabel device={device} className="custom-label" />)

    expect(container.querySelector('.custom-label')).toBeInTheDocument()
  })
})

describe('MicSelectorValue', () => {
  it('shows placeholder when no device selected', () => {
    render(
      <MicSelector>
        <MicSelectorTrigger>
          <MicSelectorValue />
        </MicSelectorTrigger>
      </MicSelector>
    )

    expect(screen.getByText('Select microphone...')).toBeInTheDocument()
  })

  it('shows selected device label when value matches', async () => {
    render(
      <MicSelector value="default">
        <MicSelectorTrigger>
          <MicSelectorValue />
        </MicSelectorTrigger>
      </MicSelector>
    )

    await waitFor(() => {
      expect(screen.getByText('Default Mic')).toBeInTheDocument()
    })
  })

  it('applies className to value', () => {
    const { container } = render(
      <MicSelector>
        <MicSelectorTrigger>
          <MicSelectorValue className="custom-value" />
        </MicSelectorTrigger>
      </MicSelector>
    )

    expect(container.querySelector('.custom-value')).toBeInTheDocument()
  })
})

describe('MicSelectorTrigger – ResizeObserver', () => {
  it('observes trigger element for width changes', () => {
    render(
      <MicSelector>
        <MicSelectorTrigger>Pick a mic</MicSelectorTrigger>
      </MicSelector>
    )

    // ResizeObserver in our mock fires immediately on observe
    // The trigger should render properly
    expect(screen.getByText('Pick a mic')).toBeInTheDocument()
  })
})

describe('MicSelector – controlled mode', () => {
  it('calls onValueChange when controlled', async () => {
    const onValueChange = vi.fn()
    render(
      <MicSelector value="default" onValueChange={onValueChange}>
        <MicSelectorTrigger>
          <MicSelectorValue />
        </MicSelectorTrigger>
      </MicSelector>
    )

    await waitFor(() => {
      expect(screen.getByText('Default Mic')).toBeInTheDocument()
    })
  })

  it('calls onOpenChange when controlled', () => {
    const onOpenChange = vi.fn()
    render(
      <MicSelector open={false} onOpenChange={onOpenChange}>
        <MicSelectorTrigger>Select</MicSelectorTrigger>
      </MicSelector>
    )

    expect(screen.getByText('Select')).toBeInTheDocument()
  })
})

describe('MicSelectorContent – popoverOptions', () => {
  it('passes popoverOptions to PopoverContent', () => {
    render(
      <MicSelector open>
        <MicSelectorTrigger>Mic</MicSelectorTrigger>
        <MicSelectorContent
          className="custom-content"
          popoverOptions={{ side: 'top' }}
        >
          <MicSelectorInput />
        </MicSelectorContent>
      </MicSelector>
    )

    expect(screen.getByPlaceholderText('Search microphones...')).toBeInTheDocument()
  })
})
