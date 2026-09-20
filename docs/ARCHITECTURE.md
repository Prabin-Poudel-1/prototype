# Architecture and API

## First-slice architecture

React calls the Spring Boot REST API through Vite's local proxy. Spring's JdbcTemplate persists preferences, plans, revisions and activity statuses. The default demo profile uses H2 in PostgreSQL compatibility mode; the PostgreSQL profile uses the PostgreSQL JDBC driver.

This is one backend application, not a distributed system. It does not use an LLM or an external optimization service.

## Planner

The catalogue is deliberately small. The planner enumerates ordered sequences of up to three eligible activities, pruning branches that exceed the time or budget. Each candidate includes estimated transport back to the sample base.

Hard requirements:

- At least one activity matches the primary interest.
- At least one culture activity is present when explicitly requested.
- Culture is excluded when explicitly rejected.
- Only sample low-walking activities are eligible when that option is selected.
- Every activity finishes within its sample opening window.
- Activity fees are multiplied by the group size.
- Activity fees and estimated transport fit the whole-group budget.
- The group returns before the selected day duration expires.

The current score rewards main-interest activities (110 points), other activities (35), and previously planned activities during recovery (90). It subtracts integer penalties for total elapsed time and cost. Ties prefer lower cost. These are transparent prototype weights, not learned or scientifically calibrated preferences.

The search is exhaustive within the small catalogue and three-stop cap, not a scalable citywide optimizer. Recovery favours preserving activity membership, but does **not** minimize edit distance, preserve original timings, honour external bookings, or lock completed activities. It replans the full sample day from the base at 08:00. Those are explicit future tasks.

## Persistence and recovery

A trip stores preferences, its accepted plan and a revision. Reading it annotates activities that are currently unavailable. A recovery preview returns a candidate and SHA-256 token of that candidate. Acceptance recomputes the candidate, checks both the trip revision and token, and updates the accepted plan only if they still match.

The token is a consistency check, not authentication. Status updates and recovery acceptance are not a reservation system, and this version does not enforce capacities or provide a transaction spanning a real operator booking. A later concurrent closure will flag a saved plan on the next read.

The frontend polls the catalogue and active trip every four seconds. This is near-live polling, not WebSocket streaming. Device location remains in the browser and is only watched while the map component remains active. Browser suspension can interrupt it.

## HTTP API

| Method | Path                           | Purpose                                 |
| ------ | ------------------------------ | --------------------------------------- |
| GET    | `/api/health`                  | Local API status                        |
| GET    | `/api/activities`              | Sample catalogue and availability       |
| POST   | `/api/trips`                   | Build and persist a feasible day        |
| GET    | `/api/trips/{id}`              | Read accepted plan and affected IDs     |
| POST   | `/api/trips/{id}/alternatives` | Preview replacement plan                |
| POST   | `/api/trips/{id}/accept`       | Accept matching revision and plan token |
| PATCH  | `/api/activities/{id}/status`  | Local operator demo update              |

Create body:

```json
{
  "date": "2026-10-10",
  "people": 2,
  "budget": 6500,
  "hours": 6,
  "focus": "bird",
  "culture": "optional",
  "lowWalking": false
}
```

`focus`: `bird`, `nature`, `culture`. `culture`: `optional`, `include`, `exclude`.

Status body:

```json
{ "available": false }
```

Acceptance body uses the values returned by the preview:

```json
{ "basedOnRevision": 1, "planToken": "token-returned-by-preview" }
```

Responses: 400 for invalid preferences, 404 for unknown trip, 409 for stale preview/revision, and 422 when the catalogue contains no feasible plan.

## Testing performed

- Six planner tests, including one sweep of 160 combinations of group size, budget and duration.
- Two service integration tests covering persistence, cancellation detection, explicit acceptance, stale revision and changed-availability rejection.
- Production TypeScript/Vite build.
- Browser walkthrough: create a birdwatching plan, cancel a planned activity, preview recovery, accept, reload saved trip.
- Desktop and 390px mobile layout inspection; no horizontal overflow at the mobile check.
- Browser console showed no errors during the walkthrough.

Not verified: PostgreSQL runtime, location permission on actual mobile devices, production hosting, real operator integration, external routing correctness or any real travel outcome.
