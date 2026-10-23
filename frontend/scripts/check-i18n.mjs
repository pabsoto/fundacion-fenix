import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROPER_NAMES = [
  'Fundación Fénix LPB',
  'Fénix LPB',
  'FÉNIX · LPB',
  'Ariana Castillo Illanes',
  'Por menos de ellos sufriendo',
  'La Paz',
  'Bolivia',
  'Yape',
  'BCP',
  'Banco de Crédito',
];

function getKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadJson(path) {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${path}:`, error.message);
    process.exit(1);
  }
}

const esPath = join(__dirname, '../src/i18n/locales/es.json');
const enPath = join(__dirname, '../src/i18n/locales/en.json');

const es = loadJson(esPath);
const en = loadJson(enPath);

const esKeys = getKeys(es).sort();
const enKeys = getKeys(en).sort();

const missingInEn = esKeys.filter(k => !enKeys.includes(k));
const missingInEs = enKeys.filter(k => !esKeys.includes(k));

if (missingInEn.length > 0) {
  console.error(`❌ Keys missing in en.json (${missingInEn.length}):`);
  missingInEn.forEach(k => console.error(`   - ${k}`));
}

if (missingInEs.length > 0) {
  console.error(`❌ Keys missing in es.json (${missingInEs.length}):`);
  missingInEs.forEach(k => console.error(`   - ${k}`));
}

if (missingInEn.length > 0 || missingInEs.length > 0) {
  process.exit(1);
}

function getValue(obj, key) {
  return key.split('.').reduce((o, k) => o?.[k], obj);
}

const identicalValues = [];
for (const key of esKeys) {
  const esValue = getValue(es, key);
  const enValue = getValue(en, key);
  
  if (esValue === enValue && typeof esValue === 'string') {
    const isProperName = PROPER_NAMES.some(name => esValue.includes(name));
    if (!isProperName) {
      identicalValues.push(key);
    }
  }
}

if (identicalValues.length > 0) {
  console.warn(`⚠️  Warning: ${identicalValues.length} keys have identical values in es.json and en.json (may need translation):`);
  identicalValues.forEach(k => console.warn(`   - ${k}`));
}

console.log('✅ i18n check passed: es.json and en.json have matching keys');
