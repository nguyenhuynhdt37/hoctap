const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../node_modules/lucide-react-native/dist/lucide-react-native.d.ts');
const content = fs.readFileSync(filePath, 'utf8');

console.log('Contains ShieldAlert:', content.includes('ShieldAlert'));
console.log('Contains ShieldCheck:', content.includes('ShieldCheck'));
console.log('Contains ShieldX:', content.includes('ShieldX'));

// Find lines containing Shield
const lines = content.split('\n');
const shieldLines = lines.filter(line => line.includes('declare const Shield') || line.includes('export declare const Shield'));
console.log('Shield exports:');
shieldLines.forEach(l => console.log(l));
