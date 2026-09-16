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
  },
  variants: {
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
