import type { CategoryFile } from "../types";

export const propertyRealEstate: CategoryFile = {
  intro:
    "Property businesses get calls from tenants with a leak at midnight, guests locked out of a rental, and owners who need an inspection before closing. Missed No More Pro answers every call in your company's name, captures the property and the problem, texts your on-call team when something can't wait, and books inspections, storage unit tours, and maintenance visits into open slots.",
  niches: {
    "property-management": {
      hook: "Tenants call at midnight, prospects call during showings, and owners call wanting management. Answer every call and route each one the right way.",
      why: "Property management companies juggle three kinds of callers: tenants reporting maintenance problems, prospective renters asking about availability and showings, and property owners looking for a manager. Maintenance emergencies happen at night and on weekends, and a missed leasing call can mean a longer vacancy. The AI answers every call in your company's name, treats emergencies like no heat or a burst pipe as urgent, answers leasing questions from your FAQs, and books showings.",
      calls: [
        "Tenant maintenance requests and emergencies",
        "No heat, no water, and active leaks after hours",
        "Prospective renters asking about availability",
        "Showing requests for vacant units",
        "Owners asking about management services",
        "Rent payment and lease questions from your FAQ",
      ],
      estimates: "owner inquiries about managing their properties",
      urgent: "a maintenance emergency like a burst pipe or no heat",
      booking: "showings",
      faqs: [
        {
          q: "Can the AI handle after-hours maintenance emergencies?",
          a: "Yes. It captures the property, unit, and problem, treats emergencies like no heat or an active leak as urgent, and texts your on-call maintenance person right away. Routine requests are logged with a transcript for your team.",
        },
        {
          q: "Can it answer questions about available rentals?",
          a: "It answers from the FAQs you keep up to date, like which units are available and your application steps, and books showings into open times. It doesn't read listings from other systems.",
        },
      ],
    },
    "apartment-management": {
      hook: "Leasing calls come after the office closes and residents call when something breaks. Answer every call so tours get booked and emergencies get handled.",
      why: "Apartment communities lose leads when prospects call after hours and reach voicemail, and residents get frustrated when a maintenance emergency sits until morning. The AI answers in your community's name, answers leasing questions from your FAQs, books tours, captures maintenance requests with the unit number, and texts your on-call maintenance tech when something can't wait.",
      calls: [
        "Prospects asking about floor plans and availability",
        "Tour requests after the leasing office closes",
        "Resident maintenance requests",
        "After-hours emergencies like leaks and lockouts",
        "Pet policy, parking, and amenity questions",
        "Move-in and move-out questions",
      ],
      estimates: "group or corporate housing inquiries",
      urgent: "a maintenance emergency in their unit",
      booking: "tours",
      faqs: [
        {
          q: "Can the AI book apartment tours after hours?",
          a: "Yes. Connect Google Calendar and it books tours into the times your leasing team is available, then texts the prospect a confirmation and a reminder.",
        },
        {
          q: "How does it handle resident emergencies?",
          a: "It captures the resident, unit, and problem, treats emergencies as urgent, and texts your on-call maintenance tech right away. Everything is logged in the CRM with a transcript.",
        },
      ],
    },
  },
  variants: {},
};
