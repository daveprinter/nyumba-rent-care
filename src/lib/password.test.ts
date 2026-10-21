import { describe, expect, it } from "vitest";
import { validPassword } from "./password";

describe("tenant password requirements", () => {
  it("requires at least six characters", () => {
    expect(validPassword("Aa1!b")).toBe(false);
    expect(validPassword("Aa1!bc")).toBe(true);
  });
  it("requires a lowercase letter", () => expect(validPassword("AA1!BC")).toBe(false));
  it("requires an uppercase letter", () => expect(validPassword("aa1!bc")).toBe(false));
  it("requires a digit", () => expect(validPassword("Aa!!bc")).toBe(false));
  it("requires a special character, not whitespace", () => {
    expect(validPassword("Aa11bc")).toBe(false);
    expect(validPassword("Aa1 bc")).toBe(false);
  });
});