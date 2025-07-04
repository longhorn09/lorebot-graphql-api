# lorebot-graphql-api
Backend microservice in NodeJS using GraphQL and CloudSQL database

## Project Structure

```
lorebot-graphql-api/
├── index.js                  # Main application entry point - Apollo Server setup
├── package.json              # Node.js dependencies and scripts configuration
├── package-lock.json         # Locked dependency versions for reproducible builds
├── LICENSE                   # Project license file
├── README.md                 # This documentation file
├── schema/                   # GraphQL schema definitions and resolvers
│   ├── index.js              # Main schema file that combines all type definitions
│   ├── types/                # GraphQL type definitions
│   │   ├── index.js          # Exports all type definitions
│   │   ├── common.js         # Common GraphQL types (PageInfo, etc.)
│   │   ├── lore.js           # Lore entity type definitions and queries
│   │   └── person.js         # Person entity type definitions and queries
│   └── resolvers/            # GraphQL resolver implementations
│       ├── index.js          # Exports all resolvers
│       ├── lore.js           # Lore entity resolvers (queries and mutations)
│       └── person.js         # Person entity resolvers (queries and mutations)
└── services/                 # Business logic and external service integrations
    └── db.mjs                # Database connection and query utilities
```

### File Descriptions

- **`index.js`**: Main application entry point that sets up the Apollo GraphQL server, configures middleware, and starts the HTTP server
- **`package.json`**: Defines project metadata, dependencies, and npm scripts for development and deployment
- **`schema/index.js`**: Combines all GraphQL type definitions and resolvers into a single schema
- **`schema/types/`**: Contains GraphQL type definitions organized by entity
  - **`common.js`**: Shared GraphQL types like PageInfo for pagination
  - **`lore.js`**: Lore entity types, queries, and mutations
  - **`person.js`**: Person entity types, queries, and mutations
- **`schema/resolvers/`**: Contains the resolver implementations that handle GraphQL operations
  - **`lore.js`**: Implements all Lore-related queries and mutations with database operations
  - **`person.js`**: Implements all Person-related queries and mutations with database operations
- **`services/db.mjs`**: Database service layer providing connection management and query utilities for CloudSQL

## Architecture

The lorebot-graphql-api follows a layered architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    External Clients                         │
│  • Discord bot front-end w/Discordjs v14                    │
│  • Discord slash commands with ephemeral interaction        │
│  • Parsing user messages to construct GraphQL input query   │
│  • Express.js HTTP server                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Apollo GraphQL Server                    │
│  • Express.js HTTP server                                   │
│  • GraphQL endpoint (/graphql)                              │
│  • Request/response handling                                │
│  • Authentication & authorization                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ GraphQL Operations
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    GraphQL Schema Layer                     │
│  • Type definitions (Lore, Person, etc.)                    │
│  • Query & Mutation schemas                                 │
│  • Input validation                                         │
│  • Resolver implementations                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ Database Queries
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Service Layer                   │
│  • Connection pooling                                       │
│  • Query execution                                          │
│  • Transaction management                                   │
│  • Error handling                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │ CloudSQL Connection
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud SQL                         │
│  • MySQL Database                                           │
│  • Managed service                                          │
│  • Automatic backups                                        │
│  • High availability                                        │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Components

**1. Apollo GraphQL Server**
- Built on Express.js for HTTP handling
- Provides GraphQL endpoint at `/graphql`
- Handles CORS, authentication, and request routing
- Supports introspection and GraphQL Playground

**2. GraphQL Schema Layer**
- Defines the API contract with type definitions
- Implements resolvers for queries and mutations
- Provides pagination support with cursor-based navigation
- Handles input validation and error responses

**3. Database Service Layer**
- Manages CloudSQL connections using `@google-cloud/cloud-sql-connector`
- Implements connection pooling for performance
- Provides query utilities and transaction support
- Handles database-specific error scenarios

**4. Google Cloud SQL**
- Managed MySQL database service
- Automatic scaling and maintenance
- Built-in security and compliance features
- Integration with Google Cloud IAM for access control

### Data Flow

1. **Client Request**: External clients send GraphQL queries/mutations via HTTP
2. **Apollo Server**: Receives and parses GraphQL operations
3. **Schema Resolution**: GraphQL schema routes operations to appropriate resolvers
4. **Database Query**: Resolvers execute database queries through the service layer
5. **Response**: Results are formatted and returned to the client

## Dependencies

Dependencies will be automatically installed with `npm install` but to install discretely run following
```
npm install @apollo/server @google-cloud/cloud-sql-connector dotenv graphql graphql-tag mysql2 express
```

## CloudSQL API enablement
Run following in Cloud Shell to enable requisite APIs
```
gcloud services enable compute.googleapis.com sqladmin.googleapis.com \
  run.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com servicenetworking.googleapis.com
```

## GCP specific setup
Replace ${GOOGLE_CLOUD_PROJECT} with name of your project

### Common error(s)
If receiving a `NO_ADC_FOUND` error, need to setup the application default credentials `ADC`
```
echo $GOOGLE_APPLICATION_CREDENTIALS
gcloud init --console-only
gcloud auth application-default login --no-browser
```

### Service account creation and policy setup
```
gcloud iam service-accounts create lorebot_service_account_name_here \
	--display-name "Lorebot service account"

gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member="serviceAccount:quickstart-service-account@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member="serviceAccount:quickstart-service-account@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.instanceUser"

gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member="serviceAccount:quickstart-service-account@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
  ```

### Database service account user setup
```
gcloud sql users create quickstart-service-account@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com --instance=database_instance_here --type=cloud_iam_service_account
```
  
## GraphQL example queries

### First page
```
query {
  allLoreConnection(
    first: 5
  ) {
    edges {
      node {
        LORE_ID
        OBJECT_NAME
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

### Second page
```
query {
  allLoreConnection(
    first: 5
    after: "NQ=="
  ) {
    edges {
      node {
        LORE_ID
        OBJECT_NAME
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```