import gql from 'graphql-tag';

export const loreTypeDefs = gql`
  type Lore {
    LORE_ID: Int
    OBJECT_NAME: String!
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
    CAN_USE: String
  }

  type LoreEdge {
    node: Lore!
    cursor: String!
  }

  type LoreConnection {
    edges: [LoreEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input LoreInput {
    # LORE_ID: Int
    OBJECT_NAME: String!
    ITEM_TYPE: String
    ITEM_IS: String
    SUBMITTER: String!
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
    CAN_USE: String
  }

  input LoreFilterInput {
    OBJECT_NAME: String
    ITEM_TYPE: String
    CLASS: String
    SUBMITTER: String
  }

  extend type Query {
    # Paginated search with tokenization
    allLorePaginated(
      first: Int = 10
      after: String
      searchToken: String
      submitter: String!
    ): LoreConnection!
    
    # Flexible query with dynamic criteria
    FlexQuery(
      first: Int = 10
      after: String
      requestor: String!
      flexCriteria: String!
    ): LoreConnection!
  }

  extend type Mutation {
    addOrUpdateLore(input: LoreInput!): Lore
  }
`; 