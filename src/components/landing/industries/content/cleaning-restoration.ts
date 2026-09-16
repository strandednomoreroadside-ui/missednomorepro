import type { CategoryFile } from "../types";

export const cleaningRestoration: CategoryFile = {
  intro:
    "Restoration calls are emergencies, and cleaning calls are ready-to-book customers. Both are lost the moment they hit voicemail. Missed No More Pro answers every call in your company's name, texts your on-call crew about water, fire, and biohazard emergencies, quotes the cleaning packages you price by phone, and books the rest into open slots.",
  niches: {
    "water-damage-restoration": {
      hook: "Water damage gets worse by the hour, and the first restoration company to answer usually gets the job. Answer every call, day or night, and get your crew rolling.",
      why: "Water damage calls come from homeowners standing in a flooded basement, property managers with a burst pipe in a unit, and business owners who found water across the floor in the morning. Many are also asking about insurance. Speed decides who gets the job, and most of these calls happen at night and on weekends. The AI answers every one in your company's name, captures the address and what happened, and texts your on-call crew immediately.",
      calls: [
        "Burst pipes and flooded basements",
        "Water heater and appliance leaks",
        "Sewage backups and category 3 water",
        "Ceiling leaks and water coming through walls",
        "Insurance claim and adjuster questions",
        "Drying equipment check-ins from active jobs",
      ],
      quotes: "emergency service calls and water extraction visits you price up front",
      estimates: "full mitigation and rebuild work documented for the insurance claim",
      urgent: "standing water or an active leak in the home",
      booking: "inspections",
      faqs: [
        {
          q: "Does the AI answer water damage calls at 2 AM?",
          a: "Yes. It answers every call around the clock, treats active water as urgent, texts your on-call crew right away, and can text the caller a confirmation with an estimated arrival time. It can also warm-transfer the caller to your on-call manager.",
        },
        {
          q: "Can it help with insurance questions?",
          a: "It doesn't give insurance advice. It notes what the caller shares, like their carrier and whether a claim is open, in the call summary, and answers questions about your process, including whether you bill insurance directly, from the FAQs you write.",
        },
      ],
    },
    "junk-removal": {
      hook: "Junk removal customers want a price and a pickup time, fast. Answer every call, quote your load sizes exactly, and book the haul while your crew is on the road.",
      why: "Junk removal buyers are ready to act: they're cleaning out a garage, moving, or dealing with a piece of furniture that won't fit in the trash. They call to ask what you take, what it costs, and how soon you can come, and they often book the first company that answers all three. The AI answers in your company's name, quotes the load sizes and single items you price by phone, and books the pickup.",
      calls: [
        "Garage, basement, and attic cleanouts",
        "Furniture, mattress, and appliance removal",
        "Yard waste and construction debris hauling",
        "Move-out and rental property cleanouts",
        "Hot tub and shed removal requests",
        "What you take and what you don't, from your FAQ",
      ],
      quotes: "single-item pickups and load sizes like a quarter, half, or full truck",
      estimates: "large cleanouts and demolition jobs you price on site",
      booking: "pickups",
      faqs: [
        {
          q: "Can the AI quote by truckload?",
          a: "Yes. Set up your load sizes and single-item prices as services, plus travel zones, and the AI reads back an exact total for what the caller describes. If they aren't sure how much they have, it can book an on-site estimate instead.",
        },
        {
          q: "Will it tell callers what items you can't take?",
          a: "Yes, if you add that list to your FAQs. The AI answers in your words and takes the caller's number for your team if they ask about something you haven't covered.",
        },
      ],
    },
    "residential-cleaning": {
      hook: "House cleaning clients book the company that answers and gives a clear price. Answer every call, quote your cleaning packages, and fill open slots in your schedule.",
      why: "Residential cleaning calls are mostly ready-to-book: a regular biweekly clean, a deep clean before guests arrive, or a move-out clean with a deadline. Callers want to know what's included, what it costs for their home, and when you have an opening. The AI answers in your company's name, quotes the packages you price by phone, answers what's included from your FAQs, and books the clean.",
      calls: [
        "Recurring weekly and biweekly cleaning",
        "One-time deep cleans",
        "Move-in and move-out cleaning with deadlines",
        "What's included and supplies questions",
        "Existing clients rescheduling a visit",
        "Add-ons like inside the oven or fridge",
      ],
      quotes: "standard cleans, deep cleans, and move-out cleans priced by home size",
      estimates: "very large homes and post-construction cleans",
      booking: "cleanings",
      faqs: [
        {
          q: "How does the AI price a house cleaning?",
          a: "Set up your cleaning packages as services, for example a deep clean for a 3-bedroom home, plus any add-ons and travel zones. The AI matches what the caller describes to your packages and reads back one exact total. It never estimates square footage or invents a price.",
        },
        {
          q: "Can clients reschedule by phone?",
          a: "Yes. Returning clients are recognized by name, and the AI can cancel or move their booked appointment to another open time, then texts a confirmation.",
        },
      ],
    },
    "carpet-upholstery-cleaning": {
      hook: "Carpet cleaning leads want a price per room and the next available day. Answer every call, quote your packages exactly, and book the job.",
      why: "Carpet and upholstery cleaning is priced in ways customers understand, like per room, per stairway, or per piece of furniture, which makes it perfect for quoting on the first call. Customers call about pet stains, move-outs, and holiday prep, and they book whoever gives them a clear total and a time. The AI answers in your company's name, prices the packages together in one quote, and books the visit.",
      calls: [
        "Whole-home and per-room carpet cleaning",
        "Sofas, sectionals, and chair upholstery",
        "Pet stain and odor treatment",
        "Area rug cleaning questions",
        "Move-out cleaning with a deadline",
        "Stair, tile, and grout add-ons",
      ],
      quotes: "room packages, stairs, upholstery pieces, and pet treatment add-ons",
      estimates: "commercial carpet and very large jobs",
      booking: "cleanings",
      faqs: [
        {
          q: "Can the AI quote three rooms and a sofa together?",
          a: "Yes. When a caller needs more than one service, the AI prices them together in one quote so your travel fee applies once, and reads back a single exact total.",
        },
        {
          q: "Can it answer questions about drying time and pets?",
          a: "Yes, from the FAQs you write. Add your drying times, pet safety guidance, and prep instructions, and the AI answers in your words.",
        },
      ],
    },
    "air-duct-cleaning": {
      hook: "Duct cleaning customers want a real price, not a teaser. Answer every call, quote your packages exactly, and book the cleaning.",
      why: "Air duct cleaning calls come from homeowners after a renovation, new homeowners, allergy sufferers, and people who noticed dust or odors. Many have seen very low advertised prices elsewhere and want to know what the job really costs. The AI answers in your company's name, quotes your packages exactly from your rates, and books the visit.",
      calls: [
        "Whole-home air duct cleaning",
        "Dryer vent cleaning",
        "Post-renovation dust and debris",
        "Allergy and odor concerns",
        "Furnace and coil cleaning add-ons",
        "Commercial duct cleaning inquiries",
      ],
      quotes: "duct cleaning packages by system count, dryer vent cleanings, and add-ons",
      estimates: "commercial systems and unusually large homes",
      booking: "cleanings",
      faqs: [
        {
          q: "Can the AI quote duct cleaning and a dryer vent together?",
          a: "Yes. It prices both in one quote so your travel fee is charged once, and reads back a single exact total from your rates.",
        },
        {
          q: "Will it tell callers how long a cleaning takes?",
          a: "Yes, if you add it to your FAQs. You can also give each service its own appointment length so the AI only books times where the whole job fits.",
        },
      ],
    },
    "hoarding-cleanup": {
      hook: "Hoarding cleanup calls are sensitive, and callers are often family members under stress. Answer with care, capture the situation, and book a discreet walkthrough.",
      why: "Hoarding cleanup requests often come from adult children, landlords, social workers, and estate representatives, not just the person living in the home. Callers want discretion and a clear sense of the process before anyone visits. The AI answers calmly in your company's name, captures the address and who is calling, answers process questions from your FAQs, and books a private walkthrough.",
      calls: [
        "Family members arranging a cleanup",
        "Landlords and property managers after a move-out",
        "Social workers and case managers",
        "Questions about discretion and the process",
        "Biohazard concerns inside the home",
        "Estate and probate cleanouts",
      ],
      estimates: "cleanups you price after a walkthrough",
      booking: "walkthroughs",
      faqs: [
        {
          q: "How does the AI handle a sensitive hoarding call?",
          a: "It speaks calmly, never judges, captures only what the caller shares, and books a walkthrough. Callers who are upset can be warm-transferred to someone on your team.",
        },
        {
          q: "Can it explain our discretion policy?",
          a: "Yes, from your FAQs. Add how you handle privacy, unmarked vehicles, and what happens to belongings, and the AI answers in your words.",
        },
      ],
    },
    "fire-restoration": {
      hook: "After a fire, families and business owners need someone to secure the property and start cleanup fast. Answer every call, day or night, and get your crew moving.",
      why: "Fire restoration calls come in the hours after a kitchen fire, an electrical fire, or a house fire, often while the fire department is still leaving. Owners need the property boarded up, water removed, and smoke damage assessed, and they're usually starting an insurance claim at the same time. The AI answers every call calmly in your company's name, captures the address and what happened, and texts your on-call crew right away.",
      calls: [
        "Board-up and securing after a fire",
        "Smoke and soot damage cleanup",
        "Water removal after firefighting",
        "Contents cleaning and pack-out questions",
        "Insurance claim and adjuster coordination questions",
        "Kitchen and small fire cleanups",
      ],
      quotes: "emergency board-ups and service calls you price up front",
      estimates: "smoke cleaning, contents work, and rebuilds documented for the insurance claim",
      urgent: "fire or smoke damage and a property that needs to be secured",
      booking: "damage assessments",
      faqs: [
        {
          q: "Does the AI handle fire damage calls at night?",
          a: "Yes. It answers every call around the clock, treats fire damage as urgent, texts your on-call crew right away, and can warm-transfer an upset caller to someone on your team.",
        },
        {
          q: "Can it help with the insurance claim?",
          a: "It doesn't give insurance advice. It notes the caller's carrier and claim details in the call summary and answers questions about how you work with insurance from your FAQs.",
        },
      ],
    },
    "lead-asbestos-remediation": {
      hook: "Lead and asbestos calls usually come right before a renovation or sale. Answer every one, capture the project, and book the inspection.",
      why: "Lead and asbestos remediation leads come from homeowners who found suspect materials during a remodel, contractors who need testing before demolition, and buyers or landlords with a report in hand. Callers want to know what testing involves and how quickly you can come out. The AI answers in your company's name, captures the property and project, answers process questions from your FAQs, and books the inspection.",
      calls: [
        "Asbestos testing before renovation or demolition",
        "Lead paint inspections for older homes",
        "Popcorn ceiling and flooring material testing",
        "Abatement and removal projects",
        "Landlord and property manager compliance questions",
        "Contractors scheduling pre-demolition surveys",
      ],
      quotes: "inspections and sample testing visits",
      estimates: "abatement and removal projects",
      booking: "inspections",
      faqs: [
        {
          q: "Will the AI tell callers whether a material is dangerous?",
          a: "No. It never gives health or safety conclusions. It answers only from the guidance you approve in your FAQs and books an inspection with your certified team.",
        },
        {
          q: "Can contractors schedule testing before a job?",
          a: "Yes. The AI captures the property, the contractor's company, and their timeline, quotes your inspection fee, and books the earliest open time.",
        },
      ],
    },
    "radon-mitigation": {
      hook: "Radon calls follow a home inspection or a test kit result. Answer every one, quote your testing, and book the mitigation estimate.",
      why: "Radon testing and mitigation companies hear from buyers whose home inspection flagged radon, sellers who need a test before listing, and homeowners with a high test kit reading. Many are working against a closing date. The AI answers in your company's name, quotes your radon tests, captures the result the caller mentions, answers questions from your FAQs, and books the test or mitigation visit.",
      calls: [
        "Radon tests for home sales",
        "High readings from home test kits",
        "Mitigation system installs",
        "Retesting after mitigation",
        "Fan replacements and system service",
        "Real estate agents coordinating tests",
      ],
      quotes: "radon tests, retests, and fan replacements",
      estimates: "new mitigation systems",
      booking: "tests and site visits",
      faqs: [
        {
          q: "Will the AI interpret a radon test result?",
          a: "No. It notes the result the caller shares in the call summary and answers from the guidance you've approved in your FAQs, then books a visit with your team.",
        },
        {
          q: "Can it schedule a test before closing?",
          a: "Yes. It captures the property address and the closing date the caller mentions, quotes your test, and books the earliest open time.",
        },
      ],
    },
    "commercial-hood-cleaning": {
      hook: "Restaurants need hood cleanings on schedule and after a failed inspection. Answer every call and keep kitchens compliant.",
      why: "Commercial kitchen exhaust cleaning calls come from restaurant owners and managers who need a scheduled cleaning, a certificate for the fire marshal, or a fast visit after an inspection. Cleanings often happen overnight after service, and managers call between rushes. The AI answers in your company's name, captures the restaurant and system details, quotes cleanings you price by phone, and books the visit.",
      calls: [
        "Scheduled kitchen exhaust hood cleanings",
        "Cleanings needed after a fire inspection",
        "Certificate and service sticker questions",
        "Exhaust fan and duct access issues",
        "New restaurant accounts and multi-location groups",
        "Grease buildup and odor concerns",
      ],
      quotes: "hood cleanings by system size and fan service calls",
      estimates: "large kitchens and multi-location accounts",
      booking: "cleanings",
      faqs: [
        {
          q: "Can the AI book overnight cleanings?",
          a: "It books into the hours you set as available on your calendar, so if you clean overnight, set those hours and the AI offers only those times.",
        },
        {
          q: "Does it recognize repeat restaurant accounts?",
          a: "Yes. Returning callers are matched to their record in the CRM and greeted by name, and every cleaning request is logged with a transcript.",
        },
      ],
    },
    "mold-remediation": {
      hook: "Mold calls come from worried homeowners, buyers with an inspection report, and landlords. Answer every one, capture the situation, and book the inspection.",
      why: "Mold remediation leads start with a musty smell, visible growth after a leak, or a home inspection that flagged mold before closing. Callers are often anxious and have questions about testing, health, and cost. The AI answers calmly in your company's name, captures what the caller is seeing, answers process questions from your FAQs, and books the inspection without giving health advice.",
      calls: [
        "Visible mold after leaks or flooding",
        "Musty smells in basements and attics",
        "Mold flagged in a home inspection",
        "Landlords and tenants with mold concerns",
        "Air testing and post-remediation clearance",
        "Crawlspace and attic mold",
      ],
      quotes: "mold inspections and air testing visits",
      estimates: "remediation projects you price after the inspection",
      booking: "inspections",
      faqs: [
        {
          q: "Will the AI tell callers whether mold is dangerous?",
          a: "No. It never gives health advice. It answers only from the guidance you approve in your FAQs and books an inspection with your team.",
        },
        {
          q: "Can it book an inspection before a home closing?",
          a: "Yes. It captures the property address and the closing date the caller mentions, quotes your inspection, and books the earliest open time.",
        },
      ],
    },
    "biohazard-cleanup": {
      hook: "Biohazard cleanup calls come at the hardest moments. Answer with care, day or night, and get your team there quickly and discreetly.",
      why: "Biohazard cleanup companies are called after unattended deaths, traumatic incidents, and other situations families, property managers, and police need handled quickly and discreetly. Callers are often in shock and need a calm voice and a clear next step. The AI answers every call gently in your company's name, captures the address and the essentials, treats the call as urgent, and can warm-transfer the caller to your on-call team.",
      calls: [
        "Unattended death and decomposition cleanup",
        "Trauma and accident scene cleanup",
        "Calls from families, landlords, and police",
        "Hoarding and sharps cleanup",
        "Insurance and payment questions",
        "Discretion and unmarked vehicle questions",
      ],
      estimates: "cleanups you assess on site",
      urgent: "a biohazard scene that needs to be cleaned",
      booking: "assessments",
      faqs: [
        {
          q: "How does the AI handle such sensitive calls?",
          a: "It speaks gently, asks only for what your team needs, never pushes, and can warm-transfer the caller to your on-call person. It texts your team right away and logs the call privately in your CRM.",
        },
        {
          q: "Can it explain how payment and insurance work?",
          a: "It answers from the FAQs you write, like whether insurance may cover the cleanup, in your words. It never makes promises about coverage.",
        },
      ],
    },
    "commercial-cleaning": {
      hook: "Commercial cleaning contracts start with one phone call. Answer every inquiry, capture the facility, and book the walkthrough.",
      why: "Commercial cleaning companies hear from office managers, property managers, medical and daycare facilities, and retail owners looking for a new cleaning service, often because their current one isn't working out. They want to know your schedule options, what's included, and how soon you can start. The AI answers in your company's name, captures the facility type and size the caller describes, answers questions from your FAQs, and books the walkthrough.",
      calls: [
        "Office and building cleaning contracts",
        "Nightly, weekly, and after-hours schedules",
        "Retail, gym, and facility cleaning",
        "Post-construction cleaning",
        "Floor care, carpet, and window add-ons",
        "Existing clients with service requests",
      ],
      estimates: "cleaning contracts you price after a walkthrough",
      booking: "walkthroughs",
      faqs: [
        {
          q: "Can the AI qualify a commercial cleaning lead?",
          a: "It captures the facility type, approximate size, cleaning frequency, and start date the caller mentions in the call summary, and books a walkthrough into an open slot.",
        },
        {
          q: "Can existing clients report an issue?",
          a: "Yes. Returning clients are recognized by name, and the AI takes their request and texts your team, logging it in the CRM with a transcript.",
        },
      ],
    },
    "window-cleaning": {
      hook: "Window cleaning customers want a price and a date before spring or the holidays. Answer every call, quote your packages, and book the job.",
      why: "Window cleaning calls come from homeowners who want spring or pre-holiday cleanings, storefront businesses on a regular route, and property managers. Residential jobs are easy to price by home size or window count and book on the first call. The AI answers in your company's name, quotes your packages, and books the cleaning.",
      calls: [
        "Interior and exterior window cleaning",
        "Screen and track cleaning add-ons",
        "Storefront window routes",
        "Hard water stain removal",
        "Post-construction window cleaning",
        "Gutter and pressure washing add-ons",
      ],
      quotes: "window cleaning packages by home size, screens, and tracks",
      estimates: "multi-story commercial buildings",
      booking: "cleanings",
      faqs: [
        {
          q: "Can the AI quote inside and outside window cleaning?",
          a: "Yes. Set up packages for exterior only or inside and out, by home size, and the AI reads back one exact total including any add-ons.",
        },
        {
          q: "Can storefront customers get on a regular route?",
          a: "The AI captures the business and how often they want service and books the first cleaning. Your team sets up the ongoing schedule.",
        },
      ],
    },
    "home-organizing": {
      hook: "Organizing clients call when they're overwhelmed. Answer every call warmly, explain how you work, and book the consultation.",
      why: "Professional organizers hear from people preparing for a move, parents drowning in kids' stuff, downsizers, and busy professionals who want a garage, pantry, or closet finally under control. Callers want to know how sessions work and what it costs. The AI answers in your business's name, answers process questions from your FAQs, quotes session packages you price up front, and books the consultation.",
      calls: [
        "Closet, pantry, and garage organizing",
        "Move-in unpacking and move-out packing",
        "Downsizing and decluttering sessions",
        "Home office and paperwork organizing",
        "Questions about how sessions work",
        "Donation drop-off and haul-away questions",
      ],
      quotes: "single-room and closet organizing sessions",
      estimates: "whole-home and move projects",
      booking: "consultations",
      faqs: [
        {
          q: "Can the AI explain how our sessions work?",
          a: "Yes, from your FAQs. Add how sessions run, what clients should prepare, and whether you haul donations, and the AI answers in your words.",
        },
        {
          q: "Can it quote a closet organizing session?",
          a: "Yes, for sessions you price up front, with travel zones added. Bigger projects are captured for a consultation.",
        },
      ],
    },
  },
  variants: {
    "crime-scene-cleanup": {
      title: "Crime scene cleanup",
      body: "Crime scene cleanup calls often come from families, landlords, and law enforcement. The AI answers gently, captures the address and who is calling, treats the call as urgent, texts your on-call team, and can warm-transfer the caller to a person right away.",
    },
    "janitorial": {
      title: "Janitorial companies",
      body: "For janitorial services, the AI captures the building, the schedule the client needs, and the services they want, answers staffing and insurance questions from your FAQs, and books the walkthrough.",
    },
    "office-cleaning": {
      title: "Office cleaning companies",
      body: "Office managers looking for cleaning usually want after-hours service on a set schedule. The AI captures the office size and schedule they describe, answers what's included from your FAQs, and books a walkthrough.",
    },
    "dryer-vent-cleaning": {
      title: "Dryer vent cleaning",
      body: "Dryer vent cleaning is often booked on its own when a dryer takes too long or runs hot. The AI quotes your dryer vent cleaning exactly, gives any safety guidance you've approved in your FAQs, and books the visit, or prices it together with a duct cleaning in one total.",
    },
    "flood-cleanup": {
      title: "Flood cleanup",
      body: "After heavy rain or a river flood, the AI answers the surge of calls in your company's name, captures each address and how much water there is, texts your crew about homes with standing water, and logs every caller in the CRM so nobody gets lost while your team works through the list.",
    },
    "cleaning-restoration-franchises": {
      title: "Cleaning and restoration franchise owners",
      body: "If you own a restoration or cleaning franchise territory, set up your location as its own business with its own number, service radius, and rates. The AI answers in your location's name, quotes your territory's prices, and texts your on-call crew, while every call is logged in your CRM.",
    },
    "estate-cleanout": {
      title: "Estate cleanouts",
      body: "Estate cleanout calls often come from family members or estate attorneys handling a difficult time. The AI answers calmly in your company's name, captures the property address and what needs to be cleared, answers questions about donations and valuables from your FAQs, and books the walkthrough.",
    },
  },
};
