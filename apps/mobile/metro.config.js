const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withTamagui } = require("@tamagui/metro-plugin");

const monorepoRoot = path.resolve(__dirname, "../..");
const tamaguiConfig = path.join(monorepoRoot, "tamagui.config.ts");
process.env.TAMAGUI_CONFIG = tamaguiConfig;
const metroConfig = getDefaultConfig(__dirname);

module.exports = withTamagui(metroConfig, {
  buildFile: path.join(monorepoRoot, "tamagui.build.ts"),
  config: tamaguiConfig,
});
