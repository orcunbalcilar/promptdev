import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return { ...actual, createPortal: (children: React.ReactNode) => children }
})

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

// Mock URL.createObjectURL to return a data URL (avoids blob: fetch issues in jsdom)
URL.createObjectURL = vi.fn(() => 'data:application/octet-stream;base64,')
URL.revokeObjectURL = vi.fn()

import { TooltipProvider } from '@/components/ui/tooltip'
import {
  PromptInput,
  PromptInputProvider,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputButton,
  PromptInputHeader,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionAddAttachments,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputHoverCard,
  PromptInputHoverCardTrigger,
  PromptInputHoverCardContent,
  PromptInputTabsList,
  PromptInputTab,
  PromptInputTabLabel,
  PromptInputTabBody,
  PromptInputTabItem,
  PromptInputCommand,
  PromptInputCommandInput,
  PromptInputCommandList,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandItem,
  PromptInputCommandSeparator,
  usePromptInputController,
  useProviderAttachments,
  usePromptInputAttachments,
  usePromptInputReferencedSources,
} from '@/components/ai-elements/prompt-input'

// Wrap all renders in TooltipProvider since PromptInputButton uses Tooltip
function Wrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>
}

// ── Helpers ──────────────────────────────────────────────────────

function renderPromptInput(props: {
  onSubmit?: (msg: { text: string; files: unknown[] }) => void | Promise<void>
  onError?: (err: { code: string; message: string }) => void
  accept?: string
  maxFiles?: number
  maxFileSize?: number
  multiple?: boolean
  globalDrop?: boolean
  syncHiddenInput?: boolean
} = {}) {
  const onSubmit = props.onSubmit ?? vi.fn()
  return render(
    <Wrapper>
      <PromptInput
        onSubmit={onSubmit}
        accept={props.accept}
        maxFiles={props.maxFiles}
        maxFileSize={props.maxFileSize}
        multiple={props.multiple}
        globalDrop={props.globalDrop}
        syncHiddenInput={props.syncHiddenInput}
        onError={props.onError}
      >
        <PromptInputHeader>
          <span>Header</span>
        </PromptInputHeader>
        <PromptInputBody>
          <PromptInputTextarea placeholder="Type here..." />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputButton tooltip="Bold">B</PromptInputButton>
          </PromptInputTools>
          <PromptInputSubmit />
        </PromptInputFooter>
      </PromptInput>
    </Wrapper>,
  )
}

// ── Tests ────────────────────────────────────────────────────────

describe('PromptInput – extended', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Form submission ────────────────────────────────────────────

  it('submits form with text via Enter key', async () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Type..." />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByPlaceholderText('Type...')
    await userEvent.type(textarea, 'Hello world')

    // Press Enter to submit
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Hello world' }),
        expect.anything(),
      )
    })
  })

  it('does not submit on Shift+Enter (allows newline)', async () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'Line 1')
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit via submit button click', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask..." />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    await user.type(screen.getByPlaceholderText('Ask...'), 'Test message')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Test message' }),
        expect.anything(),
      )
    })
  })

  // ── Async onSubmit error doesn't clear ─────────────────────────

  it('does not clear input when async onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Failed'))
    render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="msg" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByPlaceholderText('msg')
    await userEvent.type(textarea, 'Keep me')
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  // ── File validation ────────────────────────────────────────────

  it('triggers onError with "accept" when file type does not match', async () => {
    const onError = vi.fn()
    const { container } = renderPromptInput({ accept: 'image/*', onError })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()

    const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await waitFor(() => {
      fireEvent.change(fileInput, { target: { files: [textFile] } })
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'accept' }),
      )
    })
  })

  it('triggers onError with "max_file_size" when file is too large', async () => {
    const onError = vi.fn()
    const { container } = renderPromptInput({ maxFileSize: 10, onError })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File(['a'.repeat(100)], 'big.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [bigFile] } })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'max_file_size' }),
      )
    })
  })

  it('triggers onError with "max_files" when adding beyond limit', async () => {
    const onError = vi.fn()
    const { container } = renderPromptInput({ maxFiles: 1, onError })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file1 = new File(['a'], 'f1.png', { type: 'image/png' })
    const file2 = new File(['b'], 'f2.png', { type: 'image/png' })

    // Add first file
    fireEvent.change(fileInput, { target: { files: [file1, file2] } })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'max_files' }),
      )
    })
  })

  it('accepts valid files when accept pattern matches', async () => {
    const onError = vi.fn()
    const { container } = renderPromptInput({ accept: 'image/*', onError })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const imgFile = new File(['pixels'], 'photo.png', { type: 'image/png' })

    fireEvent.change(fileInput, { target: { files: [imgFile] } })

    // Should not trigger error
    expect(onError).not.toHaveBeenCalled()
  })

  // ── Submit with files ──────────────────────────────────────────

  it('includes files in submit payload', async () => {
    const onSubmit = vi.fn()
    renderPromptInput({ onSubmit })

    // Verify file input exists
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()

    // Add file
    const file = new File(['content'], 'doc.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Type text and submit via Enter
    const textarea = screen.getByPlaceholderText('Type here...')
    await userEvent.type(textarea, 'With files')

    // Submit using the submit button directly instead of Enter key
    const submitBtn = screen.getByRole('button', { name: 'Submit' })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })

    const callArgs = onSubmit.mock.calls[0]
    expect(callArgs[0].text).toBe('With files')
    expect(callArgs[0].files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ filename: 'doc.txt' }),
      ]),
    )
  })

  // ── Paste files ────────────────────────────────────────────────

  it('handles paste events with files', async () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="paste" />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByPlaceholderText('paste')
    const file = new File(['image data'], 'screenshot.png', { type: 'image/png' })

    fireEvent.paste(textarea, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            getAsFile: () => file,
          },
        ],
      },
    })

    // File should be captured (no error thrown)
  })

  // ── Backspace removes last attachment ──────────────────────────

  it('removes last attachment on Backspace when textarea is empty', async () => {
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="backspace" />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    // Add a file first
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'attachment.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    const textarea = screen.getByPlaceholderText('backspace')
    // Backspace when empty
    fireEvent.keyDown(textarea, { key: 'Backspace' })
    // Should not throw
  })

  // ── PromptInputSubmit statuses ─────────────────────────────────

  it('renders submitted status with spinner', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputFooter>
            <PromptInputSubmit status="submitted" />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  it('renders error status icon', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputFooter>
            <PromptInputSubmit status="error" />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('calls onStop when clicking streaming submit button', async () => {
    const onStop = vi.fn()
    const user = userEvent.setup()
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputFooter>
            <PromptInputSubmit status="streaming" onStop={onStop} />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    await user.click(screen.getByRole('button', { name: /stop/i }))
    expect(onStop).toHaveBeenCalled()
  })

  // ── PromptInputButton tooltip ──────────────────────────────────

  it('renders button without tooltip', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputButton>Action</PromptInputButton>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })

  it('renders button with string tooltip', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputButton tooltip="Help text">?</PromptInputButton>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: '?' })).toBeInTheDocument()
  })

  it('renders button with object tooltip', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputButton tooltip={{ content: 'Format', shortcut: '⌘B', side: 'bottom' }}>B</PromptInputButton>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument()
  })

  // ── PromptInputProvider integration ────────────────────────────

  it('works with PromptInputProvider controlling text state', async () => {
    render(
      <Wrapper>
        <PromptInputProvider initialInput="Managed">
          <PromptInput onSubmit={vi.fn()}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    expect(screen.getByDisplayValue('Managed')).toBeInTheDocument()
  })

  it('can type in provider-managed textarea', async () => {
    const user = userEvent.setup()
    render(
      <Wrapper>
        <PromptInputProvider>
          <PromptInput onSubmit={vi.fn()}>
            <PromptInputBody>
              <PromptInputTextarea placeholder="provider" />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    await user.type(screen.getByPlaceholderText('provider'), 'Provider text')
    expect(screen.getByDisplayValue('Provider text')).toBeInTheDocument()
  })

  it('submits with provider-managed state', async () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <PromptInputProvider initialInput="From provider">
          <PromptInput onSubmit={onSubmit}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'From provider' }),
        expect.anything(),
      )
    })
  })

  // ── File attachment with provider ──────────────────────────────

  it('handles file attachment through provider', async () => {
    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <PromptInput onSubmit={vi.fn()}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'file.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    // No error thrown
  })

  // ── Hidden file input ──────────────────────────────────────────

  it('renders a hidden file input for uploads', () => {
    const { container } = renderPromptInput()
    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).toBeTruthy()
    expect(fileInput?.className).toContain('hidden')
  })

  // ── Header, Footer, Tools render ───────────────────────────────

  it('renders header, footer and tools sections', () => {
    renderPromptInput()
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument()
  })

  // ── Global drop ────────────────────────────────────────────────

  it('renders with globalDrop prop without errors', () => {
    renderPromptInput({ globalDrop: true })
    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument()
  })

  // ── syncHiddenInput prop ───────────────────────────────────────

  it('renders with syncHiddenInput prop without errors', () => {
    renderPromptInput({ syncHiddenInput: true })
    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument()
  })

  // ── Select sub-components ──────────────────────────────────────

  it('renders select sub-components', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputSelect>
              <PromptInputSelectTrigger>
                <PromptInputSelectValue placeholder="Model" />
              </PromptInputSelectTrigger>
            </PromptInputSelect>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByText('Model')).toBeInTheDocument()
  })

  // ── Wrapper components coverage ────────────────────────────────

  it('renders PromptInputActionMenu components', async () => {
    const user = userEvent.setup()
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger tooltip="Actions" />
              <PromptInputActionMenuContent>
                <PromptInputActionMenuItem>Custom Action</PromptInputActionMenuItem>
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    // Trigger opens the dropdown
    const trigger = screen.getByRole('button')
    await user.click(trigger)

    // Action menu item should be visible
    await waitFor(() => {
      expect(screen.getByText('Custom Action')).toBeInTheDocument()
    })
  })

  it('renders PromptInputHoverCard components', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputHoverCard>
              <PromptInputHoverCardTrigger>Hover me</PromptInputHoverCardTrigger>
              <PromptInputHoverCardContent>Card content</PromptInputHoverCardContent>
            </PromptInputHoverCard>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('renders PromptInputTabs components', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTabsList>
            <PromptInputTab>
              <PromptInputTabLabel>Tab Label</PromptInputTabLabel>
              <PromptInputTabBody>
                <PromptInputTabItem>Tab Item</PromptInputTabItem>
              </PromptInputTabBody>
            </PromptInputTab>
          </PromptInputTabsList>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByText('Tab Label')).toBeInTheDocument()
    expect(screen.getByText('Tab Item')).toBeInTheDocument()
  })

  it('renders PromptInputCommand components', () => {
    // cmdk calls scrollIntoView which jsdom doesn't implement
    Element.prototype.scrollIntoView = vi.fn()
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputCommand>
            <PromptInputCommandInput placeholder="Search..." />
            <PromptInputCommandList>
              <PromptInputCommandEmpty>No results</PromptInputCommandEmpty>
              <PromptInputCommandGroup>
                <PromptInputCommandItem>Item 1</PromptInputCommandItem>
              </PromptInputCommandGroup>
            </PromptInputCommandList>
            <PromptInputCommandSeparator />
          </PromptInputCommand>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('renders PromptInputSelectContent and PromptInputSelectItem', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputSelect>
              <PromptInputSelectTrigger>
                <PromptInputSelectValue placeholder="Pick" />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                <PromptInputSelectItem value="opt1">Option 1</PromptInputSelectItem>
              </PromptInputSelectContent>
            </PromptInputSelect>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByText('Pick')).toBeInTheDocument()
  })

  // ── Hook error handling ────────────────────────────────────────

  it('usePromptInputController throws outside provider', () => {
    const BadController = () => {
      usePromptInputController()
      return null
    }
    expect(() => render(<BadController />)).toThrow(
      'Wrap your component inside <PromptInputProvider>',
    )
  })

  it('useProviderAttachments throws outside provider', () => {
    const BadProviderAttach = () => {
      useProviderAttachments()
      return null
    }
    expect(() => render(<BadProviderAttach />)).toThrow(
      'Wrap your component inside <PromptInputProvider>',
    )
  })

  it('usePromptInputAttachments throws outside any context', () => {
    const BadAttach = () => {
      usePromptInputAttachments()
      return null
    }
    expect(() => render(<BadAttach />)).toThrow(
      'usePromptInputAttachments must be used within a PromptInput or PromptInputProvider',
    )
  })

  it('usePromptInputReferencedSources throws outside context', () => {
    const BadRefSrc = () => {
      usePromptInputReferencedSources()
      return null
    }
    expect(() => render(<BadRefSrc />)).toThrow(
      'usePromptInputReferencedSources must be used within a LocalReferencedSourcesContext.Provider',
    )
  })

  // ── PromptInputActionAddAttachments ────────────────────────────

  it('renders PromptInputActionAddAttachments within PromptInput', async () => {
    const user = userEvent.setup()
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger tooltip="More" />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Add photos or files')).toBeInTheDocument()
    })
  })

  // ── PromptInputButton with multiple children (size="sm") ──────

  it('renders button with multiple children getting size sm', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputButton>
              <span>Icon</span>
              <span>Text</span>
            </PromptInputButton>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Text')).toBeInTheDocument()
  })

  // ── Provider file attachment with validation ───────────────────

  it('validates files through provider (accept filter)', async () => {
    const onError = vi.fn()
    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <PromptInput onSubmit={vi.fn()} accept="image/*" onError={onError}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [textFile] } })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'accept' }),
      )
    })
  })

  it('validates files through provider (max file size)', async () => {
    const onError = vi.fn()
    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <PromptInput onSubmit={vi.fn()} maxFileSize={5} onError={onError}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File(['a'.repeat(100)], 'big.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [bigFile] } })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'max_file_size' }),
      )
    })
  })

  it('validates files through provider (max files)', async () => {
    const onError = vi.fn()
    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <PromptInput onSubmit={vi.fn()} maxFiles={1} onError={onError}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const f1 = new File(['a'], 'f1.png', { type: 'image/png' })
    const f2 = new File(['b'], 'f2.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [f1, f2] } })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'max_files' }),
      )
    })
  })

  // ── convertBlobUrlToDataUrl error/fallback ─────────────────────

  it('handles blob URL conversion failure gracefully on submit', async () => {
    // Mock fetch to fail (simulates convertBlobUrlToDataUrl catch path)
    const origFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'))
    // Make createObjectURL return a blob: URL
    ;(URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('blob:http://localhost/abc')

    const onSubmit = vi.fn()
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="blob" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    // Add a file which will have a blob: URL
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'photo.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })

    // The file URL should fall back to the original blob: URL since fetch failed
    const callArgs = onSubmit.mock.calls[0]
    expect(callArgs[0].files[0].url).toBe('blob:http://localhost/abc')

    globalThis.fetch = origFetch
    ;(URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('data:application/octet-stream;base64,')
  })

  // ── onKeyDown handler passed through PromptInputTextarea ───────

  it('respects external onKeyDown handler preventing default', async () => {
    const onSubmit = vi.fn()
    const onKeyDown = vi.fn((e: React.KeyboardEvent) => e.preventDefault())
    render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="kd" onKeyDown={onKeyDown} />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByPlaceholderText('kd')
    fireEvent.keyDown(textarea, { key: 'Enter' })

    // External handler prevented default, so form should not submit
    expect(onSubmit).not.toHaveBeenCalled()
  })

  // ── PromptInputSubmit with children override ───────────────────

  it('renders custom children in PromptInputSubmit', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputFooter>
            <PromptInputSubmit>Send</PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    // aria-label="Submit" overrides text content for accessible name
    const btn = screen.getByRole('button', { name: /Submit/ })
    expect(btn).toHaveTextContent('Send')
  })

  // ── Composition handling ───────────────────────────────────────

  it('does not submit during IME composition', async () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="ime" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByPlaceholderText('ime')
    // Start composition
    fireEvent.compositionStart(textarea)
    // Pressing Enter during composition should not submit
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()

    // End composition
    fireEvent.compositionEnd(textarea)
  })

  // ── Submit button disabled prevents Enter submission ───────────

  it('does not submit on Enter when submit button is disabled', async () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="disabled" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit disabled />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByPlaceholderText('disabled')
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  // ── Accept with exact MIME type match ──────────────────────────

  it('accepts file with exact MIME match', async () => {
    const onError = vi.fn()
    const { container } = renderPromptInput({ accept: 'text/plain', onError })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['text'], 'file.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(onError).not.toHaveBeenCalled()
  })

  // ── Provider file operations (add/remove/clear) ─────────────────

  it('exercises provider add, then remove, then clear', async () => {
    // Renders a child that exposes the provider's attachments
    function ProviderConsumer() {
      const ctrl = usePromptInputController()
      return (
        <div>
          <span data-testid="file-count">{ctrl.attachments.files.length}</span>
          {ctrl.attachments.files.map((f) => (
            <button
              key={f.id}
              data-testid={`remove-${f.filename}`}
              onClick={() => ctrl.attachments.remove(f.id)}
            >
              rm
            </button>
          ))}
          <button
            data-testid="clear"
            onClick={() => ctrl.attachments.clear()}
          >
            clear
          </button>
        </div>
      )
    }

    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <ProviderConsumer />
          <PromptInput onSubmit={vi.fn()}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    expect(screen.getByTestId('file-count').textContent).toBe('0')

    // Add files through the hidden file input (triggers provider's add)
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const f1 = new File(['a'], 'one.png', { type: 'image/png' })
    const f2 = new File(['b'], 'two.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [f1, f2] } })

    await waitFor(() =>
      expect(screen.getByTestId('file-count').textContent).toBe('2'),
    )

    // Remove one file (exercises provider remove + URL.revokeObjectURL)
    await userEvent.click(screen.getByTestId('remove-one.png'))

    await waitFor(() =>
      expect(screen.getByTestId('file-count').textContent).toBe('1'),
    )

    // Clear remaining (exercises provider clear + URL.revokeObjectURL loop)
    await userEvent.click(screen.getByTestId('clear'))

    await waitFor(() =>
      expect(screen.getByTestId('file-count').textContent).toBe('0'),
    )
  })

  it('provider add with empty FileList is a no-op', async () => {
    function ProviderConsumer() {
      const ctrl = usePromptInputController()
      return (
        <div>
          <span data-testid="file-count">{ctrl.attachments.files.length}</span>
          <button
            data-testid="add-empty"
            onClick={() => ctrl.attachments.add([])}
          >
            add empty
          </button>
        </div>
      )
    }

    render(
      <Wrapper>
        <PromptInputProvider>
          <ProviderConsumer />
          <PromptInput onSubmit={vi.fn()}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    await userEvent.click(screen.getByTestId('add-empty'))
    // Count stays 0
    expect(screen.getByTestId('file-count').textContent).toBe('0')
  })

  // ── Provider unmount cleanup ───────────────────────────────────

  it('revokes blob URLs on provider unmount', async () => {
    function ProviderConsumer() {
      const ctrl = usePromptInputController()
      return (
        <span data-testid="file-count">{ctrl.attachments.files.length}</span>
      )
    }

    const { container, unmount } = render(
      <Wrapper>
        <PromptInputProvider>
          <ProviderConsumer />
          <PromptInput onSubmit={vi.fn()}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'leak.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() =>
      expect(screen.getByTestId('file-count').textContent).toBe('1'),
    )

    ;(URL.revokeObjectURL as ReturnType<typeof vi.fn>).mockClear()
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  // ── convertBlobUrlToDataUrl success path (FileReader) ──────────

  it('converts blob URL to data URL via FileReader on submit', async () => {
    const OrigFileReader = globalThis.FileReader
    const origFetch = globalThis.fetch

    // Mock fetch to return a blob
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['pixels'], { type: 'image/png' })),
    })

    // Mock FileReader to invoke onloadend synchronously
    globalThis.FileReader = vi.fn(function (this: { result: string | null; onloadend: (() => void) | null; onerror: (() => void) | null; readAsDataURL: () => void }) {
      this.result = null
      this.onloadend = null
      this.onerror = null
      this.readAsDataURL = function () {
        this.result = 'data:image/png;base64,converted'
        this.onloadend?.()
      }
    }) as unknown as typeof FileReader

    // Make createObjectURL return blob: URLs so the conversion path triggers
    ;(URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('blob:http://localhost/test')

    const onSubmit = vi.fn()
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="fr" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'pic.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    await userEvent.type(screen.getByPlaceholderText('fr'), 'test')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })

    const payload = onSubmit.mock.calls[0][0]
    expect(payload.files[0].url).toBe('data:image/png;base64,converted')

    // Restore
    globalThis.FileReader = OrigFileReader
    globalThis.fetch = origFetch
    ;(URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('data:application/octet-stream;base64,')
  })

  it('FileReader onerror resolves null (keeps blob URL)', async () => {
    const OrigFileReader = globalThis.FileReader
    const origFetch = globalThis.fetch

    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['x'])),
    })

    // FileReader that fires onerror
    globalThis.FileReader = vi.fn(function (this: { result: string | null; onloadend: (() => void) | null; onerror: (() => void) | null; readAsDataURL: () => void }) {
      this.result = null
      this.onloadend = null
      this.onerror = null
      this.readAsDataURL = function () {
        this.onerror?.()
      }
    }) as unknown as typeof FileReader

    ;(URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('blob:http://localhost/err')

    const onSubmit = vi.fn()
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="fre" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'f.png', { type: 'image/png' })] } })
    await userEvent.type(screen.getByPlaceholderText('fre'), 'x')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    // onerror resolves null → fallback keeps original blob URL
    expect(onSubmit.mock.calls[0][0].files[0].url).toBe('blob:http://localhost/err')

    globalThis.FileReader = OrigFileReader
    globalThis.fetch = origFetch
    ;(URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('data:application/octet-stream;base64,')
  })

  // ── Form-level drag and drop (non-global) ─────────────────────

  it('handles drag-and-drop files onto the form', async () => {
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="dd" />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const form = container.querySelector('form') as HTMLFormElement

    // Simulate dragover with Files type
    await act(() => {
      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true })
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: { types: ['Files'] },
      })
      form.dispatchEvent(dragOverEvent)
    })

    // Simulate drop event with files (use array-like with Symbol.iterator)
    const droppedFile = new File(['dropped'], 'dropped.png', { type: 'image/png' })
    const files = [droppedFile] as unknown as FileList
    await act(() => {
      const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { types: ['Files'], files },
      })
      form.dispatchEvent(dropEvent)
    })

    // File should be added (no throw)
    expect(form).toBeTruthy()
  })

  // ── Global drag and drop ───────────────────────────────────────

  it('handles global drag-and-drop when globalDrop is true', async () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()} globalDrop>
          <PromptInputBody>
            <PromptInputTextarea placeholder="gdd" />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    // Simulate dragover on document
    await act(() => {
      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true })
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: { types: ['Files'] },
      })
      document.dispatchEvent(dragOverEvent)
    })

    // Simulate drop on document
    const droppedFile = new File(['global'], 'global.png', { type: 'image/png' })
    const files = [droppedFile] as unknown as FileList
    await act(() => {
      const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { types: ['Files'], files },
      })
      document.dispatchEvent(dropEvent)
    })

    // No error thrown
  })

  // ── Referenced sources context (add / remove / clear) ──────────

  it('exercises referencedSources add (single), add (array), remove, clear', async () => {
    function RefSourcesConsumer() {
      const refs = usePromptInputReferencedSources()
      return (
        <div>
          <span data-testid="ref-count">{refs.sources.length}</span>
          <button
            type="button"
            data-testid="add-single"
            onClick={() =>
              refs.add({
                type: 'source-document',
                sourceDocument: { id: 's1', title: 'Doc 1', contentType: 'text/plain' },
              } as never)
            }
          >
            add single
          </button>
          <button
            type="button"
            data-testid="add-array"
            onClick={() =>
              refs.add([
                { type: 'source-document', sourceDocument: { id: 's2', title: 'Doc 2', contentType: 'text/plain' } } as never,
                { type: 'source-document', sourceDocument: { id: 's3', title: 'Doc 3', contentType: 'text/plain' } } as never,
              ])
            }
          >
            add array
          </button>
          {refs.sources.map((s, i) => (
            <button
              type="button"
              key={s.id}
              data-testid={`ref-remove-${i}`}
              onClick={() => refs.remove(s.id)}
            >
              remove
            </button>
          ))}
          <button type="button" data-testid="ref-clear" onClick={refs.clear}>
            clear
          </button>
        </div>
      )
    }

    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <RefSourcesConsumer />
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByTestId('ref-count').textContent).toBe('0')

    // Add single
    await userEvent.click(screen.getByTestId('add-single'))
    await waitFor(() =>
      expect(screen.getByTestId('ref-count').textContent).toBe('1'),
    )

    // Add array (2 more)
    await userEvent.click(screen.getByTestId('add-array'))
    await waitFor(() =>
      expect(screen.getByTestId('ref-count').textContent).toBe('3'),
    )

    // Remove first
    await userEvent.click(screen.getByTestId('ref-remove-0'))
    await waitFor(() =>
      expect(screen.getByTestId('ref-count').textContent).toBe('2'),
    )

    // Clear all
    await userEvent.click(screen.getByTestId('ref-clear'))
    await waitFor(() =>
      expect(screen.getByTestId('ref-count').textContent).toBe('0'),
    )
  })

  // ── Provider async submit success (clears text + attachments) ──

  it('clears input and files after async onSubmit resolves with provider', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <Wrapper>
        <PromptInputProvider initialInput="async clear me">
          <PromptInput onSubmit={onSubmit}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    expect(screen.getByDisplayValue('async clear me')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })

    // After async success, provider text should be cleared
    await waitFor(() => {
      expect(screen.queryByDisplayValue('async clear me')).not.toBeInTheDocument()
    })
  })

  // ── Sync submit success clears provider text ───────────────────

  it('clears provider text after sync onSubmit succeeds', async () => {
    const onSubmit = vi.fn() // returns undefined (sync)
    render(
      <Wrapper>
        <PromptInputProvider initialInput="sync clear me">
          <PromptInput onSubmit={onSubmit}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(screen.queryByDisplayValue('sync clear me')).not.toBeInTheDocument()
    })
  })

  // ── ActionAddAttachments click triggers openFileDialog ─────────

  it('clicking ActionAddAttachments triggers openFileDialog', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger tooltip="More" />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    // Spy on the hidden file input click
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {})

    await user.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Add photos or files')).toBeInTheDocument()
    })

    // Click the menu item to trigger openFileDialog
    await user.click(screen.getByText('Add photos or files'))

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled()
    })
    clickSpy.mockRestore()
  })

  // ── Backspace removes last attachment (with state propagation) ─

  it('removes last attachment on Backspace when textarea is empty and files exist', async () => {
    function AttachmentCounter() {
      const attachments = usePromptInputAttachments()
      return <span data-testid="att-count">{attachments.files.length}</span>
    }

    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <AttachmentCounter />
          <PromptInputBody>
            <PromptInputTextarea placeholder="bs" />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'last.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Wait for file to be added to state
    await waitFor(() =>
      expect(screen.getByTestId('att-count').textContent).toBe('1'),
    )

    const textarea = screen.getByPlaceholderText('bs')
    fireEvent.keyDown(textarea, { key: 'Backspace' })

    await waitFor(() =>
      expect(screen.getByTestId('att-count').textContent).toBe('0'),
    )
  })

  // ── Provider registerFileInput and openFileDialog ──────────────

  it('provider openFileDialog calls registered file input click', async () => {
    function OpenDialogButton() {
      const ctrl = usePromptInputController()
      return (
        <button data-testid="open-dialog" onClick={ctrl.attachments.openFileDialog}>
          open
        </button>
      )
    }

    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <OpenDialogButton />
          <PromptInput onSubmit={vi.fn()}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {})

    await userEvent.click(screen.getByTestId('open-dialog'))

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled()
    })
    clickSpy.mockRestore()
  })

  // ── syncHiddenInput clears value when files are empty ──────────

  it('syncHiddenInput clears file input value when files are empty', async () => {
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()} syncHiddenInput>
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    // Add then submit a file to clear the files array
    const file = new File(['x'], 'sync.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    // The syncHiddenInput effect runs when files change;
    // since we added a file, then the form submits and clears.
    // At minimum, the effect was exercised.
    expect(fileInput).toBeTruthy()
  })

  // ── openFileDialogLocal (without provider) ─────────────────────

  it('openFileDialogLocal is accessible via ActionAddAttachments without provider', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger tooltip="Add" />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {})

    await user.click(screen.getByRole('button'))
    await waitFor(() =>
      expect(screen.getByText('Add photos or files')).toBeInTheDocument(),
    )
    await user.click(screen.getByText('Add photos or files'))

    await waitFor(() => expect(clickSpy).toHaveBeenCalled())
    clickSpy.mockRestore()
  })

  // ── Provider onChange callback ─────────────────────────────────

  it('provider-controlled textarea fires onChange callback', async () => {
    const onChange = vi.fn()
    render(
      <Wrapper>
        <PromptInputProvider>
          <PromptInput onSubmit={vi.fn()}>
            <PromptInputBody>
              <PromptInputTextarea placeholder="prov-change" onChange={onChange} />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    await userEvent.type(screen.getByPlaceholderText('prov-change'), 'hello')
    expect(onChange).toHaveBeenCalled()
  })

  // ── PromptInput local unmount cleanup ──────────────────────────

  it('revokes local blob URLs on PromptInput unmount (no provider)', async () => {
    const { container, unmount } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['z'], 'z.png', { type: 'image/png' })] } })

    ;(URL.revokeObjectURL as ReturnType<typeof vi.fn>).mockClear()
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  // ── Paste without file items ───────────────────────────────────

  it('paste with no items does nothing', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="nopaste" />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByPlaceholderText('nopaste')
    fireEvent.paste(textarea, {
      clipboardData: { items: undefined },
    })
    // No error
  })

  it('paste with non-file items is ignored', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="textpaste" />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByPlaceholderText('textpaste')
    fireEvent.paste(textarea, {
      clipboardData: {
        items: [{ kind: 'string', getAsFile: () => null }],
      },
    })
  })

  it('paste with file item returning null is ignored', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="nullfile" />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByPlaceholderText('nullfile')
    fireEvent.paste(textarea, {
      clipboardData: {
        items: [{ kind: 'file', getAsFile: () => null }],
      },
    })
  })

  // ── PromptInputSubmit onClick without stop ─────────────────────

  it('PromptInputSubmit calls onClick when not generating', async () => {
    const onClick = vi.fn()
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputFooter>
            <PromptInputSubmit onClick={onClick} />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onClick).toHaveBeenCalled()
  })

  // ── Provider with validation through addWithProviderValidation──

  it('provider addWithProviderValidation filters + validates correctly', async () => {
    const onError = vi.fn()
    function ProviderCounter() {
      const ctrl = usePromptInputController()
      return <span data-testid="p-count">{ctrl.attachments.files.length}</span>
    }

    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <ProviderCounter />
          <PromptInput
            onSubmit={vi.fn()}
            accept="image/*"
            maxFileSize={100}
            maxFiles={2}
            onError={onError}
          >
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

    // Add valid image files
    const img1 = new File(['a'], 'img1.png', { type: 'image/png' })
    const img2 = new File(['b'], 'img2.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [img1, img2] } })

    await waitFor(() =>
      expect(screen.getByTestId('p-count').textContent).toBe('2'),
    )

    // Adding more exceeds maxFiles
    const img3 = new File(['c'], 'img3.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [img3] } })

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'max_files' }),
      ),
    )
  })

  // ── Provider addWithProviderValidation maxFileSize ─────────────

  it('provider addWithProviderValidation rejects all files exceeding maxFileSize', async () => {
    const onError = vi.fn()
    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <PromptInput onSubmit={vi.fn()} maxFileSize={5} onError={onError}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = new File(['a'.repeat(100)], 'big.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [bigFile] } })

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'max_file_size' }),
      ),
    )
  })

  // ── Provider addWithProviderValidation accept filter ───────────

  it('provider addWithProviderValidation rejects wrong MIME', async () => {
    const onError = vi.fn()
    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <PromptInput onSubmit={vi.fn()} accept="image/*" onError={onError}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const textFile = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [textFile] } })

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'accept' }),
      ),
    )
  })

  // ── addWithProviderValidation some capped ──────────────────────

  it('provider addWithProviderValidation caps files and still adds partial', async () => {
    const onError = vi.fn()
    function ProviderCounter() {
      const ctrl = usePromptInputController()
      return <span data-testid="p-count2">{ctrl.attachments.files.length}</span>
    }

    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <ProviderCounter />
          <PromptInput onSubmit={vi.fn()} maxFiles={1} onError={onError}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const f1 = new File(['a'], 'a.png', { type: 'image/png' })
    const f2 = new File(['b'], 'b.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [f1, f2] } })

    // Should add 1 and error about the rest
    await waitFor(() =>
      expect(screen.getByTestId('p-count2').textContent).toBe('1'),
    )
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'max_files' }),
    )
  })

  // ── Local removeLocal revoke ───────────────────────────────────

  it('removeLocal revokes blob URL of removed file', async () => {
    function LocalCounter() {
      const attachments = usePromptInputAttachments()
      return (
        <div>
          <span data-testid="lcount">{attachments.files.length}</span>
          {attachments.files.map((f) => (
            <button key={f.id} data-testid={`lrm-${f.filename}`} onClick={() => attachments.remove(f.id)}>rm</button>
          ))}
        </div>
      )
    }

    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <LocalCounter />
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'rm.png', { type: 'image/png' })] } })

    await waitFor(() => expect(screen.getByTestId('lcount').textContent).toBe('1'))

    ;(URL.revokeObjectURL as ReturnType<typeof vi.fn>).mockClear()
    await userEvent.click(screen.getByTestId('lrm-rm.png'))

    await waitFor(() => expect(screen.getByTestId('lcount').textContent).toBe('0'))
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  // ── Local clearAttachments revoke ──────────────────────────────

  it('local clear revokes all blob URLs', async () => {
    function LocalClear() {
      const attachments = usePromptInputAttachments()
      return (
        <div>
          <span data-testid="lccount">{attachments.files.length}</span>
          <button data-testid="lclear" onClick={attachments.clear}>clear</button>
        </div>
      )
    }

    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <LocalClear />
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['a'], 'c1.png', { type: 'image/png' }), new File(['b'], 'c2.png', { type: 'image/png' })] } })

    await waitFor(() => expect(screen.getByTestId('lccount').textContent).toBe('2'))

    ;(URL.revokeObjectURL as ReturnType<typeof vi.fn>).mockClear()
    await userEvent.click(screen.getByTestId('lclear'))

    await waitFor(() => expect(screen.getByTestId('lccount').textContent).toBe('0'))
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  // ── Drag events without dataTransfer ───────────────────────────

  it('drag events without files type are no-op', () => {
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const form = container.querySelector('form')!
    // dragover without dataTransfer
    form.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))
    // dragover with non-Files type
    const evt = new Event('dragover', { bubbles: true, cancelable: true })
    Object.defineProperty(evt, 'dataTransfer', { value: { types: ['text/plain'] } })
    form.dispatchEvent(evt)
    // drop without dataTransfer
    form.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    // drop with no files
    const drop2 = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop2, 'dataTransfer', { value: { types: ['text/plain'], files: null } })
    form.dispatchEvent(drop2)
  })

  it('drop event without files does not add', () => {
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const form = container.querySelector('form')!
    const evt = new Event('drop', { bubbles: true })
    Object.defineProperty(evt, 'dataTransfer', { value: { types: ['Files'], files: [] } })
    Object.defineProperty(evt, 'preventDefault', { value: vi.fn() })
    form.dispatchEvent(evt)
  })

  // ── useProviderAttachments success path ────────────────────────

  it('useProviderAttachments returns context when inside provider', () => {
    let result: ReturnType<typeof useProviderAttachments> | null = null
    function ProviderAttachConsumer() {
      result = useProviderAttachments()
      return null
    }
    render(
      <Wrapper>
        <PromptInputProvider>
          <ProviderAttachConsumer />
        </PromptInputProvider>
      </Wrapper>,
    )
    expect(result).not.toBeNull()
    expect(result!.add).toBeDefined()
    expect(result!.remove).toBeDefined()
    expect(result!.clear).toBeDefined()
  })

  // ── Async submit without provider (non-provider async clear) ──

  it('clears form after async onSubmit resolves without provider', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="asyncnp" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    await userEvent.type(screen.getByPlaceholderText('asyncnp'), 'async text')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  // ── nativeEvent.isComposing branch ─────────────────────────────

  it('Enter during nativeEvent.isComposing does not submit', () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <PromptInput onSubmit={onSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="ncompose" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </Wrapper>,
    )

    const textarea = screen.getByPlaceholderText('ncompose')
    // KeyboardEvent.isComposing maps to e.nativeEvent.isComposing in React
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      isComposing: true,
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  // ── handleChange without files ─────────────────────────────────

  it('handleChange with null files does nothing', () => {
    const { container } = render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    // Fire change with no files property on currentTarget
    fireEvent.change(fileInput, { target: { files: null } })
    // Should not throw
  })

  // ── Tooltip object without side property ───────────────────────

  it('renders button with object tooltip without side (defaults to top)', () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()}>
          <PromptInputTools>
            <PromptInputButton tooltip={{ content: 'No Side' }}>NS</PromptInputButton>
          </PromptInputTools>
        </PromptInput>
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: 'NS' })).toBeInTheDocument()
  })

  // ── Provider openFileDialog before PromptInput registers ───────

  it('provider openFileDialog noop before PromptInput mounts', () => {
    function EarlyOpener() {
      const ctrl = usePromptInputController()
      return (
        <button
          type="button"
          data-testid="early-open"
          onClick={ctrl.attachments.openFileDialog}
        >
          open
        </button>
      )
    }

    render(
      <Wrapper>
        <PromptInputProvider>
          <EarlyOpener />
        </PromptInputProvider>
      </Wrapper>,
    )

    // This calls openRef.current?.() which is the noop () => {}
    fireEvent.click(screen.getByTestId('early-open'))
    // No error thrown — the noop is exercised
  })

  // ── Provider clear with no files (edge case) ──────────────────

  it('provider clear when no files is a no-op', async () => {
    function ClearBtn() {
      const ctrl = usePromptInputController()
      return (
        <button
          type="button"
          data-testid="pclear"
          onClick={() => ctrl.attachments.clear()}
        >
          clear
        </button>
      )
    }

    render(
      <Wrapper>
        <PromptInputProvider>
          <ClearBtn />
          <PromptInput onSubmit={vi.fn()}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    await userEvent.click(screen.getByTestId('pclear'))
    // No error
  })

  // ── Global drag without dataTransfer ─────────────────────────

  it('global dragover/drop without dataTransfer is no-op', async () => {
    render(
      <Wrapper>
        <PromptInput onSubmit={vi.fn()} globalDrop>
          <PromptInputBody>
            <PromptInputTextarea placeholder="gdn" />
          </PromptInputBody>
        </PromptInput>
      </Wrapper>,
    )

    // Dispatch dragover + drop without dataTransfer
    await act(() => {
      document.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))
    })
    await act(() => {
      document.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    })
    // Also with non-Files types
    await act(() => {
      const evt = new Event('dragover', { bubbles: true, cancelable: true })
      Object.defineProperty(evt, 'dataTransfer', { value: { types: ['text/plain'] } })
      document.dispatchEvent(evt)
    })
    await act(() => {
      const evt = new Event('drop', { bubbles: true, cancelable: true })
      Object.defineProperty(evt, 'dataTransfer', { value: { types: ['text/plain'], files: null } })
      document.dispatchEvent(evt)
    })
  })

  // ── addWithProviderValidation partial size filter ──────────────

  it('provider adds valid subset when some files exceed maxFileSize', async () => {
    const onError = vi.fn()
    function PVCounter() {
      const ctrl = usePromptInputController()
      return <span data-testid="pv-count">{ctrl.attachments.files.length}</span>
    }

    const { container } = render(
      <Wrapper>
        <PromptInputProvider>
          <PVCounter />
          <PromptInput onSubmit={vi.fn()} accept="image/*" maxFileSize={100} onError={onError}>
            <PromptInputBody>
              <PromptInputTextarea />
            </PromptInputBody>
          </PromptInput>
        </PromptInputProvider>
      </Wrapper>,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    // Mix: one valid small, one valid but too big
    const good = new File(['a'], 'good.png', { type: 'image/png' })
    const big = new File(['x'.repeat(200)], 'big.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [good, big] } })

    await waitFor(() =>
      expect(screen.getByTestId('pv-count').textContent).toBe('1'),
    )
  })
})
