import gql from 'graphql-tag';

export const loreTypeDefs = gql`
  type Lore {
    LORE_ID: Int!
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

  extend type Query {
    allLore: [Lore]
    lore(LORE_ID: Int!): Lore
  }

  extend type Mutation {
    addLore(input: LoreInput): Lore
    updateLore(LORE_ID: Int!, input: LoreInput): Lore
    deleteLore(LORE_ID: Int!): Lore
  }
`; 