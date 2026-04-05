import { describe, it, expect } from "vitest";
import {
  stripHtml,
  sanitizeString,
  sanitizeObject,
  isValidEmail,
  isValidPhone,
  isWithinLength,
  MAX_MESSAGE_LENGTH,
} from "../utils/sanitizer.js";

describe("stripHtml — XSS protection", () => {
  it("strips entire script tag including content", () => {
    expect(stripHtml("<script>alert(1)</script>")).toBe("");
  });

  it("strips all HTML tags", () => {
    expect(stripHtml("<b>Hello</b> <em>World</em>")).toBe("Hello World");
  });

  it("strips img tag with onerror XSS", () => {
    expect(stripHtml('<img src=x onerror="alert(1)">')).not.toContain("<");
  });

  it("strips anchor tag", () => {
    expect(stripHtml('<a href="javascript:void(0)">click</a>')).toBe("click");
  });

  it("leaves plain text untouched", () => {
    expect(stripHtml("Hello, ich möchte einen Termin buchen.")).toBe(
      "Hello, ich möchte einen Termin buchen."
    );
  });

  it("handles encoded entities", () => {
    const result = stripHtml("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result).not.toContain("<script>");
  });
});

describe("sanitizeString", () => {
  it("strips HTML and respects default max length", () => {
    const xss = "<script>alert('xss')</script>Normal text";
    const result = sanitizeString(xss);
    expect(result).toBe("Normal text");
    expect(result.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
  });

  it("truncates to custom maxLength", () => {
    const long = "a".repeat(100);
    expect(sanitizeString(long, 10)).toHaveLength(10);
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeString("")).toBe("");
  });
});

describe("sanitizeObject", () => {
  it("sanitizes all string values in an object", () => {
    const input = {
      name: "<b>Maria</b>",
      message: "<script>alert(1)</script>Hallo",
      age: 30,
    };
    const result = sanitizeObject(input);
    expect(result.name).toBe("Maria");
    expect(result.message).toBe("Hallo");
    expect(result.age).toBe(30); // non-string unchanged
  });
});

describe("isValidEmail", () => {
  it("accepts valid email addresses", () => {
    expect(isValidEmail("maria@example.at")).toBe(true);
    expect(isValidEmail("hello@viennaglowstudio.at")).toBe(true);
    expect(isValidEmail("user+tag@domain.co.uk")).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@nodomain.com")).toBe(false);
    expect(isValidEmail("noatsign.com")).toBe(false);
    expect(isValidEmail("missing@tld")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts valid phone numbers", () => {
    expect(isValidPhone("+43 1 234 5678")).toBe(true);
    expect(isValidPhone("+4312345678")).toBe(true);
    expect(isValidPhone("06641234567")).toBe(true);
    expect(isValidPhone("(01) 234-5678")).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(isValidPhone("123")).toBe(false);           // too short
    expect(isValidPhone("abc")).toBe(false);           // non-digits
    expect(isValidPhone("12345678901234567")).toBe(false); // too long (>15 digits)
  });
});

describe("isWithinLength", () => {
  it("returns true when within limit", () => {
    expect(isWithinLength("hello", 10)).toBe(true);
    expect(isWithinLength("a".repeat(2000), 2000)).toBe(true);
  });

  it("returns false when over limit", () => {
    expect(isWithinLength("a".repeat(2001), 2000)).toBe(false);
  });
});
