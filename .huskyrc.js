module.exports = {
    hooks: {
        "pre-push": "run-s lint",
        "pre-commit": "pretty-quick --staged --pattern '**/*.ts'",
        "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    },
};
