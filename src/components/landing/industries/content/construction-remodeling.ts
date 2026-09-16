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
    "kitchen-bath-remodelers": {
      hook: "Kitchen and bath remodels are big decisions that start with a phone call. Answer every one, capture the vision, and book the design consultation.",
      why: "Kitchen and bathroom remodel leads call with a project in mind: a dated kitchen, a tub-to-shower conversion, a primary bath upgrade, or accessibility changes for aging in place. They ask about timelines, design help, and financing, and many are talking to several remodelers. The AI answers in your company's name, captures the project the homeowner describes, answers questions from your FAQs, and books the consultation.",
      calls: [
        "Full kitchen remodels",
        "Bathroom remodels and tub-to-shower conversions",
        "Accessibility and aging-in-place updates",
        "Cabinet, countertop, and tile questions",
        "Design, timeline, and financing questions",
        "Past clients with warranty questions",
      ],
      estimates: "remodels you design and price after a consultation",
      booking: "design consultations",
      faqs: [
        {
          q: "Can the AI qualify remodeling leads?",
          a: "It captures the room, the scope, the timeline, and any budget the homeowner mentions in the call summary, checks the address against your service radius, and books a consultation.",
        },
        {
          q: "Will it quote a kitchen remodel?",
          a: "No. Remodels are priced after a consultation, so the AI books one. When a caller asks for a price, it takes their details so your team can follow up.",
        },
      ],
    },
    "epoxy-flooring": {
      hook: "Epoxy garage floor leads want a price and an install date. Answer every call, quote your garage packages, and book the job.",
      why: "Epoxy and floor coating companies take calls for garage floors, basements, patios, and commercial spaces. Garage floors are easy to price by bay count and book quickly, while basements and commercial floors need a look first. The AI answers in your company's name, quotes the packages you price by phone, answers questions about durability and cure time from your FAQs, and books the install or estimate.",
      calls: [
        "One-, two-, and three-car garage floor coatings",
        "Flake, metallic, and solid color options",
        "Basement and patio floor coatings",
        "Commercial, shop, and warehouse floors",
        "Cure time and durability questions",
        "Crack repair and surface prep questions",
      ],
      quotes: "garage floor coating packages by number of car bays",
      estimates: "basements, patios, and commercial floors",
      booking: "installs and estimates",
      faqs: [
        {
          q: "Can the AI quote a two-car garage floor?",
          a: "Yes. Set up packages by bay count, plus travel zones, and the AI reads back one exact total. Charges that depend on the floor, like major crack repair, are mentioned up front.",
        },
        {
          q: "Can it explain cure times and warranties?",
          a: "Yes, from the FAQs you write. The AI answers in your words and never makes up warranty terms.",
        },
      ],
    },
    "cabinet-companies": {
      hook: "Cabinet buyers want a design consultation, not a voicemail. Answer every call, capture the project, and book the visit.",
      why: "Cabinet companies hear from homeowners planning a kitchen update, remodelers sourcing cabinets, and people interested in refacing or refinishing instead of replacing. Callers want to see options and get a design started. The AI answers in your company's name, captures the project and style the caller describes, answers product questions from your FAQs, and books the design consultation or showroom visit.",
      calls: [
        "New kitchen cabinets and design",
        "Cabinet refacing and refinishing",
        "Bathroom vanities and built-ins",
        "Countertop installs with new cabinets",
        "Contractor and builder orders",
        "Hardware and style questions",
      ],
      estimates: "cabinet projects you design and price after a measure",
      booking: "design consultations",
      faqs: [
        {
          q: "Can the AI book showroom visits?",
          a: "Yes. Connect Google Calendar and it books consultations or showroom visits into open times inside your hours, with a confirmation and reminder text.",
        },
        {
          q: "Can it answer questions about materials and lead times?",
          a: "Yes, from your FAQs. Add your product lines and typical lead times, and the AI answers in your words.",
        },
      ],
    },
    "closet-installation": {
      hook: "Custom closet clients want a designer to come measure. Answer every call, capture the space, and book the design consultation.",
      why: "Closet companies get calls about walk-in closets, reach-ins, pantries, garages, and home offices. Homeowners want to know about materials, styles, and how the design process works before committing. The AI answers in your company's name, captures the spaces the caller wants to organize, answers questions from your FAQs, and books the in-home design consultation.",
      calls: [
        "Walk-in and reach-in closet systems",
        "Pantry and laundry room storage",
        "Garage storage systems",
        "Home office built-ins",
        "Material, finish, and accessory questions",
        "Design and install timeline questions",
      ],
      estimates: "custom closet systems you design and measure in the home",
      booking: "design consultations",
      faqs: [
        {
          q: "Can the AI book in-home design consultations?",
          a: "Yes. It checks the address against your service radius and books the consultation into an open slot, then texts a confirmation and a reminder.",
        },
        {
          q: "Will it quote a closet system?",
          a: "Custom systems depend on the design, so the AI books a consultation. When a caller asks about price, it takes their details so your designer can follow up.",
        },
      ],
    },
    "excavation-contractors": {
      hook: "Excavation leads come from builders, homeowners, and farms with a project date in mind. Answer every call and capture the job while you're on the machine.",
      why: "Excavation contractors take calls for site prep, foundations, drainage, septic and utility trenching, land clearing, and driveways. Callers range from homeowners building a garage to general contractors scheduling subcontractors. The AI answers in your company's name, captures the project, site location, and timeline the caller describes, and books the site visit.",
      calls: [
        "Site prep and foundation digs",
        "Drainage, grading, and erosion control",
        "Utility and septic trenching",
        "Land clearing and stump removal",
        "Driveway and gravel work",
        "General contractors scheduling subcontract work",
      ],
      estimates: "excavation and site work you price after a site visit",
      booking: "site visits",
      faqs: [
        {
          q: "What if the site doesn't have an address yet?",
          a: "The AI asks for the nearest road, cross streets, or a landmark, reads back what it understood, and captures the project details for your team.",
        },
        {
          q: "Can general contractors reach us about bids?",
          a: "Yes. The AI captures the company, the project, and the timeline, logs it in the CRM, and texts your team or books a site visit.",
        },
      ],
    },
    drywall: {
      hook: "Drywall repairs and new hangs are quick decisions for homeowners and contractors. Answer every call, quote your patches, and book the job.",
      why: "Drywall contractors hear from homeowners with holes, cracks, and water damage, remodelers who need rooms hung and finished, and contractors scheduling drywall on a new build. Small patches are easy to price and book on the first call, while larger jobs need a look. The AI answers in your company's name, quotes the repairs you price by phone, and books estimates for the rest.",
      calls: [
        "Holes, cracks, and dents in walls",
        "Water-damaged drywall and ceilings",
        "Basement finishing and new rooms",
        "Texture matching and popcorn ceiling removal",
        "Contractors scheduling hang and finish work",
        "Painting after repairs",
      ],
      quotes: "patch repairs by size and small repair service calls",
      estimates: "full hang and finish projects",
      booking: "repairs and estimates",
      faqs: [
        {
          q: "Can the AI quote a drywall patch?",
          a: "Yes. Set patch prices by size, plus travel zones, and the AI reads back one exact total. Larger jobs are booked as estimates.",
        },
        {
          q: "Can homeowners send a photo of the damage?",
          a: "Yes. Photos texted to your Missed No More Pro number are saved to the customer's record in the CRM.",
        },
      ],
    },
    "welding-fabrication": {
      hook: "Welding customers need a repair or a custom piece done right. Answer every call, capture the job, and book the site visit or quote.",
      why: "Welding and fabrication shops take calls for mobile repairs on equipment and trailers, railings and gates, custom fabrication, and structural work for contractors. Callers want to know if you can handle the material and the job and when you can do it. The AI answers in your company's name, captures what needs to be welded or built, answers capability questions from your FAQs, and books the visit.",
      calls: [
        "Mobile welding repairs on site",
        "Trailer and equipment repairs",
        "Railings, gates, and custom metalwork",
        "Structural steel for contractors",
        "Aluminum and stainless jobs",
        "Custom fabrication quotes",
      ],
      quotes: "mobile welding service calls",
      estimates: "custom fabrication and structural jobs",
      booking: "site visits",
      faqs: [
        {
          q: "Can the AI tell callers what materials we work with?",
          a: "Yes, from your FAQs. Add the materials, processes, and job types you take on, and the AI answers from that list.",
        },
        {
          q: "Can customers send photos of the part?",
          a: "Yes. Photos texted to your Missed No More Pro number are saved to the customer's record in the CRM next to the call summary.",
        },
      ],
    },
  },
  variants: {
    "garage-floor-coating": {
      title: "Garage floor coating companies",
      body: "For garage floor coating, the AI quotes your packages by the number of car bays, mentions surface prep or crack repair as possible extras, and books the install, with each service's appointment length so the whole job fits.",
    },
    "countertop-installers": {
      title: "Countertop installers",
      body: "Countertop calls cover quartz, granite, and laminate replacements, often with new sinks and backsplashes. The AI captures the kitchen or bath and the material the caller wants, answers fabrication and install questions from your FAQs, and books the template or measure visit.",
    },
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
