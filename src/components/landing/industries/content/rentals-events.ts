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
    "portable-toilet-rental": {
      hook: "Event planners and contractors need portable toilets on a specific date. Answer every call, quote your units with delivery, and book the drop-off.",
      why: "Portable toilet rental companies take calls from contractors who need units on a job site, event organizers planning weddings, festivals, and parties, and homeowners during a remodel. Callers want unit options, how many they need, service frequency, and the price delivered to their address. The AI answers in your company's name, quotes your standard units and rental periods with travel zones, and books the delivery.",
      calls: [
        "Construction site units and weekly service",
        "Wedding and event restroom rentals",
        "Luxury restroom trailers",
        "Handwashing stations and ADA units",
        "Remodel and home project rentals",
        "Service frequency and pump-out questions",
      ],
      quotes: "standard and ADA unit rentals by week and event packages",
      estimates: "large events and restroom trailers",
      booking: "deliveries",
      faqs: [
        {
          q: "Can the AI quote units for an event?",
          a: "Yes. Set event packages and unit prices plus travel zones, and the AI reads back one exact total for the caller's address. Large events needing several units or trailers are captured for your team.",
        },
        {
          q: "Can it answer how many units an event needs?",
          a: "It answers from the guidance you put in your FAQs, like your units-per-guest recommendations. It doesn't guess.",
        },
      ],
    },
    "equipment-rental": {
      hook: "Contractors and homeowners rent equipment the day they need it. Answer every call, quote your rental rates with delivery, and book it.",
      why: "Equipment rental companies take calls for skid steers, mini excavators, lifts, trenchers, and tools, from contractors on a deadline and homeowners tackling a weekend project. They want to know what's available, the daily or weekly rate, and whether you deliver. The AI answers in your company's name, quotes your rental rates and delivery with travel zones, answers equipment questions from your FAQs, and books deliveries and pickups.",
      calls: [
        "Skid steer, excavator, and lift rentals",
        "Daily, weekend, and weekly rental rates",
        "Delivery and pickup scheduling",
        "Equipment operation and attachment questions",
        "Contractor account rentals",
        "Rental extensions and returns",
      ],
      quotes: "daily and weekly equipment rentals with delivery",
      estimates: "long-term and multi-machine rentals",
      booking: "deliveries and pickups",
      faqs: [
        {
          q: "Can the AI check whether a machine is available?",
          a: "No. It doesn't connect to your rental inventory. It quotes your rates, captures the dates and equipment, and your team confirms availability.",
        },
        {
          q: "Can it quote delivery to a job site?",
          a: "Yes. Set a delivery charge with travel zones by driving distance, and the AI adds it to the rental rate and reads back one exact total.",
        },
      ],
    },
    "tent-event-rental": {
      hook: "Wedding and party dates book up months ahead. Answer every call, capture the event, quote your packages, and lock in the date.",
      why: "Tent and event rental companies take calls from couples, party hosts, schools, and corporate planners who need tents, tables, chairs, linens, and staging for a specific date. Peak season dates go quickly, so the first company to answer and hold the date usually wins. The AI answers in your company's name, captures the event date, guest count, and site, quotes your standard packages with delivery, and books a site visit or consultation.",
      calls: [
        "Tent rentals for weddings and parties",
        "Tables, chairs, and linen packages",
        "Dance floors, staging, and lighting",
        "Corporate and school events",
        "Site visit and setup questions",
        "Weather and cancellation policy questions",
      ],
      quotes: "standard tent and table-and-chair packages with delivery",
      estimates: "large weddings and custom event layouts",
      booking: "site visits and consultations",
      faqs: [
        {
          q: "Can the AI hold a date for an event?",
          a: "It captures the event date and details and books a consultation or site visit. It doesn't check your rental inventory, so your team confirms the date is available.",
        },
        {
          q: "Can it quote a tent package?",
          a: "Yes, for packages you price up front, plus travel zones. Custom layouts are captured for your team.",
        },
      ],
    },
    "bounce-house-rental": {
      hook: "Parents book party rentals on evenings and weekends. Answer every call, quote your inflatables with delivery, and book the party.",
      why: "Bounce house and party rental companies hear from parents planning birthday parties, schools and churches planning festivals, and businesses hosting events. Callers want to know what's available, the price delivered, how much space they need, and what happens if it rains. The AI answers in your company's name, quotes your rentals with travel zones, answers setup and weather questions from your FAQs, and books the delivery.",
      calls: [
        "Bounce house and combo rentals for birthday parties",
        "Water slides and obstacle courses",
        "Concessions like popcorn and cotton candy machines",
        "School, church, and festival events",
        "Space, power, and setup requirements",
        "Weather and cancellation policy questions",
      ],
      quotes: "inflatable rentals and party packages with delivery",
      estimates: "festivals and multi-unit events",
      booking: "party deliveries",
      faqs: [
        {
          q: "Can the AI explain setup requirements?",
          a: "Yes, from your FAQs. Add how much space, power, and surface each rental needs, and the AI answers in your words.",
        },
        {
          q: "Can it quote a bounce house with delivery?",
          a: "Yes. Set rental prices and travel zones, and the AI reads back one exact total for the party address.",
        },
      ],
    },
    "photo-booth-rental": {
      hook: "Photo booth leads come from couples and event planners who want a quick price for their date. Answer every call and book the event.",
      why: "Photo booth rental companies take calls for weddings, birthdays, school dances, and corporate events. Callers want to know your packages, how long the booth runs, what's included, and whether you're available on their date. The AI answers in your company's name, captures the event date and venue, quotes your packages with travel zones, and books the event or a consultation.",
      calls: [
        "Wedding photo booth rentals",
        "Corporate event and trade show booths",
        "Birthday, prom, and school dance rentals",
        "Package hours, prints, and props questions",
        "360 booth and digital sharing questions",
        "Venue setup and space requirements",
      ],
      quotes: "photo booth packages by number of hours",
      estimates: "multi-day and custom branded events",
      booking: "events",
      faqs: [
        {
          q: "Can the AI quote a three-hour package?",
          a: "Yes. Set packages by hours, plus travel zones to the venue, and the AI reads back one exact total.",
        },
        {
          q: "Can it check if we're booked on a date?",
          a: "It checks open times on your connected calendar for the day the caller wants and books the event if the time is free.",
        },
      ],
    },
    "boat-rental": {
      hook: "Boat renters plan around the weather and book the first company that answers. Pick up every call and fill your fleet.",
      why: "Boat rental businesses get calls about pontoons, fishing boats, and jet skis for half days, full days, and holidays. Callers ask what's available, what a rental costs, what's required to drive, and what happens if it storms. The AI answers in your business's name, quotes your rentals from your price list, answers license and weather policy questions from your FAQs, and books the rental.",
      calls: [
        "Pontoon and fishing boat rentals",
        "Jet ski and kayak rentals",
        "Half-day and full-day rates",
        "Boating license and age requirements",
        "Weather and cancellation policies",
        "Group and holiday weekend bookings",
      ],
      estimates: "group events and multi-boat bookings",
      booking: "rentals",
      faqs: [
        {
          q: "Can the AI answer what's required to rent?",
          a: "Yes, from your FAQs. Add your age, license, and deposit requirements, and the AI answers in your words.",
        },
        {
          q: "Can it give each rental the right length?",
          a: "Yes. Give half-day and full-day rentals their own lengths, and the AI only offers times where the whole rental fits inside your hours.",
        },
      ],
    },
    "wedding-venues": {
      hook: "Couples tour the venues that answer first. Pick up every inquiry, capture the date and guest count, and book the tour.",
      why: "Wedding and event venues get inquiries from couples, families, and planners asking about date availability, capacity, packages, catering rules, and pricing. Most want to see the venue before deciding, and they're touring several. The AI answers in your venue's name, captures the date, guest count, and event type, answers package and policy questions from your FAQs, and books the tour.",
      calls: [
        "Wedding date availability inquiries",
        "Venue tour requests",
        "Capacity and layout questions",
        "Package, catering, and vendor policy questions",
        "Corporate events, showers, and parties",
        "Booked couples with planning questions",
      ],
      estimates: "custom packages and date availability your team confirms",
      booking: "tours",
      faqs: [
        {
          q: "Can the AI tell couples whether their date is open?",
          a: "No. It captures the date they want and your team confirms availability. It books venue tours into open times on your calendar.",
        },
        {
          q: "Can it explain our packages?",
          a: "Yes. It answers from your FAQs and quotes packages from your price list once you approve it, never guessing at pricing.",
        },
      ],
    },
    catering: {
      hook: "Catering inquiries come with a date and a guest count, and planners book whoever responds. Answer every call and book the tasting.",
      why: "Catering companies hear from couples, office managers, and party hosts planning weddings, corporate lunches, graduations, and holiday parties. Callers want menu options, per-guest pricing, dietary accommodations, and availability. The AI answers in your company's name, captures the event date, guest count, and venue, answers menu and dietary questions from your FAQs, and books a tasting or consultation.",
      calls: [
        "Wedding catering inquiries",
        "Corporate lunches and office catering",
        "Graduation, holiday, and private parties",
        "Menu options and dietary accommodations",
        "Staffing, rentals, and service style questions",
        "Existing clients changing guest counts",
      ],
      estimates: "events priced by menu and guest count",
      booking: "tastings and consultations",
      faqs: [
        {
          q: "Can the AI quote per-guest catering prices?",
          a: "No. It doesn't calculate per-guest pricing. It captures the date, guest count, and menu interests and your team follows up with a quote.",
        },
        {
          q: "Can it answer dietary questions?",
          a: "Yes, from your FAQs. Add the dietary options you offer, and the AI answers in your words. It never guesses about allergens.",
        },
      ],
    },
    "wedding-planners": {
      hook: "Engaged couples reach out to several planners at once. Answer every inquiry warmly and book the consultation first.",
      why: "Wedding and event planners get inquiries from couples who just got engaged, families planning milestone celebrations, and companies planning events. Callers want to know your services, whether you're available for their date, and how you work. The AI answers in your business's name, captures the date, location, and guest count, answers service questions from your FAQs, and books a consultation.",
      calls: [
        "Full wedding planning inquiries",
        "Day-of and month-of coordination",
        "Destination and local weddings",
        "Corporate and milestone event planning",
        "Service package questions",
        "Clients checking in on planning details",
      ],
      estimates: "planning packages based on the event",
      booking: "consultations",
      faqs: [
        {
          q: "Can the AI explain our planning packages?",
          a: "Yes. It answers from your FAQs and quotes packages from your price list once you approve it.",
        },
        {
          q: "Can it capture the couple's details?",
          a: "Yes. It notes the date, venue, guest count, and style the couple shares in the call summary, and books a consultation.",
        },
      ],
    },
    "wedding-djs": {
      hook: "Couples book DJs a year out and go with whoever answers. Pick up every call, quote your packages, and book the consultation.",
      why: "Wedding and event DJs take calls from couples, schools, and corporate planners asking about date availability, packages, lighting, ceremony sound, and MC services. Callers want a price for their date and a feel for how you work. The AI answers in your company's name, captures the date and venue, quotes your packages with travel zones, answers questions from your FAQs, and books the consultation.",
      calls: [
        "Wedding reception DJ inquiries",
        "Ceremony sound and MC services",
        "Uplighting and dance floor lighting add-ons",
        "School dances and proms",
        "Corporate events and parties",
        "Music request and planning questions",
      ],
      quotes: "event packages by number of hours and lighting add-ons",
      estimates: "custom multi-room or multi-day events",
      booking: "consultations",
      faqs: [
        {
          q: "Can the AI quote a wedding DJ package?",
          a: "Yes. Set packages by hours and add-ons, plus travel zones to the venue, and the AI reads back one exact total.",
        },
        {
          q: "Can it check whether we're free on a date?",
          a: "It captures the date and books a consultation into an open time. Your team confirms event date availability.",
        },
      ],
    },
    "commercial-photographers": {
      hook: "Business clients need headshots and product photos on a deadline. Answer every call, quote your packages, and book the shoot.",
      why: "Commercial photographers take calls for corporate headshots, product and ecommerce photography, real estate and architecture, and marketing shoots. Clients want to know your packages, turnaround time, and availability. The AI answers in your business's name, captures the project, location, and deadline, quotes your standard packages, and books the shoot or a consultation.",
      calls: [
        "Corporate headshots for teams",
        "Product and ecommerce photography",
        "Real estate and architectural shoots",
        "Brand and marketing photo shoots",
        "Turnaround time and usage rights questions",
        "Event photography inquiries",
      ],
      quotes: "headshot sessions and standard shoot packages",
      estimates: "custom campaigns and multi-day shoots",
      booking: "shoots and consultations",
      faqs: [
        {
          q: "Can the AI quote a headshot session?",
          a: "Yes, for packages you price up front, plus travel zones for on-location shoots. Custom projects are captured for a consultation.",
        },
        {
          q: "Can it answer usage rights questions?",
          a: "It answers from your FAQs in your words and never makes up licensing terms.",
        },
      ],
    },
  },
  variants: {
    "temporary-fence-rental": {
      title: "Temporary fence rental",
      body: "Temporary fence calls come from contractors, event organizers, and homeowners who need a site secured. The AI quotes your panel rentals and delivery with travel zones, captures the site and dates, and books the installation.",
    },
    "wedding-rentals": {
      title: "Wedding rental companies",
      body: "For wedding rentals like arches, linens, chargers, and lounge furniture, the AI captures the wedding date and venue, quotes your standard packages with delivery, and books a consultation so couples can plan the details with your team.",
    },
    "event-venues": {
      title: "Event venues",
      body: "For event venues hosting parties, fundraisers, and corporate events, the AI captures the event type, date, and guest count, answers capacity and policy questions from your FAQs, and books a tour.",
    },
    "event-planners": {
      title: "Event planners",
      body: "For corporate and social event planners, the AI captures the event type, date, and scope the caller describes, answers questions about your services from your FAQs, and books a consultation.",
    },
    "party-planners": {
      title: "Party planners",
      body: "Party planning calls for birthdays, showers, and anniversaries get the same care: the AI captures the occasion, date, and guest count and books a consultation into an open time.",
    },
    "roll-off-dumpster-rental": {
      title: "Roll-off dumpster rental",
      body: "For roll-off dumpster rentals to contractors and homeowners, the AI checks the drop-off address against your service radius, quotes each container size exactly from your rates, captures placement details the caller shares, and books the delivery into an open slot with a confirmation text.",
    },
  },
};
