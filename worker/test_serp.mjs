// Offline checks of response shaping against a recorded SerpApi response.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { shapeShopping, parsePackCount, shopCacheKey, haversineKm } from "./src/serp.js";

const raw = JSON.parse(readFileSync(process.argv[2], "utf8"));
const shaped = shapeShopping(raw);
assert.ok(shaped.length > 30);
const pe = shaped.find((r) => r.seller === "PharmEasy");
assert.equal(pe.price, 24.21);
assert.equal(pe.packCount, 15);

const cases = {
  "Dolo 650mg Strip Of 15 Tablets": 15,
  "Dolo-650 Tablet 15's": 15,
  "Dolo 650 Tablet": null,
  "Dolo Tablet (650mg) (15tab)": 15,
  "Dolo 650 Mg Tab (Pack-15)": 15,
  "Micro Labs Dolo 650mg Tablets 15s": 15,
  "Doliprane 650 Tablet 10's": 10,
  "Dolo 650 Tablet - Strip of 15": 15,
};
for (const [t, n] of Object.entries(cases)) assert.equal(parsePackCount(t), n, t);
assert.equal(shopCacheKey("  Dolo 650   Tablet "), "shop:dolo 650 tablet");
assert.ok(Math.abs(haversineKm(12.97, 77.59, 12.98, 77.60) - 1.5) < 0.2);
console.log("serp shaping OK:", shaped.length, "offers");
