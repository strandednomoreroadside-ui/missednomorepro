import type { CategoryFile } from "../types";

export const emergencyHomeServices: CategoryFile = {
  intro:
    "When someone is locked out, has a car stuck behind a broken garage door, or finds an animal in the attic, they call until somebody answers. Missed No More Pro picks up every one of those calls in your company's name, gives an exact total from your rates, texts your on-call tech when it can't wait, and books everything else.",
  niches: {
    "pest-control": {
      hook: "Homeowners who spot roaches, ants, or mice want someone out this week. Answer every call, quote your treatments from your own rates, and book the visit before they call a competitor.",
      why: "Pest control calls usually start with something unpleasant the caller just saw: ants in the kitchen, droppings in the pantry, wasps by the front door. They want to know what you treat, what it costs, and how soon someone can come. Many are also good candidates for recurring service. The AI answers every call in your company's name, quotes the services you price by phone, and books the first treatment into an open slot.",
      calls: [
        "Ants, roaches, spiders, and other general pest calls",
        "Mice and rat activity inside the home",
        "Wasp, hornet, and stinging insect nests",
        "Recurring quarterly or monthly service sign-ups",
        "Questions about pet and child safety from your FAQ",
        "Existing customers rescheduling their next service",
      ],
      quotes: "one-time treatments, initial service visits, recurring service visits, and inspections",
      estimates: "larger infestations and commercial accounts that need an inspection first",
      booking: "treatments and inspections",
      faqs: [
        {
          q: "Can the AI quote pest control treatments?",
          a: "Yes, for services you price up front, like a one-time treatment, an initial visit, or a recurring service visit, with travel zones and after-hours fees from your rules. The AI reads back one exact total and never guesses. Anything that needs an inspection first is captured for your team.",
        },
        {
          q: "Can it answer safety questions about pets and kids?",
          a: "It answers from the FAQs you write, word for word. Add your guidance about products, re-entry times, and pets, and callers hear your approved answer. If a question isn't covered, the AI takes their number for your team instead of improvising.",
        },
      ],
    },
    "wildlife-removal": {
      hook: "A bat in the bedroom or a raccoon in the attic can't wait for a callback. Answer every call, get urgent removals to your on-call tech, and book inspections and exclusion work.",
      why: "Wildlife calls are often panicked and often after dark: something is scratching in the walls, a bat is flying around the living room, or a snake is in the garage. Other callers want an inspection and exclusion work to keep animals out for good. The AI answers every one calmly in your company's name, captures the address and what the caller is seeing, and treats an animal inside the living space as urgent.",
      calls: [
        "Bats, squirrels, or raccoons inside the home",
        "Scratching and noises in the attic or walls",
        "Snakes in the garage or house",
        "Animals under decks, sheds, and porches",
        "Exclusion, sealing, and prevention work",
        "Dead animal removal requests",
      ],
      quotes: "inspections, trap setups, and removal service calls",
      estimates: "exclusion and repair work you price after an inspection",
      urgent: "a wild animal loose inside the living space",
      booking: "inspections",
      faqs: [
        {
          q: "What does the AI do when an animal is inside the house?",
          a: "It treats the call as urgent: it takes the address and callback number, texts your on-call tech right away, and can text the caller a confirmation with an estimated arrival time. If you've added safety guidance to your FAQs, like keeping pets and children out of the room, the AI gives your wording.",
        },
        {
          q: "Can it quote exclusion work?",
          a: "Exclusion usually depends on what an inspection finds, so the AI books the inspection and captures what the caller describes. It quotes only services you've priced, like an inspection or a trap setup.",
        },
      ],
    },
    "bed-bug-exterminators": {
      hook: "Bed bug callers are stressed and want answers now. Answer every call discreetly, explain your process from your FAQs, and book the inspection.",
      why: "People who find bed bugs call right away, often late at night after finding bites or seeing a bug on the mattress. They have lots of questions about preparation, treatment options, and whether they can stay in the home, and many want the call handled discreetly. The AI answers in your company's name, answers those questions from your FAQs in your words, and books the inspection without making the caller wait for a callback.",
      calls: [
        "New bed bug sightings and bite concerns",
        "Inspection requests for homes and apartments",
        "Heat and chemical treatment questions",
        "Preparation checklist and re-entry questions",
        "Landlords and property managers reporting units",
        "Follow-up visit scheduling after treatment",
      ],
      quotes: "bed bug inspections and follow-up visits",
      estimates: "whole-home heat or chemical treatments that depend on what the inspection finds",
      booking: "inspections",
      faqs: [
        {
          q: "Can the AI explain how to prepare for a bed bug treatment?",
          a: "Yes, if you add your preparation instructions to your FAQs. The AI answers with your exact wording. For anything you haven't covered, it takes the caller's number so your team can follow up.",
        },
        {
          q: "Will it quote a full treatment over the phone?",
          a: "Only if you've set a price for it. Most bed bug companies price treatment after an inspection, so the AI books the inspection and captures the details the caller shares. It never guesses at a price.",
        },
      ],
    },
    "emergency-board-up": {
      hook: "After a break-in, fire, or storm, a broken window or door needs to be secured tonight. Answer every call and get your crew moving right away.",
      why: "Board-up calls come at the worst moments: a burglary, a car through a storefront, a fire, or storm damage in the middle of the night. Callers include homeowners, business owners, police, and insurance adjusters, and every one wants to know how fast you can get there. The AI answers around the clock in your company's name, captures the address and what's broken, and texts your on-call crew immediately.",
      calls: [
        "Broken windows and doors after break-ins",
        "Storefronts damaged by vehicles or vandalism",
        "Fire and storm damage that needs to be secured",
        "Calls from police, adjusters, and property managers",
        "Roof tarping requests after storm damage",
        "Follow-up glass and door replacement inquiries",
      ],
      quotes: "window and door board-ups and emergency securing service calls",
      estimates: "permanent glass, door, and structural repairs",
      urgent: "a broken window or door that needs to be secured tonight",
      booking: "follow-up repair visits",
      faqs: [
        {
          q: "Does the AI answer board-up calls in the middle of the night?",
          a: "Yes. It answers every call, 24/7, treats an unsecured property as urgent, texts your on-call crew right away, and can text the caller a confirmation with an estimated arrival time.",
        },
        {
          q: "Can it handle calls from insurance adjusters and property managers?",
          a: "Yes. It captures who is calling, the property address, and what needs to be secured, and logs everything in the CRM with a transcript. Returning callers are greeted by name, so repeat accounts are recognized.",
        },
      ],
    },
    "storm-damage-contractors": {
      hook: "After a storm, every damaged home in town calls at once. Answer all of them, get urgent water intrusion to your crew, and book the inspections that turn into jobs.",
      why: "Storm damage work is a surge business. After high winds, hail, or a fallen tree, calls pour in from homeowners with water coming inside, missing shingles, or siding torn off, and many are also sorting out an insurance claim. The businesses that answer first get the inspections. The AI answers every call in your company's name, captures the address and damage, flags active leaks as urgent, and books inspections into open slots.",
      calls: [
        "Roof, siding, and window damage after wind or hail",
        "Active leaks and water coming inside after a storm",
        "Trees or limbs that damaged the home",
        "Insurance claim and adjuster meeting questions",
        "Emergency tarping and temporary repairs",
        "Inspection requests from neighbors in the same area",
      ],
      quotes: "damage inspections, emergency tarping, and temporary repair service calls",
      estimates: "roof, siding, and structural repairs tied to an insurance claim",
      urgent: "storm damage letting water into the home",
      booking: "damage inspections",
      faqs: [
        {
          q: "Can the AI keep up with calls after a big storm?",
          a: "It answers every call in your company's name instead of letting them roll to voicemail, captures the address and damage, texts your team about active leaks, and books inspections into open calendar slots, all logged in the CRM.",
        },
        {
          q: "Does it help with insurance claims?",
          a: "It doesn't give insurance advice. It notes what the homeowner shares, like their carrier or whether they've filed a claim, in the call summary, and answers claim-process questions from the FAQs you write.",
        },
      ],
    },
    "termite-control": {
      hook: "Termite calls come from worried homeowners and from buyers racing a closing date. Answer every call and book the inspection before they call someone else.",
      why: "Termite companies get calls from homeowners who found swarmers or damaged wood, plus real estate agents and buyers who need a wood-destroying insect inspection before closing. Both groups want an inspection quickly. The AI answers in your company's name, captures the address and what the caller found, answers treatment questions from your FAQs, and books the inspection.",
      calls: [
        "Termite swarmers and wood damage sightings",
        "Real estate termite inspections before closing",
        "Treatment options and warranty questions",
        "Annual inspection and bond renewal visits",
        "Carpenter ant and other wood pest calls",
        "Existing customers with retreatment questions",
      ],
      quotes: "termite inspections and real estate inspection letters",
      estimates: "treatment plans that depend on what the inspection finds",
      booking: "inspections",
      faqs: [
        {
          q: "Can the AI book real estate termite inspections?",
          a: "Yes. It captures the property address and the closing date the caller mentions, quotes your inspection fee if you've set one, and books the earliest open time on your calendar.",
        },
        {
          q: "Will it quote a termite treatment?",
          a: "Treatments usually depend on the inspection, so the AI books the inspection and captures what the caller describes instead of guessing a price.",
        },
      ],
    },
    "security-alarm-installers": {
      hook: "Security leads call after a break-in nearby, and existing customers call when an alarm acts up. Answer every call, book consultations, and get urgent service to your tech.",
      why: "Security and alarm companies hear from new customers who want cameras or an alarm system, often right after a break-in, and from existing customers whose system is beeping, won't arm, or keeps sending false alarms. The AI answers in your company's name, books consultations for new systems, quotes the service you price by phone, and texts your on-call tech when a system is down.",
      calls: [
        "New alarm and camera system consultations",
        "Systems that won't arm or keep beeping",
        "False alarm and sensor problems",
        "Doorbell camera and smart lock installs",
        "Monitoring plan questions from your FAQ",
        "Business security and access control inquiries",
      ],
      quotes: "service calls and camera or doorbell installs you price per device",
      estimates: "full security system designs",
      urgent: "an alarm system that won't arm or keeps going off",
      booking: "consultations",
      faqs: [
        {
          q: "Can the AI help existing customers with a beeping alarm?",
          a: "It can give the troubleshooting steps you add to your FAQs, like how to silence a low-battery chirp. If that doesn't solve it, it texts your on-call tech and books a service visit. It never guesses at codes or settings.",
        },
        {
          q: "Will it quote monitoring plans?",
          a: "It answers questions about your monitoring options from your FAQs in your words and quotes installs or service you've priced. It doesn't invent plan terms.",
        },
      ],
    },
    "glass-repair-replacement": {
      hook: "A shattered window or glass door can't wait until next week. Answer every call, get urgent replacements moving, and book the rest.",
      why: "Glass companies field calls about broken windows after a storm or break-in, fogged double-pane units, shower doors, mirrors, and storefront glass. Some need securing or a replacement today; others want an estimate for a custom project. The AI answers in your company's name, captures what broke and where, treats unsecured openings as urgent, and books measure visits for the rest.",
      calls: [
        "Broken windows and glass doors",
        "Fogged or failed double-pane units",
        "Shower doors and custom mirrors",
        "Storefront and commercial glass damage",
        "Table tops and replacement glass pieces",
        "Emergency securing after break-ins",
      ],
      quotes: "service calls, measure visits, and standard pane replacements",
      estimates: "shower enclosures, mirrors, and storefront systems",
      urgent: "a shattered window or glass door",
      booking: "measure visits",
      faqs: [
        {
          q: "Can customers send a photo of the broken glass?",
          a: "Yes. Photos texted to your Missed No More Pro number are saved to the customer's record in the CRM, next to the call summary, so your tech can prepare before the visit.",
        },
        {
          q: "Can the AI quote custom shower doors?",
          a: "Custom glass depends on measurements, so the AI books a measure visit and captures what the customer wants. It quotes only services you've priced.",
        },
      ],
    },
  },
  variants: {
    "gate-access-control": {
      title: "Gate and access control installers",
      body: "For gate operators, keypads, and access control, the AI answers calls from HOAs, businesses, and homeowners, treats a gate stuck open or closed as urgent by texting your on-call tech, captures the property and system details, and books installs and service visits.",
    },
    "commercial-locksmiths": {
      title: "Commercial locksmiths",
      body: "Commercial locksmith calls come from business owners and property managers who need a lock changed after an employee leaves, a master key system updated, or an office lockout handled before opening. The AI captures the business and address, logs each account in the CRM, and texts your on-call locksmith when a business can't get in.",
    },
    "safe-opening": {
      title: "Safe opening and safe services",
      body: "For safe opening, the AI captures what kind of safe it is and what happened, like a lost combination or a failed lock, from what the caller describes, then books the visit or alerts your team. Anything you haven't priced by phone is captured for a quote instead of guessed.",
    },
    "garage-door-installation": {
      title: "Garage door installation",
      body: "New garage door buyers call to ask about styles, insulation, and openers. The AI answers from your FAQs, captures the address and what the homeowner wants, and books the measure or estimate visit into an open slot on your calendar with a confirmation text.",
    },
    "commercial-overhead-door-repair": {
      title: "Commercial overhead door repair",
      body: "When a warehouse or loading dock door stops working, the business can't receive shipments. The AI answers calls from facility managers, captures the business, address, and door type, treats a stuck commercial door as urgent by texting your on-call tech, and logs the account in the CRM.",
    },
  },
};
