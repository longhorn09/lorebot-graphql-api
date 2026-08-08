# lorebot-graphql-api

Backend microservice in Node.js using GraphQL (Apollo Server 5 + Fastify 5) with **Neon serverless Postgres**. Designed to run locally or on **Google Cloud Run** (`us-east4`).

## Stack

| Layer | Technology |
| --- | --- |
| HTTP / GraphQL | Fastify 5, Apollo Server 5, `@as-integrations/fastify` |
| Database | Neon serverless Postgres (`lorebot` schema) |
| DB access | `@neondatabase/serverless` WebSocket pool; resolvers use parameterized SQL via `query()` |
| Runtime | Node.js ≥ 20, ESM (`"type": "module"`) |
| Deploy | Docker → Artifact Registry → Cloud Run (`cloudbuild.yaml`, region `us-east4`) |

Resolvers talk to Neon through `services/db.mjs` (pool, `search_path` → `lorebot`, `?` → `$n` placeholders, row-key mapping for GraphQL). Drizzle (`db/schema.js`) defines table shapes and wraps the pool but is not used for resolver queries today.

**Postgres functions used by the app:** `"CreateLore_v002"`, `"CreatePerson_v002"`, `"GetRecent"`.

String search uses Postgres `ILIKE` / `~*` and `LOWER()` equality for case-insensitive matching (MySQL CI-style parity). Person upserts Proper-case `CHARNAME` on write (`nooka` → `Nooka`).

## Project structure

```
lorebot-graphql-api/
├── index.js                  # Apollo + Fastify entry; /graphql, /health, /ready
├── package.json
├── Dockerfile                # Cloud Run image
├── cloudbuild.yaml           # Build & deploy to Cloud Run (default region us-east4)
├── .env.template             # Environment variables
├── db/
│   └── schema.js             # Drizzle table definitions (lorebot.lore / lorebot.person)
├── schema/
│   ├── index.js              # Combines typeDefs + resolvers
│   ├── types/                # GraphQL type definitions
│   └── resolvers/            # Query/mutation resolvers
├── services/
│   ├── db.mjs                # Neon pool + query helper
│   ├── logger.mjs            # Optional GCP Logging wrapper (not wired into app)
│   └── logger-throttle.mjs   # Optional throttled logger (not wired into app)
├── constants/
│   └── index.js
└── sql/
    └── postgres/             # Neon-compatible SQL reference + DIFFS.md (not applied by app)
        ├── create_db.sql
        ├── CreateLore_v002.sql
        ├── CreatePerson_v002.sql
        ├── GetRecent.sql
        ├── GetPerson.sql         # on Neon; unused by this API
        ├── GetPersonList.sql     # on Neon; unused by this API
        ├── GetLoreCount.sql      # on Neon; unused by this API
        └── DIFFS.md
```

### Notable files

- **`index.js`** — Starts Fastify + Apollo, connects to Neon, exposes `/graphql`, `/health`, `/ready`
- **`services/db.mjs`** — Neon WebSocket pool, `search_path` to `lorebot`, placeholder conversion, GraphQL row mapping
- **`schema/resolvers/lore.js`** — `allLorePaginated`, `FlexQuery`, `addOrUpdateLore`
- **`schema/resolvers/person.js`** — `allPersonsConnection`, `allPersons`, `addOrUpdatePerson`
- **`schema/resolvers/recent.js`** — `recent` via `"GetRecent"()`
- **`sql/postgres/DIFFS.md`** — Live Neon vs repo SQL parity notes

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
│  Google Cloud — Cloud Run (us-east4)                        │
│  • This GraphQL microservice only                           │
│  • Fastify + Apollo at /graphql                             │
│  • Liveness /health, readiness /ready                       │
│  • DB access: @neondatabase/serverless Pool (WebSockets)    │
└─────────────────────┬───────────────────────────────────────┘
                      │ DATABASE_URL (pooled TLS)
                      │ (not Cloud SQL / not GCP-hosted DB)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Neon — serverless Postgres (neondb)                        │
│  • Hosted by Neon (outside GCP)                             │
│  • Schema: lorebot                                          │
│  • Tables: lore, person                                     │
│  • Unique: lore.object_name, person.charname                │
│  • Functions: CreateLore_v002, CreatePerson_v002, GetRecent │
└─────────────────────────────────────────────────────────────┘
```

### Data flow

1. Client sends a GraphQL operation to `/graphql` on Cloud Run
2. Apollo validates and routes to a resolver
3. Resolver queries **Neon serverless Postgres** (`neondb`) via `services/db.mjs` (`query()`)
4. Rows are mapped to GraphQL field names and returned

## Setup

### Prerequisites

- Node.js 20+
- A Neon project with the `lorebot` schema (tables + functions already present)
- Pooled connection string from the Neon console

### Install

```bash
npm install
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

Default region is **`us-east4`** (closest GCP region to Neon `aws-us-east-1`). The service listens on `PORT` (Cloud Run default `8080`) and `HOST=0.0.0.0`.

1. Store `DATABASE_URL` and `DB_SCHEMA` in Secret Manager.
2. Build/deploy with Cloud Build:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_SERVICE_NAME=lorebot-graphql-api,_REGION=us-east4
```

Or omit substitutions — `cloudbuild.yaml` defaults already use that service name and region:

```bash
gcloud builds submit --config cloudbuild.yaml
```

3. Secrets are attached by the deploy step (`DATABASE_URL`, `DB_SCHEMA`); env includes `NODE_ENV=production`, `HOST=0.0.0.0`.

Optional GCP APIs:

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com
```

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

### FlexQuery (criteria string; string fields are case-insensitive)

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

### Upsert lore (`addOrUpdateLore`)

```graphql
mutation {
  addOrUpdateLore(input: {
    OBJECT_NAME: "shirt splint mail blue flexible"
    ITEM_TYPE: "ARMOR"
    MAT_CLASS: "metal"
    MATERIAL: "steel"
    WEIGHT: 20
    ITEM_VALUE: "55"
    AFFECTS: "resist_electr by 5"
    ITEM_IS: "BLESS"
    RESTRICTS: "NOBARBARIAN NOSHAMAN"
    APPLY: 5
    SUBMITTER: "discord-user"
  }) {
    LORE_ID
    OBJECT_NAME
    ITEM_TYPE
    APPLY
  }
}
```

### Upsert person (`addOrUpdatePerson`)

`CHARNAME` is stored Proper-cased (`nooka` → `Nooka`). Lookups are case-insensitive.

```graphql
mutation {
  addOrUpdatePerson(input: {
    CHARNAME: "nooka"
    NECK1: "a wyvern's eye..it glows dimly"
    HEAD: "a silver-streaked black hood"
    HANDS: "a pair of red gloves of the Conclave"
    WAIST: "a large waterskin"
    POUCH: "a plain component pouch"
    LIGHT: "a bright moonstone..it glows dimly"
    SUBMITTER: "discord-user"
  }) {
    PERSON_ID
    CHARNAME
    LIGHT
    NECK1
    HEAD
    HANDS
    WAIST
    POUCH
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

### curl (Cloud Run)

```bash
curl --request POST \
  --header 'content-type: application/json' \
  --url 'https://lorebot-graphql-api-PROJECT.us-east4.run.app/graphql' \
  --data '{"query":"query { recent { TBL_SRC DESCRIPTION CREATE_DATE submitter } }"}'
```
