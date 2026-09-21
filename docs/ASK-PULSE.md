# Ask Pulse setup

Ask Pulse is a Gemini-powered, text-only travel companion. It reads the current saved trip and sample catalogue on the server. It explains trips and suggests alternatives; it does not modify itineraries or call emergency services. Rebuild suggestions using the existing planner to check feasibility.

## Local file (simplest)

Open backend/.env and paste your key directly after `GEMINI_API_KEY=` without quotes. Keep `GEMINI_MODEL=gemini-3.8-flash`. Save and restart PulseApplication. This file is ignored by Git; backend/.env.example is a safe empty template for teammates. If you previously set GEMINI_API_KEY in IntelliJ, remove that override or update it because environment variables take precedence.

## IntelliJ

1. Open Run → Edit Configurations and select PulseApplication.
2. Under Modify options, enable Environment variables if it is hidden.
3. Add `GEMINI_API_KEY` with your own key and `GEMINI_MODEL` with `gemini-3.8-flash` (or another model enabled for your project).
4. Apply and restart PulseApplication. Refresh the frontend, then click Ask Pulse at the bottom right.
5. Try “Explain my trip and its budget”. Test Nepali and Hindi answers against your sample catalogue.

Never put the actual key in source code, a VITE_ variable, screenshots, chat, or GitHub. IntelliJ's .idea directory is ignored. The backend automatically loads the local backend/.env file when launched from the project root or backend directory. Environment variables set in IntelliJ take precedence over this file.

Without a key, the panel displays a setup state and sends no Gemini requests. A configured key is not proof of valid credentials or available quota; those are checked when a live request is attempted.

## Data and limits

Messages, up to eight preceding messages, and the saved itinerary/catalogue are sent to Google only when a visitor submits a question. The UI discloses this. Conversation text remains in page memory, not browser storage or the app database, and clears when a trip/revision changes or the visitor starts a new chat. Provider processing and retention follow Google's terms; free-tier content may be used to improve its products. Do not enter personal details.

Backend guards: 2,000 characters per question, eight history entries, 4,000 characters per history entry, 1,600 output tokens, a 35-second provider timeout, one concurrent request and ten attempts per minute across this local server. Provider quotas can be lower. No automatic retries or paid fallback. Errors do not return the provider's raw response or key.

This remains a local prototype bound to 127.0.0.1. Before public deployment, add user authentication, trip ownership checks, durable per-user quotas and appropriate privacy controls. Model suggestions are advisory, not validated schedules; sample hours, costs and availability are not live information.

## Verification

Automated tests use a local mock HTTP provider, not real credentials: validate input, missing-key handling, request context/history, response parsing and sanitized quota errors. Live Gemini output, model access, multilingual quality and actual account quota require local key configuration and live testing.

API reference: https://ai.google.dev/api/generate-content
