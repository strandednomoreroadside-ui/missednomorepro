import assert from "node:assert/strict";
import test from "node:test";

import { CATEGORIES, NICHE_CATALOG } from "../setup/niches.ts";
import { capturesVehicle, travelsToCustomer } from "./industry.ts";

// The bug this guards: roadside-specific intake ("what's the year, make, and
// model?") was baked into EVERY tenant's prompt, so a plumbing or cleaning
// business asked each caller about their car.

test("vehicle trades still collect the vehicle", () => {
  for (const industry of [
    "Roadside assistance",
    "Towing",
    "Mobile mechanic",
    "Auto detailing",
    "Auto glass",
    "Mobile car wash",
  ]) {
    assert.equal(capturesVehicle(industry), true, industry);
  }
});

test("home trades never ask about a vehicle", () => {
  for (const industry of [
    "HVAC",
    "Plumbing",
    "Electrician",
    "Roofing",
    "Cleaning",
    "Landscaping",
    "Pest control",
    "Handyman",
    "Window cleaning",
    "Junk removal",
    "Painting",
    "Other",
  ]) {
    assert.equal(capturesVehicle(industry), false, industry);
  }
});

test("unset industry falls back to the safe general-trade script", () => {
  assert.equal(capturesVehicle(null), false);
  assert.equal(capturesVehicle(undefined), false);
  assert.equal(capturesVehicle(""), false);
  // Unknown/free-typed values must not accidentally opt into vehicle intake.
  assert.equal(capturesVehicle("Dog walking"), false);
});

test("matching is case- and whitespace-insensitive", () => {
  assert.equal(capturesVehicle("  ROADSIDE ASSISTANCE  "), true);
  assert.equal(capturesVehicle("Auto Repair & Towing"), true);
});

test("mobile trades drive to the customer; storefronts do not", () => {
  for (const industry of [
    "HVAC",
    "Plumbing",
    "Roadside assistance",
    "Cleaning",
    "Other",
    null,
    "Pool & spa service",
    "Landscaping",
    "Hardscaping",
    "Mobile pet grooming",
    "Mobile car wash",
    "Computer & IT services",
    "Dog walking & pet sitting",
  ]) {
    assert.equal(travelsToCustomer(industry), true, String(industry));
  }
  for (const industry of [
    "Hair salon",
    "Barber shop",
    "Barbershop",
    "Day spa",
    "Day spa & massage",
    "Nail salon",
    "Lash & brow studio",
    "Tattoo & piercing studio",
    "Pet grooming salon",
    "Veterinary clinic",
    "Auto repair shop",
    "Tire shop",
    "Phone & computer repair shop",
    "Fitness studio & gym",
    "Dental clinic",
    "Spa",
  ]) {
    assert.equal(travelsToCustomer(industry), false, industry);
  }
});

test("catalog niches use their explicit flags", () => {
  for (const n of NICHE_CATALOG) {
    assert.equal(capturesVehicle(n.name), n.vehicle === true, n.name);
    assert.equal(travelsToCustomer(n.name), n.mode !== "office", n.name);
  }
  // Keyword matching alone would have gotten these wrong.
  assert.equal(capturesVehicle("Black car services"), false);
  assert.equal(capturesVehicle("Carpet & upholstery cleaning"), false);
  assert.equal(travelsToCustomer("Funeral homes"), false);
  assert.equal(travelsToCustomer("Freight brokers"), false);
});

test("legacy industry values keep their call-script behavior", () => {
  assert.equal(capturesVehicle("Roadside assistance"), true);
  assert.equal(travelsToCustomer("Roadside assistance"), true);
  assert.equal(capturesVehicle("HVAC"), false);
  assert.equal(travelsToCustomer("HVAC"), true);
  assert.equal(travelsToCustomer("Pool & spa service"), true);
});

test("catalog is internally consistent", () => {
  const names = new Set<string>();
  const slugs = new Set<string>();
  const categories = new Set(CATEGORIES.map((c) => c.id));
  for (const n of NICHE_CATALOG) {
    for (const label of [n.name, ...(n.aliases ?? [])]) {
      assert.ok(!names.has(label.toLowerCase()), `duplicate name/alias ${label}`);
      names.add(label.toLowerCase());
    }
    assert.ok(!slugs.has(n.slug), `duplicate slug ${n.slug}`);
    slugs.add(n.slug);
    assert.ok(categories.has(n.category), n.name);
    assert.ok(!(n.page && n.partOf), `${n.name} has both page and partOf`);
    assert.ok(!(n.setupOnly && (n.page || n.partOf)), `${n.name} is setupOnly but has a page`);
    if (n.partOf) {
      const parent = NICHE_CATALOG.find((p) => p.slug === n.partOf);
      assert.ok(parent && !parent.partOf && !parent.setupOnly, `${n.name} partOf ${n.partOf}`);
      assert.equal(parent.category, n.category, `${n.name} partOf another category`);
    }
  }
});
