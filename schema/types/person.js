import gql from 'graphql-tag';

export const personTypeDefs = gql`
  type Person {
    PERSON_ID: Int!
    CHARNAME: String!
    LIGHT: String
    RING1: String
    RING2: String
    NECK1: String
    NECK2: String
    BODY: String
    ONCHEST: String
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
    SUBMITTER: String!
    CREATE_DATE: String!
    #CLAN_ID: Int
  }

  type PersonEdge {
    node: Person!
    cursor: String!
  }

  type PersonConnection {
    edges: [PersonEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input PersonInput {
    CHARNAME: String!
    LIGHT: String
    RING1: String
    RING2: String
    NECK1: String
    NECK2: String
    BODY: String
    ONCHEST: String
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
    # CLAN_ID: Int
  }

  input PersonFilterInput {
    CHARNAME: String
    SUBMITTER: String
    CLAN_ID: Int
  }

  enum PersonOrderBy {
    PERSON_ID
    CHARNAME
    SUBMITTER
    CREATE_DATE
    CLAN_ID
  }

  extend type Query {
    # Cursor-based pagination (GraphQL standard)
    allPersonsConnection(
      first: Int = 10
      after: String
      filter: PersonFilterInput
    ): PersonConnection!
    
    # Legacy query (keep for backward compatibility)
    allPersons: [Person]
  }

  extend type Mutation {
    addOrUpdatePerson(input: PersonInput!): Person
    #deletePerson(PERSON_ID: Int!): Person
  }
`; 