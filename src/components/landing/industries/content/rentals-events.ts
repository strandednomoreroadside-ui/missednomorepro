import type { CategoryFile } from "../types";

export const rentalsEvents: CategoryFile = {
  intro:
    "Rental and event businesses sell dates, and callers book the first company that confirms one. Missed No More Pro answers every call in your company's name, quotes delivery rentals exactly from your prices and travel zones, captures event dates and details, and books deliveries, pickups, tours, and consultations into open slots.",
  niches: {
    "dumpster-rental": {
      hook: "Dumpster rental customers want a size, a price, and a drop-off date. Answer every call, quote your rental rates with delivery included, and book the drop-off.",
      why: "Dumpster rental calls are short and decisive. A homeowner cleaning out a house, a roofer starting a tear-off, or a contractor on a remodel wants to know what sizes you have, what's included, what they can't put in, and when you can drop it off. They book the first company that answers those questions. The AI answers in your company's name, quotes the sizes you rent with your travel zones, answers restrictions from your FAQs, and books the drop-off.",
      calls: [
        "10, 20, 30, and 40 yard dumpster rentals",
        "Home cleanout and remodel debris",
        "Roofing tear-off and construction projects",
        "What can and can't go in the dumpster",
        "Rental length, extensions, and early pickups",
        "Contractors setting up repeat rentals",
      ],
      quotes: "dumpster sizes and standard rental periods",
      estimates: "heavy debris like concrete and multi-container jobs",
      booking: "drop-offs",
      faqs: [
        {
          q: "Can the AI quote a dumpster rental with delivery?",
          a: "Yes. Set a price for each dumpster size and rental period, plus travel zones by driving distance, and the AI reads back one exact total for the caller's address. Anything that depends on the load, like heavy debris or overage weight, is mentioned as a possible extra instead of added silently.",
        },
        {
          q: "Will it tell customers what they can't put in a dumpster?",
          a: "Yes, if you add your restricted items to your FAQs. The AI answers with your list and takes the caller's number for your team if they ask about something you haven't covered.",
        },
      ],
    },
    "portable-storage-rental": {
      hook: "Portable storage customers are in the middle of a move or a remodel. Answer every call, quote your container rentals with delivery, and book the drop-off.",
      why: "Portable storage container calls come from people moving, renovating, or clearing out a space, plus contractors and businesses that need storage on site. They want container sizes, the monthly price, delivery details, and a drop-off date. The AI answers in your company's name, quotes your container sizes and rental periods with your travel zones, answers placement questions from your FAQs, and books the delivery.",
      calls: [
        "Containers for moving and remodeling",
        "On-site storage for contractors and businesses",
        "Container sizes and what fits inside",
        "Delivery placement and driveway questions",
        "Rental extensions and pickups",
        "Long-distance container moves",
      ],
      quotes: "container sizes and monthly rental periods",
      estimates: "long-distance container moves and multi-container orders",
      booking: "deliveries",
      faqs: [
        {
          q: "Can the AI quote a container rental with delivery?",
          a: "Yes. Set a price for each container size and rental period plus travel zones, and the AI reads back one exact total for the caller's address.",
        },
        {
          q: "Can it answer placement questions?",
          a: "Yes, from your FAQs. Add how much space a container needs and your driveway and surface rules, and the AI answers in your words.",
        },
      ],
    },
  },
  variants: {
    "roll-off-dumpster-rental": {
      title: "Roll-off dumpster rental",
      body: "For roll-off dumpster rentals to contractors and homeowners, the AI checks the drop-off address against your service radius, quotes each container size exactly from your rates, captures placement details the caller shares, and books the delivery into an open slot with a confirmation text.",
    },
  },
};
