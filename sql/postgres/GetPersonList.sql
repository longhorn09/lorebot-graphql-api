-- Postgres port of mysql/GetPersonList.sql (Neon-compatible).
-- See DIFFS.md for differences vs live Neon.

CREATE OR REPLACE FUNCTION lorebot."GetPersonList"()
RETURNS TABLE (
  "CHARNAME" character varying,
  submitter character varying,
  "Create_DATE" timestamp with time zone
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.charname AS "CHARNAME",
    p.submitter AS submitter,
    p.create_date AS "Create_DATE"
  FROM lorebot.person p
  ORDER BY p.charname ASC;
END;
$function$;
