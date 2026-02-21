import { defineConfig } from "@vscode/test-cli";

export default defineConfig([
  {
    files: "out/test/extension.test.js",
    workspaceFolder: "./src/test/sampleWorkspace",
    mocha: {
      ui: "tdd",
      timeout: 60000,
    },
  },
  {
    files: "out/test/foremanFallback.test.js",
    workspaceFolder: "./src/test/sampleWorkspace",
    mocha: {
      ui: "tdd",
      timeout: 60000,
    },
  },
  {
    files: "out/test/bundledFallback.test.js",
    workspaceFolder: "./src/test/sampleWorkspace",
    mocha: {
      ui: "tdd",
      timeout: 60000,
    },
  },
  {
    files: "out/test/resolveConfigPath.test.js",
    workspaceFolder: "./src/test/sampleWorkspace",
    mocha: {
      ui: "tdd",
      timeout: 60000,
    },
  },
]);
