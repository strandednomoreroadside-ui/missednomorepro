type SocialName = "facebook" | "instagram" | "linkedin" | "tiktok" | "x" | "youtube";

const paths: Record<SocialName, React.ReactNode> = {
  facebook: (
    <path d="M13.5 21v-8h2.8l.42-3.2H13.5V7.75c0-.93.26-1.56 1.61-1.56h1.72V3.33c-.3-.04-1.32-.13-2.5-.13-2.48 0-4.17 1.51-4.17 4.29V9.8H7.35V13h2.81v8h3.34Z" />
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.6" cy="6.6" r="1.2" />
    </>
  ),
  linkedin: (
    <path d="M5.35 7.3A1.95 1.95 0 1 0 5.35 3.4a1.95 1.95 0 0 0 0 3.9ZM3.65 20.5h3.4V9.25h-3.4V20.5ZM9.25 9.25h3.26v1.54h.05c.45-.86 1.56-1.77 3.22-1.77 3.44 0 4.08 2.27 4.08 5.22v6.26h-3.4v-5.55c0-1.33-.03-3.03-1.85-3.03-1.85 0-2.13 1.44-2.13 2.93v5.65h-3.4V9.25h.17Z" />
  ),
  tiktok: (
    <path d="M15.6 3c.34 2.08 1.5 3.32 3.4 3.45V9.4a7.04 7.04 0 0 1-3.36-.82v6.04a5.62 5.62 0 1 1-4.85-5.57v3a2.67 2.67 0 1 0 1.86 2.55V3h2.95Z" />
  ),
  x: (
    <path d="M18.9 3h2.76l-6.03 6.9L22.72 21h-5.55l-4.35-5.68L7.86 21H5.1l6.42-7.34L4.72 3h5.69l3.93 5.2L18.9 3Zm-.97 16.05h1.53L9.57 4.85H7.93l10 14.2Z" />
  ),
  youtube: (
    <path d="M21.58 7.19a2.98 2.98 0 0 0-2.1-2.11C17.63 4.58 12 4.58 12 4.58s-5.63 0-7.48.5a2.98 2.98 0 0 0-2.1 2.11C1.92 9.05 1.92 12 1.92 12s0 2.95.5 4.81a2.98 2.98 0 0 0 2.1 2.11c1.85.5 7.48.5 7.48.5s5.63 0 7.48-.5a2.98 2.98 0 0 0 2.1-2.11c.5-1.86.5-4.81.5-4.81s0-2.95-.5-4.81ZM10 15.19V8.81L15.45 12 10 15.19Z" />
  ),
};

export function SocialIcon({ name, className = "size-5" }: { name: SocialName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
