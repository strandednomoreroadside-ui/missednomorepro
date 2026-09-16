import type { CategoryFile } from "../types";

export const petServices: CategoryFile = {
  intro:
    "Pet owners call with questions about grooming, training, boarding, and care, often while you have your hands full with an animal. Missed No More Pro answers every call in your business's name, answers your policy and vaccination questions from your FAQs, quotes the prices you approve, books appointments, and sends reminders, whether clients come to you or you go to them.",
  niches: {
    "dog-groomers": {
      hook: "You can't answer the phone with a dog on the table. Pick up every call, quote your grooms by size, and book the appointment for the time it takes.",
      why: "Grooming salons take calls from new clients asking about prices for their breed, regulars rebooking, and owners with questions about vaccinations, matting, and how long a groom takes. Groomers are hands-on all day, so calls go to voicemail and clients book elsewhere. The AI answers in your salon's name, quotes your grooms from your price list, answers policy questions from your FAQs, and books each appointment for the right length.",
      calls: [
        "Full grooms, baths, and nail trims",
        "Price questions by breed and size",
        "Puppy first grooms",
        "Vaccination and matting policy questions",
        "Regular clients rebooking every few weeks",
        "Pick-up time and running-late calls",
      ],
      estimates: "severely matted coats and special handling needs",
      booking: "grooming appointments",
      faqs: [
        {
          q: "Can the AI quote a groom for a specific dog?",
          a: "Yes, from your price list. Set up grooms by size or breed group and approve your prices, and the AI reads back the exact total, including add-ons. Anything that depends on coat condition is mentioned up front.",
        },
        {
          q: "Can it book the right amount of time for each groom?",
          a: "Yes. Give each service its own appointment length, and the AI only offers times where the whole groom fits inside your hours.",
        },
      ],
    },
    "mobile-pet-groomers": {
      hook: "Mobile grooming clients want the van at their door on a set schedule. Answer every call, quote your grooms with travel, and fill your route.",
      why: "Mobile groomers work alone in the van all day, so every call during a groom goes to voicemail. Clients call about prices for their dog, availability in their neighborhood, and rebooking their regular appointment. The AI answers in your business's name, checks the address against your service radius, quotes your grooms with travel zones, and books the appointment.",
      calls: [
        "Full grooms and baths at the client's home",
        "Price questions by dog size and breed",
        "Service area questions",
        "Regular clients rebooking",
        "Senior dogs and anxious pets",
        "Cats and small animal grooming questions",
      ],
      quotes: "grooms and baths by dog size, plus add-ons",
      estimates: "severely matted coats and multi-pet households",
      booking: "grooming appointments",
      faqs: [
        {
          q: "Can the AI tell clients if we come to their area?",
          a: "Yes. It checks each caller's driving distance from your base against the service radius you set, and callers outside it hear that on the call.",
        },
        {
          q: "Can it quote a groom with travel included?",
          a: "Yes. Set groom prices by size plus travel zones, and the AI reads back one exact total for the client's address.",
        },
      ],
    },
    "dog-trainers": {
      hook: "Dog owners call trainers when a problem gets real. Answer every call, explain your programs, and book the evaluation.",
      why: "Dog trainers hear from new puppy owners, families dealing with pulling, jumping, or reactivity, and owners of rescue dogs with behavior concerns. Callers want to know how your programs work and what they cost. The AI answers in your business's name, captures the dog and the behavior the owner describes, answers program questions from your FAQs, and books the evaluation.",
      calls: [
        "Puppy training and socialization",
        "Leash pulling, jumping, and obedience",
        "Reactivity and behavior concerns",
        "In-home private lessons",
        "Board-and-train program questions",
        "Group class schedule questions",
      ],
      quotes: "evaluations and private lesson packages",
      estimates: "board-and-train and behavior modification programs",
      booking: "evaluations",
      faqs: [
        {
          q: "Will the AI give training advice?",
          a: "No. It answers only from the FAQs you write, like how your programs work, and books an evaluation so you can assess the dog yourself.",
        },
        {
          q: "Can it quote a lesson package?",
          a: "Yes, for packages you price up front, plus travel zones for in-home lessons.",
        },
      ],
    },
    "pet-boarding-daycare": {
      hook: "Holiday boarding books up fast. Answer every call, explain your requirements, and book the tour or evaluation.",
      why: "Boarding and daycare facilities get calls from owners planning a trip, new clients asking about daycare, and existing clients adding days. Callers ask about vaccination requirements, temperament evaluations, feeding, and holiday availability. The AI answers in your facility's name, answers requirement and policy questions from your FAQs, quotes your price list, and books tours and evaluations.",
      calls: [
        "Boarding stays for trips and holidays",
        "Daycare enrollment and packages",
        "Temperament evaluations for new dogs",
        "Vaccination requirement questions",
        "Feeding, medication, and special care questions",
        "Existing clients adding days",
      ],
      estimates: "boarding stays your team confirms",
      booking: "tours and evaluations",
      faqs: [
        {
          q: "Can the AI book boarding stays?",
          a: "It captures the dates and pet details and your team confirms the stay, since multi-day kennel availability isn't a calendar appointment. It books tours and temperament evaluations directly.",
        },
        {
          q: "Can it explain vaccination requirements?",
          a: "Yes, from your FAQs, in your exact words.",
        },
      ],
    },
    "dog-walking-pet-sitting": {
      hook: "Pet sitting clients want someone reliable who picks up the phone. Answer every call, quote your visits, and book the meet-and-greet.",
      why: "Dog walkers and pet sitters hear from new clients planning a vacation, busy professionals who need midday walks, and regular clients adding visits. New clients usually want a meet-and-greet before booking. The AI answers in your business's name, checks the address against your service area, quotes your walks and visits, and books the meet-and-greet.",
      calls: [
        "Daily and midday dog walks",
        "Drop-in pet sitting visits",
        "Overnight and vacation pet sitting",
        "Meet-and-greet requests from new clients",
        "Cat, bird, and small pet care",
        "Regular clients adding visits",
      ],
      quotes: "walks and drop-in visits by length",
      estimates: "overnight stays and multi-pet homes",
      booking: "meet-and-greets",
      faqs: [
        {
          q: "Can the AI quote a week of walks?",
          a: "It quotes each service you price, like a 30-minute walk, with travel zones. Multi-visit schedules are captured for your team to set up.",
        },
        {
          q: "Does it check whether we serve their neighborhood?",
          a: "Yes. It checks the caller's driving distance from your base against the service radius you set.",
        },
      ],
    },
    "veterinary-clinics": {
      hook: "Clinic phones ring nonstop while your team is with patients. Answer every call, book appointments, and route urgent concerns fast.",
      why: "Veterinary clinics take calls for wellness visits, vaccinations, sick pet appointments, prescription refills, and worried owners describing symptoms. Front desk staff are also checking in patients, so calls get missed. The AI answers in your clinic's name, books appointments, answers policy questions from your FAQs, takes refill requests for your team, and follows your guidance for urgent situations without giving medical advice.",
      calls: [
        "Wellness exams and vaccination appointments",
        "Sick pet appointment requests",
        "Prescription and food refill requests",
        "New client and new pet registration",
        "Hours, location, and payment questions",
        "Urgent concerns routed per your instructions",
      ],
      estimates: "surgery and dental procedure questions for your team",
      booking: "appointments",
      faqs: [
        {
          q: "Will the AI give medical advice about a pet?",
          a: "No. It never gives medical advice. For urgent concerns, it gives the instructions you approve in your FAQs, like directing callers to your emergency partner hospital, and can warm-transfer the call to your team.",
        },
        {
          q: "Can it take prescription refill requests?",
          a: "It captures the pet, owner, and medication details and texts your team. It doesn't approve refills.",
        },
      ],
    },
    "pet-waste-removal": {
      hook: "Pet waste removal customers want a weekly service they don't have to think about. Answer every call, quote by number of dogs, and start service.",
      why: "Pet waste removal companies take calls from busy families, HOAs, and property managers who want yards cleaned weekly or a one-time spring cleanup. Pricing is simple, usually by number of dogs and visit frequency, so these calls are easy to close on the spot. The AI answers in your company's name, checks the address against your service area, quotes your service, and books the first cleanup.",
      calls: [
        "Weekly and twice-weekly yard cleanups",
        "One-time and spring cleanups",
        "Price questions by number of dogs",
        "HOA and apartment common area service",
        "Gate access and yard questions",
        "Existing customers skipping a week",
      ],
      quotes: "weekly and one-time cleanups by number of dogs",
      estimates: "HOA and multi-property accounts",
      booking: "first cleanups",
      faqs: [
        {
          q: "Can the AI quote weekly service for two dogs?",
          a: "Yes. Set prices by number of dogs and frequency, plus travel zones, and the AI reads back one exact total.",
        },
        {
          q: "Can it answer gate and access questions?",
          a: "It answers from your FAQs and notes what the customer shares about gates and pets in the call summary. It never repeats gate codes back.",
        },
      ],
    },
  },
  variants: {},
};
