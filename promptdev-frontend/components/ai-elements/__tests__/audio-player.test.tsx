import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('media-chrome/react', () => ({
  MediaController: ({ children, className, ...props }: Record<string, unknown>) => (
    <div data-testid="media-controller" className={className as string} {...props}>
      {children as React.ReactNode}
    </div>
  ),
  MediaControlBar: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="control-bar" {...props}>
      {children as React.ReactNode}
    </div>
  ),
  MediaPlayButton: (props: Record<string, unknown>) => <button data-testid="play-button" {...props} />,
  MediaSeekBackwardButton: (props: Record<string, unknown>) => (
    <button data-testid="seek-backward" {...props} />
  ),
  MediaSeekForwardButton: (props: Record<string, unknown>) => (
    <button data-testid="seek-forward" {...props} />
  ),
  MediaTimeDisplay: (props: Record<string, unknown>) => <span data-testid="time-display" {...props} />,
  MediaTimeRange: (props: Record<string, unknown>) => <input data-testid="time-range" {...props} />,
  MediaDurationDisplay: (props: Record<string, unknown>) => (
    <span data-testid="duration-display" {...props} />
  ),
  MediaMuteButton: (props: Record<string, unknown>) => <button data-testid="mute-button" {...props} />,
  MediaVolumeRange: (props: Record<string, unknown>) => <input data-testid="volume-range" {...props} />,
}))

import {
  AudioPlayer,
  AudioPlayerElement,
  AudioPlayerControlBar,
  AudioPlayerPlayButton,
  AudioPlayerSeekBackwardButton,
  AudioPlayerSeekForwardButton,
  AudioPlayerTimeDisplay,
  AudioPlayerTimeRange,
  AudioPlayerDurationDisplay,
  AudioPlayerMuteButton,
  AudioPlayerVolumeRange,
} from '@/components/ai-elements/audio-player'

describe('AudioPlayer', () => {
  it('renders children with className', () => {
    render(
      <AudioPlayer className="custom-player">
        <span>Player content</span>
      </AudioPlayer>
    )

    const controller = screen.getByTestId('media-controller')
    expect(controller).toBeInTheDocument()
    expect(controller).toHaveClass('custom-player')
    expect(screen.getByText('Player content')).toBeInTheDocument()
  })
})

describe('AudioPlayerElement', () => {
  it('renders audio element with src prop', () => {
    const { container } = render(<AudioPlayerElement src="https://example.com/audio.mp3" />)

    const audio = container.querySelector('audio')
    expect(audio).toBeInTheDocument()
    expect(audio).toHaveAttribute('src', 'https://example.com/audio.mp3')
    expect(audio).toHaveAttribute('data-slot', 'audio-player-element')
  })

  it('renders audio element with data prop (base64)', () => {
    const { container } = render(
      <AudioPlayerElement
        data={{ mediaType: 'audio/mp3', base64: 'dGVzdA==' }}
      />
    )

    const audio = container.querySelector('audio')
    expect(audio).toBeInTheDocument()
    expect(audio).toHaveAttribute('src', 'data:audio/mp3;base64,dGVzdA==')
  })
})

describe('AudioPlayerControlBar', () => {
  it('renders children inside control bar', () => {
    render(
      <AudioPlayerControlBar>
        <span>Controls</span>
      </AudioPlayerControlBar>
    )

    expect(screen.getByTestId('control-bar')).toBeInTheDocument()
    expect(screen.getByText('Controls')).toBeInTheDocument()
  })
})

describe('AudioPlayerPlayButton', () => {
  it('renders play button', () => {
    render(<AudioPlayerPlayButton />)

    expect(screen.getByTestId('play-button')).toBeInTheDocument()
  })
})

describe('AudioPlayerSeekBackwardButton', () => {
  it('renders seek backward button with default offset', () => {
    render(<AudioPlayerSeekBackwardButton />)

    const btn = screen.getByTestId('seek-backward')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('data-slot', 'audio-player-seek-backward-button')
  })
})

describe('AudioPlayerSeekForwardButton', () => {
  it('renders seek forward button with default offset', () => {
    render(<AudioPlayerSeekForwardButton />)

    const btn = screen.getByTestId('seek-forward')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('data-slot', 'audio-player-seek-forward-button')
  })
})

describe('AudioPlayerTimeDisplay', () => {
  it('renders time display', () => {
    render(<AudioPlayerTimeDisplay />)

    const el = screen.getByTestId('time-display')
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('data-slot', 'audio-player-time-display')
  })
})

describe('AudioPlayerTimeRange', () => {
  it('renders time range', () => {
    render(<AudioPlayerTimeRange />)

    const el = screen.getByTestId('time-range')
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('data-slot', 'audio-player-time-range')
  })
})

describe('AudioPlayerDurationDisplay', () => {
  it('renders duration display', () => {
    render(<AudioPlayerDurationDisplay />)

    const el = screen.getByTestId('duration-display')
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('data-slot', 'audio-player-duration-display')
  })
})

describe('AudioPlayerMuteButton', () => {
  it('renders mute button', () => {
    render(<AudioPlayerMuteButton />)

    const el = screen.getByTestId('mute-button')
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('data-slot', 'audio-player-mute-button')
  })
})

describe('AudioPlayerVolumeRange', () => {
  it('renders volume range', () => {
    render(<AudioPlayerVolumeRange />)

    const el = screen.getByTestId('volume-range')
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('data-slot', 'audio-player-volume-range')
  })
})
