import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	base: "/webgal-language-tools/",
	ssr: {
		external: ["fs", "fs/promises", "path", "url"]
	},
	build: {
		rolldownOptions: {
			external: ["fs", "fs/promises", "path", "url"]
		}
	},
	logLevel: "error"
});
