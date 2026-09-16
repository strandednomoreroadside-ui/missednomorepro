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
    "vacation-rental-management": {
      hook: "Guests locked out at 11 PM and owners asking about management both call your line. Answer every call and handle each one the right way.",
      why: "Vacation rental managers hear from guests with urgent problems, like a lockout, no hot water, or a broken AC, plus prospective guests with questions and property owners interested in management. Guest emergencies can't wait for morning, and owner leads are valuable. The AI answers in your company's name, treats guest emergencies as urgent, answers property and policy questions from your FAQs, and books owner consultations.",
      calls: [
        "Guest lockouts and access code problems",
        "No hot water, no AC, and broken appliances",
        "Check-in, parking, and house rule questions",
        "Owners asking about management services",
        "Cleaning and turnover scheduling questions",
        "Guests reporting damage or maintenance issues",
      ],
      estimates: "owner inquiries about management and revenue",
      urgent: "a problem at the rental like a lockout or no hot water",
      booking: "owner consultations",
      faqs: [
        {
          q: "Will the AI give guests door codes?",
          a: "No. It never reads out access codes or private property details. It captures the guest's name and issue and texts your on-call team right away.",
        },
        {
          q: "Does it connect to Airbnb or VRBO?",
          a: "No. It doesn't read reservation systems. It answers questions from the FAQs you write and takes guest details for your team.",
        },
      ],
    },
    "home-inspectors": {
      hook: "Real estate deals run on tight timelines. Answer every call, quote your inspections, and book before the agent calls the next inspector.",
      why: "Home inspectors take calls from buyers, sellers, and real estate agents who need an inspection scheduled within days of an accepted offer. Callers want the price for the home's size, what add-ons you offer, and your first opening. The AI answers in your company's name, quotes inspections and add-ons from your rates, captures the property and closing timeline, and books the inspection.",
      calls: [
        "Buyer inspections under contract deadlines",
        "Pre-listing inspections for sellers",
        "Radon, sewer scope, and termite add-ons",
        "Agents scheduling for their clients",
        "New construction and phase inspections",
        "Questions about what the inspection covers",
      ],
      quotes: "inspections by home size and add-ons like radon tests and sewer scopes",
      estimates: "commercial and multi-unit inspections",
      booking: "inspections",
      faqs: [
        {
          q: "Can the AI quote an inspection with add-ons?",
          a: "Yes. Set inspection prices by home size and your add-ons, plus travel zones, and the AI prices everything together and reads back one exact total.",
        },
        {
          q: "Will it discuss inspection findings?",
          a: "No. It never interprets reports or findings. It takes the caller's questions and texts your team to follow up.",
        },
      ],
    },
    "commercial-maintenance": {
      hook: "When something breaks at a business, the facility manager needs a fast response. Answer every call and get the right tech moving.",
      why: "Commercial maintenance and facility service companies take calls from property managers, retail and restaurant managers, and building owners with broken doors, lighting, plumbing, and HVAC issues, plus requests for preventive maintenance. Some problems shut down operations and need someone right away. The AI answers in your company's name, captures the property and problem, treats shutdowns as urgent, and books scheduled work.",
      calls: [
        "Broken doors, locks, and storefront problems",
        "Lighting, electrical, and plumbing repairs",
        "Preventive maintenance visits",
        "Multi-site accounts reporting issues",
        "Work order and status questions",
        "New facility service contracts",
      ],
      quotes: "service calls and preventive maintenance visits",
      estimates: "larger repairs and facility contracts",
      urgent: "a facility problem that shuts down the business",
      booking: "service visits",
      faqs: [
        {
          q: "Can the AI handle calls from multi-site accounts?",
          a: "Yes. It captures the account, the location, and the problem, recognizes returning callers in the CRM, and texts your team or books a service visit.",
        },
        {
          q: "Does it connect to our work order system?",
          a: "Not directly. Every call is logged in the built-in CRM with a transcript, and on the Professional plan Zapier and Make webhooks can send new leads and bookings to other tools.",
        },
      ],
    },
    "self-storage": {
      hook: "Storage renters compare facilities by phone. Answer every call, quote your unit sizes, and book the tour or move-in.",
      why: "Self-storage facilities get calls about unit sizes, prices, climate control, access hours, and move-in specials, often from people in the middle of a move who will rent from the first facility that answers. Existing tenants call about access, payments, and move-outs. The AI answers in your facility's name, quotes unit sizes from your price list, answers policy questions from your FAQs, and books tours and move-in appointments.",
      calls: [
        "Unit size and availability questions",
        "Climate-controlled unit questions",
        "Access hours and gate questions",
        "Move-in appointments and tours",
        "Vehicle, RV, and boat storage",
        "Tenants asking about payments and move-outs",
      ],
      estimates: "business storage and multi-unit rentals",
      booking: "tours and move-ins",
      faqs: [
        {
          q: "Can the AI check which units are available?",
          a: "No. It doesn't connect to your storage management software. It quotes your unit sizes from your price list, takes the caller's details, and your team confirms availability.",
        },
        {
          q: "Will it give out gate codes?",
          a: "No. It never shares access codes. Tenants with access problems are taken as a message and texted to your team.",
        },
      ],
    },
  },
  variants: {
    "facility-maintenance": {
      title: "Facility maintenance contractors",
      body: "Facility maintenance contractors serving schools, offices, and retail chains get the same treatment: the AI captures the site and the issue, texts your team about problems that stop operations, and books scheduled maintenance.",
    },
    "storage-facilities": {
      title: "Storage facilities",
      body: "For any storage facility, the AI answers unit and pricing questions from your price list and FAQs, books tours and move-ins, and texts your team about tenant issues, without ever sharing access codes.",
    },
    "rv-storage": {
      title: "RV storage",
      body: "RV storage callers ask about space lengths, covered or enclosed options, dump stations, and access hours. The AI quotes your space sizes from your price list, answers amenity questions from your FAQs, and books a tour or move-in.",
    },
    "boat-storage": {
      title: "Boat storage",
      body: "Boat storage calls peak before winter. The AI quotes your indoor and outdoor storage options from your price list, captures the boat's length, answers winterization and access questions from your FAQs, and books the drop-off.",
    },
  },
};
