-- Postgres port of mysql/CreatePerson_v002.sql (Neon-compatible).
-- See DIFFS.md for differences vs live Neon.

CREATE OR REPLACE FUNCTION lorebot."CreatePerson_v002"(
  p_charname character varying,
  p_light character varying,
  p_ring1 character varying,
  p_ring2 character varying,
  p_neck1 character varying,
  p_neck2 character varying,
  p_body character varying,
  p_head character varying,
  p_legs character varying,
  p_feet character varying,
  p_arms character varying,
  p_slung character varying,
  p_hands character varying,
  p_shield character varying,
  p_about character varying,
  p_waist character varying,
  p_pouch character varying,
  p_rwrist character varying,
  p_lwrist character varying,
  p_weap1 character varying,
  p_weap2 character varying,
  p_held character varying,
  p_both_hands character varying,
  p_submitter character varying,
  p_clan_id integer,
  p_onchest character varying
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO lorebot.person (
    charname, light, ring1, ring2, neck1, neck2, body, head,
    legs, feet, arms, slung, hands, shield, about, waist,
    pouch, rwrist, lwrist, primary_weap, secondary_weap, held,
    both_hands, submitter, create_date, clan_id, on_chest
  )
  VALUES (
    p_charname, p_light, p_ring1, p_ring2, p_neck1, p_neck2, p_body, p_head,
    p_legs, p_feet, p_arms, p_slung, p_hands, p_shield, p_about, p_waist,
    p_pouch, p_rwrist, p_lwrist, p_weap1, p_weap2, p_held,
    p_both_hands, p_submitter, NOW(), p_clan_id, p_onchest
  )
  ON CONFLICT (charname) DO UPDATE
  SET light = EXCLUDED.light,
      ring1 = EXCLUDED.ring1,
      ring2 = EXCLUDED.ring2,
      neck1 = EXCLUDED.neck1,
      neck2 = EXCLUDED.neck2,
      body = EXCLUDED.body,
      head = EXCLUDED.head,
      legs = EXCLUDED.legs,
      feet = EXCLUDED.feet,
      arms = EXCLUDED.arms,
      slung = EXCLUDED.slung,
      hands = EXCLUDED.hands,
      shield = EXCLUDED.shield,
      about = EXCLUDED.about,
      waist = EXCLUDED.waist,
      pouch = EXCLUDED.pouch,
      rwrist = EXCLUDED.rwrist,
      lwrist = EXCLUDED.lwrist,
      primary_weap = EXCLUDED.primary_weap,
      secondary_weap = EXCLUDED.secondary_weap,
      held = EXCLUDED.held,
      both_hands = EXCLUDED.both_hands,
      submitter = EXCLUDED.submitter,
      create_date = NOW(),
      clan_id = EXCLUDED.clan_id,
      on_chest = EXCLUDED.on_chest;
END;
$function$;
