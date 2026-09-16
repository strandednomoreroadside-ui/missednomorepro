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
  },
  variants: {},
};
