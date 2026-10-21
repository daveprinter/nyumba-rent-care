<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Role lives in `user_roles`, set by `handle_new_user` from app_metadata only (public signup is always tenant); landlord/caretaker sign in via access code (`staff_codes` table, `staffLogin` server fn issues a magic-link token for one shared staff account per role); data access is relational (property landlord_id/caretaker_id, lease tenant_id) via RLS helper functions — why: role alone never grants access to someone else's data.
- Payment state changes only through SQL functions `send_payment` and `review_payment` (tenants cannot update payments) — why: prevents tenants self-approving.
- Dashboard loads all role-visible data in one query (`appQuery` in src/lib/nyumba.ts) and invalidates it on realtime messages/payments changes — why: simple and RLS already scopes rows.
- Monthly bills: idempotent `generate_monthly_bills()` run by pg_cron on the 1st and on dashboard load.
