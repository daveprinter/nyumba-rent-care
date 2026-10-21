import { describe, expect, it } from "vitest";
import { canManageMaintenance, priorityOrder } from "./maintenance-ai";

describe("manager maintenance permissions", () => {
  const property = { landlord_id: "owner", caretaker_id: "staff" };
  it("allows the assigned landlord", () => expect(canManageMaintenance("landlord", "owner", property)).toBe(true));
  it("allows the assigned caretaker", () => expect(canManageMaintenance("caretaker", "staff", property)).toBe(true));
  it("denies staff for another property", () => expect(canManageMaintenance("landlord", "other", property)).toBe(false));
  it("denies tenants", () => expect(canManageMaintenance("tenant", "owner", property)).toBe(false));
});
describe("maintenance prioritization", () => {
  it("puts emergencies ahead of high priority", () => expect(priorityOrder("emergency")).toBeLessThan(priorityOrder("high")));
  it("puts high ahead of medium", () => expect(priorityOrder("high")).toBeLessThan(priorityOrder("medium")));
  it("puts medium ahead of low", () => expect(priorityOrder("medium")).toBeLessThan(priorityOrder("low")));
});