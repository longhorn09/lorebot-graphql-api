import gql from 'graphql-tag';

export const recentTypeDefs = gql`
  type Recent {
    TBL_SRC: String
    DESCRIPTION: String
    CREATE_DATE: String
    submitter: String
  }

  extend type Query {
    recent(DISCORD_USER: String): [Recent]
  }
`; 