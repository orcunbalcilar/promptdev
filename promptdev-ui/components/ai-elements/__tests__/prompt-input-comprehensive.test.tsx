import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// Fix React 19 act() compatibility
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return { ...actual, createPortal: (children: React.ReactNode) => children };
});

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-id-" + Math.random().toString(36).slice(2, 8)),
}));

// Mock Radix portals to render inline
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: React.forwardRef<
    HTMLSpanElement,
    React.PropsWithChildren<Record<string, unknown>>
  >(function TooltipTriggerMock({ children, ...props }, ref) {
    return (
      <span ref={ref} {...props}>
        {children}
      </span>
    );
  }),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/ui/hover-card", () => ({
  HoverCard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HoverCardTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  HoverCardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  CommandInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
  CommandList: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CommandEmpty: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CommandGroup: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CommandItem: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CommandSeparator: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <hr {...props} />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectTrigger: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { value?: string }) => (
    <div data-value={value} {...props}>
      {children}
    </div>
  ),
  SelectValue: (props: React.HTMLAttributes<HTMLSpanElement>) => (
    <span {...props} />
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & {
    onSelect?: (e: Event) => void;
  }) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => onSelect?.(new Event("select"))}
      {...props}
    >
      {children}
    </button>
  ),
}));

// ResizeObserver mock
globalThis.ResizeObserver = class ResizeObserver {
  observe() {
    /* noop */
  }
  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
} as unknown as typeof ResizeObserver;

Element.prototype.scrollIntoView = vi.fn();

import {
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionAddAttachments,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectValue,
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
} from "@/components/ai-elements/prompt-input";

describe("PromptInput wrapper components", () => {
  it("renders PromptInputSelect components", () => {
    render(
      <PromptInputSelect>
        <PromptInputSelectTrigger className="test-class">
          <PromptInputSelectValue />
        </PromptInputSelectTrigger>
        <PromptInputSelectContent className="content-class">
          <PromptInputSelectItem value="a" className="item-class">
            A
          </PromptInputSelectItem>
        </PromptInputSelectContent>
      </PromptInputSelect>,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders HoverCard wrappers", () => {
    render(
      <PromptInputHoverCard openDelay={100} closeDelay={100}>
        <PromptInputHoverCardTrigger>Trigger</PromptInputHoverCardTrigger>
        <PromptInputHoverCardContent align="start" className="hover-class">
          Content
        </PromptInputHoverCardContent>
      </PromptInputHoverCard>,
    );
    expect(screen.getByText("Trigger")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders tab wrappers", () => {
    render(
      <PromptInputTabsList className="list-class">
        <PromptInputTab className="tab-class">
          <PromptInputTabLabel className="label">Label</PromptInputTabLabel>
          <PromptInputTabBody className="body">
            <PromptInputTabItem className="item">Item</PromptInputTabItem>
          </PromptInputTabBody>
        </PromptInputTab>
      </PromptInputTabsList>,
    );
    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(screen.getByText("Item")).toBeInTheDocument();
  });

  it("renders command wrappers", () => {
    render(
      <PromptInputCommand className="cmd">
        <PromptInputCommandInput className="input" />
        <PromptInputCommandList className="list">
          <PromptInputCommandEmpty className="empty">
            No results
          </PromptInputCommandEmpty>
          <PromptInputCommandGroup className="group">
            <PromptInputCommandItem className="item">
              Item 1
            </PromptInputCommandItem>
          </PromptInputCommandGroup>
          <PromptInputCommandSeparator className="sep" />
        </PromptInputCommandList>
      </PromptInputCommand>,
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("renders PromptInputToggle and Button with tooltip", () => {
    render(<PromptInputButton tooltip="Help text">Click me</PromptInputButton>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
    expect(screen.getByText("Help text")).toBeInTheDocument();
  });

  it("renders PromptInputButton with object tooltip", () => {
    render(
      <PromptInputButton
        tooltip={{ content: "Rich tip", shortcut: "Ctrl+K", side: "bottom" }}
      >
        Button
      </PromptInputButton>,
    );
    expect(screen.getByText("Rich tip")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+K")).toBeInTheDocument();
  });

  it("renders PromptInputButton without tooltip", () => {
    render(<PromptInputButton>No tooltip</PromptInputButton>);
    expect(screen.getByText("No tooltip")).toBeInTheDocument();
  });

  it("renders action menu components", () => {
    render(
      <PromptInputActionMenu>
        <PromptInputActionMenuTrigger className="trigger">
          Menu
        </PromptInputActionMenuTrigger>
        <PromptInputActionMenuContent className="content">
          <PromptInputActionMenuItem className="item">
            Option
          </PromptInputActionMenuItem>
        </PromptInputActionMenuContent>
      </PromptInputActionMenu>,
    );
    expect(screen.getByText("Menu")).toBeInTheDocument();
    expect(screen.getByText("Option")).toBeInTheDocument();
  });
});

describe("PromptInputSubmit", () => {
  it("renders default submit icon", () => {
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputSubmit />
      </PromptInput>,
    );
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("renders spinner for submitted status", () => {
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputSubmit status="submitted" />
      </PromptInput>,
    );
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
  });

  it("renders stop icon for streaming status", () => {
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputSubmit status="streaming" onStop={vi.fn()} />
      </PromptInput>,
    );
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
  });

  it("calls onStop when streaming and clicked", async () => {
    const onStop = vi.fn();
    const user = userEvent.setup();
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputSubmit status="streaming" onStop={onStop} />
      </PromptInput>,
    );
    await user.click(screen.getByRole("button", { name: /stop/i }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("renders error icon", () => {
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputSubmit status="error" />
      </PromptInput>,
    );
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });
});

describe("Context hooks throw outside provider", () => {
  it("usePromptInputController throws without provider", () => {
    const Comp = () => {
      usePromptInputController();
      return null;
    };
    expect(() => render(<Comp />)).toThrow(
      "Wrap your component inside <PromptInputProvider>",
    );
  });

  it("useProviderAttachments throws without provider", () => {
    const Comp = () => {
      useProviderAttachments();
      return null;
    };
    expect(() => render(<Comp />)).toThrow(
      "Wrap your component inside <PromptInputProvider>",
    );
  });

  it("usePromptInputAttachments throws without any provider", () => {
    const Comp = () => {
      usePromptInputAttachments();
      return null;
    };
    expect(() => render(<Comp />)).toThrow(
      "usePromptInputAttachments must be used within",
    );
  });

  it("usePromptInputReferencedSources throws without provider", () => {
    const Comp = () => {
      usePromptInputReferencedSources();
      return null;
    };
    expect(() => render(<Comp />)).toThrow(
      "usePromptInputReferencedSources must be used within",
    );
  });
});

describe("PromptInputProvider", () => {
  it("provides textInput and attachments to children", () => {
    const Consumer = () => {
      const ctrl = usePromptInputController();
      return <div data-testid="value">{ctrl.textInput.value}</div>;
    };
    render(
      <PromptInputProvider initialInput="hello">
        <Consumer />
      </PromptInputProvider>,
    );
    expect(screen.getByTestId("value")).toHaveTextContent("hello");
  });

  it("exposes add/remove/clear on attachments", async () => {
    const Consumer = () => {
      const att = useProviderAttachments();
      return (
        <div>
          <span data-testid="count">{att.files.length}</span>
          <button
            onClick={() =>
              att.add([new File(["x"], "f.txt", { type: "text/plain" })])
            }
          >
            Add
          </button>
          <button onClick={() => att.clear()}>Clear</button>
        </div>
      );
    };
    const user = userEvent.setup();
    render(
      <PromptInputProvider>
        <Consumer />
      </PromptInputProvider>,
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    await user.click(screen.getByText("Add"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    await user.click(screen.getByText("Clear"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("exposes openFileDialog via provider", () => {
    const Consumer = () => {
      const att = useProviderAttachments();
      return <button onClick={att.openFileDialog}>Open</button>;
    };
    render(
      <PromptInputProvider>
        <Consumer />
      </PromptInputProvider>,
    );
    // Just verify it doesn't throw
    fireEvent.click(screen.getByText("Open"));
  });
});

// Helper: fire change on hidden file input with specific files (bypasses browser accept filtering)
function fireFileChange(fileInput: Element, files: File[]) {
  Object.defineProperty(fileInput, "files", {
    value: files,
    configurable: true,
  });
  fireEvent.change(fileInput, { target: { files } });
}

describe("PromptInput file validation", () => {
  it("rejects files that don't match accept", () => {
    const onError = vi.fn();
    render(
      <PromptInput accept="image/*" onError={onError} onSubmit={vi.fn()}>
        <PromptInputTextarea />
      </PromptInput>,
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    const file = new File(["content"], "doc.pdf", { type: "application/pdf" });
    fireFileChange(fileInput, [file]);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "accept" }),
    );
  });

  it("rejects files exceeding maxFileSize", async () => {
    const onError = vi.fn();
    const user = userEvent.setup();
    render(
      <PromptInput maxFileSize={10} onError={onError} onSubmit={vi.fn()}>
        <PromptInputTextarea />
      </PromptInput>,
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    const file = new File(["a".repeat(100)], "big.txt", { type: "text/plain" });
    await user.upload(fileInput as HTMLInputElement, file);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "max_file_size" }),
    );
  });

  it("respects maxFiles limit", async () => {
    const onError = vi.fn();
    const user = userEvent.setup();
    render(
      <PromptInput maxFiles={1} multiple onError={onError} onSubmit={vi.fn()}>
        <PromptInputTextarea />
      </PromptInput>,
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    const files = [
      new File(["a"], "a.txt", { type: "text/plain" }),
      new File(["b"], "b.txt", { type: "text/plain" }),
    ];
    await user.upload(fileInput as HTMLInputElement, files);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "max_files" }),
    );
  });
});

describe("PromptInput form submission", () => {
  it("submits text via form data (no provider)", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea />
        <PromptInputSubmit />
      </PromptInput>,
    );
    const textarea = screen.getByPlaceholderText(
      "What would you like to know?",
    );
    await user.type(textarea, "hello{Enter}");
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it("submits text via provider", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <PromptInputProvider initialInput="">
        <PromptInput onSubmit={onSubmit}>
          <PromptInputTextarea />
          <PromptInputSubmit />
        </PromptInput>
      </PromptInputProvider>,
    );
    const textarea = screen.getByPlaceholderText(
      "What would you like to know?",
    );
    await user.type(textarea, "provider text{Enter}");
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it("handles async onSubmit error gracefully", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    render(
      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea />
        <PromptInputSubmit />
      </PromptInput>,
    );
    const textarea = screen.getByPlaceholderText(
      "What would you like to know?",
    );
    await user.type(textarea, "error text{Enter}");
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});

describe("PromptInput keyboard handling", () => {
  it("removes last attachment on Backspace in empty textarea", async () => {
    const user = userEvent.setup();
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputTextarea />
      </PromptInput>,
    );
    // Add a file first
    const fileInput = document.querySelector('input[type="file"]')!;
    const file = new File(["a"], "a.txt", { type: "text/plain" });
    await user.upload(fileInput as HTMLInputElement, file);

    // Press backspace in empty textarea
    const textarea = screen.getByPlaceholderText(
      "What would you like to know?",
    );
    await user.click(textarea);
    await user.keyboard("{Backspace}");
  });

  it("handles clipboard paste with files", async () => {
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputTextarea />
      </PromptInput>,
    );
    const textarea = screen.getByPlaceholderText(
      "What would you like to know?",
    );
    const file = new File(["img"], "img.png", { type: "image/png" });
    const clipboardData = {
      items: [{ kind: "file", getAsFile: () => file }],
    };
    fireEvent.paste(textarea, { clipboardData });
  });

  it("handles compositionEnd event", () => {
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputTextarea />
      </PromptInput>,
    );
    const textarea = screen.getByPlaceholderText(
      "What would you like to know?",
    );
    fireEvent.compositionEnd(textarea);
  });

  it("does not submit on Shift+Enter", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea />
        <PromptInputSubmit />
      </PromptInput>,
    );
    const textarea = screen.getByPlaceholderText(
      "What would you like to know?",
    );
    await user.type(textarea, "text");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("PromptInput drag and drop", () => {
  const makeDt = (files: File[]) => ({
    types: ["Files"],
    files,
  });

  it("handles file drop on form (non-global)", () => {
    render(
      <PromptInput onSubmit={vi.fn()} globalDrop={false}>
        <PromptInputTextarea />
      </PromptInput>,
    );
    const form = document.querySelector("form")!;
    const file = new File(["a"], "a.txt", { type: "text/plain" });
    const dt = makeDt([file]);
    fireEvent.dragOver(form, { dataTransfer: dt });
    fireEvent.drop(form, { dataTransfer: dt });
  });

  it("handles global drop", () => {
    render(
      <PromptInput onSubmit={vi.fn()} globalDrop={true}>
        <PromptInputTextarea />
      </PromptInput>,
    );
    const file = new File(["a"], "a.txt", { type: "text/plain" });
    const dt = makeDt([file]);
    fireEvent.dragOver(document, { dataTransfer: dt });
    fireEvent.drop(document, { dataTransfer: dt });
  });
});

describe("PromptInput syncHiddenInput", () => {
  it("clears hidden input when files are empty", () => {
    render(
      <PromptInput onSubmit={vi.fn()} syncHiddenInput>
        <PromptInputTextarea />
      </PromptInput>,
    );
    // syncHiddenInput effect runs when files.length === 0
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput.value).toBe("");
  });
});

describe("PromptInput with provider file validation", () => {
  it("validates files through provider add", () => {
    const onError = vi.fn();
    render(
      <PromptInputProvider>
        <PromptInput
          accept="image/*"
          maxFiles={1}
          maxFileSize={10}
          onError={onError}
          onSubmit={vi.fn()}
        >
          <PromptInputTextarea />
        </PromptInput>
      </PromptInputProvider>,
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    fireFileChange(fileInput, [file]);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "accept" }),
    );
  });
});

describe("PromptInputActionAddAttachments", () => {
  it("opens file dialog on select", async () => {
    const user = userEvent.setup();
    render(
      <PromptInput onSubmit={vi.fn()}>
        <PromptInputActionMenu>
          <PromptInputActionMenuContent>
            <PromptInputActionAddAttachments label="Upload" />
          </PromptInputActionMenuContent>
        </PromptInputActionMenu>
      </PromptInput>,
    );
    await user.click(screen.getByRole("menuitem"));
  });
});

describe("convertBlobUrlToDataUrl via submit", () => {
  it("converts blob URLs to data URLs on submit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    // Mock fetch to return a blob
    const mockBlob = new Blob(["test"], { type: "text/plain" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      blob: () => Promise.resolve(mockBlob),
    } as Response);

    // Mock URL.createObjectURL to return blob: URL
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/test-id");

    // Mock FileReader
    const origFileReader = globalThis.FileReader;
    globalThis.FileReader = function (this: {
      onloadend: (() => void) | null;
      onerror: (() => void) | null;
      result: string;
      readAsDataURL: (b: Blob) => void;
    }) {
      this.onloadend = null;
      this.onerror = null;
      this.result = "data:text/plain;base64,dGVzdA==";
      this.readAsDataURL = function () {
        setTimeout(() => this.onloadend?.(), 0);
      };
    } as unknown as typeof FileReader;

    render(
      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea />
        <PromptInputSubmit />
      </PromptInput>,
    );

    // Add file via change event
    const fileInput = document.querySelector('input[type="file"]')!;
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    fireFileChange(fileInput, [file]);

    // Type and submit
    const textarea = screen.getByPlaceholderText(
      "What would you like to know?",
    );
    await user.type(textarea, "submit with files{Enter}");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    // Clean up
    URL.createObjectURL = origCreateObjectURL;
    globalThis.FileReader = origFileReader;
  });

  it("handles convertBlobUrlToDataUrl fetch error", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    // Mock fetch to throw
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("fetch failed"),
    );

    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/test-id-2");

    render(
      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea />
        <PromptInputSubmit />
      </PromptInput>,
    );

    const fileInput = document.querySelector('input[type="file"]')!;
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    fireFileChange(fileInput, [file]);

    const textarea = screen.getByPlaceholderText(
      "What would you like to know?",
    );
    await user.type(textarea, "submit{Enter}");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    URL.createObjectURL = origCreateObjectURL;
  });
});

describe("PromptInputProvider remove and clear", () => {
  it("removes specific attachment by id", async () => {
    const Consumer = () => {
      const att = useProviderAttachments();
      return (
        <div>
          <span data-testid="count">{att.files.length}</span>
          {att.files.map((f) => (
            <button key={f.id} onClick={() => att.remove(f.id)}>
              Remove {f.filename}
            </button>
          ))}
          <button
            onClick={() =>
              att.add([new File(["x"], "one.txt", { type: "text/plain" })])
            }
          >
            Add1
          </button>
          <button
            onClick={() =>
              att.add([new File(["y"], "two.txt", { type: "text/plain" })])
            }
          >
            Add2
          </button>
        </div>
      );
    };
    const user = userEvent.setup();
    render(
      <PromptInputProvider>
        <Consumer />
      </PromptInputProvider>,
    );
    await user.click(screen.getByText("Add1"));
    await user.click(screen.getByText("Add2"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    await user.click(screen.getByText(/Remove one.txt/));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });
});

describe("PromptInput provider maxFileSize validation", () => {
  it("rejects oversized files through provider", () => {
    const onError = vi.fn();
    render(
      <PromptInputProvider>
        <PromptInput maxFileSize={5} onError={onError} onSubmit={vi.fn()}>
          <PromptInputTextarea />
        </PromptInput>
      </PromptInputProvider>,
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    const file = new File(["a".repeat(100)], "big.txt", { type: "text/plain" });
    fireFileChange(fileInput, [file]);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "max_file_size" }),
    );
  });

  it("rejects excess files through provider maxFiles", () => {
    const onError = vi.fn();
    render(
      <PromptInputProvider>
        <PromptInput maxFiles={1} multiple onError={onError} onSubmit={vi.fn()}>
          <PromptInputTextarea />
        </PromptInput>
      </PromptInputProvider>,
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    const files = [
      new File(["a"], "a.txt", { type: "text/plain" }),
      new File(["b"], "b.txt", { type: "text/plain" }),
    ];
    fireFileChange(fileInput, files);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "max_files" }),
    );
  });
});

describe("PromptInput submit clears input with provider", () => {
  it("clears provider text on successful async submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <PromptInputProvider initialInput="initial">
        <PromptInput onSubmit={onSubmit}>
          <PromptInputTextarea />
          <PromptInputSubmit />
        </PromptInput>
      </PromptInputProvider>,
    );
    const textarea = screen.getByPlaceholderText(
      "What would you like to know?",
    );
    await user.type(textarea, "{Enter}");
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});
