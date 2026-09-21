# Bharatpur Pulse

A working first prototype for interest-led day planning in Bharatpur, with a map, persistent itineraries, operator availability updates, and explicit trip-recovery previews.

**Status: local development prototype, not a production tourism or booking service.**

## Included

- React + TypeScript frontend with a responsive tourist workspace and Leaflet map.
- Java 21-compatible Spring Boot backend.
- Constraint search across a sample catalogue of eleven experiences.
- Group-wide budget, time, opening-window, main-interest, optional-culture and sample low-walking checks.
- Estimated transfers and return to a fixed sample base.
- Saved itineraries and activity status in a database.
- Operator demo controls; tourist screens poll for updates every four seconds.
- A cancellation flags an affected trip without silently changing it.
- Replacement preview and explicit acceptance, protected against stale revisions and changed availability.
- Optional foreground device location, with permission. Coordinates are not sent to the backend.
- Downloadable text itinerary.
- Eleven backend tests, including a 160-combination constraint sweep.

## Important data boundaries

All experience offerings, prices, opening hours, walking labels and operator availability are **sample data**. Geographic anchors are approximate. The Nepal Tourism Board link is a regional reference, not verification of the sample services.

Travel estimates use straight-line distance × 1.4, an assumed 18 km/h, a minimum eight-minute transfer and a sample transport fare. Dashed map lines connect the stops; they are **not road directions**. Transport assumes one suitable vehicle for the group. Real fares, vehicle capacity, routes and accessibility must be checked before practical use.

The selected date is stored with the trip but does not yet change seasonal suitability or opening hours. The planner currently supports **one local day starting at 08:00**, up to three activities and return to a fixed Bharatpur base. Flights and accommodation are excluded.

There is no connected AI, live weather, live traffic, wildlife observation feed, actual reservation, payment, photo-recognition service or emergency dispatch. No booking is created by accepting a plan. A PWA manifest and offline service worker have not yet been implemented.

## Requirements

- JDK 21 or later; tested here with OpenJDK 26.0.1.
- Node.js 22 or later and pnpm 11.
- Internet access for initial dependency downloads and map tiles/fonts.
- PostgreSQL 17 or Docker only when using the PostgreSQL profile.

Spring Boot 4.1.0 and the frontend's exact resolved dependencies are recorded in `backend/pom.xml` and `frontend/pnpm-lock.yaml`.

## Run locally: quickest demo

Open two terminals from this project directory.

### Backend

```sh
cd backend
./mvnw spring-boot:run
```

On Windows, use `mvnw.cmd spring-boot:run`.

The default `demo` profile uses an H2 file database in `backend/.local/pulse.mv.db`. Trips survive restarts. It requires no database server. The API listens on `http://127.0.0.1:8080`.

### Frontend

```sh
cd frontend
pnpm install
pnpm dev
```

Open **http://127.0.0.1:5173**. Vite forwards `/api` requests to the backend. The default server bindings are loopback only.

If pnpm is not installed, install pnpm 11 using your usual Node package manager. The checked-in pnpm configuration explicitly allows esbuild's installation script.

## Run with PostgreSQL

Choose and export a local database password; never commit it:

```sh
export DATABASE_PASSWORD='replace-with-your-own-local-password'
docker compose up -d db
cd backend
SPRING_PROFILES_ACTIVE=postgres ./mvnw spring-boot:run
```

The password must be present in the backend terminal as well as the Docker Compose terminal. Defaults are database `pulse`, user `pulse`, and host `localhost:5432`. You can override these using `DATABASE_URL` (a JDBC URL), `DATABASE_USER` and `DATABASE_PASSWORD`.

H2 and PostgreSQL profiles share the same SQL schema. **PostgreSQL integration has not been executed in this environment:** Docker was not running and native PostgreSQL initialization was blocked by the sandbox's shared-memory restrictions. The running preview and integration tests use H2.

## Try the complete flow

1. Keep the default two-person, NPR 6,500, six-hour birdwatching preferences.
2. Select **Plan my day**.
3. Note one activity in the resulting itinerary.
4. Open **Operator demo**, find that activity, and select **Mark unavailable**.
5. Return to **Trip workspace**. The itinerary should show that it needs a change.
6. Select **Find an alternative**. Inspect the new schedule and cost.
7. Select **Use this plan**, then reload to confirm it was saved.
8. Restore the sample activity in Operator demo when finished.

For a two-screen demonstration, open Operator demo in a second browser tab. Tourist tabs check for status changes every four seconds. Different tabs in the same browser share the saved trip ID.

## Build and test

```sh
cd backend
./mvnw test
./mvnw package
```

```sh
cd frontend
pnpm build
```

`pnpm build` runs TypeScript checking before the production Vite build. To preview the generated frontend with its API proxy, use `pnpm dev`; the standalone `vite preview` command needs separate API proxy configuration.

Stop an already running JAR before rebuilding that same JAR, or run the backend with `spring-boot:run` during development. Overwriting an in-use executable JAR can cause class-loading errors.

## Structure

```text
backend/
  src/main/java/com/pulse/
    Catalog.java          Sample experiences and geographic anchors
    Models.java           Request and response records
    Planner.java          Feasibility search and scoring
    TripService.java      Persistence, status changes and recovery
    PulseController.java  HTTP endpoints
  src/main/resources/
    schema.sql            Shared initial schema
    application-*.properties
  src/test/java/com/pulse/
frontend/
  src/
    main.tsx              Tourist workspace and operator demo
    MapView.tsx           Leaflet map and foreground geolocation
    types.ts              API contracts and display helpers
    styles.css            Responsive layout
compose.yaml              Optional PostgreSQL service
```

See `docs/ARCHITECTURE.md` for the planner, API and limitations, and `docs/ROADMAP.md` for the next implementation stages.

## Before any public deployment

This prototype deliberately has no accounts. Operator endpoints and trip IDs are not an authorization system. Add authentication, trip ownership checks, operator roles, request limits and an appropriate deployment/database configuration before exposing it publicly.

Map tiles are loaded from OpenStreetMap's public tile service with attribution. Follow its usage policy; do not add bulk downloading or offline tile prefetching to that service. Select a suitable provider before scaling. Fonts load from Google Fonts; self-host them if needed.

## Help and problem reports

Use **Help & contacts** for click-to-call links to Nepal Police (100, within Nepal)
and Bharatpur Hospital's general contact (+977 56-597003). Official sources were
checked on 20 September 2026:
- https://www.nepalpolice.gov.np/stations/emergency-contacts/
- https://online.bharatpurhospital.gov.np/

Nearby hospital/police links open Google Maps searches; Pulse does not rank services,
verify current availability or dispatch assistance. Device calling support is required.

The non-emergency form saves to the `problem_reports` database table. Operator demo
shows the latest 100 reports. `POST /api/reports` validates category and field lengths;
`GET /api/reports` reads the local inbox. Reports are not delivered to authorities.
The demo inbox has no authentication: do not enter sensitive data or expose the API
publicly. Add authenticated operator access, rate limits and a retention policy first.
Restart the backend after updating so schema initialization creates the new table.

## Itinerary photos and sample reviews

Each suggested stop now shows a photo preview and an expandable fictional review.
`frontend/src/PlacePreview.tsx` maps the eleven sample activity IDs to media and review
examples. These are explicitly labelled demo reviews, not actual visitor feedback.
New catalogue IDs show an empty state until media is added.

`frontend/src/placePhotos.json` records Wikimedia Commons source URLs, photographers,
and per-photo licence links (CC BY-SA 3.0/4.0 or CC0 1.0). Photos are externally hosted and need internet access;
a fallback message is shown if a photo fails to load. The preview visually crops photos;
the original framing is available through the photo link. Regional/cuisine images used
for fictional venues are labelled illustrative rather than photos of the exact venue.
Photos and reviews follow the displayed itinerary, including recovery previews.

## Expanded destinations

The catalogue includes Devghat heritage walk, Maula Kalika Temple hike in neighbouring
Gaindakot, Meghauli nature outing, and Sauraha riverfront stroll in Ratnanagar.
These are real destination areas with sample activity costs, time windows and durations.
Coordinates are approximate area anchors, not verified trailheads or access points.
Existing trip snapshots stay unchanged; generate a new plan to consider new places.
Restart the backend to load the expanded catalogue.

Destination references: https://ntb.gov.np/en/devghat, https://www.maulakalika.org.np/,
https://ntb.gov.np/meghauli and https://ntb.gov.np/sauraha.
