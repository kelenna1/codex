# Devil’s Advocate

An interview prototype for TipMaster: a focused pre-submit pressure test for football predictions.

Choose a prototype World Cup fixture and pick **Home**, **Draw**, or **Away**. The feature returns the strongest concise case against that pick, plus the kind of evidence that would weaken the counter-case.

This is deliberately **not a predictor** and it is not a chatbot. The product idea is simple: make a user’s prediction feel more considered before they lock it in.

**Live demo:** [devils-advocate-alpha.vercel.app](https://devils-advocate-alpha.vercel.app/)

## Product intent

The feature is designed around one focused interaction:

1. Select a fixture.
2. Select a prediction.
3. Ask Devil’s Advocate to challenge it.
4. Read the counter-case and what could change the argument.

The prototype fixtures are clearly labelled as demo data. The model receives no live schedule, statistics, injuries, odds, browsing tools, or match-specific evidence, so the response must describe conditional tactical or game-state risks rather than inventing facts.

## Architecture

```text
React UI (src/App.jsx)
        |
        | POST /api/challenge
        v
Vercel function / Vite dev middleware (api/challenge.js)
        |
        | strict JSON-schema request, tools disabled, store=false
        v
OpenAI Responses API
        |
        v
Structured counter-case rendered in the UI
```

- `src/App.jsx` owns the small interaction state machine: fixture selection, prediction selection, loading, success, error, and request cancellation.
- `shared/fixtures.js` is the single allowlist for the prototype fixtures. The server validates both the fixture ID and team names before calling the model.
- `api/challenge.js` is the server-side boundary. It validates input, limits request size, keeps the API key off the client, sends a strict JSON-schema request, and returns structured errors.
- `vercel.json` configures the Vite build and the `/api/challenge` serverless function.

## Run locally

Requirements: Node.js 20+ and an OpenAI API key.

```bash
cd devils-advocate
npm install
cp .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local`. `OPENAI_MODEL` is optional and defaults to `gpt-5-mini`.

Start the app:

```bash
npm run dev
```

The Vite development server serves the React app and mounts the same challenge handler used by Vercel.

## Scripts

```bash
npm run dev       # start the local Vite server
npm test          # run the Vitest suite once
npm run test:watch
npm run build     # create the production bundle
npm run preview   # preview the production bundle locally
```

## API contract

`POST /api/challenge` accepts an allowlisted fixture and one of `home`, `draw`, or `away`:

```json
{
  "fixture": {
    "id": "bra-esp",
    "homeTeam": "Brazil",
    "awayTeam": "Spain"
  },
  "prediction": "home"
}
```

Successful responses use this shape:

```json
{
  "counterargument": "string",
  "what_would_change_my_mind": "string",
  "confidence": "low"
}
```

Confidence is forced to `low` in this prototype because no match-specific evidence is supplied. Errors use a consistent envelope:

```json
{
  "error": {
    "code": "challenge_unavailable",
    "message": "The challenge service is not configured."
  }
}
```

## Testing

The test suite covers the core interaction and service boundary:

- selecting a prediction and rendering a model response;
- resetting the prediction and previous result when the fixture changes;
- showing a useful inline error when the service is unavailable;
- rejecting non-allowlisted or malformed input;
- verifying the evidence-bounded, tool-free model request;
- returning structured responses for unsupported methods and malformed JSON.

Run the checks with:

```bash
npm test
npm run build
```

## Deploy to Vercel

Import the repository into Vercel with `devils-advocate` as the project root, or configure the project root to that directory. Add `OPENAI_API_KEY` as a server-side environment variable and deploy.

Do not prefix the key with `VITE_`; Vite exposes variables with that prefix to browser code.

## Deliberate limits

This is intentionally a small product experiment. It has no authentication, database, analytics, conversation history, live fixture feed, match-data provider, or streaming response. Those would add surface area before the central question is answered: does a concise counter-case improve a user’s prediction decision?

## Project structure

```text
devils-advocate/
├── api/challenge.js       # server-side validation and OpenAI request
├── shared/fixtures.js     # demo fixture allowlist
├── src/App.jsx            # React interaction and rendering
├── src/styles.css         # visual system and responsive layout
├── tests/                 # UI and API contract tests
├── .env.example
├── package.json
├── vercel.json
└── vite.config.js
```

The app-specific README in `devils-advocate/README.md` contains the full production prompt and additional design notes.
