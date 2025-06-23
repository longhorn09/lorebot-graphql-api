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

  extend type Query {
    allPersons: [Person]
    person(PERSON_ID: Int!): Person
  }

  extend type Mutation {
    addPerson(input: PersonInput!): Person
    updatePerson(PERSON_ID: Int!, input: PersonInput!): Person
    deletePerson(PERSON_ID: Int!): Person
  }
`; 