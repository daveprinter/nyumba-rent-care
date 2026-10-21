import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppData } from "@/lib/nyumba";
import { Section } from "./common";

export function AccessCodesPanel({ d }: { d: AppData }) {
  const q = useQuery({
    queryKey: ["staff-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_codes").select("role, code");
      if (error) throw error;
      return data;
    },
  });
  const [code, setCode] = useState("");
  const mine = q.data?.find((r) => r.role === d.role);
  const caretaker = q.data?.find((r) => r.role === "caretaker");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{4,8}$/.test(code)) { toast.error("Code must be 4–8 digits"); return; }
    const { error } = await supabase
      .from("staff_codes")
      .update({ code, updated_at: new Date().toISOString() })
      .eq("role", d.role as "landlord" | "caretaker");
    if (error) { toast.error(error.message); return; }
    toast.success("Access code changed");
    setCode("");
    q.refetch();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Section title="My access code">
        <p className="text-sm text-muted-foreground">Current code</p>
        <p className="mb-4 font-display text-3xl font-bold tracking-widest">{mine?.code ?? "…"}</p>
        <form onSubmit={save} className="space-y-3">
          <Label htmlFor="newcode">New code (4–8 digits)</Label>
          <Input
            id="newcode"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <Button type="submit">Change code</Button>
        </form>
      </Section>
      {d.role === "landlord" && (
        <Section title="Caretaker's active code">
          <p className="font-display text-3xl font-bold tracking-widest">
            {caretaker?.code ?? "…"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Share this with your caretaker so they can log in.
          </p>
        </Section>
      )}
    </div>
  );
}
