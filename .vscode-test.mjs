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
    files: "out/test/fallbackTests.test.js",
    workspaceFolder: "./src/test/fallbackWorkspace",
    mocha: {
      ui: "tdd",
      timeout: 60000,
    },
  },
]);
