import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToTokens: vi.fn().mockReturnValue({
      tokens: [[{ content: 'const x = 1', color: '#000', fontStyle: 0 }]],
      fg: '#000',
      bg: '#fff',
    }),
    getLoadedLanguages: vi.fn().mockReturnValue(['typescript']),
  }),
}))

import {
  CodeBlock,
  CodeBlockContainer,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockFilename,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'

describe('CodeBlock', () => {
  it('renders code content', () => {
    render(
      <CodeBlock code="const x = 1" language="typescript" />
    )
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
  })

  it('renders with children', () => {
    render(
      <CodeBlock code="const x = 1" language="typescript">
        <CodeBlockHeader>
          <CodeBlockTitle>
            <CodeBlockFilename>test.ts</CodeBlockFilename>
          </CodeBlockTitle>
        </CodeBlockHeader>
      </CodeBlock>
    )
    expect(screen.getByText('test.ts')).toBeInTheDocument()
  })
})

describe('CodeBlockContainer', () => {
  it('renders children', () => {
    render(
      <CodeBlockContainer language="typescript">
        <span>Container content</span>
      </CodeBlockContainer>
    )
    expect(screen.getByText('Container content')).toBeInTheDocument()
  })

  it('sets data-language attribute', () => {
    const { container } = render(
      <CodeBlockContainer language="python">
        <span>Content</span>
      </CodeBlockContainer>
    )
    expect(container.querySelector('[data-language="python"]')).toBeInTheDocument()
  })
})

describe('CodeBlockHeader', () => {
  it('renders children', () => {
    render(
      <CodeBlockHeader>
        <span>Header content</span>
      </CodeBlockHeader>
    )
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })
})

describe('CodeBlockTitle', () => {
  it('renders text', () => {
    render(
      <CodeBlockTitle>
        <span>Title text</span>
      </CodeBlockTitle>
    )
    expect(screen.getByText('Title text')).toBeInTheDocument()
  })
})

describe('CodeBlockFilename', () => {
  it('renders filename', () => {
    render(<CodeBlockFilename>app.tsx</CodeBlockFilename>)
    expect(screen.getByText('app.tsx')).toBeInTheDocument()
  })
})

describe('CodeBlockActions', () => {
  it('renders children', () => {
    render(
      <CodeBlockActions>
        <button type="button">Copy</button>
      </CodeBlockActions>
    )
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })
})

describe('CodeBlockCopyButton', () => {
  it('copies code to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText },
    })

    render(
      <CodeBlock code="const x = 1" language="typescript">
        <CodeBlockHeader>
          <CodeBlockActions>
            <CodeBlockCopyButton />
          </CodeBlockActions>
        </CodeBlockHeader>
      </CodeBlock>
    )

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('const x = 1')
    })
  })
})

describe('CodeBlockContent', () => {
  it('renders code lines', () => {
    render(
      <CodeBlockContent code="const y = 2" language="typescript" />
    )
    expect(screen.getByText('const y = 2')).toBeInTheDocument()
  })

  it('renders with line numbers', () => {
    const { container } = render(
      <CodeBlockContent code="const z = 3" language="typescript" showLineNumbers />
    )
    expect(container.querySelector('code')).toBeInTheDocument()
  })
})
