# lorebot-graphql-api
Backend microservice in NodeJS using GraphQL and CloudSQL database

## Project Structure

```
lorebot-graphql-api/
├── index.mjs                 # Main application entry point - Apollo Server setup
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

- **`index.mjs`**: Main application entry point that sets up the Apollo GraphQL server, configures middleware, and starts the HTTP server
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