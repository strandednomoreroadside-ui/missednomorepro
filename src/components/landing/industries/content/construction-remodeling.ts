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
  },
  variants: {
    carpentry: {
      title: "Carpentry and finish carpentry",
      body: "For carpentry work like trim, built-ins, and custom shelving, the AI captures the project details the caller shares, quotes any small jobs you price by phone, and books the estimate for custom work into an open slot on your calendar.",
    },
  },
};
