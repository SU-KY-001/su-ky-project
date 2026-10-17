import pkg from "../../../package.json" with { type: "json" };

// Single source of truth: the version released in CHANGELOG.md is the one in package.json.
export const API_VERSION: string = pkg.version;
