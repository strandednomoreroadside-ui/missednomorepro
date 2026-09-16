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
    "mobile-mechanics": {
      hook: "Drivers with a car that won't start want a mechanic who comes to them. Answer every call, capture the vehicle and location, and get your tech rolling.",
      why: "Mobile mechanic calls come from drivers stuck in a driveway or parking lot with a dead battery, a no-start, or brakes grinding, plus people who'd rather have routine maintenance done at home or work. They want to know if you can come today and what it will cost. The AI answers in your company's name, captures the year, make, and model and the problem, quotes your service calls, and texts your tech when a car is stranded.",
      calls: [
        "Cars that won't start and dead batteries",
        "Brake pads, rotors, and grinding noises",
        "Oil changes at home or at work",
        "Check engine light diagnostics",
        "Starter, alternator, and belt replacements",
        "Pre-purchase inspections on used cars",
      ],
      quotes: "diagnostic visits, battery installs with the battery added on top, and oil changes",
      estimates: "repairs that depend on a diagnosis or parts pricing",
      urgent: "a car that won't start",
      booking: "service visits",
      faqs: [
        {
          q: "Does the AI capture the vehicle details?",
          a: "Yes. It asks for the year, make, and model along with the problem and the location, and if the caller can't give an exact address, it asks for cross streets or a landmark and reads it back.",
        },
        {
          q: "Can it quote a battery replacement?",
          a: "It quotes your installation price with your travel zones and tells the caller the battery itself is added on top, so they hear an honest total without a made-up part price.",
        },
      ],
    },
    "mobile-tire-services": {
      hook: "A flat on the road is a call you want to win. Answer every one, capture the tire and location, quote your service, and get a truck moving.",
      why: "Mobile tire services get calls from drivers with a flat on the shoulder or in a parking lot, people who want new tires installed at home, and fleets that need tires swapped on site. Drivers on the road often don't know the exact address. The AI answers in your company's name, captures the vehicle and location, quotes repairs and installs from your rates, and texts your tech about stranded drivers.",
      calls: [
        "Flat tires on the road or in a parking lot",
        "Tire repairs and plug patches",
        "New tire installs at home or at work",
        "Seasonal tire swaps",
        "Fleet and commercial tire service",
        "TPMS light and pressure questions",
      ],
      quotes: "flat repairs, tire changes, and installs with the tires added on top",
      estimates: "fleet and multi-vehicle jobs",
      urgent: "a flat tire on the road",
      booking: "installs and swaps",
      faqs: [
        {
          q: "What if the driver doesn't know where they are?",
          a: "The AI asks for the nearest cross streets, exit, mile marker, or a nearby business, reads back what it understood, and captures the vehicle before texting your tech.",
        },
        {
          q: "Does it know what tires we have in stock?",
          a: "No. It doesn't connect to inventory. It captures the tire size the caller shares and quotes your install price with the tires added on top, and your team confirms availability.",
        },
      ],
    },
    "windshield-repair-replacement": {
      hook: "Windshield customers want to know the price and when you can come. Answer every call, capture the vehicle, and book the chip repair or replacement.",
      why: "Windshield calls come from drivers with a chip that's starting to spread, a crack across the glass, or a broken side window after a break-in. Many ask whether insurance covers it and whether you can come to their home or work. The AI answers in your company's name, captures the year, make, and model and the damage, quotes the services you price by phone, and books the appointment.",
      calls: [
        "Rock chips and small crack repairs",
        "Full windshield replacements",
        "Broken side and back windows",
        "Mobile service at home or work",
        "Insurance and glass coverage questions",
        "Fleet and commercial vehicle glass",
      ],
      quotes: "chip repairs and windshield replacements with the glass added on top",
      estimates: "specialty glass and calibration questions for your team",
      booking: "repairs and replacements",
      faqs: [
        {
          q: "Can the AI tell callers whether insurance covers it?",
          a: "It doesn't give insurance advice. It answers questions about how you work with insurance from your FAQs and notes the caller's carrier in the call summary.",
        },
        {
          q: "Does it capture the vehicle details?",
          a: "Yes. It asks for the year, make, and model along with the damage, which lands in the call summary for your tech.",
        },
      ],
    },
    "auto-detailing": {
      hook: "Detailing customers book the shop that answers and gives a clear price. Pick up every call, quote your packages by vehicle size, and fill your calendar.",
      why: "Auto detailing calls are ready to book: an interior deep clean, a full detail before selling a car, ceramic coating, or a monthly maintenance wash. Customers want to know package prices for their vehicle and your next opening. The AI answers in your company's name, captures the vehicle, quotes your packages exactly, and books the detail.",
      calls: [
        "Interior and exterior detail packages",
        "Full details before selling a car",
        "Ceramic coating and paint correction",
        "Pet hair and odor removal",
        "Maintenance washes for repeat clients",
        "Fleet and dealership detailing",
      ],
      quotes: "detail packages by vehicle size and add-ons like pet hair removal",
      estimates: "paint correction and ceramic coating jobs you inspect first",
      booking: "details",
      faqs: [
        {
          q: "Can the AI quote by vehicle size?",
          a: "Yes. Set up packages by vehicle size, like a sedan or an SUV, and the AI matches what the caller drives to your prices and reads back one exact total.",
        },
        {
          q: "Can it give each package the right amount of time?",
          a: "Yes. Give each service its own appointment length, and the AI only offers times where the whole detail fits.",
        },
      ],
    },
    "commercial-truck-repair": {
      hook: "When a truck is down, the load is late. Answer every call, capture the unit and problem, and book it into the shop.",
      why: "Commercial truck shops hear from owner-operators, fleet managers, and dispatchers who need a truck or trailer back on the road. They want to know how soon you can take the unit and whether you work on their make. The AI answers in your shop's name, captures the unit's year, make, and model and the problem, answers questions from your FAQs, and books the appointment.",
      calls: [
        "Trucks with engine, brake, or electrical problems",
        "DOT inspections and preventive maintenance",
        "Trailer repairs and inspections",
        "Fleet accounts scheduling units",
        "Dispatchers asking when a unit will be ready",
        "Parts and warranty questions",
      ],
      estimates: "repairs that depend on a diagnosis",
      booking: "shop appointments",
      faqs: [
        {
          q: "Does the AI capture truck details?",
          a: "Yes. It asks for the unit's year, make, and model along with the problem, and it never asks for a street address since the truck is coming to your shop.",
        },
        {
          q: "Can it tell a dispatcher when a truck will be ready?",
          a: "It doesn't connect to your shop system, so it takes the dispatcher's name and number and texts your team to call back.",
        },
      ],
    },
    "fleet-maintenance": {
      hook: "Fleet managers need vehicles serviced without losing a workday. Answer every call, capture the units, and schedule on-site maintenance.",
      why: "Fleet maintenance providers work with contractors, delivery companies, and municipalities that need preventive maintenance done where the vehicles park, plus quick response when a vehicle goes down. Fleet managers call to schedule batches of units and to report breakdowns. The AI answers in your company's name, captures the vehicles and location, texts your tech about down vehicles, and books on-site service.",
      calls: [
        "On-site preventive maintenance for fleets",
        "Down vehicles blocking a route",
        "Oil changes and inspections for multiple units",
        "DOT and annual inspection scheduling",
        "New fleet account inquiries",
        "Fleet managers checking on service history",
      ],
      quotes: "per-vehicle preventive maintenance visits and mobile service calls",
      estimates: "fleet-wide service agreements",
      urgent: "a fleet vehicle down and off the road",
      booking: "on-site service days",
      faqs: [
        {
          q: "Can the AI handle calls from fleet managers?",
          a: "Yes. It captures the company, the vehicles, and the location, recognizes returning accounts in the CRM, and books on-site service into open slots on your calendar.",
        },
        {
          q: "How does it handle a vehicle that's down?",
          a: "It treats the call as urgent, texts your on-call tech right away, and can text the fleet manager a confirmation with an estimated arrival time.",
        },
      ],
    },
    "rv-repair": {
      hook: "RV owners need repairs where the RV is parked. Answer every call, capture the rig and location, and book the mobile service visit.",
      why: "RV repair calls come from owners with slide-outs that won't move, roof leaks, generators and appliances that quit, and campers stuck at a campground mid-trip. Mobile RV techs are usually on another site when the phone rings. The AI answers in your company's name, captures the RV's year, make, and model and where it's parked, quotes your service calls, and books the visit or flags an urgent breakdown.",
      calls: [
        "Slide-outs, awnings, and jacks not working",
        "Roof leaks and water damage",
        "Generators, furnaces, and AC units",
        "Pre-trip and winterization service",
        "Campers broken down at a campground",
        "Warranty and extended service contract questions",
      ],
      quotes: "mobile service calls, inspections, and winterizations",
      estimates: "roof replacements and major repairs",
      urgent: "an RV breakdown in the middle of a trip",
      booking: "service visits",
      faqs: [
        {
          q: "Can the AI find the RV at a campground?",
          a: "It captures the campground name, site number, or nearest landmark the caller gives, reads it back, and checks it against your service radius before booking.",
        },
        {
          q: "Can it quote a winterization?",
          a: "Yes. Set your winterization price with travel zones, and the AI reads back one exact total and books the visit.",
        },
      ],
    },
    "heavy-equipment-repair": {
      hook: "A machine down on a job site stops the whole crew. Answer every call, capture the equipment and site, and get your field tech moving.",
      why: "Heavy equipment repair calls come from contractors, farms, and quarries with an excavator, loader, dozer, or tractor that quit on site. Every hour of downtime costs them, so they call whoever answers first. The AI answers in your company's name, captures the machine's make and model, the problem, and the site location, texts your on-call field tech, and books scheduled service.",
      calls: [
        "Excavators, loaders, and dozers down on site",
        "Hydraulic leaks and failures",
        "Engine and electrical problems",
        "Preventive maintenance on equipment fleets",
        "Farm equipment and tractor repairs",
        "Undercarriage and track work inquiries",
      ],
      quotes: "field service calls and preventive maintenance visits",
      estimates: "major component repairs and rebuilds",
      urgent: "a machine down on a job site",
      booking: "service visits",
      faqs: [
        {
          q: "What if the job site doesn't have an address?",
          a: "The AI asks for the nearest cross streets, road, or landmark, reads back what it understood, and captures the machine details before texting your field tech.",
        },
        {
          q: "Can it quote a field service call?",
          a: "Yes. Set your field service call rate with travel zones by driving distance and an after-hours fee, and the AI reads back one exact total.",
        },
      ],
    },
    "auto-body-collision": {
      hook: "After an accident, drivers call body shops looking for someone who answers and explains the process. Pick up every call and book the estimate.",
      why: "Collision shop calls come from drivers right after an accident, often shaken and unsure how insurance works, plus people with hail damage, scratches, or dents. They want to know whether you work with their insurance, how estimates work, and how long repairs take. The AI answers in your shop's name, captures the vehicle and damage, answers process questions from your FAQs, and books the estimate appointment.",
      calls: [
        "Collision damage estimates after an accident",
        "Insurance claim and direct repair questions",
        "Hail damage and dent repairs",
        "Bumper, scratch, and paint repairs",
        "Rental car and repair timeline questions",
        "Customers checking on repair status",
      ],
      estimates: "collision repairs you price after inspecting the damage",
      booking: "estimate appointments",
      faqs: [
        {
          q: "Can the AI answer insurance questions?",
          a: "It answers questions about how your shop works with insurance from your FAQs, like whether you're a direct repair shop for certain carriers, and notes the caller's carrier in the call summary. It doesn't give coverage advice.",
        },
        {
          q: "Can drivers send photos of the damage?",
          a: "Yes. Photos texted to your Missed No More Pro number are saved to the customer's record in the CRM next to the call summary.",
        },
      ],
    },
    "paintless-dent-repair": {
      hook: "Dent and hail repair customers want a quick price and an appointment. Answer every call, capture the vehicle and damage, and book it.",
      why: "Paintless dent repair calls come from drivers with door dings, a dent from a shopping cart, or hail damage after a storm, plus dealerships that need reconditioning. After a hailstorm, calls spike for weeks. The AI answers in your company's name, captures the vehicle and the damage the caller describes, quotes the dent services you price by phone, and books the appointment.",
      calls: [
        "Door dings and small dents",
        "Hail damage repairs after storms",
        "Crease and larger dent questions",
        "Dealership and fleet reconditioning",
        "Insurance hail claim questions",
        "Mobile service at home or work",
      ],
      quotes: "small dent repairs you price per dent",
      estimates: "hail damage and larger dents you assess in person",
      booking: "appointments",
      faqs: [
        {
          q: "Can the AI quote hail damage?",
          a: "Hail repairs depend on the count and size of dents, so the AI captures the vehicle and books an assessment. It quotes only services you've priced, like a single small dent.",
        },
        {
          q: "Can customers text photos of the dent?",
          a: "Yes. Photos texted to your Missed No More Pro number are saved to the customer's record in the CRM so you can review them before the appointment.",
        },
      ],
    },
    "motorcycle-repair": {
      hook: "Riding season doesn't wait. Answer every call, capture the bike and the problem, and book the service before riders go elsewhere.",
      why: "Motorcycle shops get a rush of calls every spring for tune-ups, tires, and bikes that won't start after winter, plus accident repairs and custom work all season. Riders want to know how soon you can take their bike and whether you work on their make. The AI answers in your shop's name, captures the bike's year, make, and model and the problem, answers questions from your FAQs, and books the drop-off.",
      calls: [
        "Spring tune-ups and bikes that won't start",
        "Tire replacements and brake service",
        "Carburetor and fuel system problems",
        "Accident and insurance repairs",
        "Performance parts and custom work",
        "Winter storage and battery tender questions",
      ],
      estimates: "repairs that depend on a diagnosis",
      booking: "service appointments",
      faqs: [
        {
          q: "Does the AI ask which bike it is?",
          a: "Yes. It captures the year, make, and model along with the problem, and it never asks for a street address since the rider brings the bike to your shop.",
        },
        {
          q: "Can it tell riders whether we work on their brand?",
          a: "Yes, if you list the makes you service in your FAQs. The AI answers from that list and takes a message for anything you haven't covered.",
        },
      ],
    },
    "boat-repair-marine": {
      hook: "Boat owners want their time on the water, not on hold. Answer every call, capture the boat and where it's docked, and book the service.",
      why: "Marine mechanics hear from boat owners with engines that won't start, spring commissioning and fall winterization requests, and outboard and inboard repairs. Many boats are at a marina, a dock, or on a trailer in a driveway. The AI answers in your company's name, captures the boat's year, make, and model and its location, quotes your seasonal services, and books the visit.",
      calls: [
        "Engines that won't start or run rough",
        "Spring commissioning and de-winterization",
        "Fall winterization and shrink wrap",
        "Outboard and inboard repairs",
        "Trailer and electrical problems",
        "Boats at marinas, docks, and driveways",
      ],
      quotes: "winterizations, commissioning, shrink wrap, and mobile service calls",
      estimates: "engine rebuilds and major repairs",
      urgent: "a boat that won't start at the dock",
      booking: "service visits",
      faqs: [
        {
          q: "Can the AI find a boat at a marina?",
          a: "It captures the marina name, slip number, or nearest landmark the caller gives, reads it back, and checks the location against your service radius.",
        },
        {
          q: "Can it quote a winterization?",
          a: "Yes. Set your winterization and shrink wrap prices with travel zones, and the AI reads back one exact total and books the visit.",
        },
      ],
    },
  },
  variants: {
    "mobile-battery-replacement": {
      title: "Mobile battery replacement",
      body: "For mobile battery replacement, the AI treats a car that won't start as urgent, captures the vehicle and location, quotes your installation fee with the battery added on top, and texts your tech so the driver gets moving again.",
    },
    "mobile-windshield-replacement": {
      title: "Mobile windshield replacement",
      body: "For mobile windshield service, the AI captures where the vehicle will be, at home, work, or a parking lot, checks it against your service radius, quotes your replacement with the glass added on top, and books the appointment for the time the job takes.",
    },
    "mobile-detailing": {
      title: "Mobile detailing",
      body: "For mobile detailers who come to the customer, the AI captures the service address and the vehicle, checks the address against your service radius, quotes your packages with your travel zones, and books the detail.",
    },
    "mobile-car-wash": {
      title: "Mobile car wash",
      body: "Mobile car wash customers want a quick price and a time. The AI quotes your wash packages by vehicle size with your travel zones, books the wash, and texts a reminder, including for repeat customers on a regular schedule.",
    },
    "trailer-repair": {
      title: "Trailer repair",
      body: "Trailer repair calls cover lights, brakes, bearings, axles, and inspections for utility, cargo, and semi trailers. The AI captures the trailer details and the problem and books it into the shop.",
    },
    "tire-shops": {
      title: "Tire shops",
      body: "Tire shop callers want to know if you have their size and how soon they can come in. The AI captures the vehicle and tire details the caller shares, answers questions about brands and services from your FAQs, and books the install or repair appointment. It doesn't check your tire inventory, so stock questions are taken as a message for your team.",
    },
  },
};
