import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin as EsbuildPlugin } from "esbuild";

const normalizePath = (filePath: string) => filePath.replace(/\\/g, "/");
const threeModulePath = normalizePath(
  path.resolve(__dirname, "node_modules/three/build/three.module.js"),
);
const batchedMeshExportStatement =
  "export { BatchedMesh } from '../examples/jsm/objects/BatchedMesh.js';";

let cachedPatchedSource: string | null | undefined;

const getPatchedThreeSource = () => {
  if (cachedPatchedSource !== undefined) {
    return cachedPatchedSource;
  }

  const original = readFileSync(threeModulePath, "utf-8");

  cachedPatchedSource = original.includes(batchedMeshExportStatement)
    ? null
    : `${original}\n${batchedMeshExportStatement}\n`;

  return cachedPatchedSource;
};

const ensureThreeBatchedMeshExport = (): Plugin => ({
  name: "ensure-three-batched-mesh-export",
  enforce: "pre",
  load(id) {
    if (normalizePath(id) !== threeModulePath) {
      return null;
    }

    return getPatchedThreeSource();
  },
});

const ensureThreeBatchedMeshExportEsbuild = (): EsbuildPlugin => ({
  name: "ensure-three-batched-mesh-export",
  setup(build) {
    build.onLoad({ filter: /three\.module\.js$/ }, async (args) => {
      if (normalizePath(args.path) !== threeModulePath) {
        return undefined;
      }

      const patched = getPatchedThreeSource();

      if (!patched) {
        return undefined;
      }

      return {
        contents: patched,
        loader: "js",
      };
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    ensureThreeBatchedMeshExport(),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [ensureThreeBatchedMeshExportEsbuild()],
    },
  },
  ssr: {
    optimizeDeps: {
      esbuildOptions: {
        plugins: [ensureThreeBatchedMeshExportEsbuild()],
      },
    },
  },
}));
