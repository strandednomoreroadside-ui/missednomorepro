import type { CategoryFile } from "../types";

export const beautyPersonalServices: CategoryFile = {
  intro:
    "Salons, studios, and personal service businesses can't pick up the phone in the middle of an appointment, and clients who reach voicemail often book somewhere else. Missed No More Pro answers every call in your business's name, quotes the exact total from your service menu, books each appointment for the time the service takes, sends confirmation and reminder texts, handles cancellations, and answers your policy questions in your words, without ever asking a client for a street address.",
  niches: {
    "tattoo-studios": {
      hook: "Tattoo clients call while you're mid-session. Answer every call, answer your booking questions, and get consultations on the calendar.",
      why: "Tattoo studios get calls about custom piece consultations, walk-in availability, flash pricing, deposits, age and ID policies, and aftercare, usually while every artist is working. Clients who can't get an answer book with another shop. The AI answers in your studio's name, answers policy questions from your FAQs in your words, and books consultations and appointments into open times.",
      calls: [
        "Custom tattoo consultation requests",
        "Walk-in and same-day availability questions",
        "Deposit, ID, and age policy questions",
        "Aftercare and touch-up questions",
        "Piercing appointment requests",
        "Clients rescheduling a session",
      ],
      estimates: "custom pieces your artists price after a consultation",
      booking: "consultations and sessions",
      faqs: [
        {
          q: "Can the AI explain our deposit and ID policy?",
          a: "Yes. Add your deposit, age, and ID rules to your FAQs, and the AI answers with your exact wording.",
        },
        {
          q: "Can clients request a specific artist?",
          a: "The AI notes the artist the client asks for in the booking details for your team. Appointments go on one connected calendar, so your team confirms the artist's availability.",
        },
      ],
    },
    "permanent-makeup": {
      hook: "Permanent makeup clients have questions before they book. Answer every call, explain your process in your words, and book the consultation.",
      why: "Permanent makeup and cosmetic tattoo businesses hear from clients interested in microblading, lip blush, and eyeliner, plus touch-up appointments and people with questions about healing and preparation. Many callers want reassurance before they commit. The AI answers in your business's name, answers questions from your FAQs, quotes your service menu, and books consultations and touch-ups.",
      calls: [
        "Microblading and powder brow consultations",
        "Lip blush and eyeliner appointments",
        "Touch-up and color boost appointments",
        "Preparation and healing questions",
        "Deposit and cancellation policy questions",
        "Correction and removal inquiries",
      ],
      estimates: "corrections and removals that need a consultation first",
      booking: "consultations and appointments",
      faqs: [
        {
          q: "Will the AI answer medical questions about procedures?",
          a: "No. It answers only from the guidance you approve in your FAQs and never gives medical advice. Questions it can't answer are taken for you to follow up.",
        },
        {
          q: "Can it book touch-ups for existing clients?",
          a: "Yes. Returning clients are recognized by name, and the AI books touch-ups into open times, giving each service its own appointment length.",
        },
      ],
    },
    "fitness-studios": {
      hook: "Prospective members call while your trainers are coaching. Answer every call, explain your memberships, and book the intro session.",
      why: "Fitness studios and gyms hear from people interested in memberships, personal training, and classes, plus members with questions about schedules, freezes, and cancellations. Prospects who can't get an answer often pick another gym. The AI answers in your studio's name, answers membership and class questions from your FAQs, quotes your price list, and books intro sessions and consultations.",
      calls: [
        "Membership and pricing questions",
        "Intro sessions and free trial classes",
        "Personal training consultations",
        "Class schedule and childcare questions",
        "Membership freeze and cancellation policy questions",
        "Corporate and group membership inquiries",
      ],
      estimates: "corporate and group memberships",
      booking: "intro sessions and consultations",
      faqs: [
        {
          q: "Does the AI connect to our class booking software?",
          a: "No. It doesn't book into systems like Mindbody or ClassPass. It answers schedule questions from your FAQs and books intro sessions and consultations on your connected Google Calendar.",
        },
        {
          q: "Can it handle cancellation requests?",
          a: "It explains your cancellation policy from your FAQs in your words and takes the member's details for your team. It doesn't change memberships itself.",
        },
      ],
    },
    "driving-schools": {
      hook: "Parents and new drivers call to sign up for lessons. Answer every call, explain your programs, and book the lesson.",
      why: "Driving schools take calls from parents enrolling teens, adults who need lessons before a road test, and people with questions about permits, classroom hours, and state requirements. Instructors are usually in a car with a student when the phone rings. The AI answers in your school's name, answers program questions from your FAQs, quotes your lesson packages, and books lessons and road test appointments.",
      calls: [
        "Teen driver education enrollment",
        "Adult and refresher driving lessons",
        "Road test preparation and car rental for the test",
        "Permit, classroom, and state requirement questions",
        "Lesson package and pricing questions",
        "Students rescheduling lessons",
      ],
      estimates: "group programs and custom lesson plans",
      booking: "lessons",
      faqs: [
        {
          q: "Can the AI explain state requirements?",
          a: "It answers from the FAQs you write, like your state's permit and hour requirements. It never guesses at rules, and questions it can't answer are taken for your team.",
        },
        {
          q: "Can students reschedule a lesson by phone?",
          a: "Yes. Returning students are recognized by name, and the AI can move their booked lesson to another open time and text a confirmation.",
        },
      ],
    },
    "phone-computer-repair": {
      hook: "Cracked screens and dead laptops can't wait. Answer every call, quote your common repairs, and book the drop-off.",
      why: "Phone and computer repair shops get calls about cracked screens, batteries, water damage, slow computers, and data recovery. Customers want to know if you fix their model, what it costs, and how long it takes. The AI answers in your shop's name, captures the device and problem, quotes the repairs on your price list, and books the drop-off appointment.",
      calls: [
        "Cracked phone and tablet screens",
        "Battery and charging port replacements",
        "Water-damaged devices",
        "Slow computers and virus removal",
        "Data recovery questions",
        "Repair status and pickup questions",
      ],
      estimates: "board-level repairs and data recovery",
      booking: "repair appointments",
      faqs: [
        {
          q: "Can the AI quote a screen replacement?",
          a: "Yes. Add your repairs to your price list, like a screen replacement for a specific model, and once you approve it the AI reads back the exact price. It never guesses.",
        },
        {
          q: "Can it tell customers whether their repair is ready?",
          a: "No. It doesn't connect to your repair tracking. It takes the customer's details and texts your team to call back.",
        },
      ],
    },
  },
  variants: {
    "computer-it-services": {
      title: "Computer and IT services",
      body: "For IT providers who work on site at homes and small businesses, pick the on-site business type in setup. The AI captures the business, the problem, and the address, checks it against your service radius, and books the visit.",
    },
  },
};
