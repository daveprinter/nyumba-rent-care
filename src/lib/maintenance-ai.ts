import { z } from "zod";

export const categories = ["plumbing", "electrical", "structural", "security", "appliance", "pest", "other"] as const;
export const priorities = ["emergency", "high", "medium", "low"] as const;
export const triageSchema = z.object({
  category: z.enum(categories),
  priority: z.enum(priorities),
  priorityReason: z.string(),
  recommendedActions: z.array(z.string()),
  responseDraft: z.string(),
});
export type Triage = z.infer<typeof triageSchema>;
export const maintenanceInput = z.object({
  leaseId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(4000),
});
export function canManageMaintenance(role: string, userId: string, property: { landlord_id: string; caretaker_id: string | null }) {
  return (role === "landlord" || role === "caretaker") &&
    (property.landlord_id === userId || property.caretaker_id === userId);
}
export function priorityOrder(priority: string | null) {
  const index = priorities.indexOf(priority as typeof priorities[number]);
  return index < 0 ? priorities.length : index;
}