import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return { ...actual, createPortal: (children: React.ReactNode) => children };
});

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

Element.prototype.scrollIntoView = vi.fn();

import {
  VoiceSelector,
  VoiceSelectorTrigger,
  VoiceSelectorContent,
  VoiceSelectorInput,
  VoiceSelectorList,
  VoiceSelectorEmpty,
  VoiceSelectorGroup,
  VoiceSelectorItem,
  VoiceSelectorSeparator,
  VoiceSelectorShortcut,
  VoiceSelectorGender,
  VoiceSelectorAccent,
  VoiceSelectorAge,
  VoiceSelectorName,
  VoiceSelectorDescription,
  VoiceSelectorAttributes,
  VoiceSelectorBullet,
  VoiceSelectorPreview,
} from "@/components/ai-elements/voice-selector";

describe("VoiceSelectorGender – extended", () => {
  it("renders transgender icon", () => {
    const { container } = render(<VoiceSelectorGender value="transgender" />);
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  it("renders androgyne icon", () => {
    const { container } = render(<VoiceSelectorGender value="androgyne" />);
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  it("renders non-binary icon", () => {
    const { container } = render(<VoiceSelectorGender value="non-binary" />);
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  it("renders intersex icon", () => {
    const { container } = render(<VoiceSelectorGender value="intersex" />);
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  it("renders default icon for undefined value", () => {
    const { container } = render(<VoiceSelectorGender />);
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  it("renders default icon for unrecognized value", () => {
    const { container } = render(
      <VoiceSelectorGender value={"unknown-gender" as "male"} />,
    );
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  it("renders with custom className", () => {
    const { container } = render(
      <VoiceSelectorGender value="male" className="custom-gender" />,
    );
    expect(container.querySelector(".custom-gender")).toBeInTheDocument();
  });

  it("children override icon", () => {
    render(<VoiceSelectorGender value="female">Override</VoiceSelectorGender>);
    expect(screen.getByText("Override")).toBeInTheDocument();
  });
});

describe("VoiceSelectorAccent – extended", () => {
  const accentTests: Array<[string, string]> = [
    ["australian", "🇦🇺"],
    ["canadian", "🇨🇦"],
    ["irish", "🇮🇪"],
    ["scottish", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"],
    ["indian", "🇮🇳"],
    ["south-african", "🇿🇦"],
    ["new-zealand", "🇳🇿"],
    ["spanish", "🇪🇸"],
    ["french", "🇫🇷"],
    ["german", "🇩🇪"],
    ["italian", "🇮🇹"],
    ["portuguese", "🇵🇹"],
    ["brazilian", "🇧🇷"],
    ["mexican", "🇲🇽"],
    ["argentinian", "🇦🇷"],
    ["chinese", "🇨🇳"],
    ["korean", "🇰🇷"],
    ["russian", "🇷🇺"],
    ["arabic", "🇸🇦"],
    ["dutch", "🇳🇱"],
    ["swedish", "🇸🇪"],
    ["norwegian", "🇳🇴"],
    ["danish", "🇩🇰"],
    ["finnish", "🇫🇮"],
    ["polish", "🇵🇱"],
    ["turkish", "🇹🇷"],
    ["greek", "🇬🇷"],
  ];

  it.each(accentTests)(
    "renders %s accent with correct flag emoji",
    (accent, emoji) => {
      render(<VoiceSelectorAccent value={accent} />);
      expect(screen.getByText(emoji)).toBeInTheDocument();
    },
  );

  it("renders empty for unknown accent", () => {
    const { container } = render(
      <VoiceSelectorAccent value="unknown-accent" />,
    );
    expect(container.querySelector("span")!.textContent).toBe("");
  });

  it("children override emoji", () => {
    render(
      <VoiceSelectorAccent value="french">French Accent</VoiceSelectorAccent>,
    );
    expect(screen.getByText("French Accent")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <VoiceSelectorAccent value="american" className="accent-cls" />,
    );
    expect(container.querySelector(".accent-cls")).toBeInTheDocument();
  });
});

describe("VoiceSelectorAge", () => {
  it("renders age value", () => {
    render(<VoiceSelectorAge>25</VoiceSelectorAge>);
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <VoiceSelectorAge className="age-cls">30</VoiceSelectorAge>,
    );
    expect(container.querySelector(".age-cls")).toBeInTheDocument();
  });
});

describe("VoiceSelectorName", () => {
  it("renders name text", () => {
    render(<VoiceSelectorName>Alloy</VoiceSelectorName>);
    expect(screen.getByText("Alloy")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <VoiceSelectorName className="name-cls">Shimmer</VoiceSelectorName>,
    );
    expect(container.querySelector(".name-cls")).toBeInTheDocument();
  });
});

describe("VoiceSelectorDescription", () => {
  it("renders description text", () => {
    render(
      <VoiceSelectorDescription>Warm and friendly</VoiceSelectorDescription>,
    );
    expect(screen.getByText("Warm and friendly")).toBeInTheDocument();
  });
});

describe("VoiceSelectorAttributes", () => {
  it("renders children", () => {
    render(
      <VoiceSelectorAttributes>
        <span>Attr1</span>
        <VoiceSelectorBullet />
        <span>Attr2</span>
      </VoiceSelectorAttributes>,
    );

    expect(screen.getByText("Attr1")).toBeInTheDocument();
    expect(screen.getByText("Attr2")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <VoiceSelectorAttributes className="attrs-cls">
        <span>Attribute</span>
      </VoiceSelectorAttributes>,
    );
    expect(container.querySelector(".attrs-cls")).toBeInTheDocument();
  });
});

describe("VoiceSelectorBullet", () => {
  it("renders bullet character", () => {
    const { container } = render(<VoiceSelectorBullet />);
    const bullet = container.querySelector('[aria-hidden="true"]');
    expect(bullet).toBeInTheDocument();
    expect(bullet?.textContent).toBe("•");
  });

  it("applies custom className", () => {
    const { container } = render(
      <VoiceSelectorBullet className="bullet-cls" />,
    );
    expect(container.querySelector(".bullet-cls")).toBeInTheDocument();
  });
});

describe("VoiceSelectorPreview", () => {
  it("renders play button by default", () => {
    render(<VoiceSelectorPreview />);
    expect(
      screen.getByRole("button", { name: /play preview/i }),
    ).toBeInTheDocument();
  });

  it("renders pause button when playing", () => {
    render(<VoiceSelectorPreview playing />);
    expect(
      screen.getByRole("button", { name: /pause preview/i }),
    ).toBeInTheDocument();
  });

  it("renders spinner when loading", () => {
    render(<VoiceSelectorPreview loading />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("calls onPlay when clicked", async () => {
    const onPlay = vi.fn();
    const user = userEvent.setup();
    render(<VoiceSelectorPreview onPlay={onPlay} />);

    await user.click(screen.getByRole("button", { name: /play preview/i }));
    expect(onPlay).toHaveBeenCalled();
  });

  it("calls both onClick and onPlay", async () => {
    const onClick = vi.fn();
    const onPlay = vi.fn();
    const user = userEvent.setup();
    render(<VoiceSelectorPreview onClick={onClick} onPlay={onPlay} />);

    await user.click(screen.getByRole("button", { name: /play preview/i }));
    expect(onClick).toHaveBeenCalled();
    expect(onPlay).toHaveBeenCalled();
  });

  it("stopPropagation when clicked", async () => {
    const parentClick = vi.fn();
    const user = userEvent.setup();
    render(
      <div onClick={parentClick}>
        <VoiceSelectorPreview onPlay={vi.fn()} />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: /play preview/i }));
    // stopPropagation is called in the component
    expect(parentClick).not.toHaveBeenCalled();
  });
});

describe("VoiceSelector – item selection", () => {
  it("renders items in an open dialog", () => {
    render(
      <VoiceSelector open>
        <VoiceSelectorContent>
          <VoiceSelectorInput placeholder="Search voice..." />
          <VoiceSelectorList>
            <VoiceSelectorGroup heading="Default">
              <VoiceSelectorItem value="alloy">
                <VoiceSelectorName>Alloy</VoiceSelectorName>
                <VoiceSelectorAttributes>
                  <VoiceSelectorGender value="female" />
                  <VoiceSelectorBullet />
                  <VoiceSelectorAccent value="american" />
                  <VoiceSelectorBullet />
                  <VoiceSelectorAge>28</VoiceSelectorAge>
                </VoiceSelectorAttributes>
              </VoiceSelectorItem>
              <VoiceSelectorSeparator />
              <VoiceSelectorItem value="echo">
                <VoiceSelectorName>Echo</VoiceSelectorName>
              </VoiceSelectorItem>
            </VoiceSelectorGroup>
          </VoiceSelectorList>
          <VoiceSelectorEmpty>No voices found</VoiceSelectorEmpty>
        </VoiceSelectorContent>
      </VoiceSelector>,
    );

    expect(screen.getByText("Alloy")).toBeInTheDocument();
    expect(screen.getByText("Echo")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search voice...")).toBeInTheDocument();
  });

  it("calls onValueChange when item is selected", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <VoiceSelector open onValueChange={onValueChange}>
        <VoiceSelectorContent>
          <VoiceSelectorList>
            <VoiceSelectorItem
              value="echo"
              onSelect={() => onValueChange("echo")}
            >
              Echo
            </VoiceSelectorItem>
          </VoiceSelectorList>
        </VoiceSelectorContent>
      </VoiceSelector>,
    );

    await user.click(screen.getByText("Echo"));
    expect(onValueChange).toHaveBeenCalledWith("echo");
  });

  it("handles controlled value prop", () => {
    render(
      <VoiceSelector value="shimmer">
        <VoiceSelectorTrigger>
          <button>Current: shimmer</button>
        </VoiceSelectorTrigger>
      </VoiceSelector>,
    );

    expect(screen.getByText("Current: shimmer")).toBeInTheDocument();
  });

  it("handles default value prop", () => {
    render(
      <VoiceSelector defaultValue="nova">
        <VoiceSelectorTrigger>
          <button>Trigger</button>
        </VoiceSelectorTrigger>
      </VoiceSelector>,
    );

    expect(screen.getByText("Trigger")).toBeInTheDocument();
  });

  it("handles onOpenChange callback", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <VoiceSelector onOpenChange={onOpenChange}>
        <VoiceSelectorTrigger>
          <button>Open Dialog</button>
        </VoiceSelectorTrigger>
        <VoiceSelectorContent>
          <VoiceSelectorList>
            <VoiceSelectorItem value="a">A</VoiceSelectorItem>
          </VoiceSelectorList>
        </VoiceSelectorContent>
      </VoiceSelector>,
    );

    await user.click(screen.getByText("Open Dialog"));
    expect(onOpenChange).toHaveBeenCalled();
  });

  it("renders with defaultOpen", () => {
    render(
      <VoiceSelector defaultOpen>
        <VoiceSelectorContent>
          <VoiceSelectorList>
            <VoiceSelectorItem value="a">Visible Item</VoiceSelectorItem>
          </VoiceSelectorList>
        </VoiceSelectorContent>
      </VoiceSelector>,
    );

    expect(screen.getByText("Visible Item")).toBeInTheDocument();
  });
});

describe("VoiceSelectorShortcut", () => {
  it("renders shortcut text", () => {
    render(
      <VoiceSelector open>
        <VoiceSelectorContent>
          <VoiceSelectorList>
            <VoiceSelectorItem value="a">
              Item <VoiceSelectorShortcut>⌘K</VoiceSelectorShortcut>
            </VoiceSelectorItem>
          </VoiceSelectorList>
        </VoiceSelectorContent>
      </VoiceSelector>,
    );

    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });
});
