import assert from "node:assert/strict";
import test from "node:test";

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
  for (const industry of ["HVAC", "Plumbing", "Roadside assistance", "Cleaning", "Other", null]) {
    assert.equal(travelsToCustomer(industry), true, String(industry));
  }
  for (const industry of ["Hair salon", "Barber shop", "Day spa", "Dental clinic"]) {
    assert.equal(travelsToCustomer(industry), false, industry);
  }
});
