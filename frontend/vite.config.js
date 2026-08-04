import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    // Force NODE_ENV=test. When the parent shell exports NODE_ENV=production
    // (as CI or some dev shells do), the CJS builds of react/react-dom load in
    // production mode, where `React.act` does not exist — @testing-library/react
    // then falls back to the deprecated react-dom/test-utils shim that calls
    // `React.act(...)`, crashing every test with "React.act is not a function".
    env: { NODE_ENV: "test" },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/**/*.test.{js,jsx}", "src/test/**", "src/main.jsx"],
      thresholds: {
        lines: 12,
        functions: 10,
        branches: 20,
        statements: 13,
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: globalThis.process?.env.VITE_DEV_PROXY_TARGET ?? "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
