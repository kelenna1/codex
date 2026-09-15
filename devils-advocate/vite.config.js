import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import challengeHandler from "./api/challenge.js";

function localChallengeApi(serviceOptions) {
  return {
    name: "local-challenge-api",
    configureServer(server) {
      server.middlewares.use("/api/challenge", (request, response) => {
        challengeHandler(request, response, serviceOptions);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      localChallengeApi({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL || "gpt-5-mini",
      }),
    ],
    test: {
      environment: "jsdom",
      setupFiles: "./tests/setup.js",
      css: true,
    },
  };
});
