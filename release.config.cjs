/** @type {import('semantic-release').Options} */
module.exports = {
    branches: [
        { name: "main", prerelease: "alpha" },
        { name: "beta", prerelease: "beta" },
    ],
    plugins: [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        "@semantic-release/changelog",
        ["@semantic-release/npm", { pkgRoot: "packages/core" }],
        ["@semantic-release/npm", { pkgRoot: "packages/app-builder" }],
        "@semantic-release/github",
    ],
};
