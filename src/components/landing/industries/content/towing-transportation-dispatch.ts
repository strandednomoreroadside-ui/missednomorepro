import type { CategoryFile } from "../types";

export const towingTransportationDispatch: CategoryFile = {
  intro:
    "Towing, moving, and transportation businesses run on dispatch, and every missed call is a job handed to someone else. Missed No More Pro answers every call in your company's name, captures pickup locations even without an exact address, quotes the services you price by distance, texts your drivers when a call can't wait, and books the scheduled work.",
  niches: {
    "moving-companies": {
      hook: "Moving leads shop around and book fast. Answer every call, capture the move details, and get the estimate on the calendar before they call the next mover.",
      why: "Moving customers call with a date, a home size, and a lot of questions: how pricing works, whether you pack, how far you go, and how soon you have availability. Most moves are priced from an estimate, and the first mover to book that estimate has the advantage. The AI answers in your company's name, captures the move details the caller shares, answers process questions from your FAQs, and books the estimate.",
      calls: [
        "Local residential moves",
        "Apartment and condo moves with elevator or stair questions",
        "Packing and unpacking services",
        "Moving dates and availability questions",
        "Storage between moves",
        "Existing customers confirming move-day details",
      ],
      estimates: "full moves you price from an in-home or video estimate",
      booking: "moving estimates",
      faqs: [
        {
          q: "Can the AI quote a move over the phone?",
          a: "Most movers price from an estimate, so the AI captures the move date, home size, and addresses the caller shares and books the estimate. If you sell flat-priced services, like a small single-item move, it can quote those exactly from your rates.",
        },
        {
          q: "Can it answer questions about packing and insurance?",
          a: "Yes, from the FAQs you write. Add how your pricing works, what's included, and your coverage options, and the AI answers in your words without inventing terms.",
        },
      ],
    },
    "parking-lot-towing": {
      hook: "Parking enforcement tows need a fast response, and towed drivers call all night. Answer every call, get property requests to your drivers, and give vehicle owners your lot details.",
      why: "Parking lot and private property towing businesses get two very different callers. Property managers and business owners call to report a vehicle in a fire lane, a reserved spot, or an unauthorized space, and they want it moved quickly. Vehicle owners call to find out whether their car was towed, where it is, and how to get it back. The AI answers both in your company's name, sends property requests to your drivers, and answers owner questions from your FAQs.",
      calls: [
        "Property managers reporting unauthorized vehicles",
        "Fire lane, handicap, and reserved spot violations",
        "Drivers asking whether their car was towed",
        "Impound lot address, hours, and release document questions",
        "New private property enforcement accounts",
        "Apartment complex and HOA parking calls",
      ],
      urgent: "a vehicle blocking a fire lane or a reserved space",
      booking: "property walkthroughs",
      faqs: [
        {
          q: "What does the AI tell someone whose car was towed?",
          a: "It answers from your FAQs: your impound lot address, release hours, and the documents they need to bring. It captures the vehicle's year, make, and model and the caller's number, and it never makes up fees or policies you haven't provided.",
        },
        {
          q: "How are property manager tow requests handled?",
          a: "The AI captures the property address, the vehicle, and the violation, treats blocked fire lanes and reserved spots as urgent, texts your on-call driver right away, and logs the request in the CRM under that property.",
        },
      ],
    },
    "piano-movers": {
      hook: "Piano owners want a specialist who answers and gives a straight price. Pick up every call, quote your local piano moves, and book the date.",
      why: "Piano moving calls come from families moving house, churches and schools relocating instruments, and buyers bringing home a new piano. Callers want to know if you move their type of piano, what stairs cost, and when you can do it. The AI answers in your company's name, captures the piano type, stairs, and addresses the caller shares, quotes the local moves you price by piano type, and books the move.",
      calls: [
        "Upright and spinet piano moves",
        "Grand and baby grand piano moves",
        "Stairs, tight turns, and access questions",
        "Piano storage and delivery after purchase",
        "Churches, schools, and venues",
        "Pool table and heavy item moves",
      ],
      quotes: "local piano moves by piano type, with stairs as a possible extra",
      estimates: "long-distance piano moves",
      booking: "moves",
      faqs: [
        {
          q: "Can the AI quote a piano move?",
          a: "Yes, for moves you price by piano type, like an upright or a grand, with travel zones from your base. Charges that depend on the job, like flights of stairs, are mentioned instead of added silently.",
        },
        {
          q: "Does it ask about stairs and access?",
          a: "It captures what the caller describes about stairs and access in the call summary, and you can set stairs as a possible extra charge so callers hear about it up front.",
        },
      ],
    },
    "equipment-hauling": {
      hook: "Contractors need equipment moved on their schedule, not whenever you call back. Answer every call and capture the haul.",
      why: "Equipment hauling calls come from contractors moving machines between job sites, farmers moving tractors, and buyers who need a purchase picked up. Callers need to know if you can handle the size and weight and when you're available. The AI answers in your company's name, captures the equipment, pickup, and drop-off details the caller shares, answers capability questions from your FAQs, and texts your team.",
      calls: [
        "Excavators, skid steers, and loaders between job sites",
        "Tractors and farm equipment",
        "Equipment bought at auction or from a dealer",
        "Oversize load and permit questions",
        "Scheduled recurring hauls for contractors",
        "Storage container and shed moves",
      ],
      estimates: "hauls you price by distance, size, and weight",
      booking: "pickups",
      faqs: [
        {
          q: "Can the AI quote an equipment haul?",
          a: "Hauls usually depend on the distance, the machine, and the weight, so the AI captures those details and your team follows up with the price. It never guesses.",
        },
        {
          q: "Can it tell contractors what we can haul?",
          a: "Yes, from your FAQs. Add your trailer capacities and the equipment you move, and the AI answers in your words.",
        },
      ],
    },
  },
  variants: {
    "pool-table-movers": {
      title: "Pool table movers",
      body: "Pool table moves need disassembly, slate handling, and releveling. The AI captures the table size and both locations, quotes the moves you price by table size, and books the date.",
    },
    "heavy-duty-towing": {
      title: "Heavy-duty towing and recovery",
      body: "Heavy-duty towing calls come from truckers, fleet managers, and police for semis, buses, and equipment. The AI captures the unit, the location (an exit or mile marker works), and what happened, treats a disabled commercial vehicle as urgent, texts your on-call operator right away, and logs fleet accounts in the CRM.",
    },
    "private-property-towing": {
      title: "Private property towing",
      body: "For private property towing, the AI handles property owner requests and vehicle owner questions the same way: owners get your impound details from your FAQs, and property managers' requests go straight to your on-call driver with the property address and vehicle description.",
    },
    "moving-storage": {
      title: "Moving and storage companies",
      body: "If you offer storage alongside moves, add your storage options and policies to your FAQs. The AI answers storage questions in your words, captures the move and storage dates the caller shares, and books the estimate.",
    },
    "furniture-movers": {
      title: "Furniture movers",
      body: "For furniture-only moves, like a sofa, a dresser, or a new purchase from a store, you can set flat prices for common single-item moves, with travel zones measured from your base to the pickup. The AI quotes those exactly from your rates and books the pickup, and larger jobs are booked as estimates.",
    },
    "long-distance-movers": {
      title: "Long-distance movers",
      body: "Long-distance moving calls need more detail: origin, destination, move date, and home size. The AI captures what the caller shares in the call summary, answers questions about delivery windows and coverage from your FAQs, and books the estimate. Set your service radius around where you pick up so origin addresses are checked on the call.",
    },
    "office-movers": {
      title: "Office and commercial movers",
      body: "Office move inquiries come from office managers and business owners planning around a lease date. The AI captures the business, both addresses, and the timeline, answers after-hours and weekend move questions from your FAQs, and books a walkthrough.",
    },
  },
};
