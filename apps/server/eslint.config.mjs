import pluginJs from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		files: [ "**/*.js" ],
		languageOptions: {
			sourceType: "module",
		},
	},
	{
		languageOptions: {
			globals: globals.browser,
		},
	},
	pluginJs.configs.recommended,
	{
		plugins: {
			"simple-import-sort": simpleImportSort,
		},
		rules: {
			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error",

			"no-unused-vars": "off",
			"no-undef": "off",
			"no-empty": "off",
			"no-unused-private-class-members": "off",
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
			quotes: [ 1, "double", { allowTemplateLiterals: true, avoidEscape: true } ],
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
		},
	},
];
