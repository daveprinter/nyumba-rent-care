import { useEffect, useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { arrears, kes, nameOf, type AppData, type Room } from "@/lib/nyumba";
import { Empty, Section, Stat, Status, fmtDate, run, useRefresh } from "./common";

export function Overview({ d }: { d: AppData }) {
  const active = d.leases.filter((l) => l.active);
  const owing = active
    .map((l) => ({
      l,
      amt: arrears(
        d.bills.filter((b) => b.lease_id === l.id),
        d.payments,
      ),
    }))
    .filter((x) => x.amt > 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Properties" value={d.properties.length} />
        <Stat label="Rooms occupied" value={`${active.length}/${d.rooms.length}`} />
        <Stat label="Arrears" value={kes(owing.reduce((s, x) => s + x.amt, 0))} />
        <Stat
          label="Payments to verify"
          value={d.payments.filter((p) => p.status === "pending").length}
          hint={`${d.maintenance.filter((m) => m.status !== "closed").length} open repairs`}
        />
      </div>
      <Section title="Arrears">
        {owing.length === 0 ? (
          <Empty>Everyone is up to date.</Empty>
        ) : (
          <ul className="divide-y">
            {owing.map(({ l, amt }) => {
              const room = d.rooms.find((r) => r.id === l.room_id);
              return (
                <li key={l.id} className="flex justify-between py-2 text-sm">
                  <span>
                    {nameOf(d, l.tenant_id)} · {room?.name}
                  </span>
                  <span className="font-semibold text-destructive">{kes(amt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
      <Section title="Leases ending soon">
        {active.filter((l) => l.end_date).length === 0 ? (
          <Empty>No leases with end dates.</Empty>
        ) : (
          <ul className="divide-y text-sm">
            {active
              .filter((l) => l.end_date)
              .sort((a, b) => a.end_date!.localeCompare(b.end_date!))
              .map((l) => (
                <li key={l.id} className="flex justify-between py-2">
                  <span>
                    {nameOf(d, l.tenant_id)} · {d.rooms.find((r) => r.id === l.room_id)?.name}
                  </span>
                  <span>{fmtDate(l.end_date)}</span>
                </li>
              ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export function PropertiesPanel({ d }: { d: AppData }) {
  const refresh = useRefresh();
  async function addProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (
      await run(
        () =>
          supabase.from("properties").insert({
            name: String(f.get("name")),
            location: String(f.get("location")),
            landlord_id: d.uid,
          }),
        "House added",
      )
    ) {
      form.reset();
      refresh();
    }
  }
  return (
    <div className="space-y-6">
      <Section title="Add a house">
        <form onSubmit={addProperty} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input name="name" placeholder="House name e.g. Baraka Apartments" required />
          <Input name="location" placeholder="Location e.g. Kilimani, Nairobi" />
          <Button type="submit">Add house</Button>
        </form>
      </Section>
      {d.properties.length === 0 && <Empty>Add your first house to start listing rooms.</Empty>}
      {d.properties.map((p) => (
        <PropertyCard key={p.id} d={d} pid={p.id} />
      ))}
    </div>
  );
}

function PropertyCard({ d, pid }: { d: AppData; pid: string }) {
  const refresh = useRefresh();
  const p = d.properties.find((x) => x.id === pid)!;
  const rooms = d.rooms.filter((r) => r.property_id === pid);
  const [tpl, setTpl] = usePersistentState(`nl:room-tpl:${pid}`, {
    prefix: "A",
    start: 1,
    count: 1,
    rent: "",
  });
  const [names, setNames] = useState<string[]>([]);
  const count = Math.min(50, Math.max(1, Number(tpl.count) || 1));
  useEffect(() => {
    setNames(Array.from({ length: count }, (_, i) => `${tpl.prefix}${Number(tpl.start || 1) + i}`));
  }, [tpl.prefix, tpl.start, count]);

  async function setCaretaker(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    const { data: id } = await supabase.rpc("find_user_by_email", { _email: email });
    if (!id) {
      toast.error("No NyumbaLink account with that email.");
      return;
    }
    if (
      await run(
        () => supabase.from("properties").update({ caretaker_id: id }).eq("id", pid),
        "Caretaker assigned",
      )
    )
      refresh();
  }
  async function addRooms(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const list = names.map((n) => n.trim()).filter(Boolean);
    if (list.length === 0) { toast.error("Enter at least one room number"); return; }
    if (new Set(list).size !== list.length) { toast.error("Room numbers must be different"); return; }
    if (
      await run(
        () =>
          supabase
            .from("rooms")
            .insert(list.map((name) => ({ property_id: pid, name, rent: Number(tpl.rent) }))),
        list.length > 1 ? `${list.length} rooms added` : "Room added",
      )
    ) {
      refresh();
    }
  }

  return (
    <Section
      title={p.name}
      action={<span className="text-sm text-muted-foreground">{p.location}</span>}
    >
      <form onSubmit={setCaretaker} className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span>
          Caretaker: <b>{nameOf(d, p.caretaker_id)}</b>
        </span>
        <Input
          name="email"
          type="email"
          placeholder="Caretaker's email"
          className="h-8 max-w-xs"
          required
        />
        <Button size="sm" variant="outline" type="submit">
          Assign
        </Button>
      </form>
      <div className="space-y-3">
        {rooms.map((r) => (
          <RoomRow key={r.id} d={d} room={r} />
        ))}
      </div>
      <form onSubmit={addRooms} className="mt-4 space-y-3 rounded-xl border p-3">
        <p className="text-sm font-semibold">Add rooms (same rent for all copies)</p>
        <div className="grid gap-2 md:grid-cols-4">
          <label className="text-xs">
            How many rooms
            <Input type="number" min={1} max={50} value={tpl.count}
              onChange={(e) => setTpl({ ...tpl, count: Number(e.target.value) })} />
          </label>
          <label className="text-xs">
            Room prefix
            <Input value={tpl.prefix} placeholder="e.g. A"
              onChange={(e) => setTpl({ ...tpl, prefix: e.target.value })} />
          </label>
          <label className="text-xs">
            Starting number
            <Input type="number" min={0} value={tpl.start}
              onChange={(e) => setTpl({ ...tpl, start: Number(e.target.value) })} />
          </label>
          <label className="text-xs">
            Monthly rent (each)
            <Input type="number" min={0} required value={tpl.rent}
              onChange={(e) => setTpl({ ...tpl, rent: e.target.value })} />
          </label>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Room numbers (edit any)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {names.map((n, i) => (
              <Input key={i} value={n} aria-label={`Room ${i + 1} number`}
                onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
            ))}
          </div>
        </div>
        <Button type="submit" variant="secondary">
          {count > 1 ? `Add ${count} rooms` : "Add room"}
        </Button>
      </form>
    </Section>
  );
}

function RoomRow({ d, room }: { d: AppData; room: Room }) {
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const lease = d.leases.find((l) => l.room_id === room.id && l.active);

  async function assign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { data: tenantId } = await supabase.rpc("find_user_by_email", {
      _email: String(f.get("email")),
    });
    if (!tenantId) {
      toast.error("That tenant needs to create a NyumbaLink account first.");
      return;
    }
    const ok = await run(
      () =>
        supabase.from("leases").insert({
          room_id: room.id,
          tenant_id: tenantId,
          start_date: String(f.get("start")),
          end_date: (f.get("end") as string) || null,
          monthly_rent: Number(f.get("rent")),
          agreement: String(f.get("agreement")),
        }),
      "Tenant assigned — first bill created",
    );
    if (ok) {
      setOpen(false);
      refresh();
    }
  }
  async function endLease() {
    if (!lease) return;
    const ok = await run(() =>
      supabase
        .from("leases")
        .update({ active: false, end_date: new Date().toISOString().slice(0, 10) })
        .eq("id", lease.id),
    );
    if (ok) {
      await supabase.from("notices").insert({
        property_id: room.property_id,
        author_id: d.uid,
        kind: "move_out",
        title: "Move-out",
        body: `${nameOf(d, lease.tenant_id)} moved out of ${room.name}`,
      });
      toast.success("Lease ended");
      refresh();
    }
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">
            {room.name}{" "}
            <span className="font-normal text-muted-foreground">· {kes(room.rent)}/mo</span>
          </p>
          {lease ? (
            <p className="text-sm text-muted-foreground">
              {nameOf(d, lease.tenant_id)} · from {fmtDate(lease.start_date)}{" "}
              {lease.end_date && `to ${fmtDate(lease.end_date)}`}
            </p>
          ) : (
            <Status value="open" />
          )}
        </div>
        {lease ? (
          <Button size="sm" variant="outline" onClick={endLease}>
            End lease / move out
          </Button>
        ) : (
          <Button size="sm" onClick={() => setOpen(!open)}>
            Assign tenant
          </Button>
        )}
      </div>
      {lease?.agreement && (
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-card p-2 text-xs">{lease.agreement}</p>
      )}
      {open && !lease && (
        <form onSubmit={assign} className="mt-3 grid gap-2 md:grid-cols-2">
          <Input name="email" type="email" placeholder="Tenant's email" required />
          <Input name="rent" type="number" defaultValue={room.rent} required />
          <label className="text-xs">
            Start date
            <Input
              name="start"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="text-xs">
            End date (optional)
            <Input name="end" type="date" />
          </label>
          <Textarea
            name="agreement"
            placeholder="Lease agreement terms"
            className="md:col-span-2"
          />
          <Button type="submit" className="md:col-span-2">
            Create lease
          </Button>
        </form>
      )}
    </div>
  );
}
