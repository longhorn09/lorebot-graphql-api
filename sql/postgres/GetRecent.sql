-- Postgres port of mysql/GetRecent.sql (Neon-compatible).
-- See DIFFS.md for differences vs live Neon.

CREATE OR REPLACE FUNCTION lorebot."GetRecent"()
RETURNS TABLE (
  "TBL_SRC" text,
  "DESCRIPTION" character varying,
  "CREATE_DATE" timestamp with time zone,
  submitter character varying
)
LANGUAGE plpgsql
AS $function$
DECLARE
  maxlim int := 15;
BEGIN
  RETURN QUERY
  (
    SELECT
      'Person'::text AS "TBL_SRC",
      p.charname AS "DESCRIPTION",
      p.create_date AS "CREATE_DATE",
      p.submitter AS submitter
    FROM lorebot.person p
    ORDER BY p.create_date DESC
    LIMIT maxlim
  )
  UNION ALL
  (
    SELECT
      'Lore'::text AS "TBL_SRC",
      l.object_name AS "DESCRIPTION",
      l.create_date AS "CREATE_DATE",
      l.submitter AS submitter
    FROM lorebot.lore l
    ORDER BY l.create_date DESC
    LIMIT maxlim
  )
  ORDER BY "CREATE_DATE" DESC;
END;
$function$;
