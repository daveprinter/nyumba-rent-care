import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categories, priorities, type Triage } from "@/lib/maintenance-ai";
import { classifyMaintenance, saveManagerMaintenance } from "@/lib/maintenance.functions";
import { leaseInfo, nameOf, type AppData } from "@/lib/nyumba";
import { Empty, useRefresh } from "./common";

export function MaintenanceComposer({ d }: { d: AppData }) {
  const leases = d.leases.filter((l) => l.active);
  const [leaseId, setLeaseId] = useState(leases[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [triage, setTriage] = useState<Triage | null>(null);
  const [busy, setBusy] = useState<"ai" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const classify = useServerFn(classifyMaintenance);
  const save = useServerFn(saveManagerMaintenance);
  const refresh = useRefresh();
  const valid = leaseId && title.trim().length >= 3 && description.trim().length >= 10;
  const resetAssessment = () => { setTriage(null); setError(null); };
  async function assess() {
    setBusy("ai"); setError(null);
    try {
      const result = await classify({ data: { leaseId, title, description } });
      setTriage(result.triage); setError(result.error);
    } catch (e) { setError(e instanceof Error ? e.message : "Assessment failed."); }
    finally { setBusy(null); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy("save"); setError(null);
    try {
      await save({ data: { leaseId, title, description, triage } });
      setTitle(""); setDescription(""); setTriage(null);
      toast.success("Maintenance request saved. Response remains a draft.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Request could not be saved."); }
    finally { setBusy(null); }
  }
  if (!leases.length) return <Empty>No active tenant leases yet.</Empty>;
  return <form onSubmit={submit} className="space-y-4">
    <div className="space-y-1.5">
      <Label htmlFor="maintenance-tenant">Tenant & room</Label>
      <Select value={leaseId} onValueChange={(id) => { setLeaseId(id); resetAssessment(); }} disabled={busy !== null}>
        <SelectTrigger id="maintenance-tenant" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{leases.map((l) => {
          const { property, room } = leaseInfo(d, l.id);
          return <SelectItem key={l.id} value={l.id}>{nameOf(d, l.tenant_id)} · {property?.name} / {room?.name}</SelectItem>;
        })}</SelectContent>
      </Select>
    </div>
    <div className="space-y-1.5"><Label htmlFor="maintenance-title">Issue</Label>
      <Input id="maintenance-title" value={title} onChange={(e) => { setTitle(e.target.value); resetAssessment(); }} placeholder="e.g. Water leaking near an electrical socket" minLength={3} maxLength={160} required disabled={busy !== null} />
    </div>
    <div className="space-y-1.5"><Label htmlFor="maintenance-description">Tenant’s report</Label>
      <Textarea id="maintenance-description" value={description} onChange={(e) => { setDescription(e.target.value); resetAssessment(); }} placeholder="What happened, where, when, and any immediate safety concerns" minLength={10} maxLength={4000} required disabled={busy !== null} />
    </div>
    <Button type="button" variant="outline" disabled={!valid || busy !== null} onClick={assess}>
      {busy === "ai" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      {busy === "ai" ? "Assessing request…" : "Classify & draft with AI"}
    </Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {triage && <div className="space-y-4 border-t pt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="maintenance-category">Category</Label>
          <Select value={triage.category} onValueChange={(category: Triage["category"]) => setTriage({ ...triage, category })} disabled={busy !== null}>
            <SelectTrigger id="maintenance-category" className="w-full capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1.5"><Label htmlFor="maintenance-priority">Priority</Label>
          <Select value={triage.priority} onValueChange={(priority: Triage["priority"]) => setTriage({ ...triage, priority })} disabled={busy !== null}>
            <SelectTrigger id="maintenance-priority" className="w-full capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>{priorities.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
          </Select></div>
      </div>
      <p className="text-sm text-muted-foreground">{triage.priorityReason}</p>
      <div><h3 className="mb-2 text-sm font-semibold">Recommended actions</h3><ol className="list-decimal space-y-1 pl-5 text-sm">{triage.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}</ol></div>
      <div className="space-y-1.5"><Label htmlFor="maintenance-response">Tenant response · draft</Label>
        <Textarea id="maintenance-response" value={triage.responseDraft} onChange={(e) => setTriage({ ...triage, responseDraft: e.target.value })} rows={5} disabled={busy !== null} />
      </div>
    </div>}
    <div><Button type="submit" disabled={!valid || busy !== null}>
      {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save request{triage ? " & draft" : ""}
    </Button></div>
  </form>;
}