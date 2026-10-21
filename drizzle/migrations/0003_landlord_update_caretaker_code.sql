CREATE POLICY "landlord update caretaker code" ON public.staff_codes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'landlord'::app_role) AND role = 'caretaker'::app_role)
WITH CHECK (public.has_role(auth.uid(), 'landlord'::app_role) AND role = 'caretaker'::app_role AND code ~ '^[0-9]{4,8}$');