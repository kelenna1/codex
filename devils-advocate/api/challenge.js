import OpenAI from "openai";

import { findFixture } from "../shared/fixtures.js";

const ALLOWED_PREDICTIONS = new Set(["home", "draw", "away"]);
const MAX_BODY_BYTES = 8_192;

export const CHALLENGE_INSTRUCTIONS = `You are Devil's Advocate, a small feature inside a football prediction product.

Your role is not to predict the match or decide which outcome is most likely. Give the strongest concise argument against the user's selected prediction, then name one specific kind of information that could weaken your counterargument.

Use only the fixture, selected prediction, and evidence explicitly supplied in the user input. Never claim or imply current injuries, player availability, lineups, odds, rankings, recent form, statistics, results, head-to-head records, tactical tendencies, or any other match-specific fact that is not supplied. Do not use outside knowledge. When no match-specific evidence is supplied, frame the counterargument entirely as tactical or game-state uncertainty using conditional language such as "could", "may", and "if". Do not present a possibility as an observed fact.

Address the selected outcome directly. The counterargument must be no more than two sentences and approximately 55 words. what_would_change_my_mind must be one sentence and approximately 30 words. Confidence measures the strength of the counterargument given the supplied evidence, not the probability of a match result. When supplied_evidence is empty, confidence must be "low".`;

export const CHALLENGE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    counterargument: { type: "string" },
    what_would_change_my_mind: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: [
    "counterargument",
    "what_would_change_my_mind",
    "confidence",
  ],
});

export class ChallengeError extends Error {
  constructor(status, code, publicMessage) {
    super(publicMessage);
    this.name = "ChallengeError";
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

function assertRequest(body) {
  const requestedFixture = body?.fixture;
  const prediction = body?.prediction;
  const fixture = findFixture(requestedFixture?.id);

  const fixtureMatches =
    fixture &&
    requestedFixture?.homeTeam === fixture.homeTeam &&
    requestedFixture?.awayTeam === fixture.awayTeam;

  if (!fixtureMatches || !ALLOWED_PREDICTIONS.has(prediction)) {
    throw new ChallengeError(
      400,
      "invalid_request",
      "Choose an available fixture and a valid prediction.",
    );
  }

  return { fixture, prediction };
}

function isChallengeResult(value) {
  return (
    value &&
    typeof value.counterargument === "string" &&
    value.counterargument.trim().length > 0 &&
    typeof value.what_would_change_my_mind === "string" &&
    value.what_would_change_my_mind.trim().length > 0 &&
    ["low", "medium", "high"].includes(value.confidence)
  );
}

export async function createChallenge(
  body,
  {
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_MODEL || "gpt-5-mini",
    client,
  } = {},
) {
  const { fixture, prediction } = assertRequest(body);

  if (!client && !apiKey) {
    throw new ChallengeError(
      503,
      "challenge_unavailable",
      "The challenge service is not configured.",
    );
  }

  const openai =
    client ||
    new OpenAI({
      apiKey,
      timeout: 9_000,
      maxRetries: 1,
    });

  let response;
  try {
    response = await openai.responses.create({
      model,
      instructions: CHALLENGE_INSTRUCTIONS,
      input: JSON.stringify({
        fixture: {
          home_team: fixture.homeTeam,
          away_team: fixture.awayTeam,
        },
        selected_prediction: prediction,
        supplied_evidence: [],
      }),
      text: {
        format: {
          type: "json_schema",
          name: "devils_advocate_challenge",
          description:
            "A concise evidence-bounded argument against a football prediction.",
          strict: true,
          schema: CHALLENGE_SCHEMA,
        },
      },
      tools: [],
      max_output_tokens: 300,
      store: false,
    });
  } catch (error) {
    console.error("Challenge model request failed", error);
    throw new ChallengeError(
      502,
      "challenge_failed",
      "The challenge could not be generated. Try again.",
    );
  }

  try {
    const result = JSON.parse(response.output_text);
    if (!isChallengeResult(result)) {
      throw new Error("Response did not match the challenge contract.");
    }

    // This prototype supplies no match evidence, so confidence cannot exceed low.
    return { ...result, confidence: "low" };
  } catch (error) {
    console.error("Challenge model response was invalid", error);
    throw new ChallengeError(
      502,
      "invalid_model_response",
      "The challenge could not be generated. Try again.",
    );
  }
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  let rawBody = "";
  for await (const chunk of request) {
    rawBody += chunk;
    if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
      throw new ChallengeError(
        413,
        "payload_too_large",
        "The request is too large.",
      );
    }
  }

  return JSON.parse(rawBody || "{}");
}

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

export default async function challengeHandler(
  request,
  response,
  serviceOptions,
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, {
      error: {
        code: "method_not_allowed",
        message: "Use POST for this endpoint.",
      },
    });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const result = await createChallenge(body, serviceOptions);
    sendJson(response, 200, result);
  } catch (error) {
    if (error instanceof ChallengeError) {
      sendJson(response, error.status, {
        error: { code: error.code, message: error.publicMessage },
      });
      return;
    }

    if (error instanceof SyntaxError) {
      sendJson(response, 400, {
        error: {
          code: "invalid_json",
          message: "Send a valid JSON request.",
        },
      });
      return;
    }

    console.error("Unexpected challenge endpoint failure", error);
    sendJson(response, 500, {
      error: {
        code: "internal_error",
        message: "The challenge service is temporarily unavailable.",
      },
    });
  }
}
