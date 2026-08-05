-- Postgres port of mysql/GetPerson.sql (Neon-compatible).
-- See DIFFS.md for differences vs live Neon.

CREATE OR REPLACE FUNCTION lorebot."GetPerson"(
  p_charname character varying
)
RETURNS SETOF lorebot.person
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM lorebot.person
  WHERE charname = p_charname;
END;
$function$;
