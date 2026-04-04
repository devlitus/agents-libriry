import { describe, it, expect } from "vitest";
import { shellEscape } from "./test-command.js";

describe("shellEscape", () => {
  it("returns input unchanged when no shell metacharacters are present", () => {
    expect(shellEscape("foo.test.ts")).toBe("foo.test.ts");
    expect(shellEscape("src/__tests__/api.test.ts")).toBe("src/__tests__/api.test.ts");
    expect(shellEscape("test-file.ts")).toBe("test-file.ts");
  });

  it("escapes semicolon when present", () => {
    expect(shellEscape("foo;bar.test.ts")).toBe("foo\\;bar.test.ts");
  });

  it("escapes ampersand when present", () => {
    expect(shellEscape("foo&bar.test.ts")).toBe("foo\\&bar.test.ts");
  });

  it("escapes pipe when present", () => {
    expect(shellEscape("foo|bar.test.ts")).toBe("foo\\|bar.test.ts");
  });

  it("escapes backtick when present", () => {
    expect(shellEscape("foo`bar`.test.ts")).toBe("foo\\`bar\\`.test.ts");
  });

  it("escapes dollar sign when present", () => {
    expect(shellEscape("foo$bar.test.ts")).toBe("foo\\$bar.test.ts");
  });

  it("escapes less-than when present", () => {
    expect(shellEscape("foo<bar.test.ts")).toBe("foo\\<bar.test.ts");
  });

  it("escapes greater-than when present", () => {
    expect(shellEscape("foo>bar.test.ts")).toBe("foo\\>bar.test.ts");
  });

  it("escapes parentheses when present", () => {
    expect(shellEscape("foo(bar).test.ts")).toBe("foo\\(bar\\).test.ts");
  });

  it("escapes square brackets when present", () => {
    expect(shellEscape("foo[bar].test.ts")).toBe("foo\\[bar\\].test.ts");
  });

  it("escapes curly braces when present", () => {
    expect(shellEscape("foo{bar}.test.ts")).toBe("foo\\{bar\\}.test.ts");
  });

  it("escapes exclamation mark when present", () => {
    expect(shellEscape("foo!bar.test.ts")).toBe("foo\\!bar.test.ts");
  });

  it("escapes hash when present", () => {
    expect(shellEscape("foo#bar.test.ts")).toBe("foo\\#bar.test.ts");
  });

  it("escapes asterisk when present", () => {
    expect(shellEscape("foo*bar.test.ts")).toBe("foo\\*bar.test.ts");
  });

  it("escapes question mark when present", () => {
    expect(shellEscape("foo?bar.test.ts")).toBe("foo\\?bar.test.ts");
  });

  it("escapes backslash when present", () => {
    expect(shellEscape("foo\\bar.test.ts")).toBe("foo\\\\bar.test.ts");
  });

  it("escapes single quote when present", () => {
    expect(shellEscape("foo'bar.test.ts")).toBe("foo\\'bar.test.ts");
  });

  it("escapes multiple metacharacters in sequence", () => {
    expect(shellEscape("foo;bar&test$file.ts")).toBe("foo\\;bar\\&test\\$file.ts");
  });

  it("escapes metacharacters at start of string", () => {
    expect(shellEscape(";foo.test.ts")).toBe("\\;foo.test.ts");
  });

  it("escapes metacharacters at end of string", () => {
    expect(shellEscape("foo.test.ts;")).toBe("foo.test.ts\\;");
  });
});
