import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vsixPlugin from "@codingame/monaco-vscode-rollup-vsix-plugin";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), vsixPlugin()]
});
