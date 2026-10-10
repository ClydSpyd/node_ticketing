# Ticketing App — Project Handoff for Codex

> **Status:** Historical snapshot from ChatGPT mentoring through 10 October 2026. The checked-out repository is the source of truth. Inspect files and git diff before suggesting changes. This document records intent, reasoning, and progress; it does not claim every file exists exactly as described.

## 1. Developer goals and mentoring contract

The developer is an experienced React/Next.js and TypeScript full-stack engineer deliberately developing deeper **senior Node/backend and Staff-level architecture skills**. This is **Project 1**, a production-minded ticketing modular monolith, intended to evolve later into distributed-system exercises.

**Preferred interaction:** concise responses, incremental steps, no unnecessary tangents, no large unsolicited code dumps. The developer wants to write the code; review their implementation and give targeted corrections. Favor a single next task and explain architectural trade-offs only as needed. Do not redesign working code or introduce patterns speculatively.

Learning areas: Node runtime and concurrency, API engineering, SQL and transactions, DDD/hexagonal architecture, system design, distributed systems, messaging, observability, scalability.

## 2. Product/domain scope

- Organizers create events, venues, and inventory.
- Customers reserve and purchase **general-admission (GA)** ticket quantities or **assigned seats**.
- Holds last approximately **10 minutes**; expired holds should not block inventory.
- Later work: external PSP payments, ambiguous payment outcomes, ticket issuance, one-time scanning, cancellation/refunds, idempotency, background jobs/outbox, reliability, bursty launches.
- Core invariant: **never oversell** inventory under concurrent requests.

Do not implement later features until the current reservation flow is stable.

## 3. Stack and conventions

- Node.js, TypeScript, Fastify, `@fastify/type-provider-typebox`, TypeBox.
- PostgreSQL (locally via Homebrew), `pg`/node-postgres pool and `PoolClient`.
- NodeNext ESM TypeScript; relative imports use `.js` suffix even when source files are `.ts`.
- `src/db.ts` exports a `db` Pool connected to `ticketing` database.
- Feature-based folders, currently `events` and `reservations`.
- The infrastructure folder was previously spelled `postgress` in the user's code. **Check the actual path** rather than automatically renaming it.

## 4. Database schema (known historical shape)

| Table | Key columns / relationships |
|---|---|
| `events` | `id` identity PK, `name`, `starts_at`, `venue_id` FK |
| `venues` | venue metadata, `id` PK |
| `venue_seats` | `id`, `venue_id`, `section`, `row_number`, `seat_number`; unique `(venue_id,section,row_number,seat_number)` |
| `event_seats` | `id`, `event_id` FK, `venue_seat_id` FK, `price`, `category`; unique `(event_id,venue_seat_id)` |
| `ticket_categories` | `id`, `event_id`, `name`, `price`, `capacity`; unique `(event_id,name)` |
| `reservations` | `id`, `event_id`, `status`, `expires_at`, `created_at` (confirm actual defaults) |
| `reserved_seats` | `reservation_id` FK, `event_seat_id` FK; unique `(reservation_id,event_seat_id)` |
| `reserved_ga` | `reservation_id` FK, `ticket_category_id` FK, `quantity > 0` |

Reservations historically use status `ACTIVE` for an unexpired hold. Active reservations are counted only if `expires_at > NOW()`. Payment lifecycle statuses and SOLD inventory accounting are **not implemented/settled**. Existing DB constraints and migration state should be verified from repository/DB rather than assumed.

## 5. API state

- `GET /events/:eventId`: fetch event or 404.
- `POST /events`: create event.
- `POST /reservations/ga`: now delegates to application use case and Unit of Work.
- `POST /reservations/seats`: originally a single large Fastify handler containing SQL and explicit transaction. **Currently being refactored** into application/ports/adapters.

### Assigned-seat legacy route algorithm

1. `BEGIN`.
2. Confirm `events.id = eventId` exists; otherwise 404.
3. Lock matching `event_seats` rows for event and requested IDs using `FOR UPDATE`.
4. Verify number of matching rows equals requested IDs count; otherwise 404. **This assumes input IDs are unique.**
5. Query `reserved_seats` joined with `reservations`, looking for active, unexpired holds for any requested seat; if found 409.
6. Insert `reservations` row (`ACTIVE`, expires in 10 minutes).
7. Insert multiple `reserved_seats` rows using `unnest($2::int[])`.
8. `COMMIT`, otherwise `ROLLBACK`, always release client.

Concurrency test previously run: two simultaneous seat requests for the same seats yielded one 201 and one 409. Preserve this guarantee after refactor. **Note:** tests should also cover duplicate IDs, nonexistent IDs, and different event membership.

### GA reservation algorithm

1. `BEGIN` via Unit of Work.
2. `SELECT id,event_id,capacity FROM ticket_categories WHERE id=$1 FOR UPDATE`.
3. Query `COALESCE(SUM(rga.quantity),0)` from `reserved_ga` joined to `reservations`, filtered to `ACTIVE`, `expires_at > NOW()`, and matching category.
4. Check `capacity - reservedQuantity >= requested quantity`; otherwise throw `InsufficientInventoryError`.
5. Insert `reservations` row, then `reserved_ga` allocation.
6. Commit on success; rollback on thrown errors.

The **category row lock** serializes concurrent GA acquisitions of the same category; it is released at transaction end, **not** after 10 minutes. The temporary hold is modeled as data. Input validation should enforce positive quantity and valid IDs.

## 6. Current architecture and file layout

Historical approximate layout (verify):

```text
src/
├── db.ts
├── server.ts
├── events/
│   ├── events.types.ts
│   └── ...
└── reservations/
    ├── reservations.types.ts
    ├── reservations.schemas.ts
    ├── reservations.error.ts
    ├── reservations.routes.ts
    ├── application/
    │   ├── create-ga-reservation.ts
    │   ├── create-seat-reservation.ts      # work in progress / may not exist yet
    │   └── ports/
    │       ├── inventory.repository.ts
    │       ├── reservation.repository.ts
    │       ├── unit-of-work.ts
    │       └── ... event repository port under discussion
    └── infrastructure/
        └── postgress/                      # historical spelling; verify
            ├── postgres-inventory.repository.ts
            ├── postgres-reservation.repository.ts
            ├── postgres-unit-of-work.ts
            └── ...
```

### Layer responsibilities

- **HTTP**: TypeBox request schema, instantiate/wire concrete Unit of Work in route-registration function (outside per-request handler), map domain/application errors to 404/409; Fastify handles unexpected errors.
- **Application**: coordinate workflow through interfaces, decide whether inventory can be reserved, throw named business errors, return reservation.
- **Ports**: `InventoryRepository`, `ReservationRepository`, `UnitOfWork`, and likely `EventsRepository`; interfaces specify needed behavior, not infrastructure implementation.
- **Infrastructure**: SQL, row locks, and transaction-scoped PostgreSQL repository implementations.

Do not add domain entities/classes solely for pattern compliance. Domain models currently use plain TS types.

## 7. Existing ports and adapters

### `InventoryRepository` (user's most recent code)

```ts
import type { GACategory } from "../../reservations.types.js";

export interface InventoryRepository {
  acquireGACategory(categoryId: number): Promise<GACategory | null>;
  getReservedGAQuantity(categoryId: number): Promise<number>;
  acquireEventSeats(eventId: number, seatIds: number[]): Promise<number[]>;
  checkSeatAvailability(seatIds: number[]): Promise<boolean>;
}
```

`PostgresInventoryRepository` takes a `PoolClient` and implements all four methods. `acquireEventSeats` selects matching `event_seats.id` for `event_id` and `id = ANY($2::int[]) FOR UPDATE`, then returns IDs. `checkSeatAvailability` queries active unexpired reserved seats and returns true if none found.

**Critical contract:** `acquireEventSeats` and `checkSeatAvailability` must execute on the **same client in the same transaction**. Validate duplicate seat IDs at HTTP boundary (TypeBox `uniqueItems: true`) or defensively in application.

### `ReservationRepository`

Historically:

```ts
export interface ReservationRepository {
  create(eventId: number): Promise<Reservation>;
  reserveGA(reservationId: number, categoryId: number, quantity: number): Promise<void>;
  // For seat refactor:
  reserveSeats(reservationId: number, seatIds: number[]): Promise<void>;
}
```

`create()` inserts ACTIVE reservation with `NOW() + INTERVAL '10 minutes'` and maps returned DB columns to a typed `Reservation` (`id`, `eventId`, `status`, `expiresAt` as applicable). `reserveGA` inserts into `reserved_ga`. `reserveSeats` is intended to insert into `reserved_seats` for the newly created reservation.

### `EventsRepository` — new port proposed by user

```ts
import type { Event } from "../../events.types.js";
export interface EventsRepository {
  findById(id: number): Promise<Event | null>;
}
```

Used by seat workflow to confirm event exists. Discussion: events concept belongs logically in `events` feature; repository may be exposed in shared transaction context as needed. **Placement and implementation were still in progress.** Avoid adding every repository globally as application grows; keep context focused on actual use-case needs.

### `UnitOfWork` port

```ts
import type { InventoryRepository } from "./inventory.repository.js";
import type { ReservationRepository } from "./reservation.repository.js";

export interface TransactionContext {
  inventory: InventoryRepository;
  reservations: ReservationRepository;
  // events: EventsRepository;  // planned extension for seat workflow
}

export interface UnitOfWork {
  run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>;
}
```

`PostgresUnitOfWork` implementation (already implemented and reviewed):

```ts
export class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const inventory = new PostgresInventoryRepository(client);
      const reservations = new PostgresReservationRepository(client);
      const workResult = await work({ inventory, reservations });
      await client.query("COMMIT");
      return workResult;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
```

The context is to be extended with an event repository as the seat refactor requires. A shared `PostgresUnitOfWork(db)` instance can be constructed **once inside `reservationsRoutes(app)` but outside handlers**. Each call to `run()` gets a separate client and transaction; the shared instance does not share transaction state.

**Important error semantics:** a normal return causes `COMMIT`, even if returning `{success:false}`. User explicitly chose **throwing business exceptions** for aborting transactions. `CategoryNotFoundError` and `InsufficientInventoryError` are caught and mapped to 404/409 at HTTP boundary. Unexpected exceptions propagate to Fastify. Rollback on read-only failure is not required for data safety but provides a consistent policy.

## 8. Latest GA use case and route status

The user had refactored GA use case to receive `UnitOfWork` **interface**, not `PostgresUnitOfWork` concrete class. It calls `unitOfWork.run(async ({inventory,reservations}) => { ... })`, throws `CategoryNotFoundError` and `InsufficientInventoryError`, inserts reservation and GA allocation.

A recent review found the use case still returned `{success:true,reservation}` with a stale `CreateGAReservationResult` union, while HTTP route expected the `Reservation` directly. Recommendation was to change signature to `Promise<Reservation>` and return `reservation` (without wrapper). **Verify whether this correction was applied.**

`reservations.routes.ts` created `const unitOfWork = new PostgresUnitOfWork(db)` at route-registration scope. The GA handler calls use case and catches named errors, mapping to 404/409. The seat handler still had inline SQL at that snapshot.

## 9. Current task: seat reservation refactor

User is implementing this **incrementally** and checking small pieces with mentor.

Latest completed work shown:
- `InventoryRepository` extended with `acquireEventSeats(eventId,seatIds):Promise<number[]>` and `checkSeatAvailability(seatIds):Promise<boolean>`.
- Both methods implemented in `PostgresInventoryRepository` with existing SQL and `PoolClient`.
- User proposed `EventsRepository.findById(id):Promise<Event|null>`.

Suggested next small steps (confirm current state before recommending):
1. Implement `ReservationRepository.reserveSeats(reservationId,seatIds)` in PostgreSQL adapter.
2. Implement/wire `EventsRepository` through `TransactionContext` and `PostgresUnitOfWork` so event lookup uses same transaction.
3. Implement `create-seat-reservation.ts` using only ports: find event; acquire seats; verify all requested unique IDs belong to event; check availability; create reservation; allocate seats; return reservation.
4. Map business errors to HTTP responses; replace old inline SQL handler.
5. Test concurrency (two overlapping requests), non-existent event, wrong-event seats, duplicate seat IDs, and insufficient availability.

**Do not do all five automatically.** Review user's current work and guide one step at a time.

## 10. Risks and decisions to revisit deliberately

- **Duplicate seat IDs:** `ANY($2::int[])` returns each matching row once. Comparing returned row count to input array length fails for duplicate IDs. Reject duplicates with TypeBox `uniqueItems: true` and/or application validation.
- **Deadlock risk:** Concurrent multi-seat acquisitions with overlapping seats can deadlock if lock acquisition order differs. Evaluate deterministic lock ordering and retry policy when testing, rather than assuming `FOR UPDATE` alone eliminates all issues.
- **Data integrity:** Check existing DB constraints and consider DB-level protections as requirements mature. The current approach serializes cooperating application writers through locks.
- **Inventory model:** Active unexpired reservations are counted. Payment completion/sold inventory accounting is a future design task; do not treat current logic as final production sale accounting.
- **Type-only imports:** `import type` for interfaces/types under NodeNext/ESM.
- **Event repo location:** Conceptually belongs to events feature, but cross-feature transaction coordination should remain pragmatic.
- **Response consistency:** Verify GA and seats endpoints return comparable reservation shapes.
- **No premature unification:** GA and assigned-seat use cases should remain separate until both are correct; then evaluate common abstractions.

## 11. Suggested initial Codex request

> Read `AGENTS.md` and `docs/PROJECT_CONTEXT.md`. Inspect the actual repository, particularly `src/reservations` and its event dependencies, including `git diff`. Do not modify files. Identify the most important correctness or architectural issue in my current seat reservation refactor and explain it succinctly. Help me implement the fix myself, one step at a time.
