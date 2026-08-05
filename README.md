# lorebot-graphql-api

Backend microservice in Node.js using GraphQL (Apollo Server 5 + Fastify 5) with **Neon serverless Postgres** and **Drizzle ORM**. Designed to run locally or on **Google Cloud Run**.

## Stack

| Layer | Technology |
| --- | --- |
| HTTP / GraphQL | Fastify 5, Apollo Server 5, `@as-integrations/fastify` |
| Database | Neon serverless Postgres (`lorebot` schema) |
| DB access | `@neondatabase/serverless` WebSocket pool, Drizzle ORM |
| Runtime | Node.js ≥ 20, ESM (`"type": "module"`) |
| Deploy | Docker → Artifact Registry → Cloud Run (`cloudbuild.yaml`) |

Resolvers currently execute SQL through `services/db.mjs` (`query()` over the Neon pool). Drizzle owns the pool (`drizzle-orm/neon-serverless`) and table definitions in `db/schema.js`. Postgres functions such as `"CreateLore_v002"`, `"CreatePerson_v002"`, and `"GetRecent"` back write/recent paths. FlexQuery uses Postgres `~*` (case-insensitive) and `ILIKE` for MySQL CI-style search parity.

## Project structure

```
lorebot-graphql-api/
├── index.js                  # Apollo + Fastify entry; /graphql, /health, /ready
├── package.json
├── Dockerfile                # Cloud Run image
├── cloudbuild.yaml           # Build & deploy to Cloud Run
├── .env.template             # Required environment variables
├── db/
│   └── schema.js             # Drizzle table definitions (lorebot.lore / lorebot.person)
├── schema/
│   ├── index.js              # Combines typeDefs + resolvers
│   ├── types/                # GraphQL type definitions
│   └── resolvers/            # Query/mutation resolvers
├── services/
│   ├── db.mjs                # Neon pool, Drizzle client, query helper
│   ├── logger.mjs            # Optional GCP Logging wrapper (not wired into app yet)
│   └── logger-throttle.mjs   # Optional throttled logger (not wired into app yet)
├── constants/
│   └── index.js
└── sql/
    ├── mysql/                # Legacy MySQL reference (docs/AI only; not used at runtime)
    └── postgres/             # Neon-compatible Postgres reference + DIFFS.md vs live Neon
```

### Notable files

- **`index.js`** — Starts Fastify + Apollo, connects to Neon, exposes `/graphql`, `/health`, `/ready`
- **`services/db.mjs`** — Neon WebSocket pool, `search_path` to `lorebot`, `?` → `$n` placeholders, row-key mapping for GraphQL
- **`db/schema.js`** — Drizzle schema for `lore` and `person`
- **`schema/resolvers/lore.js`** — `allLorePaginated`, `FlexQuery`, `addOrUpdateLore`
- **`schema/resolvers/person.js`** — `allPersonsConnection`, `allPersons`, `addOrUpdatePerson`
- **`schema/resolvers/recent.js`** — `recent` via `"GetRecent"()`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Clients                         │
│  • Discord bot (discord.js)                                 │
│  • Slash commands / ephemeral interactions                  │
│  • GraphQL queries constructed from user input              │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloud Run (this service)                       │
│  • Fastify HTTP server                                      │
│  • Apollo GraphQL at /graphql                               │
│  • Liveness /health, readiness /ready                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ GraphQL resolvers
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Database access layer                          │
│  • @neondatabase/serverless Pool (WebSockets)               │
│  • drizzle-orm (neon-serverless)                            │
│  • Parameterized SQL + Postgres functions                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ DATABASE_URL (pooled)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Neon serverless Postgres                       │
│  • Schema: lorebot                                          │
│  • Tables: lore, person                                     │
│  • Functions: CreateLore_v002, CreatePerson_v002, GetRecent │
└─────────────────────────────────────────────────────────────┘
```

### Data flow

1. Client sends a GraphQL operation to `/graphql`
2. Apollo validates and routes to a resolver
3. Resolver queries Neon via `services/db.mjs` (pool + Drizzle)
4. Rows are mapped to GraphQL field names and returned

## Setup

### Prerequisites

- Node.js 20+
- A Neon project with the `lorebot` schema (tables + functions already migrated)
- Pooled connection string from the Neon console

### Install

```bash
npm install
```

Core packages (also pulled in by `npm install`):

```bash
npm install @apollo/server @as-integrations/fastify fastify @fastify/cors \
  graphql graphql-tag dotenv \
  @neondatabase/serverless drizzle-orm ws bufferutil

npm install -D drizzle-kit
```

### Environment

Copy `.env.template` to `.env` and set at least:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
DB_SCHEMA=lorebot
DB_CONNECTION_LIMIT=5
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
```

Use Neon’s **pooled** connection string for local and Cloud Run. Do not commit `.env`.

### Run locally

```bash
npm start
# or
npm run start:prod
```

- GraphQL: `http://localhost:4000/graphql`
- Health: `http://localhost:4000/health`
- Ready (DB check): `http://localhost:4000/ready`

## Cloud Run deployment

The service listens on `PORT` (Cloud Run default `8080`) and `HOST=0.0.0.0`.

1. Store `DATABASE_URL` in Secret Manager (recommended).
2. Build/deploy with Cloud Build:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_SERVICE_NAME=lorebot-graphql-api,_REGION=us-east1
```

3. Attach the secret to the Cloud Run service, e.g. `DATABASE_URL=DATABASE_URL:latest`, and set `DB_SCHEMA=lorebot`, `NODE_ENV=production`.

Optional GCP APIs if deploying from this repo’s Cloud Build pipeline:

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com
```

Application Default Credentials / Cloud SQL IAM setup from the previous MySQL stack are **not** required for Neon.

## GraphQL example queries

### Paginated lore search (`allLorePaginated`)

```graphql
query {
  allLorePaginated(
    first: 5
    searchToken: "robe"
    submitter: "discord-user"
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

### Next page

```graphql
query {
  allLorePaginated(
    first: 5
    after: "NQ=="
    searchToken: "robe"
    submitter: "discord-user"
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
      endCursor
    }
    totalCount
  }
}
```

### FlexQuery (criteria string; affects uses case-insensitive regex)

```graphql
query {
  FlexQuery(
    first: 5
    requestor: "discord-user"
    flexCriteria: "affects=DAMROLL by 1&weight>=5"
  ) {
    edges {
      node {
        LORE_ID
        OBJECT_NAME
        AFFECTS
        WEIGHT
      }
      cursor
    }
    totalCount
  }
}
```

### Recent

```graphql
query {
  recent(DISCORD_USER: "discord-user") {
    TBL_SRC
    DESCRIPTION
    CREATE_DATE
    submitter
  }
}
```
