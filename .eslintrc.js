module.exports = {
  "extends": "google",
  "parserOptions": {
    "ecmaVersion": 6
  },
  "rules": {
    // don't dangle commas
    "comma-dangle": ["error", "never"],
    // pre-ES6 engines need to be able to use objects as maps
    "guard-for-in": "off",
    // increase max line length
    "max-len": ["error", { "code": 120 }],
    // This is silly. Negated conditions are highly useful and often much more concise than
    // their complements.
    "no-negated-condition": "off"
  }
};
