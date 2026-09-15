# Devil’s Advocate

An embedded World Cup prediction feature for TipMaster. Pick Home, Draw, or Away; the model responds with the strongest concise case against that pick and the one kind of evidence that could weaken its case.

The feature is intentionally not a predictor. It is a pre-submit pressure test designed to make a prediction feel more considered without turning the product into a chatbot.

## Run locally

Requirements: Node.js 20 or newer and an OpenAI API key.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local`. `OPENAI_MODEL` is optional and defaults to `gpt-5-mini`. Vite serves the React app and mounts the same `/api/challenge` handler used by Vercel.

```bash
npm test
npm run build
```

## Deploy

The repository is configured for Vercel. Import the repository, add `OPENAI_API_KEY` as a server-side environment variable, and deploy. Do not prefix it with `VITE_`; that would expose the key to the browser.

## Product and design decisions

- **Embedded, not conversational.** There is one choice, one action, and one response. No chat input, history, assistant avatar, or open-ended prompt.
- **Honest demo data.** The three matchups are visibly labelled as prototype fixtures rather than presented as an official schedule.
- **Evidence-bounded by construction.** The server accepts only fixtures from a shared allowlist, passes no external evidence or tools, and forces low confidence because this prototype has no match-specific evidence.
- **Useful uncertainty.** When facts are absent, the model is asked for conditional tactical and game-state risks. This keeps the feature useful without laundering general football knowledge into invented specifics.
- **One visual accent.** Challenge red marks the counter-position; the rest uses restrained match-product typography and surfaces so the module can plausibly sit inside a wider prediction flow.
- **Fail honestly.** A missing key or upstream failure produces a clear unavailable state. There is no canned response masquerading as AI.

## Production prompt

The server sends only the allowlisted teams, the selected outcome, and an empty evidence array. It does not enable web search or other tools.

```text
You are Devil's Advocate, a small feature inside a football prediction product.

Your role is not to predict the match or decide which outcome is most likely. Give the strongest concise argument against the user's selected prediction, then name one specific kind of information that could weaken your counterargument.

Use only the fixture, selected prediction, and evidence explicitly supplied in the user input. Never claim or imply current injuries, player availability, lineups, odds, rankings, recent form, statistics, results, head-to-head records, tactical tendencies, or any other match-specific fact that is not supplied. Do not use outside knowledge. When no match-specific evidence is supplied, frame the counterargument entirely as tactical or game-state uncertainty using conditional language such as "could", "may", and "if". Do not present a possibility as an observed fact.

Address the selected outcome directly. The counterargument must be no more than two sentences and approximately 55 words. what_would_change_my_mind must be one sentence and approximately 30 words. Confidence measures the strength of the counterargument given the supplied evidence, not the probability of a match result. When supplied_evidence is empty, confidence must be "low".
```

Structured response:

```json
{
  "counterargument": "string",
  "what_would_change_my_mind": "string",
  "confidence": "low | medium | high"
}
```

## Deliberate limits

This prototype has no authentication, database, analytics, streaming, live fixture feed, conversation history, or match-data provider. Those would add surface area without testing the central product idea: whether a focused counter-case improves a user’s prediction decision.
