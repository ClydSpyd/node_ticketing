# Ticketing App

A monolithic event ticketing API, built as a learning exercise for full-stack and system design skills.

## Stack

- **Runtime:** Node.js (ES modules)
- **Framework:** [Fastify](https://fastify.dev/) 5
- **Language:** TypeScript
- **Validation:** TypeBox via `@fastify/type-provider-typebox` (schema-driven request validation + typing)
- **Database:** PostgreSQL (`pg`), raw SQL with connection pooling
- **Dev tooling:** `tsx` (watch/run), `tsc` (typecheck/build)

## Overview

The app exposes a REST API for managing events and ticket reservations. Reservations
are handled inside database transactions with row-level locking to stay correct under
concurrent requests, and holds expire after a set window to free up inventory.

## Getting started

Requires Node.js and a running PostgreSQL instance with a `ticketing` database.

```bash
npm install
npm run dev        # start with hot reload (tsx watch) on port 3000
```

Other scripts:

```bash
npm run typecheck  # type-check without emitting
npm run build      # compile to dist/
npm start          # run the compiled build
```

## Project structure

Code is organized by domain under `src/`, with each feature owning its routes and
request schemas. `server.ts` wires up the Fastify app and `db.ts` holds the Postgres
connection pool.
