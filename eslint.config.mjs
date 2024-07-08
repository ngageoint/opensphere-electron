import globals from "globals";

export default [
  {
    ignores: ["app/src/preload"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 2020,
      sourceType: "commonjs",
    },
    rules: {
      "array-bracket-newline": 0,
      "array-bracket-spacing": [2, "never"],
      "array-element-newline": 0,
      "arrow-parens": [2, "always"],
      "block-spacing": [2, "never"],
      "brace-style": 2,
      camelcase: [
        2,
        {
          properties: "never",
        },
      ],
      "comma-dangle": ["error", "never"],
      "comma-spacing": 2,
      "comma-style": 2,
      "computed-property-spacing": 2,
      "constructor-super": 2,
      curly: [2, "multi-line"],
      "eol-last": 2,
      "func-call-spacing": 2,
      "generator-star-spacing": [2, "after"],
      // Pre-ES6 engines need to be able to use objects as maps.
      "guard-for-in": "off",
      indent: [
        2,
        2,
        {
          CallExpression: {
            arguments: 2,
          },
          FunctionDeclaration: {
            body: 1,
            parameters: 2,
          },
          FunctionExpression: {
            body: 1,
            parameters: 2,
          },
          MemberExpression: 2,
          ObjectExpression: 1,
          SwitchCase: 1,
          ignoredNodes: ["ConditionalExpression"],
        },
      ],
      "key-spacing": 2,
      "keyword-spacing": 2,
      "linebreak-style": 2,
      "max-len": [
        "error",
        {
          code: 120,
        },
      ],
      "new-cap": 2,
      "no-array-constructor": 2,
      "no-caller": 2,
      "no-cond-assign": 0,
      "no-extend-native": 2,
      "no-extra-bind": 2,
      "no-invalid-this": 2,
      "no-irregular-whitespace": 2,
      "no-mixed-spaces-and-tabs": 2,
      "no-multi-spaces": 2,
      "no-multi-str": 2,
      "no-multiple-empty-lines": [
        2,
        {
          max: 2,
        },
      ],
      "no-negated-condition": "off",
      "no-new-object": 2,
      "no-new-symbol": 2,
      "no-new-wrappers": 2,
      "no-tabs": 2,
      "no-this-before-super": 2,
      "no-throw-literal": 2,
      "no-trailing-spaces": 2,
      "no-undef": "error",
      "no-unexpected-multiline": 2,
      "no-unused-vars": [
        2,
        {
          args: "none",
        },
      ],
      "no-var": 2,
      "no-with": 2,
      "object-curly-spacing": 2,
      "one-var": [
        2,
        {
          const: "never",
          let: "never",
          var: "never",
        },
      ],
      "operator-linebreak": [2, "after"],
      "padded-blocks": [2, "never"],
      "prefer-const": [
        2,
        {
          destructuring: "all",
        },
      ],
      "prefer-promise-reject-errors": 2,
      "prefer-rest-params": 2,
      "prefer-spread": 2,
      "quote-props": [2, "consistent"],
      quotes: [
        2,
        "single",
        {
          allowTemplateLiterals: true,
        },
      ],
      "rest-spread-spacing": 2,
      semi: 2,
      "semi-spacing": 2,
      "space-before-blocks": 2,
      "space-before-function-paren": [
        2,
        {
          anonymous: "never",
          asyncArrow: "always",
          named: "never",
        },
      ],
      "spaced-comment": [2, "always"],
      "switch-colon-spacing": 2,
      "yield-star-spacing": [2, "after"],
    },
  },
];
