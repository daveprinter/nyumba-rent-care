import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, KeyRound, Wallet, Wrench, MessageCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { staffLogin } from "@/lib/staff.functions";
import { useServerFn } from "@tanstack/react-start";
import { PasswordField } from "@/components/nl/password-field";
import { validPassword } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/logo.png";
import heroImg from "@/assets/hero.jpg";
import heroVideo from "@/assets/hero.mp4.asset.json";
import heroWebm from "@/assets/hero.webm.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NyumbaLink — Rent, tenants & maintenance in one place" },
      {
        name: "description",
        content:
          "Landlords, caretakers and tenants run a rental property together: M-PESA rent, leases, repairs and messaging.",
      },
      { property: "og:title", content: "NyumbaLink — Run your rental together" },
      {
        property: "og:description",
        content:
          "Landlords, caretakers and tenants in one place: rent, leases, repairs and messaging.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const floaters = [Home, KeyRound, Wallet, Wrench, MessageCircle, Building2];

function Landing() {
  const navigate = useNavigate();
  const loginStaff = useServerFn(staffLogin);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"tenant" | "landlord" | "caretaker">("tenant");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(f.get("email")).trim(),
        password: String(f.get("password")),
      });
      if (error) throw error;
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (!validPassword(password)) {
      toast.error("Please meet all five password requirements.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
      email: String(f.get("email")).trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: String(f.get("name")), phone: String(f.get("phone")) },
      },
    });
      if (error) throw error;
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else toast.info("Check your email to confirm your existing account, then log in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function staffSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code"));
    setLoading(true);
    try {
      const { tokenHash } = await loginStaff({
        data: { role: role as "landlord" | "caretaker", code },
      });
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw error;
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-overlay text-overlay-foreground">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        poster={heroImg}
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={heroWebm.url} type="video/webm" />
        <source src={heroVideo.url} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 14 }).map((_, i) => {
          const Icon = floaters[i % floaters.length] ?? Home;
          return (
            <Icon
              key={i}
              className="animate-float-up absolute bottom-0 text-accent/60"
              style={{
                left: `${(i * 37) % 100}%`,
                width: 18 + (i % 4) * 8,
                height: 18 + (i % 4) * 8,
                animationDuration: `${12 + (i % 5) * 3}s`,
                animationDelay: `${i * 1.3}s`,
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2">
        <section className="animate-fade-rise">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full glass px-4 py-2 text-foreground">
            <img
              src={logo}
              alt="NyumbaLink logo"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <span className="font-display text-lg font-bold">NyumbaLink</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight md:text-6xl">
            One home for <span className="text-accent">landlords</span>, caretakers & tenants.
          </h1>
          <p className="mt-5 max-w-md text-lg opacity-85">
            Monthly rent billed automatically, M-PESA codes verified in a tap, repairs tracked until
            they're done.
          </p>
          <div className="mt-8 flex items-center gap-3 opacity-90">
            <KeyRound className="animate-key-swing h-8 w-8 text-accent" />
            <span className="text-sm">Every room, every lease, every shilling — linked.</span>
          </div>
        </section>

        <section className="animate-fade-rise glass rounded-2xl p-6 text-foreground shadow-elegant [animation-delay:200ms]">
          <div className="mb-4 grid grid-cols-3 gap-2">
            {(["tenant", "caretaker", "landlord"] as const).map((r) => (
              <Button
                key={r}
                type="button"
                variant={role === r ? "default" : "outline"}
                onClick={() => setRole(r)}
                className="capitalize"
              >
                {r}
              </Button>
            ))}
          </div>
          {role === "tenant" ? (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Log in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <Field name="email" label="Email" type="email" />
                  <PasswordField />
                  <Button type="submit" className="w-full" disabled={loading}>
                    Log in
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <Field name="name" label="Full name" />
                  <Field name="phone" label="Phone (M-PESA)" />
                  <Field name="email" label="Email" type="email" />
                  <PasswordField signup />
                  <Button type="submit" className="w-full" disabled={loading}>
                    Create tenant account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={staffSignIn} className="space-y-4">
              <h2 className="text-xl font-semibold capitalize">{role} log in</h2>
              <Field name="code" label={`${role} access code`} type="code" />
              <Button type="submit" className="w-full" disabled={loading}>
                Log in
              </Button>
            </form>
          )}

        </section>
      </div>
    </main>
  );
}

function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type === "code" ? "password" : type}
        inputMode={type === "code" ? "numeric" : undefined}
        required
        minLength={type === "password" ? 6 : undefined}
      />
    </div>
  );
}
