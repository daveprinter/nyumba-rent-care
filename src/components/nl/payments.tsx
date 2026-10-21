import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  arrears,
  isValidMpesaCode,
  kes,
  leaseInfo,
  nameOf,
  normalizeCode,
  type AppData,
  type Payment,
} from "@/lib/nyumba";
import { Empty, Section, Stat, Status, fmtDate, run, useRefresh } from "./common";

export function StaffPayments({ d }: { d: AppData }) {
  const pending = d.payments.filter((p) => p.status === "pending");
  const forwarded = pending.filter((p) => p.sent_to_landlord || p.sent_to_caretaker);
  const history = d.payments.filter((p) => p.status !== "pending");
  return (
    <div className="space-y-6">
      <Section title="Payments waiting for approval">
        {forwarded.length === 0 ? (
          <Empty>No M-PESA codes forwarded yet.</Empty>
        ) : (
          <div className="space-y-3">
            {forwarded.map((p) => (
              <ReviewRow key={p.id} d={d} p={p} />
            ))}
          </div>
        )}
      </Section>
      <Section title="Payment history">
        {history.length === 0 ? (
          <Empty>No reviewed payments yet.</Empty>
        ) : (
          <PaymentTable d={d} list={history} />
        )}
      </Section>
    </div>
  );
}

function ReviewRow({ d, p }: { d: AppData; p: Payment }) {
  const refresh = useRefresh();
  const [code, setCode] = useState("");
  const { room, property } = leaseInfo(d, p.lease_id);
  async function review(approve: boolean) {
    const { error } = await supabase.rpc("review_payment", {
      _payment_id: p.id,
      _code: code,
      _approve: approve,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(approve ? "Code matched — payment approved" : "Payment rejected");
    refresh();
  }
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span>
          <b>{nameOf(d, p.tenant_id)}</b> · {property?.name} {room?.name}
        </span>
        <span className="font-semibold">{kes(p.amount)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Sent {fmtDate(p.created_at)} to{" "}
        {[p.sent_to_landlord && "landlord", p.sent_to_caretaker && "caretaker"]
          .filter(Boolean)
          .join(" & ")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter M-PESA code from your statement"
          className="max-w-xs font-mono"
        />
        <Button size="sm" onClick={() => review(true)} disabled={!code}>
          Check & approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => review(false)}>
          Reject
        </Button>
      </div>
    </div>
  );
}

function PaymentTable({ d, list }: { d: AppData; list: Payment[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-2">Date</th>
            <th>Tenant</th>
            <th>Code</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {list.map((p) => (
            <tr key={p.id}>
              <td className="py-2">{fmtDate(p.created_at)}</td>
              <td>{nameOf(d, p.tenant_id)}</td>
              <td className="font-mono">{p.mpesa_code}</td>
              <td>{kes(p.amount)}</td>
              <td>
                <Status value={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TenantRent({ d }: { d: AppData }) {
  const refresh = useRefresh();
  const lease = d.leases.find((l) => l.active && l.tenant_id === d.uid);
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [billId, setBillId] = useState("");
  if (!lease)
    return (
      <Empty>
        You haven't been assigned a room yet. Ask your landlord to add you using your email (
        {d.me?.email}).
      </Empty>
    );
  const { room, property } = leaseInfo(d, lease.id);
  const bills = d.bills.filter((b) => b.lease_id === lease.id);
  const unpaid = bills.filter((b) => b.status !== "paid");
  const owed = arrears(bills, d.payments);
  const mine = d.payments.filter((p) => p.lease_id === lease.id);

  async function verify() {
    if (!isValidMpesaCode(code)) {
      toast.error("An M-PESA code has 10 letters and numbers, e.g. SJK3H7LQ2X");
      return;
    }
    const bill = unpaid.find((b) => b.id === billId) ?? unpaid[0];
    const ok = await run(
      () =>
        supabase.from("payments").insert({
          lease_id: lease!.id,
          bill_id: bill?.id ?? null,
          tenant_id: d.uid,
          mpesa_code: normalizeCode(code),
          amount: Number(amount || bill?.amount || lease!.monthly_rent),
        }),
      "Code verified and saved. Now send it to your landlord or caretaker.",
    );
    if (ok) {
      setCode("");
      setAmount("");
      refresh();
    }
  }
  async function send(p: Payment, l: boolean, c: boolean) {
    const { error } = await supabase.rpc("send_payment", {
      _payment_id: p.id,
      _to_landlord: l,
      _to_caretaker: c,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sent! It's now on their dashboard for approval.");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="My room" value={room?.name ?? "—"} hint={property?.name} />
        <Stat label="Monthly rent" value={kes(lease.monthly_rent)} />
        <Stat label="Arrears" value={kes(owed)} />
        <Stat
          label="Lease ends"
          value={fmtDate(lease.end_date)}
          hint={`Started ${fmtDate(lease.start_date)}`}
        />
      </div>

      <Section title="Pay rent with M-PESA">
        <p className="mb-3 text-sm text-muted-foreground">
          Pay via M-PESA, then paste the transaction code from your SMS and tap Verify.
        </p>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_160px_auto]">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={billId}
            onChange={(e) => setBillId(e.target.value)}
          >
            {unpaid.length === 0 && <option value="">No unpaid bills</option>}
            {unpaid.map((b) => (
              <option key={b.id} value={b.id}>
                {new Date(b.period).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}{" "}
                · {kes(b.amount)}
              </option>
            ))}
          </select>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Paste M-PESA code"
            className="font-mono"
          />
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
          <Button onClick={verify}>Verify</Button>
        </div>
      </Section>

      <Section title="My payments">
        {mine.length === 0 ? (
          <Empty>No payments yet.</Empty>
        ) : (
          <div className="space-y-2">
            {mine.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"
              >
                <span className="font-mono">{p.mpesa_code}</span>
                <span>{kes(p.amount)}</span>
                <Status value={p.status} />
                {p.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={p.sent_to_landlord ? "secondary" : "default"}
                      disabled={p.sent_to_landlord}
                      onClick={() => send(p, true, false)}
                    >
                      {p.sent_to_landlord ? "Sent to landlord" : "Send to landlord"}
                    </Button>
                    <Button
                      size="sm"
                      variant={p.sent_to_caretaker ? "secondary" : "default"}
                      disabled={p.sent_to_caretaker || !property?.caretaker_id}
                      onClick={() => send(p, false, true)}
                    >
                      {p.sent_to_caretaker ? "Sent to caretaker" : "Send to caretaker"}
                    </Button>
                    {!p.sent_to_landlord && property?.caretaker_id && !p.sent_to_caretaker && (
                      <Button size="sm" variant="outline" onClick={() => send(p, true, true)}>
                        Send to both
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Bills">
        <ul className="divide-y text-sm">
          {bills.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2">
              <span>
                {new Date(b.period).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}{" "}
                · due {fmtDate(b.due_date)}
              </span>
              <span className="flex items-center gap-2">
                {kes(b.amount)} <Status value={b.status} />
              </span>
            </li>
          ))}
        </ul>
      </Section>
      {lease.agreement && (
        <Section title="My lease agreement">
          <p className="whitespace-pre-wrap text-sm">{lease.agreement}</p>
        </Section>
      )}
    </div>
  );
}
