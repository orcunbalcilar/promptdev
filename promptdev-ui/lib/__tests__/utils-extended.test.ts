import { describe, it, expect } from "vitest";
import { generateTaskTitle, slugify } from "@/lib/utils";

describe("generateTaskTitle", () => {
  it("returns empty string for empty input", () => {
    expect(generateTaskTitle("")).toBe("");
  });

  it("returns empty string for undefined-like falsy input", () => {
    expect(generateTaskTitle("")).toBe("");
  });

  it("returns first line stripped of markdown formatting", () => {
    expect(generateTaskTitle("# Hello World")).toBe("Hello World");
    expect(generateTaskTitle("**Bold text** here")).toBe("Bold text here");
    expect(generateTaskTitle("`code` snippet")).toBe("Code snippet");
  });

  it("capitalizes the first letter", () => {
    expect(generateTaskTitle("hello world")).toBe("Hello world");
  });

  it("limits to ~8 words and appends ellipsis", () => {
    const longPrompt =
      "one two three four five six seven eight nine ten eleven";
    const result = generateTaskTitle(longPrompt);
    expect(result).toBe("One two three four five six seven eight...");
  });

  it("does not append ellipsis when 8 words or fewer", () => {
    const shortPrompt = "one two three four five";
    const result = generateTaskTitle(shortPrompt);
    expect(result).toBe("One two three four five");
    expect(result).not.toContain("...");
  });

  it("uses only the first line of multi-line input", () => {
    const multiLine = "First line title\nSecond line body\nThird line";
    expect(generateTaskTitle(multiLine)).toBe("First line title");
  });

  it("returns empty string when first line is only markdown chars", () => {
    expect(generateTaskTitle("###\nsecond line")).toBe("");
  });

  it("handles exactly 8 words without ellipsis", () => {
    const exact8 = "one two three four five six seven eight";
    expect(generateTaskTitle(exact8)).toBe(
      "One two three four five six seven eight",
    );
  });

  it("handles single word", () => {
    expect(generateTaskTitle("hello")).toBe("Hello");
  });

  it("trims leading/trailing whitespace on first line", () => {
    expect(generateTaskTitle("  spaced out  ")).toBe("Spaced out");
  });
});

describe("slugify", () => {
  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("foo bar baz")).toBe("foo-bar-baz");
  });

  it("removes non-word characters", () => {
    expect(slugify("hello! @world #2024")).toBe("hello-world-2024");
  });

  it("collapses multiple hyphens into one", () => {
    expect(slugify("hello---world")).toBe("hello-world");
  });

  it("trims hyphens from start and end", () => {
    expect(slugify("-hello-world-")).toBe("hello-world");
  });

  it("handles mixed special characters", () => {
    expect(slugify("  Hello, World! This is #1.  ")).toBe(
      "hello-world-this-is-1",
    );
  });

  it("handles tabs and multiple spaces", () => {
    expect(slugify("foo\t  bar")).toBe("foo-bar");
  });

  it("preserves underscores (word chars)", () => {
    expect(slugify("hello_world")).toBe("hello_world");
  });

  it("handles numbers", () => {
    expect(slugify("Test 123")).toBe("test-123");
  });

  it("handles string with only special characters", () => {
    expect(slugify("!@#$%")).toBe("");
  });
});
