import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

export default defineConfig([
	globalIgnores([ "dist", "playwright-report", "test-results" ]),
	{
		files: [ "**/*.{js,jsx}" ],
		extends: [
			js.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
			parserOptions: {
				ecmaVersion: "latest",
				ecmaFeatures: { jsx: true },
				sourceType: "module",
			},
		},
		plugins: {
			"simple-import-sort": simpleImportSort,
		},
		rules: {
			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error",

			"react-hooks/exhaustive-deps": "off",
			"react-hooks/rules-of-hooks": "error",

			"no-constant-binary-expression": "off",

			"array-bracket-newline": [ 1, "consistent" ],
			"array-bracket-spacing": [ 1, "always" ],
			"array-element-newline": [ 1, "consistent" ],
			"arrow-parens": [ 1, "always" ],
			"arrow-spacing": [ 1, { before: true, after: true } ],
			"block-spacing": [ 1, "always" ],
			"brace-style": [ 1, "1tbs" ],
			"comma-dangle": [ 1, "always-multiline" ],
			"comma-spacing": [ 1, { before: false, after: true } ],
			"comma-style": [ 1, "last" ],
			"computed-property-spacing": [ 1, "never" ],
			"function-call-argument-newline": [ 1, "consistent" ],
			"func-call-spacing": [ 1, "never" ],
			"implicit-arrow-linebreak": [ 1, "beside" ],
			indent: [ 1, "tab" ],
			"jsx-quotes": [ 1, "prefer-double" ],
			"key-spacing": [ 1, { beforeColon: false, afterColon: true } ],
			"keyword-spacing": [ 1, { before: true, after: true } ],
			"new-parens": [ 1, "always" ],
			"no-extra-semi": 1,
			"no-floating-decimal": 1,
			"no-multi-spaces": 1,
			"no-whitespace-before-property": 1,
			"nonblock-statement-body-position": [ 1, "beside" ],
			"object-curly-newline": [ 1, { consistent: true } ],
			"object-curly-spacing": [ 1, "always" ],
			"operator-linebreak": [ 1, "after" ],
			"quote-props": [ 1, "as-needed" ],
			quotes: [ 1, "double" ],
			semi: 1,
			"semi-spacing": 1,
			"semi-style": [ 1, "last" ],
			"space-before-blocks": [ 1, "always" ],
			"space-before-function-paren": [ 1, "never" ],
			"space-in-parens": [ 1, "never" ],
			"space-infix-ops": 1,
			"space-unary-ops": [ 1, { words: true, nonwords: false } ],
			"switch-colon-spacing": [ 1, { after: true, before: false } ],
			"template-curly-spacing": [ 1, "never" ],
			"template-tag-spacing": [ 1, "always" ],
			"wrap-regex": 1,
			"no-empty-pattern": "off",
			"react-refresh/only-export-components": "off",

			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": "off",

			"react-hooks/set-state-in-effect": "off",
			"react-hooks/static-components": "off",
			"react-hooks/immutability": "off",
			"react-hooks/refs": "off",
			"react-hooks/purity": "off",
			"no-undef": "off",
			"no-empty": "off",
			"react-hooks/globals": "off",
			"no-unreachable": "off",
			"no-prototype-builtins": "off",
			"no-constant-condition": "off",
		},
	},
]);
