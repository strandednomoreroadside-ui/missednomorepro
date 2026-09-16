import type { CategoryFile } from "../types";

export const lawnLandscapeOutdoor: CategoryFile = {
  intro:
    "Outdoor service businesses get most of their calls in a few busy weeks, while crews are out mowing, planting, or clearing. Missed No More Pro answers every call in your company's name, quotes the recurring services you price by phone, books estimates for bigger projects, and texts your team about urgent calls like a tree down on a house.",
  niches: {
    landscaping: {
      hook: "Spring landscaping calls come in while every crew is out working. Answer them all, capture the project, and book the estimates that fill your season.",
      why: "Landscaping calls are about projects: new plantings, beds and mulch, sod, grading, and cleanups, plus a lot of spring and fall cleanup requests with tight timelines. Most jobs need a look at the property before pricing. The AI answers in your company's name, captures what the homeowner wants, quotes the cleanups and small services you price by phone, and books the estimate for the rest.",
      calls: [
        "Spring and fall cleanups",
        "Mulch, beds, and planting projects",
        "Sod, seeding, and grading",
        "Landscape design consultations",
        "Retaining walls and patio inquiries",
        "Commercial property maintenance contracts",
      ],
      quotes: "spring and fall cleanups and mulch installs you price by package",
      estimates: "design projects, plantings, and hardscape work you price on site",
      booking: "estimates",
      faqs: [
        {
          q: "Can the AI quote landscaping jobs?",
          a: "Yes, for services you price by package, like a standard spring cleanup, with your travel zones added. Design and installation projects are captured and booked as estimates, since those depend on the property.",
        },
        {
          q: "Can homeowners send pictures of their yard?",
          a: "Yes. Photos texted to your Missed No More Pro number are saved to the customer's record in the CRM, next to the call summary, so you can see the property before the estimate.",
        },
      ],
    },
    "lawn-care": {
      hook: "Lawn care customers want weekly service to start this week. Answer every call, quote your mowing and treatment programs, and book the first visit.",
      why: "Lawn care calls are some of the easiest to close: a homeowner wants weekly mowing, a fertilizer program, or aeration and seeding, and they want a price and a start date. Customers who can't reach you just call the next company. The AI answers in your company's name, quotes the services you price by lawn size, and books the first visit into an open slot.",
      calls: [
        "Weekly and biweekly mowing",
        "Fertilization and weed control programs",
        "Aeration and overseeding",
        "Grub and pest lawn treatments",
        "Seasonal cleanup add-ons",
        "Existing customers skipping or rescheduling a visit",
      ],
      quotes: "mowing visits, treatment applications, and aeration packages priced by lawn size",
      estimates: "large properties and commercial accounts",
      booking: "first visits",
      faqs: [
        {
          q: "How does the AI quote mowing?",
          a: "Set up mowing and treatment services by lawn size, for example a small, medium, or large lot, plus travel zones. The AI matches what the caller describes to your services and reads back one exact total.",
        },
        {
          q: "Can customers change their service by phone?",
          a: "Customers with a booked visit can call to cancel or reschedule it into another open time, and they get a confirmation text. Other requests are taken as a message for your team.",
        },
      ],
    },
    "tree-service": {
      hook: "Tree calls range from a routine trim to a tree on the house. Answer every one, get the emergencies to your crew right away, and book estimates for the rest.",
      why: "Tree service calls include planned work, like removals, trimming, and stump grinding, plus storm emergencies where a limb or whole tree has come down on a roof, a car, or a driveway. Planned work needs an estimate; emergencies need a crew now. The AI answers in your company's name, captures the address and what's wrong, texts your on-call crew about trees on structures, and books estimates for everything else.",
      calls: [
        "Trees or limbs down on houses, cars, and driveways",
        "Tree removal estimates",
        "Trimming, pruning, and deadwood removal",
        "Stump grinding",
        "Dead, leaning, or storm-weakened trees",
        "Land clearing and lot clearing inquiries",
      ],
      quotes: "stump grinding and small trimming jobs you price up front",
      estimates: "removals and larger trimming jobs you price after seeing the tree",
      urgent: "a tree or large limb down on the house",
      booking: "estimates",
      faqs: [
        {
          q: "What does the AI do when a tree falls on a house?",
          a: "It treats the call as urgent: it takes the address and callback number, texts your on-call crew right away, and can text the homeowner a confirmation with an estimated arrival time.",
        },
        {
          q: "Can it quote a tree removal?",
          a: "Removals depend on the tree and its location, so the AI books an estimate and captures what the caller describes. It quotes only services you've priced, like stump grinding.",
        },
      ],
    },
  },
  variants: {
    hardscaping: {
      title: "Hardscaping",
      body: "For hardscaping projects like paver patios, retaining walls, and outdoor kitchens, the AI captures what the homeowner is planning, answers material and timeline questions from your FAQs, and books a design consultation or estimate into an open slot.",
    },
    "emergency-tree-removal": {
      title: "Emergency tree removal",
      body: "For emergency tree removal after storms, the AI answers every call around the clock, treats a tree on a structure or blocking a driveway as urgent, texts your on-call crew immediately, and can text the caller an estimated arrival time. Your after-hours fee is included automatically for services you quote.",
    },
  },
};
