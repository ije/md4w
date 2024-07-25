import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import { defineConfig } from "rollup";

export default defineConfig({
  input: "src/index.js",
  output: [
    {
      dir: "dist",
      format: "es",
      exports: "named",
      preserveModules: true,
      preserveModulesRoot: "src",
      sourcemap: true,
    },
  ],
  external: ["md4w"],
  plugins: [resolve(), terser()],
});
