import { useEffect, useMemo, useRef, useState } from "react";

import { FIXTURES, findFixture } from "../shared/fixtures.js";

const PREDICTIONS = [
  { value: "home", label: "Home" },
  { value: "draw", label: "Draw" },
  { value: "away", label: "Away" },
];

function predictionTeam(fixture, value) {
  if (value === "home") return fixture.homeTeam;
  if (value === "away") return fixture.awayTeam;
  return "Level score";
}

function App() {
  const [fixtureId, setFixtureId] = useState(FIXTURES[0].id);
  const [prediction, setPrediction] = useState(null);
  const [status, setStatus] = useState("idle");
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState("");
  const controllerRef = useRef(null);

  const fixture = useMemo(() => findFixture(fixtureId), [fixtureId]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  function chooseFixture(nextFixtureId) {
    if (nextFixtureId === fixtureId) return;
    controllerRef.current?.abort();
    setFixtureId(nextFixtureId);
    setPrediction(null);
    setStatus("idle");
    setChallenge(null);
    setError("");
  }

  function choosePrediction(value) {
    setPrediction(value);
    setChallenge(null);
    setError("");
    setStatus("idle");
  }

  async function requestChallenge(event) {
    event.preventDefault();
    if (!prediction || status === "loading") return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("loading");
    setChallenge(null);
    setError("");

    try {
      const response = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixture: {
            id: fixture.id,
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
          },
          prediction,
        }),
        signal: controller.signal,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.error?.message || "The challenge could not be generated.",
        );
      }

      setChallenge(payload);
      setStatus("success");
    } catch (requestError) {
      if (requestError.name === "AbortError") return;
      setError(
        requestError.message || "The challenge could not be generated. Try again.",
      );
      setStatus("error");
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }

  return (
    <div className="page-shell">
      <header className="product-bar" aria-label="TipMaster World Cup">
        <span className="tm-mark" aria-hidden="true">
          TM
        </span>
        <span className="product-name">TipMaster</span>
        <span className="product-divider" aria-hidden="true" />
        <span className="competition-name">World Cup 2026</span>
      </header>

      <main className="feature-card">
        <section className="feature-intro" aria-labelledby="feature-title">
          <div>
            <h1 id="feature-title">Devil’s Advocate</h1>
            <p>Pressure-test your pick before you lock it in.</p>
          </div>
          <span className="feature-note">Not a prediction</span>
        </section>

        <section className="fixture-section" aria-labelledby="fixtures-heading">
          <div className="section-heading">
            <h2 id="fixtures-heading">Choose a fixture</h2>
            <p>Prototype fixtures—not the official schedule</p>
          </div>

          <div className="fixture-switcher" aria-label="Prototype fixtures">
            {FIXTURES.map((option) => (
              <button
                className="fixture-option"
                data-selected={option.id === fixtureId}
                key={option.id}
                type="button"
                aria-pressed={option.id === fixtureId}
                aria-label={`${option.homeTeam} vs ${option.awayTeam}`}
                onClick={() => chooseFixture(option.id)}
              >
                <span>{option.homeCode}</span>
                <small>vs</small>
                <span>{option.awayCode}</span>
              </button>
            ))}
          </div>
        </section>

        <form onSubmit={requestChallenge}>
          <section className="match-card" aria-label={`${fixture.homeTeam} vs ${fixture.awayTeam}`}>
            <div className="match-context">
              <span>Selected fixture</span>
              <span>90 minutes</span>
            </div>

            <div className="teams" aria-hidden="true">
              <div className="team home-team">
                <span className="team-code">{fixture.homeCode}</span>
                <strong>{fixture.homeTeam}</strong>
                <small>Home</small>
              </div>
              <span className="versus">vs</span>
              <div className="team away-team">
                <span className="team-code">{fixture.awayCode}</span>
                <strong>{fixture.awayTeam}</strong>
                <small>Away</small>
              </div>
            </div>

            <fieldset className="prediction-fieldset">
              <legend>What’s your pick?</legend>
              <div className="prediction-options">
                {PREDICTIONS.map((option) => (
                  <button
                    key={option.value}
                    className="prediction-option"
                    data-selected={prediction === option.value}
                    type="button"
                    aria-pressed={prediction === option.value}
                    aria-label={`${option.label}: ${predictionTeam(fixture, option.value)}`}
                    onClick={() => choosePrediction(option.value)}
                  >
                    <span>{option.label}</span>
                    <small>{predictionTeam(fixture, option.value)}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              className="challenge-button"
              type="submit"
              disabled={!prediction || status === "loading"}
            >
              {status === "loading" ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Building the counter-case…
                </>
              ) : (
                "Challenge my pick"
              )}
            </button>
          </section>
        </form>

        <div className="response-region" aria-live="polite">
          {status === "loading" && (
            <p className="loading-note" role="status">
              Looking for the strongest case against your pick.
            </p>
          )}

          {status === "error" && (
            <div className="error-message" role="alert">
              <strong>Challenge unavailable</strong>
              <span>{error}</span>
            </div>
          )}

          {challenge && (
            <aside className="challenge-result" aria-label="Challenge result">
              <div className="result-heading">
                <span>The counter-case</span>
                <span className="confidence">
                  {challenge.confidence} confidence
                </span>
              </div>
              <p className="counterargument">{challenge.counterargument}</p>
              <div className="mind-change">
                <span>What could weaken this</span>
                <p>{challenge.what_would_change_my_mind}</p>
              </div>
              <p className="confidence-note">
                Confidence reflects supplied evidence, not the likely result.
              </p>
            </aside>
          )}
        </div>
      </main>

      <p className="prototype-caption">
        One pick. One counter-case. No invented match facts.
      </p>
    </div>
  );
}

export default App;
