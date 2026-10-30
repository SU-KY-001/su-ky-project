const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withTamagui } = require("@tamagui/metro-plugin");
const { withNativeWind } = require("nativewind/metro");

const monorepoRoot = path.resolve(__dirname, "../..");
const tamaguiConfig = path.join(monorepoRoot, "tamagui.config.ts");
process.env.TAMAGUI_CONFIG = tamaguiConfig;
const config = withTamagui(getDefaultConfig(__dirname), {
  buildFile: path.join(monorepoRoot, "tamagui.build.ts"),
  config: tamaguiConfig,
});

module.exports = withNativeWind(config, { input: "./global.css" });
