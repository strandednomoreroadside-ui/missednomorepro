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
    "courier-delivery": {
      hook: "Same-day delivery customers need an answer now. Pick up every call, capture the pickup and drop-off, and get a driver moving.",
      why: "Courier and delivery companies hear from law firms, medical offices, print shops, retailers, and individuals who need something delivered today, often within the hour. Business customers also call to set up regular routes. The AI answers in your company's name, captures the pickup, drop-off, item, and deadline, texts your dispatcher right away for rush jobs, and books scheduled pickups.",
      calls: [
        "Same-day and rush deliveries",
        "Legal document and court filing runs",
        "Medical and lab specimen deliveries",
        "Retail and e-commerce local deliveries",
        "Recurring route setups for businesses",
        "Delivery status questions",
      ],
      estimates: "deliveries you price by distance, size, and urgency",
      urgent: "a delivery that has to go out right now",
      booking: "scheduled pickups",
      faqs: [
        {
          q: "Can the AI dispatch a rush delivery?",
          a: "It captures the pickup, drop-off, item, and deadline, treats the call as urgent, and texts your dispatcher right away. The caller can get a confirmation text with an estimated arrival time for the pickup.",
        },
        {
          q: "Can it give delivery status updates?",
          a: "No. It doesn't connect to your dispatch system. It takes the caller's details and texts your team to follow up.",
        },
      ],
    },
    "freight-brokers": {
      hook: "Shippers and carriers call brokers all day. Answer every call, capture the load or lane, and route it to the right person.",
      why: "Freight brokerages field calls from shippers looking for capacity, carriers calling about posted loads, and existing customers checking on shipments. Brokers are often on another call, and a missed shipper call can be a lost load. The AI answers in your company's name, captures what the caller shares about the load, lane, dates, and equipment, answers standard questions from your FAQs, and texts your team.",
      calls: [
        "Shippers requesting quotes for loads",
        "Carriers asking about posted loads",
        "Equipment, lane, and pickup date details",
        "New shipper account inquiries",
        "Existing customers checking on a shipment",
        "Carrier setup and onboarding questions",
      ],
      estimates: "load quotes your brokers price",
      booking: "calls with your team",
      faqs: [
        {
          q: "Can the AI quote freight rates?",
          a: "No. It never quotes rates. It captures the origin, destination, dates, weight, and equipment the shipper describes, and texts your broker to follow up.",
        },
        {
          q: "Can carriers get load information?",
          a: "It doesn't connect to your load board. It captures the carrier's details and the load they're asking about and texts your team.",
        },
      ],
    },
    "local-trucking": {
      hook: "Local hauling customers need a truck on a certain day. Answer every call, capture the job, and get it on the schedule.",
      why: "Local trucking companies take calls for material hauling, gravel and dirt deliveries, construction debris, and contract hauling for builders and landscapers. Callers want to know if you have a truck available and what you can haul. The AI answers in your company's name, captures the material, pickup, delivery location, and date, answers capability questions from your FAQs, and books the haul.",
      calls: [
        "Gravel, dirt, and mulch deliveries",
        "Construction material hauling",
        "Debris hauling from job sites",
        "Contractors scheduling regular hauls",
        "Dump truck availability questions",
        "Load size and capacity questions",
      ],
      estimates: "hauls you price by material, distance, and load",
      booking: "hauls",
      faqs: [
        {
          q: "Can the AI quote a load of gravel?",
          a: "Only if you set a price for it. Most hauls depend on the material and distance, so the AI captures the details and your team follows up with the price.",
        },
        {
          q: "Can contractors book recurring hauls?",
          a: "The AI books each haul into an open slot on your calendar and recognizes returning contractors by name in the CRM.",
        },
      ],
    },
    "chauffeur-services": {
      hook: "Car service clients book whoever answers and confirms the ride. Pick up every call, quote your transfers, and book the reservation.",
      why: "Private transportation and chauffeur services hear from executives, travelers, event guests, and corporate assistants booking rides, often with a flight time or event schedule attached. They want a confirmed price and pickup time. The AI answers in your company's name, captures the pickup location, destination, date, and passenger count, quotes the flat-rate trips you set, and books the reservation.",
      calls: [
        "Airport pickups and drop-offs",
        "Corporate and executive car service",
        "Hourly as-directed service",
        "Event and night-out transportation",
        "Corporate accounts booking for travelers",
        "Changes to existing reservations",
      ],
      quotes: "airport transfers and flat-rate trips from your base",
      estimates: "multi-stop, hourly, and out-of-town trips",
      booking: "reservations",
      faqs: [
        {
          q: "How does the AI quote an airport transfer?",
          a: "Set flat prices for your airport transfers and travel zones measured from your base to the pickup, and the AI reads back one exact total. Longer or multi-stop trips are captured for your team to price.",
        },
        {
          q: "Can it capture flight details?",
          a: "It notes the flight number and arrival time the caller gives in the booking details and call summary for your dispatcher. It doesn't track flights.",
        },
      ],
    },
    "limousine-companies": {
      hook: "Prom, wedding, and night-out bookings go to the first limo company that answers. Pick up every call and lock in the date.",
      why: "Limousine companies take calls for weddings, proms, birthdays, concerts, and corporate events. Callers want to know which vehicles are available, how many people fit, and what the package costs for their date. The AI answers in your company's name, captures the event date, passenger count, and pickup details, quotes the packages you price up front, and books the reservation.",
      calls: [
        "Wedding day transportation",
        "Prom and homecoming bookings",
        "Birthdays, concerts, and nights out",
        "Corporate events and roadshows",
        "Vehicle size and passenger capacity questions",
        "Deposit and cancellation policy questions",
      ],
      quotes: "event packages by vehicle and number of hours",
      estimates: "multi-vehicle weddings and custom events",
      booking: "reservations",
      faqs: [
        {
          q: "Can the AI quote a limo package?",
          a: "Yes. Set packages by vehicle and hours, plus travel zones from your base, and the AI reads back one exact total. Custom or multi-vehicle events are captured for your team.",
        },
        {
          q: "Can it answer deposit and cancellation questions?",
          a: "Yes, from your FAQs, in your words. It never makes up policies.",
        },
      ],
    },
    "party-bus-companies": {
      hook: "Party bus groups book fast and book the company that answers. Pick up every call, quote your packages, and hold the date.",
      why: "Party bus calls come from groups planning bachelor and bachelorette parties, birthdays, brewery and winery tours, and game days. The organizer wants to know capacity, what's allowed on board, and the price for their date. The AI answers in your company's name, captures the date, group size, and plans, quotes your packages, answers policy questions from your FAQs, and books the reservation.",
      calls: [
        "Bachelor and bachelorette parties",
        "Birthday and night-out bookings",
        "Brewery, winery, and bar tours",
        "Sports games and concerts",
        "Capacity and on-board policy questions",
        "Deposit and damage policy questions",
      ],
      quotes: "party packages by bus size and number of hours",
      estimates: "multi-day and out-of-town trips",
      booking: "reservations",
      faqs: [
        {
          q: "Can the AI tell groups what's allowed on the bus?",
          a: "Yes, from your FAQs. Add your policies on drinks, music, and decorations, and the AI answers in your words.",
        },
        {
          q: "Can it quote a four-hour package?",
          a: "Yes. Set packages by bus size and hours, plus travel zones from your base, and the AI reads back one exact total.",
        },
      ],
    },
  },
  variants: {
    "last-mile-delivery": {
      title: "Last-mile delivery companies",
      body: "For last-mile delivery, the AI answers calls from retailers setting up delivery service and from recipients with questions, captures account and route details, answers standard questions from your FAQs, and texts your team.",
    },
    "black-car-services": {
      title: "Black car services",
      body: "Black car clients expect a polished, immediate answer. The AI answers in your company's name, captures the pickup, destination, and time, quotes your flat-rate trips, and books the reservation with a confirmation text.",
    },
    "airport-transportation": {
      title: "Airport transportation",
      body: "For airport shuttles and transfers, the AI captures the pickup address, flight time, and passenger count, quotes your flat airport rates with travel zones from your base, and books the ride with a reminder text.",
    },
    "wedding-transportation": {
      title: "Wedding transportation",
      body: "Wedding transportation calls come months ahead. The AI captures the wedding date, venues, and number of guests, quotes your wedding packages, and books the reservation so the date is held.",
    },
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
