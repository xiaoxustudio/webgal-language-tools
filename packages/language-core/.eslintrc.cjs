module.exports = {
	extends: ["../../.eslintrc.json"],
	env: {
		node: true
	},
	ignorePatterns: [".eslintrc.cjs"],
	parserOptions: {
		project: ["./tsconfig.eslint.json"],
		tsconfigRootDir: __dirname
	}
};
