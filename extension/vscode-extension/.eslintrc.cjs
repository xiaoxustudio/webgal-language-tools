/**@type import("eslint").Linter.Config  */
module.exports = {
	extends: ["../../.eslintrc.json"],
	env: {
		node: true
	},
	ignorePatterns: [".eslintrc.cjs"],
	parserOptions: {
		project: ["./tsconfig.eslint.json"],
		tsconfigRootDir: __dirname
	},
	rules: {
		"@typescript-eslint/no-explicit-any": "off"
	}
};
