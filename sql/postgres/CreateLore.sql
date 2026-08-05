-- Postgres port of mysql/CreateLore.sql (Neon-compatible; no can_use column).
-- See DIFFS.md for differences vs live Neon.

CREATE OR REPLACE FUNCTION lorebot."CreateLore"(
  p_objname character varying,
  p_itemtype character varying,
  p_itemis character varying,
  p_submitter character varying,
  p_affects character varying,
  p_apply integer,
  p_restricts character varying,
  p_weapclass character varying,
  p_matclass character varying,
  p_material character varying,
  p_itemvalue character varying,
  p_extra character varying,
  p_immune character varying,
  p_effects character varying,
  p_weight integer,
  p_capacity integer,
  p_itemlevel character varying,
  p_containersize integer,
  p_charges integer,
  p_speed integer,
  p_accuracy integer,
  p_power integer,
  p_damage character varying
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO lorebot.lore (
    object_name, item_type, item_is, submitter, affects, apply, restricts,
    create_date, class, mat_class, material, item_value, extra, immune,
    effects, weight, capacity, item_level, container_size, charges,
    speed, accuracy, power, damage
  )
  VALUES (
    p_objname, p_itemtype, p_itemis, p_submitter, p_affects, p_apply, p_restricts,
    NOW(), p_weapclass, p_matclass, p_material, p_itemvalue, p_extra, p_immune,
    p_effects, p_weight, p_capacity, p_itemlevel, p_containersize, p_charges,
    p_speed, p_accuracy, p_power, p_damage
  )
  ON CONFLICT (object_name) DO UPDATE
  SET item_type = EXCLUDED.item_type,
      item_is = EXCLUDED.item_is,
      submitter = EXCLUDED.submitter,
      affects = EXCLUDED.affects,
      apply = EXCLUDED.apply,
      restricts = EXCLUDED.restricts,
      create_date = NOW(),
      class = EXCLUDED.class,
      mat_class = EXCLUDED.mat_class,
      material = EXCLUDED.material,
      item_value = EXCLUDED.item_value,
      extra = EXCLUDED.extra,
      immune = EXCLUDED.immune,
      effects = EXCLUDED.effects,
      weight = EXCLUDED.weight,
      capacity = EXCLUDED.capacity,
      item_level = EXCLUDED.item_level,
      container_size = EXCLUDED.container_size,
      charges = EXCLUDED.charges,
      speed = EXCLUDED.speed,
      accuracy = EXCLUDED.accuracy,
      power = EXCLUDED.power,
      damage = EXCLUDED.damage;
END;
$function$;
