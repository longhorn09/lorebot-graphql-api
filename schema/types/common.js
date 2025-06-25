import gql from 'graphql-tag';

export const paginationTypeDefs = gql`
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  enum OrderDirection {
    ASC
    DESC
  }
`; 