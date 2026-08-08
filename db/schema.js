import {
  bigint,
  pgSchema,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Mirrors the Neon `lorebot` schema (lowercase identifiers).
 * GraphQL still exposes UPPERCASE field names; services/db.mjs maps row keys.
 */
export const lorebot = pgSchema('lorebot');

export const lore = lorebot.table('lore', {
  lore_id: bigint('lore_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  object_name: varchar('object_name', { length: 100 }),
  item_type: varchar('item_type', { length: 30 }),
  item_is: varchar('item_is', { length: 80 }),
  submitter: varchar('submitter', { length: 50 }),
  affects: varchar('affects', { length: 600 }),
  apply: bigint('apply', { mode: 'number' }),
  restricts: varchar('restricts', { length: 200 }),
  create_date: timestamp('create_date', { withTimezone: true }).defaultNow(),
  class: varchar('class', { length: 20 }),
  mat_class: varchar('mat_class', { length: 30 }),
  material: varchar('material', { length: 40 }),
  item_value: varchar('item_value', { length: 10 }),
  extra: varchar('extra', { length: 2000 }),
  immune: varchar('immune', { length: 200 }),
  effects: varchar('effects', { length: 500 }),
  weight: bigint('weight', { mode: 'number' }),
  capacity: bigint('capacity', { mode: 'number' }),
  item_level: varchar('item_level', { length: 80 }),
  container_size: bigint('container_size', { mode: 'number' }),
  charges: bigint('charges', { mode: 'number' }),
  speed: bigint('speed', { mode: 'number' }),
  accuracy: bigint('accuracy', { mode: 'number' }),
  power: bigint('power', { mode: 'number' }),
  damage: varchar('damage', { length: 8 }),
  can_use: varchar('can_use', { length: 200 }),
});

export const person = lorebot.table('person', {
  person_id: bigint('person_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  charname: varchar('charname', { length: 30 }).notNull(),
  light: varchar('light', { length: 100 }),
  ring1: varchar('ring1', { length: 100 }),
  ring2: varchar('ring2', { length: 100 }),
  neck1: varchar('neck1', { length: 100 }),
  neck2: varchar('neck2', { length: 100 }),
  body: varchar('body', { length: 100 }),
  head: varchar('head', { length: 100 }),
  legs: varchar('legs', { length: 100 }),
  feet: varchar('feet', { length: 100 }),
  arms: varchar('arms', { length: 100 }),
  slung: varchar('slung', { length: 100 }),
  hands: varchar('hands', { length: 100 }),
  shield: varchar('shield', { length: 100 }),
  about: varchar('about', { length: 100 }),
  waist: varchar('waist', { length: 100 }),
  pouch: varchar('pouch', { length: 100 }),
  rwrist: varchar('rwrist', { length: 100 }),
  lwrist: varchar('lwrist', { length: 100 }),
  primary_weap: varchar('primary_weap', { length: 100 }),
  secondary_weap: varchar('secondary_weap', { length: 100 }),
  held: varchar('held', { length: 100 }),
  both_hands: varchar('both_hands', { length: 100 }),
  submitter: varchar('submitter', { length: 50 }),
  create_date: timestamp('create_date', { withTimezone: true }).defaultNow(),
  clan_id: bigint('clan_id', { mode: 'number' }),
  on_chest: varchar('on_chest', { length: 60 }),
});
