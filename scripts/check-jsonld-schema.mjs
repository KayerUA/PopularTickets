#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = readFileSync(join(root, "apps/tickets/lib/seo/eventJsonLd.ts"), "utf8");

const requiredSnippets = [
  "function stripJsonLdEmptyValues",
  "return stripJsonLdEmptyValues({",
  '"@type": "Event"',
  "additionalType: eventFormat",
  '"@type": "Place"',
  '"@type": "PostalAddress"',
  "addressLocality: venueAddress.addressLocality",
  "streetAddress: venueAddress.streetAddress",
  "priceCurrency: \"PLN\"",
  "availability,",
  "inLanguage: EVENT_LANG[locale]",
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));
if (missing.length) {
  console.error("JSON-LD schema guard failed. Missing snippets:");
  for (const snippet of missing) console.error(`- ${snippet}`);
  process.exit(1);
}

const blockedPatterns = [
  /streetAddress:\s*event\.venue/,
  /address:\s*event\.venue/,
  /priceCurrency:\s*undefined/,
  /"@type":\s*undefined/,
];

const blocked = blockedPatterns.filter((pattern) => pattern.test(source));
if (blocked.length) {
  console.error("JSON-LD schema guard failed. Blocked source patterns:");
  for (const pattern of blocked) console.error(`- ${pattern}`);
  process.exit(1);
}

console.log("JSON-LD schema guard passed.");
