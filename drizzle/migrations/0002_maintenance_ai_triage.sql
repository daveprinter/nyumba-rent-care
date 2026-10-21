ALTER TABLE public.maintenance_requests ADD COLUMN category text, ADD COLUMN priority text, ADD COLUMN priority_reason text, ADD COLUMN recommended_actions jsonb, ADD COLUMN response_draft text, ADD COLUMN reported_by uuid, ADD COLUMN ai_generated boolean NOT NULL DEFAULT false;
CREATE POLICY "staff raise for assigned tenant" ON public.maintenance_requests FOR INSERT TO authenticated WITH CHECK (
(public.has_role(auth.uid(),'landlord') OR public.has_role(auth.uid(),'caretaker')) AND public.is_property_staff(public.lease_property(lease_id)) AND EXISTS(SELECT 1 FROM public.leases l WHERE l.id=lease_id AND l.tenant_id=maintenance_requests.tenant_id AND l.active)
);
CREATE TABLE public.ai_access_state (id text PRIMARY KEY, blocked boolean NOT NULL DEFAULT false, status integer, message text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.ai_access_state TO service_role;
ALTER TABLE public.ai_access_state ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;