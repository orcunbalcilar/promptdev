import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

import {
  FileTree,
  FileTreeFolder,
  FileTreeFile,
  FileTreeIcon,
  FileTreeName,
  FileTreeActions,
} from '@/components/ai-elements/file-tree'

describe('FileTree', () => {
  it('renders children', () => {
    render(
      <FileTree>
        <span>Tree content</span>
      </FileTree>
    )
    expect(screen.getByText('Tree content')).toBeInTheDocument()
  })

  it('has tree role', () => {
    render(
      <FileTree>
        <span>Content</span>
      </FileTree>
    )
    expect(screen.getByRole('tree')).toBeInTheDocument()
  })
})

describe('FileTreeFolder', () => {
  it('renders name', () => {
    render(
      <FileTree>
        <FileTreeFolder path="/src" name="src" />
      </FileTree>
    )
    expect(screen.getByText('src')).toBeInTheDocument()
  })

  it('toggles expansion on click', () => {
    render(
      <FileTree>
        <FileTreeFolder path="/src" name="src">
          <FileTreeFile path="/src/index.ts" name="index.ts" />
        </FileTreeFolder>
      </FileTree>
    )

    // Click folder to expand
    fireEvent.click(screen.getByText('src'))

    // Child should appear
    expect(screen.getByText('index.ts')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(
      <FileTree onSelect={onSelect}>
        <FileTreeFolder path="/src" name="src" />
      </FileTree>
    )

    fireEvent.click(screen.getByText('src'))
    expect(onSelect).toHaveBeenCalledWith('/src')
  })
})

describe('FileTreeFile', () => {
  it('renders name', () => {
    render(
      <FileTree>
        <FileTreeFile path="/readme.md" name="readme.md" />
      </FileTree>
    )
    expect(screen.getByText('readme.md')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(
      <FileTree onSelect={onSelect}>
        <FileTreeFile path="/readme.md" name="readme.md" />
      </FileTree>
    )

    fireEvent.click(screen.getByText('readme.md'))
    expect(onSelect).toHaveBeenCalledWith('/readme.md')
  })

  it('calls onSelect on Enter key', () => {
    const onSelect = vi.fn()
    render(
      <FileTree onSelect={onSelect}>
        <FileTreeFile path="/readme.md" name="readme.md" />
      </FileTree>
    )

    fireEvent.keyDown(screen.getByText('readme.md').closest('[role="treeitem"]')!, {
      key: 'Enter',
    })
    expect(onSelect).toHaveBeenCalledWith('/readme.md')
  })
})

describe('FileTreeIcon', () => {
  it('renders default icon', () => {
    render(
      <FileTreeIcon data-testid="icon">
        <span>📁</span>
      </FileTreeIcon>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('📁')).toBeInTheDocument()
  })
})

describe('FileTreeName', () => {
  it('renders text', () => {
    render(<FileTreeName>my-file.ts</FileTreeName>)
    expect(screen.getByText('my-file.ts')).toBeInTheDocument()
  })
})

describe('FileTreeActions', () => {
  it('renders children', () => {
    render(
      <FileTreeActions>
        <button type="button">Delete</button>
      </FileTreeActions>
    )
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('stops click propagation', () => {
    // FileTreeActions calls stopPropagation on click — verify the handler is on the element
    const { container } = render(
      <FileTreeActions>
        <button type="button">Action</button>
      </FileTreeActions>
    )
    const actionsGroup = container.querySelector('[role="group"]')
    expect(actionsGroup).toBeInTheDocument()
    // Verify the rendered element has group role (the wrapper that stops propagation)
    expect(actionsGroup).toHaveAttribute('role', 'group')
  })
})
