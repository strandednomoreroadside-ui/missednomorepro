import type { FaqItem } from "../faq";

/**
 * Page content for one generated /industries niche page. Every string must
 * describe what the product actually does for that niche.
 *
 * Phrases are dropped into fixed sentences, so write them to fit:
 * - quotes:    "Set your prices for {quotes}, plus travel zones..." (on-site niches only;
 *              the quote engine prices by the caller's driving distance)
 * - estimates: "For {estimates}, the AI captures what the caller needs..."
 * - urgent:    "When a caller has {urgent}, the AI..." (on-site niches only)
 * - booking:   "{Booking} booked, reminders sent" / "books {booking} into open times"
 */
export type NicheContent = {
  hook: string;
  why: string;
  calls: string[];
  quotes?: string;
  estimates?: string;
  urgent?: string;
  booking?: string;
  faqs: FaqItem[];
};

/** A close variant folded into its parent niche's page as one section. */
export type VariantContent = { title: string; body: string };

export type CategoryFile = {
  intro: string;
  niches: Record<string, NicheContent>;
  variants: Record<string, VariantContent>;
};
