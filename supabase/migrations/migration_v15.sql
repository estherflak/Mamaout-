-- Migration v15: security fixes (applied to production 2026-07-05 via MCP as
-- "v15_security_fixes" — kept here for the repo record).
--
-- 1. activities: the `anon_insert` policy (WITH CHECK true) let anyone holding
--    the public anon key write directly into the live feed. Dropped; inserts
--    from the client are now admin-only (the scraper uses the service role and
--    bypasses RLS). Also dropped the duplicate public SELECT policy.
-- 2. submissions: SELECT/UPDATE were open to every signed-in user, leaking
--    organizer contact details and letting anyone approve/reject. Now
--    admin-only.
-- 3. profiles: the only SELECT policy was "own profile", which silently broke
--    the entire Friends feature (phone lookup, friend names, requests tab).
--    Friends (pending or accepted) can now read each other's profiles, and
--    phone lookup goes through a SECURITY DEFINER RPC returning only id+name.
-- 4. Linter cleanups: security_invoker on activity_participant_counts, EXECUTE
--    revoked on handle_new_user, search_path pinned on the mamaout_* functions.

DROP POLICY IF EXISTS anon_insert ON activities;
DROP POLICY IF EXISTS public_read ON activities;

CREATE POLICY admin_insert ON activities
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'esther.kern@yahoo.fr');

DROP POLICY IF EXISTS "Admin can read submissions" ON submissions;
DROP POLICY IF EXISTS "Admin can update submissions" ON submissions;

CREATE POLICY "Admin can read submissions" ON submissions
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'esther.kern@yahoo.fr');

CREATE POLICY "Admin can update submissions" ON submissions
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'esther.kern@yahoo.fr');

CREATE POLICY "Friends can read each other's profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user_id = profiles.id AND f.friend_id = auth.uid())
         OR (f.friend_id = profiles.id AND f.user_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION find_profile_by_phone(p_phone text)
RETURNS TABLE (id uuid, name text)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT id, name FROM profiles WHERE phone = p_phone LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION find_profile_by_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION find_profile_by_phone(text) TO authenticated;

ALTER VIEW activity_participant_counts SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION mamaout_norm_name(text) SET search_path = public;
ALTER FUNCTION mamaout_city(text) SET search_path = public;
ALTER FUNCTION mamaout_dedup_key(text, text) SET search_path = public;
ALTER FUNCTION match_activity_id(text, text) SET search_path = public;
