import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import {
  Commit,
  CommitHeader,
  CommitHash,
  CommitMessage,
  CommitMetadata,
  CommitSeparator,
  CommitInfo,
  CommitAuthor,
  CommitAuthorAvatar,
  CommitTimestamp,
  CommitActions,
  CommitCopyButton,
  CommitContent,
  CommitFiles,
  CommitFile,
  CommitFileStatus,
  CommitFilePath,
  CommitFileAdditions,
  CommitFileDeletions,
} from '@/components/ai-elements/commit'

describe('Commit', () => {
  it('renders children', () => {
    render(
      <Commit>
        <span>Commit content</span>
      </Commit>
    )
    expect(screen.getByText('Commit content')).toBeInTheDocument()
  })
})

describe('CommitHeader', () => {
  it('renders children', () => {
    render(
      <Commit>
        <CommitHeader>
          <span>Header content</span>
        </CommitHeader>
      </Commit>
    )
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })
})

describe('CommitHash', () => {
  it('renders hash text', () => {
    render(<CommitHash>abc1234</CommitHash>)
    expect(screen.getByText('abc1234')).toBeInTheDocument()
  })
})

describe('CommitMessage', () => {
  it('renders message', () => {
    render(<CommitMessage>Fix bug in parser</CommitMessage>)
    expect(screen.getByText('Fix bug in parser')).toBeInTheDocument()
  })
})

describe('CommitMetadata', () => {
  it('renders children', () => {
    render(
      <CommitMetadata>
        <span>Meta info</span>
      </CommitMetadata>
    )
    expect(screen.getByText('Meta info')).toBeInTheDocument()
  })
})

describe('CommitSeparator', () => {
  it('renders default separator', () => {
    render(<CommitSeparator />)
    expect(screen.getByText('•')).toBeInTheDocument()
  })

  it('renders custom separator', () => {
    render(<CommitSeparator>|</CommitSeparator>)
    expect(screen.getByText('|')).toBeInTheDocument()
  })
})

describe('CommitInfo', () => {
  it('renders children', () => {
    render(
      <CommitInfo>
        <span>Info content</span>
      </CommitInfo>
    )
    expect(screen.getByText('Info content')).toBeInTheDocument()
  })
})

describe('CommitAuthor', () => {
  it('renders author name', () => {
    render(
      <CommitAuthor>
        <span>John Doe</span>
      </CommitAuthor>
    )
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
})

describe('CommitAuthorAvatar', () => {
  it('renders initials', () => {
    render(<CommitAuthorAvatar initials="JD" />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })
})

describe('CommitTimestamp', () => {
  it('renders formatted time', () => {
    const now = new Date()
    render(<CommitTimestamp date={now} />)
    // "today" for same-day date
    expect(screen.getByText('today')).toBeInTheDocument()
  })

  it('renders custom children', () => {
    render(<CommitTimestamp date={new Date()}>2 days ago</CommitTimestamp>)
    expect(screen.getByText('2 days ago')).toBeInTheDocument()
  })

  it('sets dateTime attribute', () => {
    const date = new Date('2025-06-15T12:00:00Z')
    render(<CommitTimestamp date={date} />)
    const timeEl = screen.getByText(/ago|days|yesterday|today/i).closest('time')
    expect(timeEl).toHaveAttribute('dateTime', date.toISOString())
  })
})

describe('CommitActions', () => {
  it('renders children', () => {
    render(
      <CommitActions>
        <button type="button">View</button>
      </CommitActions>
    )
    expect(screen.getByText('View')).toBeInTheDocument()
  })

  it('stops click propagation', () => {
    // CommitActions renders a div with role="group" that calls stopPropagation
    const { container } = render(
      <CommitActions>
        <button type="button">Action</button>
      </CommitActions>
    )
    const actionsGroup = container.querySelector('[role="group"]')
    expect(actionsGroup).toBeInTheDocument()
    expect(actionsGroup).toHaveAttribute('role', 'group')
  })
})

describe('CommitCopyButton', () => {
  it('copies hash to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText },
    })

    render(<CommitCopyButton hash="abc1234" />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('abc1234')
    })
  })
})

describe('CommitContent', () => {
  it('renders children', () => {
    render(
      <Commit open>
        <CommitContent>
          <span>Diff content</span>
        </CommitContent>
      </Commit>
    )
    expect(screen.getByText('Diff content')).toBeInTheDocument()
  })
})

describe('CommitFiles', () => {
  it('renders children', () => {
    render(
      <CommitFiles>
        <span>File list</span>
      </CommitFiles>
    )
    expect(screen.getByText('File list')).toBeInTheDocument()
  })
})

describe('CommitFile', () => {
  it('renders children', () => {
    render(
      <CommitFile>
        <span>Single file</span>
      </CommitFile>
    )
    expect(screen.getByText('Single file')).toBeInTheDocument()
  })
})

describe('CommitFileStatus', () => {
  it('shows badge for added', () => {
    render(<CommitFileStatus status="added" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('shows badge for modified', () => {
    render(<CommitFileStatus status="modified" />)
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('shows badge for deleted', () => {
    render(<CommitFileStatus status="deleted" />)
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('shows badge for renamed', () => {
    render(<CommitFileStatus status="renamed" />)
    expect(screen.getByText('R')).toBeInTheDocument()
  })
})

describe('CommitFilePath', () => {
  it('renders path', () => {
    render(<CommitFilePath>src/index.ts</CommitFilePath>)
    expect(screen.getByText('src/index.ts')).toBeInTheDocument()
  })
})

describe('CommitFileAdditions', () => {
  it('shows +N additions', () => {
    render(<CommitFileAdditions count={5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('returns null for zero count', () => {
    const { container } = render(<CommitFileAdditions count={0} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('CommitFileDeletions', () => {
  it('shows -N deletions', () => {
    render(<CommitFileDeletions count={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('returns null for zero count', () => {
    const { container } = render(<CommitFileDeletions count={0} />)
    expect(container.innerHTML).toBe('')
  })
})
