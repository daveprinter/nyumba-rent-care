import { useEffect, useRef, useState } from "react";
import { ExternalLink, Truck, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MOVERS_URL, contacts, leaseInfo, nameOf, type AppData } from "@/lib/nyumba";
import { Empty, Section, Status, fmtDate, run, useRefresh } from "./common";

export function MaintenancePanel({ d }: { d: AppData }) {
  const refresh = useRefresh();
  const lease = d.leases.find((l) => l.active && l.tenant_id === d.uid);
  async function raise(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (
      await run(
        () =>
          supabase.from("maintenance_requests").insert({
            lease_id: lease!.id,
            tenant_id: d.uid,
            title: String(f.get("title")),
            description: String(f.get("description")),
          }),
        "Fault reported",
      )
    ) {
      form.reset();
      refresh();
    }
  }
  async function setStatus(id: string, status: string) {
    if (
      await run(() =>
        supabase
          .from("maintenance_requests")
          .update({ status, closed_at: status === "closed" ? new Date().toISOString() : null })
          .eq("id", id),
      )
    )
      refresh();
  }
  const list = [...d.maintenance].sort(
    (a, b) => Number(a.status === "closed") - Number(b.status === "closed"),
  );
  return (
    <div className="space-y-6">
      {d.role === "tenant" && lease && (
        <Section title="Report a problem">
          <form onSubmit={raise} className="space-y-2">
            <Input name="title" placeholder="e.g. Leaking kitchen tap" required />
            <Textarea name="description" placeholder="Describe the problem" />
            <Button type="submit">Submit request</Button>
          </form>
        </Section>
      )}
      <Section title="Maintenance requests">
        {list.length === 0 ? (
          <Empty>No requests.</Empty>
        ) : (
          <div className="space-y-2">
            {list.map((m) => {
              const { room, property } = leaseInfo(d, m.lease_id);
              return (
                <div key={m.id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{m.title}</p>
                    <Status value={m.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {nameOf(d, m.tenant_id)} · {property?.name} {room?.name} ·{" "}
                    {fmtDate(m.created_at)}
                    {m.closed_at && ` · closed ${fmtDate(m.closed_at)}`}
                  </p>
                  {d.role !== "tenant" && m.status !== "closed" && (
                    <div className="mt-2 flex gap-2">
                      {m.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(m.id, "in_progress")}
                        >
                          Start work
                        </Button>
                      )}
                      <Button size="sm" onClick={() => setStatus(m.id, "closed")}>
                        Close out
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

export function MessagesPanel({ d }: { d: AppData }) {
  const refresh = useRefresh();
  const people = contacts(d);
  const [peer, setPeer] = useState<string | undefined>(people[0]);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const thread = d.messages.filter(
    (m) =>
      (m.sender_id === peer && m.recipient_id === d.uid) ||
      (m.sender_id === d.uid && m.recipient_id === peer),
  );
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
    const unread = thread.filter((m) => m.recipient_id === d.uid && !m.read).map((m) => m.id);
    if (unread.length)
      supabase
        .from("messages")
        .update({ read: true })
        .in("id", unread)
        .then(() => refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer, thread.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!peer || !text.trim()) return;
    if (
      await run(() =>
        supabase
          .from("messages")
          .insert({ sender_id: d.uid, recipient_id: peer, body: text.trim() }),
      )
    ) {
      setText("");
      refresh();
    }
  }
  if (people.length === 0)
    return (
      <Empty>
        No one to message yet — you'll see your landlord, caretaker or tenants here once you're
        linked to a house.
      </Empty>
    );
  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <div className="space-y-1 rounded-2xl border bg-card p-2">
        {people.map((id) => {
          const unread = d.messages.filter(
            (m) => m.sender_id === id && m.recipient_id === d.uid && !m.read,
          ).length;
          return (
            <button
              key={id}
              onClick={() => setPeer(id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${peer === id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <span className="truncate">{nameOf(d, id)}</span>
              {unread > 0 && (
                <span className="rounded-full bg-accent px-2 text-xs text-accent-foreground">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex h-[480px] flex-col rounded-2xl border bg-card">
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {thread.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Say hello 👋</p>
          )}
          {thread.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === d.uid ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {m.payment_id && <p className="text-xs font-semibold opacity-80">💳 Payment</p>}
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[10px] opacity-60">
                {new Date(m.created_at).toLocaleString("en-KE")}
              </p>
            </div>
          ))}
          <div ref={end} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t p-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${nameOf(d, peer)}`}
          />
          <Button type="submit">Send</Button>
        </form>
      </div>
    </div>
  );
}

export function TimelinePanel({ d }: { d: AppData }) {
  const refresh = useRefresh();
  const [pid, setPid] = useState(d.properties[0]?.id);
  if (!pid) return <Empty>No houses yet.</Empty>;
  const roomIds = d.rooms.filter((r) => r.property_id === pid).map((r) => r.id);
  const leaseIds = d.leases.filter((l) => roomIds.includes(l.room_id)).map((l) => l.id);
  const events = [
    ...d.notices
      .filter((n) => n.property_id === pid)
      .map((n) => ({ at: n.created_at, kind: n.kind, title: n.title, body: n.body })),
    ...d.payments
      .filter((p) => leaseIds.includes(p.lease_id) && p.status === "approved")
      .map((p) => ({
        at: p.reviewed_at ?? p.created_at,
        kind: "payment",
        title: "Rent paid",
        body: `${nameOf(d, p.tenant_id)} · KES ${p.amount} · ${p.mpesa_code}`,
      })),
    ...d.maintenance
      .filter((m) => leaseIds.includes(m.lease_id))
      .map((m) => ({
        at: m.created_at,
        kind: "repair",
        title: `Repair: ${m.title}`,
        body: `Reported by ${nameOf(d, m.tenant_id)} · ${m.status.replace("_", " ")}`,
      })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  async function post(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (
      await run(
        () =>
          supabase.from("notices").insert({
            property_id: pid!,
            author_id: d.uid,
            title: String(f.get("title")),
            body: String(f.get("body")),
          }),
        "Notice posted",
      )
    ) {
      form.reset();
      refresh();
    }
  }
  return (
    <div className="space-y-6">
      {d.properties.length > 1 && (
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={pid}
          onChange={(e) => setPid(e.target.value)}
        >
          {d.properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {d.role !== "tenant" && (
        <Section title="Post a notice">
          <form onSubmit={post} className="space-y-2">
            <Input name="title" placeholder="e.g. Water shutdown on Saturday" required />
            <Textarea name="body" placeholder="Details for tenants" />
            <Button type="submit">Post notice</Button>
          </form>
        </Section>
      )}
      <Section title="Timeline & notice history">
        {events.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-primary/30 pl-5">
            {events.map((ev, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-accent" />
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {fmtDate(ev.at)} · {ev.kind.replace("_", " ")}
                </p>
                <p className="font-semibold">{ev.title}</p>
                {ev.body && <p className="text-sm text-muted-foreground">{ev.body}</p>}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

export function MovingPanel() {
  const steps = {
    "Moving in": [
      "Sign your lease agreement",
      "Pay deposit & first month via M-PESA",
      "Inspect the room and report any faults",
      "Collect keys from the caretaker",
    ],
    "Moving out": [
      "Give notice to your landlord via Messages",
      "Clear any arrears",
      "Book movers",
      "Hand over keys & final inspection",
    ],
  };
  return (
    <div className="space-y-6">
      <Section title="Recommended movers">
        <div className="flex flex-col items-start gap-4 rounded-xl bg-primary p-5 text-primary-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-10 w-10 text-accent" />
            <div>
              <p className="font-display text-xl font-bold">HomeShift Movers</p>
              <p className="text-sm opacity-85">
                Recommended by NyumbaLink for safe, affordable moves.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <a href={MOVERS_URL} target="_blank" rel="noopener noreferrer">
              Open moving services <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </Section>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(steps).map(([title, list]) => (
          <Section key={title} title={title}>
            <ul className="space-y-2 text-sm">
              {list.map((s) => (
                <li key={s} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  {s}
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
    </div>
  );
}
