import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    target: "node18",
    outDir: "dist",
    clean: true,
    splitting: false,
    sourcemap: true,
    dts: true,
    outExtension({ format }) {
        return {
            js: `.${format === "esm" ? "mjs" : "js"}`,
        };
    },
    // Skip emitting the same file in the src directory
    esbuildOptions(options) {
        options.outbase = 'src';
    },
    treeshake: true,
}); 