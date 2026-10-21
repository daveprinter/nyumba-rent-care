import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Property = T["properties"]["Row"];
export type Room = T["rooms"]["Row"];
export type Lease = T["leases"]["Row"];
export type Bill = T["bills"]["Row"];
export type Payment = T["payments"]["Row"];
export type Maintenance = T["maintenance_requests"]["Row"];
export type Message = T["messages"]["Row"];
export type Notice = T["notices"]["Row"];
export type Profile = T["profiles"]["Row"];
export type Role = "landlord" | "caretaker" | "tenant";

export const MOVERS_URL = "https://homeshiftt.lovable.app";

export const MPESA_CODE = /^[A-Z0-9]{10}$/;
export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}
export function isValidMpesaCode(code: string) {
  return MPESA_CODE.test(normalizeCode(code));
}

export function arrears(
  bills: Pick<Bill, "amount" | "status" | "id">[],
  payments: Pick<Payment, "bill_id" | "amount" | "status">[],
) {
  return bills
    .filter((b) => b.status !== "paid")
    .reduce((sum, b) => {
      const paid = payments
        .filter((p) => p.bill_id === b.id && p.status === "approved")
        .reduce((s, p) => s + Number(p.amount), 0);
      return sum + Math.max(0, Number(b.amount) - paid);
    }, 0);
}

export const kes = (n: number | string) => `KES ${Number(n).toLocaleString()}`;

async function rows<R>(p: PromiseLike<{ data: R[] | null; error: { message: string } | null }>) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const appQuery = queryOptions({
  queryKey: ["nyumba"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id;
    await supabase.rpc("generate_monthly_bills");
    const [
      roles,
      profiles,
      properties,
      rooms,
      leases,
      bills,
      payments,
      maintenance,
      notices,
      messages,
    ] = await Promise.all([
      rows(supabase.from("user_roles").select("role").eq("user_id", uid)),
      rows(supabase.from("profiles").select("*")),
      rows(supabase.from("properties").select("*").order("created_at")),
      rows(supabase.from("rooms").select("*").order("name")),
      rows(supabase.from("leases").select("*").order("created_at", { ascending: false })),
      rows(supabase.from("bills").select("*").order("period", { ascending: false })),
      rows(supabase.from("payments").select("*").order("created_at", { ascending: false })),
      rows(
        supabase.from("maintenance_requests").select("*").order("created_at", { ascending: false }),
      ),
      rows(supabase.from("notices").select("*").order("created_at", { ascending: false })),
      rows(supabase.from("messages").select("*").order("created_at")),
    ]);
    const role = ((roles[0] as { role: Role } | undefined)?.role ?? "tenant") as Role;
    const profileMap = Object.fromEntries((profiles as Profile[]).map((p) => [p.id, p]));
    return {
      uid,
      role,
      me: profileMap[uid] as Profile | undefined,
      profileMap: profileMap as Record<string, Profile>,
      properties: properties as Property[],
      rooms: rooms as Room[],
      leases: leases as Lease[],
      bills: bills as Bill[],
      payments: payments as Payment[],
      maintenance: maintenance as Maintenance[],
      notices: notices as Notice[],
      messages: messages as Message[],
    };
  },
});

export type AppData = Awaited<ReturnType<NonNullable<typeof appQuery.queryFn>>>;

export function leaseInfo(d: AppData, leaseId: string) {
  const lease = d.leases.find((l) => l.id === leaseId);
  const room = d.rooms.find((r) => r.id === lease?.room_id);
  const property = d.properties.find((p) => p.id === room?.property_id);
  return { lease, room, property, tenant: lease ? d.profileMap[lease.tenant_id] : undefined };
}

export function nameOf(d: AppData, id?: string | null) {
  if (!id) return "—";
  const p = d.profileMap[id];
  return p?.full_name || p?.email || "Unknown";
}

/** People this user may message: counterparts on shared properties. */
export function contacts(d: AppData) {
  const ids = new Set<string>();
  for (const p of d.properties) {
    ids.add(p.landlord_id);
    if (p.caretaker_id) ids.add(p.caretaker_id);
  }
  if (d.role !== "tenant") for (const l of d.leases) ids.add(l.tenant_id);
  for (const m of d.messages) {
    ids.add(m.sender_id);
    ids.add(m.recipient_id);
  }
  ids.delete(d.uid);
  return [...ids];
}
