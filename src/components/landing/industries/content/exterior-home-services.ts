import type { CategoryFile } from "../types";

export const exteriorHomeServices: CategoryFile = {
  intro:
    "Exterior projects start with a homeowner walking around the house and deciding something needs to be done: a fence, a deck, new windows, a fresh coat of paint. They call a few companies and book whoever answers and gives a clear next step. Missed No More Pro answers those calls in your company's name, quotes the smaller jobs you price by phone, and books estimates for the rest.",
  niches: {
    "pressure-washing": {
      hook: "Pressure washing leads call on the first warm weekend of the year. Answer every one, quote your flat-rate packages exactly, and fill your schedule while you're on a job.",
      why: "Pressure washing and soft washing jobs are easy to quote when you price by package: a house wash, a driveway, a deck, a roof soft wash. Homeowners compare a few companies and book the first one that gives them a real price and a date. The AI answers every call in your company's name, reads back the total for the packages they want in one quote, and books the job into an open slot.",
      calls: [
        "House washing and soft washing requests",
        "Driveway, sidewalk, and patio cleaning",
        "Deck and fence cleaning before staining",
        "Roof soft washing for stains and algae",
        "Commercial storefront and parking area cleaning",
        "Repeat customers booking their yearly wash",
      ],
      quotes: "house washes, driveway and patio cleaning, deck cleaning, and roof soft washes",
      estimates: "commercial properties and unusually large jobs",
      booking: "washes",
      faqs: [
        {
          q: "Can the AI quote more than one service at once?",
          a: "Yes. If a caller wants a house wash and a driveway cleaning, the AI prices them together in one quote so your travel fee is charged once, then reads back a single exact total.",
        },
        {
          q: "What about homes bigger than my standard packages?",
          a: "Set up the packages you quote by phone, and anything outside them is captured with the details the caller shares so your team can follow up with a custom price. The AI never guesses.",
        },
      ],
    },
    "painting-contractors": {
      hook: "Painting leads want an estimate on the calendar, not a voicemail. Answer every call, capture the project, and book the walkthrough while your crews are on the ladder.",
      why: "Most painting jobs are priced after a walkthrough, so the goal of the first call is simple: understand the project and get the estimate booked before the homeowner calls someone else. Callers ask about interior versus exterior work, timelines, prep, and paint brands. The AI answers in your company's name, captures what the caller describes, answers common questions from your FAQs, and books the estimate into an open slot.",
      calls: [
        "Interior painting for rooms, ceilings, and trim",
        "Exterior house painting and staining",
        "Cabinet painting and refinishing questions",
        "Commercial and rental property repaints",
        "Prep, timeline, and paint brand questions",
        "Touch-up and warranty follow-up calls",
      ],
      estimates: "interior and exterior projects you price after a walkthrough",
      booking: "estimates",
      faqs: [
        {
          q: "Will the AI give a painting price over the phone?",
          a: "Only for anything you've set a price for. Most painting contractors price after a walkthrough, so the AI books the estimate and captures what the homeowner describes. When someone asks for a price it can't give, it takes their number so your team can follow up.",
        },
        {
          q: "Can it answer questions about prep and timelines?",
          a: "Yes, from the FAQs you write. Add your process, typical timelines, and the brands you use, and the AI answers in your words.",
        },
      ],
    },
    "concrete-contractors": {
      hook: "Concrete leads call about driveways, patios, and cracked steps, and they call more than one contractor. Answer first, capture the project, and book the estimate.",
      why: "Concrete work is mostly estimate-based: a new driveway, a patio, a walkway, a garage floor, or replacing cracked and sunken sections. Homeowners want to know whether you do their type of job, when you can come look, and roughly how your process works. The AI answers in your company's name, captures the project and the address, answers process questions from your FAQs, and books the estimate.",
      calls: [
        "New driveway and driveway replacement estimates",
        "Patios, walkways, and steps",
        "Cracked, sunken, or heaved concrete repair",
        "Garage and shed slab pours",
        "Stamped and decorative concrete questions",
        "Commercial flatwork and sidewalk inquiries",
      ],
      estimates: "driveways, patios, slabs, and repair projects you price on site",
      booking: "estimates",
      faqs: [
        {
          q: "Can the AI book concrete estimates?",
          a: "Yes. Connect Google Calendar and it books estimates into open times inside your hours, then texts the homeowner a confirmation and a reminder. It also checks the address against your service radius first.",
        },
        {
          q: "Can homeowners send photos of the area?",
          a: "Yes. Photos texted to your Missed No More Pro number, including replies to the confirmation text, are saved to the customer's record in the CRM so you can see the area before the estimate.",
        },
      ],
    },
    "fence-contractors": {
      hook: "Fence projects start with a homeowner who just decided they need one. Answer every call, capture the property details, and book the estimate before they call the next fence company.",
      why: "Fence calls cover new installs for privacy, pets, or pools, plus repairs after storms or a car backing into a gate. New installs need a site visit and property line questions, while repairs are often urgent and smaller. The AI answers in your company's name, captures the address and what the caller wants, answers material and permit questions from your FAQs, and books the estimate or repair visit.",
      calls: [
        "New wood, vinyl, aluminum, and chain-link fences",
        "Privacy, pet, and pool code fencing",
        "Storm-damaged sections and leaning posts",
        "Gate repairs and new gate installs",
        "Permit, HOA, and property line questions",
        "Commercial and farm fencing inquiries",
      ],
      quotes: "repair service calls and gate adjustments",
      estimates: "new fence installs you price by the property",
      booking: "estimates",
      faqs: [
        {
          q: "Can the AI answer permit and HOA questions?",
          a: "It answers from the FAQs you write, so add your guidance on permits, HOA approval, and property lines. It won't guess at local rules. If a question isn't covered, it takes the caller's number for your team.",
        },
        {
          q: "Can it quote fence repairs?",
          a: "Yes, for repairs you price up front, like a service call or a gate adjustment, with your travel zones added. New installs are captured and booked as estimates.",
        },
      ],
    },
    "deck-patio-builders": {
      hook: "Deck and patio projects are big-ticket leads you can't afford to miss. Answer every call, capture the project, and get the design consultation on the calendar.",
      why: "Homeowners planning a new deck or patio usually call in the spring with a picture in their head and a few questions: materials, timelines, permits, and whether you do covered structures. These are high-value projects, and the builder who responds first and books a consultation often wins. The AI answers in your company's name, captures what the homeowner is planning, answers questions from your FAQs, and books the consultation.",
      calls: [
        "New wood and composite deck builds",
        "Paver and concrete patio projects",
        "Deck repairs, rebuilds, and railing replacements",
        "Covered patios, pergolas, and screened porches",
        "Material, timeline, and permit questions",
        "Staining and deck restoration requests",
      ],
      estimates: "new decks, patios, and covered structures you design and price on site",
      booking: "design consultations",
      faqs: [
        {
          q: "How does the AI handle a big deck project inquiry?",
          a: "It captures what the homeowner is planning, like size, materials, and features, from what they describe, checks the address against your service radius, and books a design consultation into an open slot on your calendar.",
        },
        {
          q: "What happens if the homeowner doesn't book right away?",
          a: "Every caller is saved in the CRM with a transcript and summary, and your team gets a text about real leads, so nobody who called about a project gets forgotten. Your team follows up from the CRM with the full conversation in front of them.",
        },
      ],
    },
    "window-door-companies": {
      hook: "Window and door buyers want an in-home consultation, and they call several companies to get one. Answer first, capture the project, and book it.",
      why: "Window and door replacement is a considered purchase. Callers ask about energy efficiency, styles, financing, and how long installation takes, and the company that answers clearly and books the consultation is usually the one invited in. Some calls are repairs too, like a broken pane or a door that won't latch. The AI answers in your company's name, answers questions from your FAQs, and books consultations and repair visits.",
      calls: [
        "Whole-home window replacement consultations",
        "Entry, patio, and sliding door replacements",
        "Broken glass, fogged panes, and seal failures",
        "Doors that stick, drag, or won't latch",
        "Energy efficiency, style, and financing questions",
        "Warranty service requests from past customers",
      ],
      quotes: "repair service calls and glass replacement visits you price up front",
      estimates: "whole-home window and door replacement projects",
      booking: "in-home consultations",
      faqs: [
        {
          q: "Can the AI answer financing and warranty questions?",
          a: "Yes, from the FAQs you provide. Add your financing options, warranty terms, and product lines, and the AI answers in your words. It doesn't make up offers or terms.",
        },
        {
          q: "Does it recognize past customers calling about warranty work?",
          a: "Returning callers are matched to their record in the CRM and greeted by name, and every call is logged with a transcript, so your team sees their history before calling back.",
        },
      ],
    },
  },
  variants: {
    "fence-repair": {
      title: "Fence repair",
      body: "For fence repair calls, like a section blown down in a storm, a leaning post, or a gate that won't close, the AI captures the address and damage, quotes the repair services you price up front, and books the visit. Homeowners can text a photo of the damage to your Missed No More Pro number so your crew arrives with the right materials.",
    },
  },
};
