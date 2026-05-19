module.exports = {
	extends: ["../../.eslintrc.json"],
	env: {
		node: true
	},
	ignorePatterns: [".eslintrc.cjs"],
	parserOptions: {
		project: ["./tsconfig.json"],
		tsconfigRootDir: __dirname
	}
};
