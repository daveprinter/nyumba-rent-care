import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const STAFF_EMAIL = { landlord: "landlord@nyumbalink.app", caretaker: "caretaker@nyumbalink.app" };
const STAFF_NAME = { landlord: "Landlord", caretaker: "Caretaker" };

/** Verifies a landlord/caretaker access code and returns a one-time sign-in token. */
export const staffLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ role: z.enum(["landlord", "caretaker"]), code: z.string().min(1).max(12) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("staff_codes")
      .select("*")
      .eq("role", data.role)
      .single();
    if (error || !row) throw new Error(`Login unavailable${error ? ": " + error.message : ""}`);
    if (row.code !== data.code.trim()) throw new Error("Wrong code");

    const email = STAFF_EMAIL[data.role];
    if (!row.user_id) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        app_metadata: { role: data.role },
        user_metadata: { full_name: STAFF_NAME[data.role] },
      });
      if (created.error || !created.data.user) throw new Error(created.error?.message ?? "Failed");
      await supabaseAdmin
        .from("staff_codes")
        .update({ user_id: created.data.user.id })
        .eq("role", data.role);
      // app_metadata lands after the signup trigger, so set the role explicitly.
      await supabaseAdmin.from("user_roles").delete().eq("user_id", created.data.user.id);
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: created.data.user.id, role: data.role });
    }
    const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) throw new Error(link.error.message);
    return { tokenHash: link.data.properties.hashed_token };
  });
