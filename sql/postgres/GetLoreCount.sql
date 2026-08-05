-- Postgres port of mysql/GetLoreCount.sql (Neon-compatible).
-- See DIFFS.md for differences vs live Neon.

CREATE OR REPLACE FUNCTION lorebot."GetLoreCount"()
RETURNS TABLE ("LoreCount" bigint)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::bigint AS "LoreCount"
  FROM lorebot.lore;
END;
$function$;
