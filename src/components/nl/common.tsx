import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["nyumba"] });
}

export async function run(
  fn: () => PromiseLike<{ error: { message: string } | null }>,
  ok?: string,
) {
  const { error } = await fn();
  if (error) {
    toast.error(error.message);
    return false;
  }
  if (ok) toast.success(ok);
  return true;
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

const tone: Record<string, string> = {
  paid: "bg-success text-success-foreground",
  approved: "bg-success text-success-foreground",
  closed: "bg-success text-success-foreground",
  pending: "bg-warning text-foreground",
  in_progress: "bg-warning text-foreground",
  unpaid: "bg-destructive text-destructive-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  open: "bg-accent text-accent-foreground",
};
export function Status({ value }: { value: string }) {
  return <Badge className={`capitalize ${tone[value] ?? ""}`}>{value.replace("_", " ")}</Badge>;
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
    : "—";
