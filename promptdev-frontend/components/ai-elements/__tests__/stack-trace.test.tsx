import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open, ...props }: any) => (
    <div data-testid="collapsible" data-open={open} {...props}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild, ...props }: any) => {
    if (asChild) return <>{children}</>
    return <button data-testid="collapsible-trigger" {...props}>{children}</button>
  },
  CollapsibleContent: ({ children, ...props }: any) => (
    <div data-testid="collapsible-content" {...props}>{children}</div>
  ),
}))

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined)
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
})

import {
  StackTrace,
  StackTraceHeader,
  StackTraceError,
  StackTraceErrorType,
  StackTraceErrorMessage,
  StackTraceCopyButton,
  StackTraceExpandButton,
  StackTraceContent,
  StackTraceFrames,
} from '@/components/ai-elements/stack-trace'

const sampleTrace = `TypeError: Cannot read property 'foo' of undefined
    at myFunction (/src/app.ts:10:5)
    at handler (/src/handler.ts:20:10)
    at Object.<anonymous> (node_modules/express/lib/router.js:50:3)`

describe('StackTrace', () => {
  it('renders children', () => {
    render(
      <StackTrace trace={sampleTrace}>
        <span>Stack trace child</span>
      </StackTrace>
    )
    expect(screen.getByText('Stack trace child')).toBeInTheDocument()
  })
})

describe('StackTraceHeader', () => {
  it('renders children', () => {
    render(
      <StackTrace trace={sampleTrace}>
        <StackTraceHeader>
          <span>Header content</span>
        </StackTraceHeader>
      </StackTrace>
    )
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })
})

describe('StackTraceError', () => {
  it('renders children with alert icon', () => {
    render(
      <StackTrace trace={sampleTrace}>
        <StackTraceError>
          <span>Error info</span>
        </StackTraceError>
      </StackTrace>
    )
    expect(screen.getByText('Error info')).toBeInTheDocument()
  })
})

describe('StackTraceErrorType', () => {
  it('renders type text from parsed trace', () => {
    render(
      <StackTrace trace={sampleTrace}>
        <StackTraceErrorType />
      </StackTrace>
    )
    expect(screen.getByText('TypeError')).toBeInTheDocument()
  })
})

describe('StackTraceErrorMessage', () => {
  it('renders message from parsed trace', () => {
    render(
      <StackTrace trace={sampleTrace}>
        <StackTraceErrorMessage />
      </StackTrace>
    )
    expect(screen.getByText("Cannot read property 'foo' of undefined")).toBeInTheDocument()
  })
})

describe('StackTraceCopyButton', () => {
  it('copies trace to clipboard', async () => {
    mockWriteText.mockClear()

    render(
      <StackTrace trace={sampleTrace}>
        <StackTraceCopyButton />
      </StackTrace>
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockWriteText).toHaveBeenCalledWith(sampleTrace)
  })
})

describe('StackTraceExpandButton', () => {
  it('renders chevron icon', () => {
    const { container } = render(
      <StackTrace trace={sampleTrace}>
        <StackTraceExpandButton />
      </StackTrace>
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})

describe('StackTraceContent', () => {
  it('renders children', () => {
    render(
      <StackTrace trace={sampleTrace} defaultOpen>
        <StackTraceContent>
          <span>Content inside</span>
        </StackTraceContent>
      </StackTrace>
    )
    expect(screen.getByText('Content inside')).toBeInTheDocument()
  })
})

describe('StackTraceFrames', () => {
  it('renders frame list', () => {
    render(
      <StackTrace trace={sampleTrace} defaultOpen>
        <StackTraceContent>
          <StackTraceFrames />
        </StackTraceContent>
      </StackTrace>
    )
    expect(screen.getByText('myFunction')).toBeInTheDocument()
    expect(screen.getByText('handler')).toBeInTheDocument()
  })

  it('renders file paths as buttons', () => {
    render(
      <StackTrace trace={sampleTrace} defaultOpen>
        <StackTraceContent>
          <StackTraceFrames />
        </StackTraceContent>
      </StackTrace>
    )
    expect(screen.getByText('/src/app.ts:10:5')).toBeInTheDocument()
    expect(screen.getByText('/src/handler.ts:20:10')).toBeInTheDocument()
  })

  it('filters internal frames when showInternalFrames is false', () => {
    render(
      <StackTrace trace={sampleTrace} defaultOpen>
        <StackTraceContent>
          <StackTraceFrames showInternalFrames={false} />
        </StackTraceContent>
      </StackTrace>
    )
    expect(screen.getByText('myFunction')).toBeInTheDocument()
    expect(screen.getByText('handler')).toBeInTheDocument()
    expect(screen.queryByText('Object.<anonymous>')).not.toBeInTheDocument()
  })

  it('calls onFilePathClick when clicking file path', () => {
    const onFilePathClick = vi.fn()
    render(
      <StackTrace trace={sampleTrace} defaultOpen onFilePathClick={onFilePathClick}>
        <StackTraceContent>
          <StackTraceFrames />
        </StackTraceContent>
      </StackTrace>
    )
    const filePathBtn = screen.getByText('/src/app.ts:10:5')
    fireEvent.click(filePathBtn)
    expect(onFilePathClick).toHaveBeenCalledWith('/src/app.ts', 10, 5)
  })
})
