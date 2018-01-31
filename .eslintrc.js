module.exports = {
    "parser": "babel-eslint",
    "extends": "airbnb",
    "globals": {
        "fetch": true,
        "FormData": true
    },
    "plugins": [
        "react",
        "jsx-a11y",
        "import"
    ],
    "rules": {
        "react/jsx-filename-extension": [1, { "extensions": [".js", ".jsx"] }],
        "react/prefer-stateless-function": [1],
        "react/require-default-props": [0],
        "react/no-unused-prop-types": [2, {
            "skipShapeProps": true
        }],
        "react/no-multi-comp": [0],
        "no-bitwise": [0],
        "react/no-multi-comp": [0],
        "linebreak-style": [0],
    },
};