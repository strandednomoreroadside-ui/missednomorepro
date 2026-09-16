import type { CategoryFile } from "../types";

export const automotive: CategoryFile = {
  intro:
    "Auto shops and mobile automotive businesses lose calls every time a tech is under a car. Missed No More Pro answers every call in your shop's name, captures the vehicle's year, make, and model with the problem, books service appointments, and for mobile businesses quotes your rates and texts your tech when a driver is stuck.",
  niches: {
    "auto-repair-shops": {
      hook: "Your techs can't answer the phone from under a lift. Answer every call, capture the vehicle and the problem, and book the appointment before the driver calls the shop down the street.",
      why: "Auto repair shops field a steady stream of calls that pull service writers away from customers at the counter: check engine lights, brake noises, oil changes, and people asking if their car is ready. Drivers with a problem usually call several shops and book the first one that gives them an appointment. The AI answers in your shop's name, captures the year, make, and model with the problem, and books the drop-off into an open slot.",
      calls: [
        "Check engine lights and diagnostic appointments",
        "Brake noises, pulling, and vibration concerns",
        "Oil changes and scheduled maintenance",
        "Tire, alignment, and battery questions",
        "Customers asking if their car is ready",
        "Warranty, fleet, and loaner car questions from your FAQ",
      ],
      estimates: "repairs that depend on a diagnosis",
      booking: "service appointments",
      faqs: [
        {
          q: "Does the AI ask for the vehicle's year, make, and model?",
          a: "Yes. When you pick an auto repair business type in setup, the AI captures the vehicle's year, make, and model along with the problem, and it never asks the caller for a street address since they're bringing the car to you.",
        },
        {
          q: "Can it tell customers whether their car is ready?",
          a: "It doesn't connect to your shop management system, so it won't read repair status. It takes the customer's name and number and texts your team so a service writer can call back, and it logs the call in the CRM.",
        },
      ],
    },
    "mobile-diesel-mechanics": {
      hook: "A broken-down truck is money lost every hour it sits. Answer every call, capture the unit and location, and get your mobile diesel tech moving.",
      why: "Mobile diesel calls come from owner-operators broken down on the shoulder, fleet managers with a truck that won't start in the yard, and contractors with equipment down on a job site. They need to know how soon you can get there, and they often don't have an exact address, just an exit or a mile marker. The AI answers in your company's name, captures the unit and location, and texts your on-call tech right away.",
      calls: [
        "Trucks broken down on the highway or shoulder",
        "No-start and electrical problems in the yard",
        "DPF, DEF, and aftertreatment issues",
        "Air system, brake, and tire problems",
        "Fleet preventive maintenance scheduling",
        "Repeat fleet accounts calling in units",
      ],
      quotes: "mobile service calls, diagnostic visits, and preventive maintenance visits",
      estimates: "major repairs that depend on a diagnosis",
      urgent: "a truck broken down on the road",
      booking: "maintenance visits",
      faqs: [
        {
          q: "What if the driver doesn't know the exact address?",
          a: "The AI asks for the nearest exit, mile marker, cross streets, or a landmark, reads back what it understood, and captures the unit's year, make, and model before texting your on-call tech.",
        },
        {
          q: "Can it quote a mobile service call?",
          a: "Yes. Set your service call and diagnostic rates with travel zones by driving distance and an after-hours fee, and the AI reads back one exact total. Repairs that depend on a diagnosis are captured for your tech.",
        },
      ],
    },
  },
  variants: {
    "tire-shops": {
      title: "Tire shops",
      body: "Tire shop callers want to know if you have their size and how soon they can come in. The AI captures the vehicle and tire details the caller shares, answers questions about brands and services from your FAQs, and books the install or repair appointment. It doesn't check your tire inventory, so stock questions are taken as a message for your team.",
    },
  },
};
