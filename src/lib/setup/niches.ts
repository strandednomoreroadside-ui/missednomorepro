/**
 * The industry catalog: 12 categories, each with its sub-niches. PURE data
 * (no I/O), shared by the setup wizard, the call-script rules in
 * src/lib/voice/industry.ts, and the /industries marketing pages.
 *
 * `name` is what setup stores in businesses.industry and what the AI hears
 * as the business type, so renaming one changes that business's prompt.
 *
 * Call-script behavior per niche:
 * - mode "onsite" (default): the business goes to the customer, so the AI
 *   collects a service address, checks the service radius, and can dispatch.
 * - mode "office": customers visit, meet, or call; no service address, no
 *   service-area check, and nothing is ever "on the way".
 * - vehicle: the AI also collects the vehicle's year, make, and model.
 *
 * Marketing pages: `page` points at a hand-built landing page; `partOf` folds
 * a near-duplicate niche into another niche's page (one page per real search
 * intent) and renders as a section there. `setupOnly` niches get no
 * marketing at all. Every other niche gets a generated /industries page.
 */

export type CategoryId =
  | "hvac-plumbing-electrical"
  | "emergency-home-services"
  | "exterior-home-services"
  | "cleaning-restoration"
  | "construction-remodeling"
  | "lawn-landscape-outdoor"
  | "automotive"
  | "towing-transportation-dispatch"
  | "property-real-estate"
  | "rentals-events"
  | "beauty-personal-services"
  | "pet-services";

export type Category = { id: CategoryId; name: string; blurb: string };

export type Niche = {
  name: string;
  slug: string;
  category: CategoryId;
  mode?: "office";
  vehicle?: true;
  /** Legacy businesses.industry values that mean this niche. */
  aliases?: string[];
  page?: string;
  partOf?: string;
  /** In setup, but no marketing page or hub listing (regulated/sensitive). */
  setupOnly?: true;
};

export const CATEGORIES: Category[] = [
  { id: "hvac-plumbing-electrical", name: "HVAC, Plumbing & Electrical", blurb: "Heating, cooling, plumbing, drains, electrical, generators, and appliance repair" },
  { id: "emergency-home-services", name: "Emergency Home Services", blurb: "Locksmiths, garage doors, pest control, board-up, glass, and security" },
  { id: "exterior-home-services", name: "Exterior Home Services", blurb: "Roofing, gutters, siding, windows, painting, fences, decks, and concrete" },
  { id: "cleaning-restoration", name: "Cleaning & Restoration", blurb: "Water, fire, and mold restoration, cleanup, junk removal, and cleaning" },
  { id: "construction-remodeling", name: "Construction & Remodeling", blurb: "General contractors, remodelers, flooring, foundations, and handymen" },
  { id: "lawn-landscape-outdoor", name: "Lawn, Landscape & Outdoor", blurb: "Landscaping, lawn care, trees, irrigation, snow, pools, and hot tubs" },
  { id: "automotive", name: "Automotive & Mobile Automotive", blurb: "Repair and body shops, mobile mechanics, tires, glass, and detailing" },
  { id: "towing-transportation-dispatch", name: "Towing, Transportation & Dispatch", blurb: "Towing, roadside, movers, couriers, trucking, and chauffeur services" },
  { id: "property-real-estate", name: "Property & Real Estate", blurb: "Property management, real estate, inspections, mortgages, insurance, and storage" },
  { id: "rentals-events", name: "Rentals & Events", blurb: "Dumpster, equipment, and party rentals, venues, catering, and event pros" },
  { id: "beauty-personal-services", name: "Beauty & Personal Services", blurb: "Salons, barbershops, studios, fitness, tax prep, bail bonds, and more" },
  { id: "pet-services", name: "Pet Services", blurb: "Groomers, trainers, boarding, pet sitting, and veterinary clinics" },
];

const c = (category: CategoryId, niches: Omit<Niche, "category">[]): Niche[] =>
  niches.map((n) => ({ ...n, category }));

export const NICHE_CATALOG: Niche[] = [
  ...c("hvac-plumbing-electrical", [
    { name: "HVAC contractors", slug: "hvac-contractors", aliases: ["HVAC"], page: "/ai-receptionist-for-hvac" },
    { name: "Emergency HVAC", slug: "emergency-hvac", partOf: "hvac-contractors" },
    { name: "Commercial HVAC", slug: "commercial-hvac", partOf: "hvac-contractors" },
    { name: "Plumbing companies", slug: "plumbing-companies", aliases: ["Plumbing"], page: "/ai-receptionist-for-plumbers" },
    { name: "24/7 emergency plumbers", slug: "emergency-plumbers", partOf: "plumbing-companies" },
    { name: "Commercial plumbing", slug: "commercial-plumbing", partOf: "plumbing-companies" },
    { name: "Drain cleaning & sewer companies", slug: "drain-cleaning-sewer" },
    { name: "Septic services", slug: "septic-services" },
    { name: "Grease trap cleaning", slug: "grease-trap-cleaning" },
    { name: "Electrical contractors", slug: "electrical-contractors", aliases: ["Electrician"], page: "/ai-receptionist-for-electricians" },
    { name: "Commercial electrical", slug: "commercial-electrical", partOf: "electrical-contractors" },
    { name: "Generator installation & repair", slug: "generator-installation-repair" },
    { name: "Electricians offering generator service", slug: "electricians-generator-service", partOf: "generator-installation-repair" },
    { name: "Solar installers", slug: "solar-installers", aliases: ["Solar installation"] },
    { name: "Appliance repair", slug: "appliance-repair" },
    { name: "Commercial appliance repair", slug: "commercial-appliance-repair", partOf: "appliance-repair" },
    { name: "Commercial refrigeration repair", slug: "commercial-refrigeration-repair" },
    { name: "Restaurant equipment repair", slug: "restaurant-equipment-repair", partOf: "commercial-refrigeration-repair" },
    { name: "Heating oil & propane delivery", slug: "heating-oil-propane-delivery" },
    { name: "Water treatment & wells", slug: "water-treatment-wells" },
  ]),
  ...c("emergency-home-services", [
    { name: "Locksmiths", slug: "locksmiths", aliases: ["Locksmith"], page: "/ai-receptionist-for-locksmiths" },
    { name: "Commercial locksmiths", slug: "commercial-locksmiths", partOf: "locksmiths" },
    { name: "Safe opening companies", slug: "safe-opening", partOf: "locksmiths" },
    { name: "Garage door repair", slug: "garage-door-repair", page: "/ai-receptionist-for-garage-door-repair" },
    { name: "Garage door installation", slug: "garage-door-installation", partOf: "garage-door-repair" },
    { name: "Commercial overhead door repair", slug: "commercial-overhead-door-repair", partOf: "garage-door-repair" },
    { name: "Pest control companies", slug: "pest-control", aliases: ["Pest control"] },
    { name: "Termite control companies", slug: "termite-control" },
    { name: "Bed bug exterminators", slug: "bed-bug-exterminators" },
    { name: "Wildlife & pest removal", slug: "wildlife-removal", aliases: ["Wildlife removal"] },
    { name: "Emergency board-up services", slug: "emergency-board-up" },
    { name: "Storm damage contractors", slug: "storm-damage-contractors" },
    { name: "Glass repair & replacement", slug: "glass-repair-replacement", aliases: ["Glass & mirror"] },
    { name: "Security & alarm installers", slug: "security-alarm-installers", aliases: ["Security & alarm"] },
    { name: "Gate & access control installers", slug: "gate-access-control", partOf: "security-alarm-installers" },
  ]),
  ...c("exterior-home-services", [
    { name: "Roofing contractors", slug: "roofing-contractors", aliases: ["Roofing"], page: "/ai-receptionist-for-roofers" },
    { name: "Gutter companies", slug: "gutter-companies", aliases: ["Gutter services"] },
    { name: "Siding contractors", slug: "siding-contractors", aliases: ["Siding"] },
    { name: "Exterior remodeling companies", slug: "exterior-remodeling", partOf: "siding-contractors" },
    { name: "Window & door companies", slug: "window-door-companies", aliases: ["Windows & doors"] },
    { name: "Painting contractors", slug: "painting-contractors", aliases: ["Painting"] },
    { name: "Pressure washing & soft washing", slug: "pressure-washing", aliases: ["Pressure washing"] },
    { name: "Chimney & fireplace companies", slug: "chimney-fireplace", aliases: ["Chimney sweep"] },
    { name: "Fence contractors", slug: "fence-contractors" },
    { name: "Fence repair", slug: "fence-repair", partOf: "fence-contractors" },
    { name: "Deck & patio builders", slug: "deck-patio-builders", aliases: ["Deck & fence"] },
    { name: "Concrete contractors", slug: "concrete-contractors", aliases: ["Concrete & masonry"] },
    { name: "Asphalt & paving companies", slug: "asphalt-paving", aliases: ["Paving & asphalt"] },
  ]),
  ...c("cleaning-restoration", [
    { name: "Water damage restoration", slug: "water-damage-restoration", aliases: ["Restoration & water damage"] },
    { name: "Flood cleanup", slug: "flood-cleanup", partOf: "water-damage-restoration" },
    { name: "Fire restoration companies", slug: "fire-restoration" },
    { name: "Mold remediation companies", slug: "mold-remediation", aliases: ["Mold remediation"] },
    { name: "Cleaning & restoration franchises", slug: "cleaning-restoration-franchises", partOf: "water-damage-restoration" },
    { name: "Biohazard cleanup companies", slug: "biohazard-cleanup" },
    { name: "Crime scene cleanup", slug: "crime-scene-cleanup", partOf: "biohazard-cleanup" },
    { name: "Hoarding cleanup companies", slug: "hoarding-cleanup" },
    { name: "Estate cleanout companies", slug: "estate-cleanout", partOf: "junk-removal" },
    { name: "Junk removal", slug: "junk-removal" },
    { name: "Lead & asbestos remediation", slug: "lead-asbestos-remediation" },
    { name: "Radon testing & mitigation", slug: "radon-mitigation" },
    { name: "Residential cleaning companies", slug: "residential-cleaning", aliases: ["Cleaning"] },
    { name: "Commercial cleaning companies", slug: "commercial-cleaning", aliases: ["Commercial cleaning"] },
    { name: "Janitorial companies", slug: "janitorial", partOf: "commercial-cleaning" },
    { name: "Office cleaning companies", slug: "office-cleaning", partOf: "commercial-cleaning" },
    { name: "Carpet & upholstery cleaning", slug: "carpet-upholstery-cleaning", aliases: ["Carpet cleaning"] },
    { name: "Air duct cleaning", slug: "air-duct-cleaning", aliases: ["Duct cleaning"] },
    { name: "Dryer vent cleaning", slug: "dryer-vent-cleaning", partOf: "air-duct-cleaning" },
    { name: "Commercial hood cleaning", slug: "commercial-hood-cleaning" },
    { name: "Window cleaning", slug: "window-cleaning" },
    { name: "Home organizing services", slug: "home-organizing" },
  ]),
  ...c("construction-remodeling", [
    { name: "General contractors", slug: "general-contractors", aliases: ["Home remodeling"] },
    { name: "Handyman companies", slug: "handyman", aliases: ["Handyman"] },
    { name: "Kitchen & bath remodelers", slug: "kitchen-bath-remodelers" },
    { name: "Flooring installers", slug: "flooring-installers", aliases: ["Flooring"] },
    { name: "Epoxy flooring companies", slug: "epoxy-flooring" },
    { name: "Garage floor coating companies", slug: "garage-floor-coating", partOf: "epoxy-flooring" },
    { name: "Cabinet companies", slug: "cabinet-companies", aliases: ["Cabinets & countertops"] },
    { name: "Countertop installers", slug: "countertop-installers", partOf: "cabinet-companies" },
    { name: "Closet installation companies", slug: "closet-installation" },
    { name: "Insulation contractors", slug: "insulation-contractors", aliases: ["Insulation"] },
    { name: "Insulation removal", slug: "insulation-removal", partOf: "insulation-contractors" },
    { name: "Foundation repair companies", slug: "foundation-repair", aliases: ["Foundation repair"] },
    { name: "Basement waterproofing", slug: "basement-waterproofing" },
    { name: "Crawlspace encapsulation", slug: "crawlspace-encapsulation", partOf: "basement-waterproofing" },
    { name: "Excavation contractors", slug: "excavation-contractors", aliases: ["Excavation"] },
    { name: "Drywall contractors", slug: "drywall", aliases: ["Drywall"] },
    { name: "Carpentry", slug: "carpentry", partOf: "handyman" },
    { name: "Welding & fabrication", slug: "welding-fabrication" },
  ]),
  ...c("lawn-landscape-outdoor", [
    { name: "Landscaping companies", slug: "landscaping", aliases: ["Landscaping"] },
    { name: "Hardscaping", slug: "hardscaping", partOf: "landscaping" },
    { name: "Lawn care companies", slug: "lawn-care", aliases: ["Lawn care"] },
    { name: "Tree service companies", slug: "tree-service", aliases: ["Tree service"] },
    { name: "Emergency tree removal", slug: "emergency-tree-removal", partOf: "tree-service" },
    { name: "Irrigation & sprinkler companies", slug: "irrigation-sprinklers", aliases: ["Irrigation & sprinklers"] },
    { name: "Snow removal companies", slug: "snow-removal", aliases: ["Snow removal"] },
    { name: "Pool service & repair", slug: "pool-service-repair", aliases: ["Pool & spa service"] },
    { name: "Pool opening & closing services", slug: "pool-opening-closing", partOf: "pool-service-repair" },
    { name: "Pool installation companies", slug: "pool-installation" },
    { name: "Hot tub service & repair", slug: "hot-tub-service", partOf: "pool-service-repair" },
    { name: "Mosquito control companies", slug: "mosquito-control" },
    { name: "Holiday light installation", slug: "holiday-light-installation" },
  ]),
  ...c("automotive", [
    { name: "Auto repair shops", slug: "auto-repair-shops", mode: "office", vehicle: true, aliases: ["Auto repair shop"] },
    { name: "Tire shops", slug: "tire-shops", mode: "office", vehicle: true, aliases: ["Tire shop"], partOf: "auto-repair-shops" },
    { name: "Auto body & collision shops", slug: "auto-body-collision", mode: "office", vehicle: true },
    { name: "Mobile mechanics", slug: "mobile-mechanics", vehicle: true, aliases: ["Mobile mechanic"] },
    { name: "Mobile diesel mechanics", slug: "mobile-diesel-mechanics", vehicle: true },
    { name: "Mobile tire services", slug: "mobile-tire-services", vehicle: true },
    { name: "Mobile battery replacement", slug: "mobile-battery-replacement", vehicle: true, partOf: "mobile-mechanics" },
    { name: "Windshield repair & replacement", slug: "windshield-repair-replacement", vehicle: true, aliases: ["Auto glass"] },
    { name: "Mobile windshield replacement", slug: "mobile-windshield-replacement", vehicle: true, partOf: "windshield-repair-replacement" },
    { name: "Paintless dent repair", slug: "paintless-dent-repair", vehicle: true },
    { name: "Auto detailing", slug: "auto-detailing", vehicle: true },
    { name: "Mobile detailing", slug: "mobile-detailing", vehicle: true, partOf: "auto-detailing" },
    { name: "Mobile car wash", slug: "mobile-car-wash", vehicle: true, partOf: "auto-detailing" },
    { name: "Motorcycle repair", slug: "motorcycle-repair", mode: "office", vehicle: true },
    { name: "RV repair & mobile RV service", slug: "rv-repair", vehicle: true },
    { name: "Boat repair & marine mechanics", slug: "boat-repair-marine", vehicle: true },
    { name: "Trailer repair", slug: "trailer-repair", mode: "office", vehicle: true, partOf: "commercial-truck-repair" },
    { name: "Heavy equipment repair", slug: "heavy-equipment-repair", vehicle: true },
    { name: "Commercial truck repair", slug: "commercial-truck-repair", mode: "office", vehicle: true },
    { name: "Fleet maintenance companies", slug: "fleet-maintenance", vehicle: true },
  ]),
  ...c("towing-transportation-dispatch", [
    { name: "Towing companies", slug: "towing-companies", vehicle: true, aliases: ["Towing"], page: "/ai-receptionist-for-towing" },
    { name: "Roadside assistance companies", slug: "roadside-assistance", vehicle: true, aliases: ["Roadside assistance"], page: "/ai-receptionist-for-towing" },
    { name: "Heavy-duty towing", slug: "heavy-duty-towing", vehicle: true, partOf: "towing-companies" },
    { name: "Parking lot towing", slug: "parking-lot-towing", vehicle: true },
    { name: "Private property towing", slug: "private-property-towing", vehicle: true, partOf: "parking-lot-towing" },
    { name: "Equipment hauling", slug: "equipment-hauling" },
    { name: "Moving companies", slug: "moving-companies", aliases: ["Moving services"] },
    { name: "Moving & storage companies", slug: "moving-storage", partOf: "moving-companies" },
    { name: "Furniture movers", slug: "furniture-movers", partOf: "moving-companies" },
    { name: "Long-distance movers", slug: "long-distance-movers", partOf: "moving-companies" },
    { name: "Office movers", slug: "office-movers", partOf: "moving-companies" },
    { name: "Piano movers", slug: "piano-movers" },
    { name: "Pool table movers", slug: "pool-table-movers", partOf: "piano-movers" },
    { name: "Courier & delivery companies", slug: "courier-delivery" },
    { name: "Last-mile delivery companies", slug: "last-mile-delivery", partOf: "courier-delivery" },
    { name: "Freight brokers", slug: "freight-brokers", mode: "office" },
    { name: "Local trucking companies", slug: "local-trucking" },
    { name: "Private transportation & chauffeur services", slug: "chauffeur-services" },
    { name: "Black car services", slug: "black-car-services", partOf: "chauffeur-services" },
    { name: "Limousine companies", slug: "limousine-companies" },
    { name: "Wedding transportation", slug: "wedding-transportation", partOf: "limousine-companies" },
    { name: "Airport transportation", slug: "airport-transportation", partOf: "chauffeur-services" },
    { name: "Party bus companies", slug: "party-bus-companies" },
  ]),
  ...c("property-real-estate", [
    { name: "Property management companies", slug: "property-management" },
    { name: "Apartment management companies", slug: "apartment-management" },
    { name: "Vacation rental management", slug: "vacation-rental-management" },
    { name: "Real estate agents", slug: "real-estate-agents", mode: "office", setupOnly: true },
    { name: "Real estate teams", slug: "real-estate-teams", mode: "office", setupOnly: true },
    { name: "Real estate brokerages", slug: "real-estate-brokerages", mode: "office", setupOnly: true },
    { name: "Commercial real estate firms", slug: "commercial-real-estate", mode: "office", setupOnly: true },
    { name: "Home inspectors", slug: "home-inspectors", aliases: ["Home inspection"] },
    { name: "Appraisers", slug: "appraisers", setupOnly: true },
    { name: "Mortgage brokers", slug: "mortgage-brokers", mode: "office", setupOnly: true },
    { name: "Loan officers", slug: "loan-officers", mode: "office", setupOnly: true },
    { name: "Insurance agencies", slug: "insurance-agencies", mode: "office", setupOnly: true },
    { name: "Independent insurance brokers", slug: "insurance-brokers", mode: "office", setupOnly: true },
    { name: "Commercial maintenance companies", slug: "commercial-maintenance", aliases: ["Property maintenance"] },
    { name: "Facility maintenance contractors", slug: "facility-maintenance", partOf: "commercial-maintenance" },
    { name: "Self-storage facilities", slug: "self-storage", mode: "office" },
    { name: "Storage facilities", slug: "storage-facilities", mode: "office", partOf: "self-storage" },
    { name: "RV storage", slug: "rv-storage", mode: "office", partOf: "self-storage" },
    { name: "Boat storage", slug: "boat-storage", mode: "office", partOf: "self-storage" },
  ]),
  ...c("rentals-events", [
    { name: "Dumpster rental companies", slug: "dumpster-rental" },
    { name: "Roll-off dumpster rental", slug: "roll-off-dumpster-rental", partOf: "dumpster-rental" },
    { name: "Portable toilet rentals", slug: "portable-toilet-rental" },
    { name: "Portable storage container rental", slug: "portable-storage-rental" },
    { name: "Temporary fence rental", slug: "temporary-fence-rental", partOf: "equipment-rental" },
    { name: "Equipment rental companies", slug: "equipment-rental" },
    { name: "Tent & event rental companies", slug: "tent-event-rental" },
    { name: "Wedding rental companies", slug: "wedding-rentals", partOf: "tent-event-rental" },
    { name: "Bounce house & party rentals", slug: "bounce-house-rental" },
    { name: "Photo booth rental companies", slug: "photo-booth-rental" },
    { name: "Boat rental companies", slug: "boat-rental", mode: "office" },
    { name: "Wedding venues", slug: "wedding-venues", mode: "office" },
    { name: "Event venues", slug: "event-venues", mode: "office", partOf: "wedding-venues" },
    { name: "Catering companies", slug: "catering" },
    { name: "Wedding planners", slug: "wedding-planners", mode: "office" },
    { name: "Event planners", slug: "event-planners", mode: "office", partOf: "wedding-planners" },
    { name: "Party planners", slug: "party-planners", mode: "office", partOf: "wedding-planners" },
    { name: "Wedding DJs", slug: "wedding-djs" },
    { name: "Commercial photographers", slug: "commercial-photographers" },
  ]),
  ...c("beauty-personal-services", [
    { name: "Hair salons", slug: "hair-salons", mode: "office", aliases: ["Hair salon"], page: "/ai-receptionist-for-salons" },
    { name: "Barbershops", slug: "barbershops", mode: "office", aliases: ["Barbershop"], page: "/ai-receptionist-for-salons" },
    { name: "Nail salons", slug: "nail-salons", mode: "office", aliases: ["Nail salon"], page: "/ai-receptionist-for-salons" },
    { name: "Day spas & massage", slug: "day-spa-massage", mode: "office", aliases: ["Day spa & massage"], page: "/ai-receptionist-for-salons" },
    { name: "Lash & brow studios", slug: "lash-brow-studios", mode: "office", aliases: ["Lash & brow studio"], page: "/ai-receptionist-for-salons" },
    { name: "Tattoo studios", slug: "tattoo-studios", mode: "office", aliases: ["Tattoo & piercing studio"] },
    { name: "Permanent makeup businesses", slug: "permanent-makeup", mode: "office" },
    { name: "Fitness studios & gyms", slug: "fitness-studios", mode: "office", aliases: ["Fitness studio & gym"] },
    { name: "Tax preparation firms", slug: "tax-preparation", mode: "office", setupOnly: true },
    { name: "Bail bond agencies", slug: "bail-bonds", mode: "office", setupOnly: true },
    { name: "Funeral homes", slug: "funeral-homes", mode: "office", setupOnly: true },
    { name: "Driving schools", slug: "driving-schools", mode: "office" },
    { name: "Phone & computer repair shops", slug: "phone-computer-repair", mode: "office", aliases: ["Phone & computer repair shop"] },
    { name: "Computer & IT services", slug: "computer-it-services", partOf: "phone-computer-repair" },
  ]),
  ...c("pet-services", [
    { name: "Dog groomers", slug: "dog-groomers", mode: "office", aliases: ["Pet grooming salon"] },
    { name: "Mobile pet groomers", slug: "mobile-pet-groomers", aliases: ["Mobile pet grooming"] },
    { name: "Dog trainers", slug: "dog-trainers" },
    { name: "Pet boarding & daycare", slug: "pet-boarding-daycare", mode: "office" },
    { name: "Dog walking & pet sitting", slug: "dog-walking-pet-sitting" },
    { name: "Veterinary clinics", slug: "veterinary-clinics", mode: "office", aliases: ["Veterinary clinic"] },
    { name: "Pet waste removal", slug: "pet-waste-removal" },
  ]),
];

export const OTHER_NICHE = "Other";

const key = (s: string) => s.toLowerCase().trim();
const BY_NAME = new Map<string, Niche>();
for (const n of NICHE_CATALOG) {
  BY_NAME.set(key(n.name), n);
  for (const a of n.aliases ?? []) BY_NAME.set(key(a), n);
}

/** The catalog niche for a stored industry value (current name or legacy alias). */
export function findNiche(industry: string | null | undefined): Niche | undefined {
  return industry ? BY_NAME.get(key(industry)) : undefined;
}

export function nichesIn(category: CategoryId): Niche[] {
  return NICHE_CATALOG.filter((n) => n.category === category);
}
