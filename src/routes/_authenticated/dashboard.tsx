import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { LogOut, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appQuery, type AppData } from "@/lib/nyumba";
import { Overview, PropertiesPanel } from "@/components/nl/landlord";
import { StaffPayments, TenantRent } from "@/components/nl/payments";
import {
  MaintenancePanel,
  MessagesPanel,
  MovingPanel,
  TimelinePanel,
} from "@/components/nl/shared";
import { AccessCodesPanel } from "@/components/nl/codes";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — NyumbaLink" },
      { name: "description", content: "Your NyumbaLink rent, tenants, repairs and messages." },
      { property: "og:title", content: "Dashboard — NyumbaLink" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "Your NyumbaLink rent, tenants, repairs and messages.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(appQuery),
  component: Dashboard,
});

type Tab = { id: string; label: string; render: (d: AppData) => React.ReactNode };
const tabsFor: Record<AppData["role"], Tab[]> = {
  landlord: [
    { id: "overview", label: "Overview", render: (d) => <Overview d={d} /> },
    { id: "houses", label: "Houses & leases", render: (d) => <PropertiesPanel d={d} /> },
    { id: "payments", label: "Payments", render: (d) => <StaffPayments d={d} /> },
    { id: "repairs", label: "Maintenance", render: (d) => <MaintenancePanel d={d} /> },
    { id: "messages", label: "Messages", render: (d) => <MessagesPanel d={d} /> },
    { id: "timeline", label: "Notices & timeline", render: (d) => <TimelinePanel d={d} /> },
    { id: "codes", label: "Access codes", render: (d) => <AccessCodesPanel d={d} /> },
  ],
  caretaker: [
    { id: "overview", label: "Overview", render: (d) => <Overview d={d} /> },
    { id: "payments", label: "Payments", render: (d) => <StaffPayments d={d} /> },
    { id: "repairs", label: "Maintenance", render: (d) => <MaintenancePanel d={d} /> },
    { id: "messages", label: "Messages", render: (d) => <MessagesPanel d={d} /> },
    { id: "timeline", label: "Notices & timeline", render: (d) => <TimelinePanel d={d} /> },
    { id: "codes", label: "My access code", render: (d) => <AccessCodesPanel d={d} /> },
  ],
  tenant: [
    { id: "rent", label: "My rent", render: (d) => <TenantRent d={d} /> },
    { id: "repairs", label: "Report a problem", render: (d) => <MaintenancePanel d={d} /> },
    { id: "messages", label: "Messages", render: (d) => <MessagesPanel d={d} /> },
    { id: "timeline", label: "Notices", render: (d) => <TimelinePanel d={d} /> },
    { id: "moving", label: "Moving services", render: () => <MovingPanel /> },
  ],
};

function Dashboard() {
  const { data: d } = useSuspenseQuery(appQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const ch = supabase
      .channel("nyumba-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () =>
        qc.invalidateQueries({ queryKey: ["nyumba"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () =>
        qc.invalidateQueries({ queryKey: ["nyumba"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_requests" }, () =>
        qc.invalidateQueries({ queryKey: ["nyumba"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const tabs = tabsFor[d.role];
  const unread = d.messages.filter((m) => m.recipient_id === d.uid && !m.read).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="NyumbaLink"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <span className="font-display text-lg font-bold">NyumbaLink</span>
            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">
              {d.role}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <Bell className="h-4 w-4" />
              {unread}
            </span>
            <span className="hidden sm:inline">{d.me?.full_name || d.me?.email}</span>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="mr-1 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue={tabs[0]?.id}>
          <TabsList className="mb-6 h-auto flex-wrap">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
                {t.id === "messages" && unread > 0 ? ` (${unread})` : ""}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.id} value={t.id}>
              {t.render(d)}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
