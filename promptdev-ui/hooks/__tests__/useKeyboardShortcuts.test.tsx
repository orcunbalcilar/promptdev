import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  it("should call handler when matching key is pressed", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "k", handler }])
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should respect modifier keys", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "k", ctrlKey: true, handler }])
    );

    // Without ctrl - should not trigger
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    expect(handler).not.toHaveBeenCalled();

    // With ctrl - should trigger
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should ignore input elements by default", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "k", handler }])
    );

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "k", bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("should handle multiple shortcuts", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: "a", handler: handler1 },
        { key: "b", handler: handler2 },
      ])
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("should clean up event listeners on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([{ key: "k", handler }])
    );

    unmount();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("should prevent default on matching shortcut", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "s", ctrlKey: true, handler }])
    );

    const event = new KeyboardEvent("keydown", { key: "s", ctrlKey: true });
    const preventSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    expect(preventSpy).toHaveBeenCalled();
  });
});
