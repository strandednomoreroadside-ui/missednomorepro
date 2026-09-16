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
    "irrigation-sprinklers": {
      hook: "Sprinkler startups in spring and blowouts in fall fill up fast. Answer every call, quote your seasonal services exactly, and book the route.",
      why: "Irrigation companies live by the calendar: spring startups, fall winterizations, and repairs all season when a head breaks or a zone won't turn on. Seasonal services are easy to price and book on the first call, and customers who can't get through before a freeze call someone else. The AI answers in your company's name, quotes startups, winterizations, and service calls, and books them into open slots.",
      calls: [
        "Spring system startups",
        "Fall winterizations and blowouts",
        "Broken heads, leaks, and zones that won't run",
        "Controller and timer programming",
        "New sprinkler system installs",
        "Drip irrigation and landscape lighting questions",
      ],
      quotes: "startups, winterizations, and repair service calls by zone count",
      estimates: "new irrigation system installs",
      booking: "service visits",
      faqs: [
        {
          q: "Can the AI book fall winterizations?",
          a: "Yes. It quotes your winterization price from your rates and books the visit into an open slot, then texts the customer a confirmation and a reminder.",
        },
        {
          q: "How does it price by the number of zones?",
          a: "Set up services by zone count, like a startup for up to six zones, and the AI matches what the caller tells it to your prices. It never guesses.",
        },
      ],
    },
    "pool-service-repair": {
      hook: "Pool owners want their pool open, clear, and working. Answer every call, quote openings and service visits, and fill your route.",
      why: "Pool service companies take calls for weekly maintenance, spring openings and fall closings, green pool cleanups, and equipment problems like a pump or heater that won't run. Most are ready to book, and the busiest weeks are the ones right before summer. The AI answers in your company's name, quotes the services you price by phone, and books visits into open slots.",
      calls: [
        "Weekly and biweekly pool service",
        "Spring openings and fall closings",
        "Green pool cleanups",
        "Pumps, filters, and heaters not working",
        "Leak detection and repair requests",
        "Hot tub and spa service",
      ],
      quotes: "openings, closings, service visits, and green pool cleanups",
      estimates: "equipment replacements and leak repairs",
      booking: "service visits",
      faqs: [
        {
          q: "Can the AI book pool openings?",
          a: "Yes. It quotes your opening price from your rates, checks the address against your service radius, and books the opening into an open slot with a confirmation text.",
        },
        {
          q: "Can it help with equipment problems?",
          a: "It captures what the owner describes, like a pump that won't prime or a heater error, books a service visit, and gives any troubleshooting tips you've added to your FAQs.",
        },
      ],
    },
    "snow-removal": {
      hook: "When snow is in the forecast, every property owner calls at once. Answer them all, quote your plowing rates, and lock in the season.",
      why: "Snow removal calls cluster right before and during storms. Homeowners want a driveway plowed or shoveled, and businesses and HOAs want a seasonal contract with salting. Operators are out plowing when the phone rings the most. The AI answers in your company's name, quotes per-visit services you price by phone, captures commercial contract requests, and logs everyone in the CRM.",
      calls: [
        "Per-push driveway plowing",
        "Sidewalk and walkway shoveling",
        "Salting and ice management",
        "Seasonal residential contracts",
        "Commercial lot and HOA contracts",
        "Customers asking when their driveway will be done",
      ],
      quotes: "per-visit driveway plowing, shoveling, and salting",
      estimates: "seasonal and commercial contracts",
      booking: "site visits",
      faqs: [
        {
          q: "Can the AI quote a driveway plow?",
          a: "Yes. Set per-visit prices by driveway size and your travel zones, and the AI reads back one exact total. Commercial contracts are captured for your team.",
        },
        {
          q: "What if customers call asking when we'll get to them?",
          a: "The AI takes their name and number and texts your team, and logs the call in the CRM. It doesn't promise arrival times it can't know.",
        },
      ],
    },
    "mosquito-control": {
      hook: "Mosquito customers want their yard back before the weekend. Answer every call, quote your treatments, and book the first spray.",
      why: "Mosquito control calls come from homeowners tired of being bitten, families planning a party or graduation, and existing customers on a seasonal program. They want to know what the treatment costs, whether it's safe for kids and pets, and how soon you can come. The AI answers in your company's name, quotes your treatments, answers safety questions from your FAQs, and books the visit.",
      calls: [
        "Seasonal mosquito and tick programs",
        "One-time treatments before events",
        "Pet and child safety questions",
        "Natural and organic treatment options",
        "Existing customers rescheduling after rain",
        "Tick and flea yard treatments",
      ],
      quotes: "one-time event treatments and per-visit program treatments",
      estimates: "large properties and commercial accounts",
      booking: "treatments",
      faqs: [
        {
          q: "Can the AI answer pet safety questions?",
          a: "It answers from the FAQs you write, word for word. Add your guidance about products and re-entry times, and callers hear your approved answer.",
        },
        {
          q: "Can it book a treatment before a party?",
          a: "Yes. It captures the event date the caller mentions, quotes your event treatment, and books the earliest open time that works.",
        },
      ],
    },
  },
  variants: {
    "pool-opening-closing": {
      title: "Pool opening and closing services",
      body: "For seasonal openings and closings, the AI quotes each service exactly from your rates, books it into an open slot, and sends a reminder before the visit, so your busiest two months fill up without phone tag.",
    },
    "hot-tub-service": {
      title: "Hot tub service and repair",
      body: "Hot tub calls cover cloudy water, heaters that won't heat, error codes, and drain-and-clean service. The AI captures what the owner describes, quotes the services you've priced, and books the service visit.",
    },
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
