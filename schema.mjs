"use strict";
// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
import gql from 'graphql-tag'; // Using gql from 'graphql-tag' for better syntax highlighting and parsing

const typeDefs = gql`
  type Lore {
    LORE_ID: Int!
    OBJECT_NAME: String
    ITEM_TYPE: String
    ITEM_IS: String
    SUBMITTER: String
    AFFECTS: String
    APPLY: Int
    RESTRICTS: String
    CREATE_DATE: String # Assuming datetime is represented as a String
    CLASS: String
    MAT_CLASS: String
    MATERIAL: String
    ITEM_VALUE: String
    EXTRA: String
    IMMUNE: String
    EFFECTS: String
    WEIGHT: Int
    CAPACITY: Int
    ITEM_LEVEL: String
    CONTAINER_SIZE: Int
    CHARGES: Int
    SPEED: Int
    ACCURACY: Int
    POWER: Int
    DAMAGE: String
  }

  input LoreInput {
    OBJECT_NAME: String
    ITEM_TYPE: String
    ITEM_IS: String
    SUBMITTER: String
    AFFECTS: String
    APPLY: Int
    RESTRICTS: String
    CREATE_DATE: String
    CLASS: String
    MAT_CLASS: String
    MATERIAL: String
    ITEM_VALUE: String
    EXTRA: String
    IMMUNE: String
    EFFECTS: String
    WEIGHT: Int
    CAPACITY: Int
    ITEM_LEVEL: String
    CONTAINER_SIZE: Int
    CHARGES: Int
    SPEED: Int
    ACCURACY: Int
    POWER: Int
    DAMAGE: String
  }


  type Person {
    PERSON_ID: Int!
    CHARNAME: String!
    LIGHT: String
    RING1: String
    RING2: String
    NECK1: String
    NECK2: String
    BODY: String
    HEAD: String
    LEGS: String
    FEET: String
    ARMS: String
    SLUNG: String
    HANDS: String
    SHIELD: String
    ABOUT: String
    WAIST: String
    POUCH: String
    RWRIST: String
    LWRIST: String
    PRIMARY_WEAP: String
    SECONDARY_WEAP: String
    HELD: String
    BOTH_HANDS: String
    SUBMITTER: String
    CREATE_DATE: String # Assuming datetime is represented as a String
    CLAN_ID: Int
  }

  input PersonInput {
    CHARNAME: String!
    LIGHT: String
    RING1: String
    RING2: String
    NECK1: String
    NECK2: String
    BODY: String
    HEAD: String
    LEGS: String
    FEET: String
    ARMS: String
    SLUNG: String
    HANDS: String
    SHIELD: String
    ABOUT: String
    WAIST: String
    POUCH: String
    RWRIST: String
    LWRIST: String
    PRIMARY_WEAP: String
    SECONDARY_WEAP: String
    HELD: String
    BOTH_HANDS: String
    SUBMITTER: String
    CREATE_DATE: String
    CLAN_ID: Int
  }

  type Query {
    allLore: [Lore]                 # query for all lores
    lore(LORE_ID: Int!): Lore       # query for a single Lore  by ID
    allPersons: [Person]            # query for all persons
    person(PERSON_ID: Int!): Person # query for a single Person by ID
  }

  type Mutation {
    addLore(input: LoreInput): Lore
    updateLore(LORE_ID: Int!, input: LoreInput): Lore
    deleteLore(LORE_ID: Int!): Lore
    addPerson(input: PersonInput!): Person # New mutation to add a person
    updatePerson(PERSON_ID: Int!, input: PersonInput!): Person # New mutation to update a person
    deletePerson(PERSON_ID: Int!): Person # New mutation to delete a person    
  }
`;

//export default typeDefs;
export default typeDefs ;