import type { CategoryFile } from "../types";

export const constructionRemodeling: CategoryFile = {
  intro:
    "Remodeling and construction leads are worth thousands, but the owner is usually on a job site when they call. Missed No More Pro answers every call in your company's name, captures the project, answers your standard questions in your words, quotes the small jobs you price by phone, and books the estimate before the homeowner calls the next contractor.",
  niches: {
    handyman: {
      hook: "Handyman customers have a list of small jobs and want someone who answers. Pick up every call, quote your flat-rate tasks, and book the visit.",
      why: "Handyman calls are a mix of small, specific jobs: mount a TV, fix a door that sticks, patch drywall, replace a faucet, assemble furniture. Customers often have several tasks for one visit and want to know what it will cost and how soon someone can come. The AI answers in your company's name, prices the tasks you quote by phone together in one visit, and books the first open time.",
      calls: [
        "TV mounting and shelf hanging",
        "Drywall patches and small repairs",
        "Doors that stick, squeak, or won't latch",
        "Furniture and fixture assembly and installs",
        "Honey-do lists with several small tasks",
        "Rental property turnover repairs",
      ],
      quotes: "flat-rate tasks like TV mounting, fixture installs, and drywall patches",
      estimates: "larger repairs and remodeling work you price on site",
      booking: "visits",
      faqs: [
        {
          q: "Can the AI quote a list of small handyman jobs?",
          a: "Yes, for tasks you've priced. The AI can price up to four services in one quote for the same visit, charging your travel fee once, and reads back a single exact total. Anything you haven't priced is captured for your team.",
        },
        {
          q: "What if a caller asks for work I don't do?",
          a: "Add the jobs you do and don't take on to your FAQs. The AI answers from that list, and if something isn't covered, it takes the caller's details so you can decide.",
        },
      ],
    },
    "general-contractors": {
      hook: "Remodel and addition leads call while you're on site. Answer every one, capture the project scope, and book the consultation before they call the next contractor.",
      why: "General contractor calls range from a homeowner planning a basement finish or addition to a property owner who needs a contractor for insurance repairs. The first call is about understanding the project, the budget range the caller mentions, and the timeline, then setting a consultation. The AI answers in your company's name, captures what the caller describes, answers questions about licensing and your process from your FAQs, and books the consultation.",
      calls: [
        "Home additions and basement finishing",
        "Whole-home and multi-room remodels",
        "Insurance repair and rebuild projects",
        "Licensing, insurance, and permit questions",
        "Subcontractor and supplier calls routed to your team",
        "Existing clients checking on active projects",
      ],
      estimates: "remodels, additions, and rebuild projects you scope in person",
      booking: "consultations",
      faqs: [
        {
          q: "Can the AI qualify remodeling leads?",
          a: "It captures what the caller describes, like the type of project, timeline, and any budget they mention, in the call summary, checks the address against your service radius, and books a consultation. Your team sees the full transcript in the CRM before the meeting.",
        },
        {
          q: "What about calls from subcontractors and suppliers?",
          a: "Sales pitches and robocalls are screened out. Calls that need you personally can be warm-transferred to your phone or taken as a detailed message with a text alert.",
        },
      ],
    },
    "foundation-repair": {
      hook: "Foundation calls come from worried homeowners who just found a crack. Answer every call, capture what they're seeing, and book the inspection.",
      why: "Foundation repair leads usually start with a discovery: a crack in the basement wall, doors that stick, a sloping floor, or a home inspector's report before a sale. Callers are anxious and want to know how soon someone can look. The AI answers in your company's name, captures what the homeowner describes, answers process questions from your FAQs, and books the inspection.",
      calls: [
        "Cracked basement walls and foundation cracks",
        "Sloping floors and sticking doors",
        "Bowing or leaning walls",
        "Inspection reports from home sales",
        "Pier, wall anchor, and stabilization questions",
        "Warranty service for past repairs",
      ],
      quotes: "foundation inspections",
      estimates: "stabilization and structural repairs you price after an inspection",
      booking: "inspections",
      faqs: [
        {
          q: "Can homeowners send photos of the cracks?",
          a: "Yes. Photos texted to your Missed No More Pro number are saved to the customer's record in the CRM next to the call summary, so your inspector can see the problem before the visit.",
        },
        {
          q: "Will the AI tell someone their foundation is fine?",
          a: "No. It never diagnoses or guesses. It captures what the caller describes and books an inspection with your team.",
        },
      ],
    },
    "basement-waterproofing": {
      hook: "Wet basement calls come in after every heavy rain. Answer them all, capture the problem, and book the inspection before the next storm.",
      why: "Basement waterproofing leads come from homeowners with water on the floor after a storm, damp walls, musty smells, or a sump pump that failed. Many are also dealing with a crawlspace. The AI answers in your company's name, captures what the caller is seeing, answers questions about your systems from your FAQs, and books the inspection.",
      calls: [
        "Water in the basement after rain",
        "Damp walls, efflorescence, and musty smells",
        "Sump pump failures and replacements",
        "Interior drainage and wall system questions",
        "Crawlspace moisture and encapsulation",
        "Warranty service for installed systems",
      ],
      quotes: "waterproofing inspections and sump pump service calls",
      estimates: "drainage and waterproofing systems you price after an inspection",
      booking: "inspections",
      faqs: [
        {
          q: "Can the AI book waterproofing inspections?",
          a: "Yes. It checks the address against your service radius, books the inspection into an open slot, and texts the homeowner a confirmation and a reminder.",
        },
        {
          q: "Can it explain our waterproofing systems?",
          a: "Yes, from the FAQs you write. Add how your systems work and your warranty terms, and the AI answers in your words without inventing claims.",
        },
      ],
    },
    "flooring-installers": {
      hook: "Flooring buyers want a measure on the calendar. Answer every call, capture the project, and book the in-home measure.",
      why: "Flooring leads call about hardwood, luxury vinyl, tile, and carpet for a room or a whole floor, plus refinishing and repairs. Almost every job needs a measure before pricing, and customers usually book the first installer who can come out. The AI answers in your company's name, captures the rooms and materials the caller mentions, answers product questions from your FAQs, and books the measure.",
      calls: [
        "Luxury vinyl plank and laminate installs",
        "Hardwood installs and refinishing",
        "Tile floors, showers, and backsplashes",
        "Carpet replacement",
        "Water-damaged floor replacement",
        "Commercial flooring inquiries",
      ],
      estimates: "flooring projects you measure before pricing",
      booking: "in-home measures",
      faqs: [
        {
          q: "Can the AI quote flooring by the square foot?",
          a: "No. It doesn't estimate square footage. It captures the rooms and materials the caller describes and books an in-home measure so your team can price the job.",
        },
        {
          q: "Can it answer questions about materials?",
          a: "Yes, from your FAQs. Add the products you carry and install, and the AI answers in your words.",
        },
      ],
    },
    "insulation-contractors": {
      hook: "Insulation leads call when the energy bill spikes or a room won't stay warm. Answer every call, capture the project, and book the assessment.",
      why: "Insulation contractors hear from homeowners with high energy bills, cold rooms, or ice dams, plus remodelers and builders who need insulation installed, and homeowners who need old insulation removed after pests or water damage. The AI answers in your company's name, captures what the caller describes, answers questions about materials and rebates from your FAQs, and books the assessment.",
      calls: [
        "Attic insulation top-ups and blown-in insulation",
        "Spray foam insulation projects",
        "Cold rooms, drafts, and ice dams",
        "Old or contaminated insulation removal",
        "New construction and remodel insulation",
        "Energy rebate and material questions",
      ],
      quotes: "attic assessments and standard attic top-up packages",
      estimates: "spray foam and whole-home projects",
      booking: "assessments",
      faqs: [
        {
          q: "Can the AI answer rebate questions?",
          a: "It answers from the FAQs you write, like the programs you work with. It never makes up rebate amounts or eligibility.",
        },
        {
          q: "Can it quote attic insulation?",
          a: "Yes, for packages you price up front, with your travel zones added. Larger projects are captured and booked as assessments.",
        },
      ],
    },
  },
  variants: {
    "insulation-removal": {
      title: "Insulation removal",
      body: "Insulation removal calls often follow rodent infestations, water damage, or a remodel. The AI captures what the homeowner describes, answers questions about your removal process from your FAQs, and books the assessment into an open slot.",
    },
    "crawlspace-encapsulation": {
      title: "Crawlspace encapsulation",
      body: "Crawlspace calls usually mention moisture, musty smells, sagging floors, or pests. The AI captures what the homeowner describes, answers questions about vapor barriers and dehumidifiers from your FAQs, and books the crawlspace inspection into an open slot.",
    },
    carpentry: {
      title: "Carpentry and finish carpentry",
      body: "For carpentry work like trim, built-ins, and custom shelving, the AI captures the project details the caller shares, quotes any small jobs you price by phone, and books the estimate for custom work into an open slot on your calendar.",
    },
  },
};
