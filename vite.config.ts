import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const ensureThreeBatchedMeshExport = (): Plugin => {
  const threeModulePath = path
    .resolve(__dirname, "node_modules/three/build/three.module.js")
    .replace(/\\/g, "/");
  const exportStatement =
    "export { BatchedMesh } from '../examples/jsm/objects/BatchedMesh.js';";

  return {
    name: "ensure-three-batched-mesh-export",
    enforce: "pre",
    load(id) {
      if (id.replace(/\\/g, "/") === threeModulePath) {
        const original = readFileSync(threeModulePath, "utf-8");

        if (original.includes(exportStatement)) {
          return null;
        }

        return `${original}\n${exportStatement}\n`;
      }

      return null;
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    ensureThreeBatchedMeshExport(),
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
