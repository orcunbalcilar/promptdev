import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  TaskItemFile,
  TaskItem,
  Task,
  TaskTrigger,
  TaskContent,
} from '@/components/ai-elements/task'

describe('TaskItemFile', () => {
  it('renders children', () => {
    render(<TaskItemFile>file.ts</TaskItemFile>)

    expect(screen.getByText('file.ts')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<TaskItemFile data-testid="file" className="extra">f</TaskItemFile>)

    expect(screen.getByTestId('file')).toHaveClass('extra')
  })
})

describe('TaskItem', () => {
  it('renders children', () => {
    render(<TaskItem>Searching for results</TaskItem>)

    expect(screen.getByText('Searching for results')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<TaskItem data-testid="item" className="custom">text</TaskItem>)

    expect(screen.getByTestId('item')).toHaveClass('custom')
  })
})

describe('Task', () => {
  it('renders children (default open)', () => {
    render(
      <Task>
        <TaskTrigger title="Search task" />
        <TaskContent>
          <span>task content</span>
        </TaskContent>
      </Task>,
    )

    expect(screen.getByText('task content')).toBeInTheDocument()
  })

  it('is open by default', () => {
    render(
      <Task>
        <TaskTrigger title="Search" />
        <TaskContent>
          <span>visible content</span>
        </TaskContent>
      </Task>,
    )

    expect(screen.getByText('visible content')).toBeVisible()
  })
})

describe('TaskTrigger', () => {
  it('shows title text', () => {
    render(
      <Task>
        <TaskTrigger title="Research topic" />
      </Task>,
    )

    expect(screen.getByText('Research topic')).toBeInTheDocument()
  })

  it('renders SearchIcon svg', () => {
    const { container } = render(
      <Task>
        <TaskTrigger title="Search" />
      </Task>,
    )

    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders custom children instead of default layout', () => {
    render(
      <Task>
        <TaskTrigger title="unused">
          <button>Custom trigger</button>
        </TaskTrigger>
      </Task>,
    )

    expect(screen.getByText('Custom trigger')).toBeInTheDocument()
  })
})

describe('TaskContent', () => {
  it('renders children inside collapsible content', () => {
    render(
      <Task defaultOpen>
        <TaskContent>
          <span>inner content</span>
        </TaskContent>
      </Task>,
    )

    expect(screen.getByText('inner content')).toBeInTheDocument()
  })
})
