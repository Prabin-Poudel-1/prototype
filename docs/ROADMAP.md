# Next implementation stages

The agreed product direction is a web-first tourism companion for international and domestic visitors, supporting planning before arrival and adaptation during the trip. The current deliverable is the first local, one-day slice.

## 1. Replace sample assumptions with checked data

- Verify a small set of actual Bharatpur experiences with sources, timestamps, opening windows, prices, party limits and walking requirements.
- Add a proper road-routing provider and total group transport estimates.
- Distinguish municipality boundaries from wider Chitwan destinations.
- Add travel dates, multiple days, start location, lodging and a clearly scoped budget.

## 2. Make recovery reflect a trip already in progress

- Store completed, locked and optional activities.
- Replan from the visitor's current time and chosen location.
- Penalize schedule and activity changes separately.
- Explain infeasible requirements and offer explicit tradeoffs.
- Evaluate against a greedy planner and full replanning with the same data.

## 3. Connect providers safely

- Add tourist ownership and operator roles.
- Model capacity, request expiry, acceptance and cancellation.
- Prevent overbooking with database transactions and idempotency keys.
- Use server events when polling is no longer sufficient.

## 4. Weather and AI

- Separate sourced historical seasonality from forecasts within the provider's forecast horizon.
- Use AI to parse trip requirements into a validated schema and explain checked alternatives.
- Keep arithmetic and feasibility in the backend.
- Add photo interpretation with uncertainty and sourced cultural/species context.

## 5. Travel support

- Field-verify appropriate help contacts; never imply automatic rescue dispatch.
- Add a PWA manifest and cache saved itineraries and contacts.
- Add Nepali/English language support.
- Test location permissions and loss of connectivity on actual phones.

Group formation, real-time guide tracking and wildlife observations remain proposals, not commitments implemented in this version. Introduce them only after the central planning and recovery workflow is reliable.
