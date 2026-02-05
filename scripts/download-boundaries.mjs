#!/usr/bin/env node

/**
 * Download NHS boundary GeoJSON files from the ONS Open Geography API.
 * Re-run this script whenever boundary vintages change (e.g. NHS reorganisation).
 *
 * Usage: node scripts/download-boundaries.mjs
 *
 * Output: public/geo/{regions,icbs,sub-icbs,england}.geojson
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'geo');

const BASE = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';

// Each entry: service name, fields to keep, output filename, optional where clause
const BOUNDARIES = [
  {
    name: 'NHS Regions',
    service: 'NHS_England_Regions_January_2024_EN_BGC',
    fields: 'NHSER24CD,NHSER24NM',
    // Normalised field names for the app
    codeField: 'NHSER24CD',
    nameField: 'NHSER24NM',
    outFile: 'regions.geojson',
  },
  {
    name: 'ICBs',
    service: 'Integrated_Care_Boards_April_2023_EN_BGC',
    fields: 'ICB23CD,ICB23NM',
    codeField: 'ICB23CD',
    nameField: 'ICB23NM',
    outFile: 'icbs.geojson',
  },
  {
    name: 'Sub-ICBs',
    // BSC (200m) for Sub-ICBs - good balance of detail vs size for 106 features
    service: 'Sub_Integrated_Care_Board_Locations_April_2023_EN_BSC',
    fields: 'SICBL23CD,SICBL23NM',
    codeField: 'SICBL23CD',
    nameField: 'SICBL23NM',
    outFile: 'sub-icbs.geojson',
  },
  {
    name: 'England',
    service: 'Countries_December_2024_Boundaries_UK_BUC',
    fields: 'CTRY24CD,CTRY24NM',
    codeField: 'CTRY24CD',
    nameField: 'CTRY24NM',
    outFile: 'england.geojson',
    where: "CTRY24NM='England'",
  },
];

function buildUrl(b) {
  const where = encodeURIComponent(b.where || '1=1');
  return (
    `${BASE}/${b.service}/FeatureServer/0/query` +
    `?where=${where}` +
    `&outFields=${b.fields}` +
    `&outSR=4326` +
    `&f=geojson` +
    `&geometryPrecision=5` +
    `&resultRecordCount=2000`
  );
}

// Normalise properties to { code, name } for consistent app usage
function normaliseFeatures(geojson, b) {
  for (const feature of geojson.features) {
    const props = feature.properties;
    feature.properties = {
      code: props[b.codeField],
      name: props[b.nameField],
    };
  }
  return geojson;
}

async function download(b) {
  const url = buildUrl(b);
  console.log(`  Fetching ${b.name} ...`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${b.name}: ${res.statusText}`);
  }

  const geojson = await res.json();

  if (!geojson.features?.length) {
    throw new Error(`No features returned for ${b.name}`);
  }

  // Normalise field names
  normaliseFeatures(geojson, b);

  const outPath = join(OUT_DIR, b.outFile);
  writeFileSync(outPath, JSON.stringify(geojson));

  const sizeKB = (Buffer.byteLength(JSON.stringify(geojson)) / 1024).toFixed(0);
  console.log(`  -> ${b.outFile}: ${geojson.features.length} features, ${sizeKB} KB`);
}

async function main() {
  console.log('Downloading NHS boundary files from ONS Open Geography API\n');

  mkdirSync(OUT_DIR, { recursive: true });

  for (const b of BOUNDARIES) {
    try {
      await download(b);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      process.exitCode = 1;
    }
  }

  console.log('\nDone. Files saved to public/geo/');
}

main();
