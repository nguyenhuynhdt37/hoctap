const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
const motiShimPath = path.resolve(__dirname, "src/lib/moti.tsx");

// moti@0.30.0 phụ thuộc framer-motion@6 không tương thích RN 0.81 / Expo 54 / web
// → redirect moti về shim dùng react-native-reanimated thay thế
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  moti: motiShimPath,
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "moti") {
    return {
      type: "sourceFile",
      filePath: motiShimPath,
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Bỏ "module" field → Metro không dùng ESM entry, dùng CJS thay thế
// Fix lỗi: Cannot destructure property '__extends' of 'tslib.default' as it is undefined
config.resolver.mainFields = config.resolver.mainFields?.filter(
  (f) => f !== "module"
);

module.exports = withNativeWind(config, { input: "./global.css" });
