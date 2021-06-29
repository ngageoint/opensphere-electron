module.exports = {
  "extends": "google",
  "env": {
    "es6": true,
    "node": true
  },
  "parserOptions": {
    "ecmaVersion": 2020
  },
  "rules": {
    // Don't dangle commas.
    "comma-dangle": ["error", "never"],
    // Pre-ES6 engines need to be able to use objects as maps.
    "guard-for-in": "off",
    // Increase max line length.
    "max-len": ["error", { "code": 120 }],
    // This is silly. Negated conditions are highly useful and often much more concise than
    // their complements.
    "no-negated-condition": "off",
    // Error on undeclared variables. Google disables this because it causes problems with Closure-style JS, where
    // namespaces are globally defined. In modularized JS, this is a highly useful error.
    "no-undef": "error"
  }
};
