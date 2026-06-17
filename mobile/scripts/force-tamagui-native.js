const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '../node_modules/tamagui/package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  // Force Tamagui to use its native entrypoint when bundled by Metro
  pkg['react-native'] = 'src/index.ts';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('Patched tamagui/package.json for React Native');
}
