export const FIXTURES = Object.freeze([
  Object.freeze({
    id: "bra-esp",
    homeTeam: "Brazil",
    homeCode: "BRA",
    awayTeam: "Spain",
    awayCode: "ESP",
  }),
  Object.freeze({
    id: "arg-fra",
    homeTeam: "Argentina",
    homeCode: "ARG",
    awayTeam: "France",
    awayCode: "FRA",
  }),
  Object.freeze({
    id: "ger-jpn",
    homeTeam: "Germany",
    homeCode: "GER",
    awayTeam: "Japan",
    awayCode: "JPN",
  }),
]);

export function findFixture(fixtureId) {
  return FIXTURES.find(({ id }) => id === fixtureId);
}
