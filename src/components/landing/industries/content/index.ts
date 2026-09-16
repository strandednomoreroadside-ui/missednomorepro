import type { CategoryId } from "@/lib/setup/niches";

import type { CategoryFile, NicheContent, VariantContent } from "../types";
import { automotive } from "./automotive";
import { beautyPersonalServices } from "./beauty-personal-services";
import { cleaningRestoration } from "./cleaning-restoration";
import { constructionRemodeling } from "./construction-remodeling";
import { emergencyHomeServices } from "./emergency-home-services";
import { exteriorHomeServices } from "./exterior-home-services";
import { hvacPlumbingElectrical } from "./hvac-plumbing-electrical";
import { lawnLandscapeOutdoor } from "./lawn-landscape-outdoor";
import { petServices } from "./pet-services";
import { propertyRealEstate } from "./property-real-estate";
import { rentalsEvents } from "./rentals-events";
import { towingTransportationDispatch } from "./towing-transportation-dispatch";

const FILES: Record<CategoryId, CategoryFile> = {
  "hvac-plumbing-electrical": hvacPlumbingElectrical,
  "emergency-home-services": emergencyHomeServices,
  "exterior-home-services": exteriorHomeServices,
  "cleaning-restoration": cleaningRestoration,
  "construction-remodeling": constructionRemodeling,
  "lawn-landscape-outdoor": lawnLandscapeOutdoor,
  automotive,
  "towing-transportation-dispatch": towingTransportationDispatch,
  "property-real-estate": propertyRealEstate,
  "rentals-events": rentalsEvents,
  "beauty-personal-services": beautyPersonalServices,
  "pet-services": petServices,
};

export const CATEGORY_INTROS: Record<CategoryId, string> = Object.fromEntries(
  Object.entries(FILES).map(([id, file]) => [id, file.intro])
) as Record<CategoryId, string>;

export const NICHE_CONTENT: Record<string, NicheContent> = Object.assign(
  {},
  ...Object.values(FILES).map((file) => file.niches)
);

export const VARIANT_CONTENT: Record<string, VariantContent> = Object.assign(
  {},
  ...Object.values(FILES).map((file) => file.variants)
);
