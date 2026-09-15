export type RadioLayout = "stack" | "twin" | "top" | "side";

export const RADIO_FACES = [
  { id: "steel", name: "Steel", blurb: "Shop", layout: "stack" },
  { id: "field", name: "Field", blurb: "Patrol", layout: "stack" },
  { id: "night", name: "Night", blurb: "Low light", layout: "stack" },
  { id: "brick", name: "Brick", blurb: "Handheld", layout: "stack" },
  { id: "sun", name: "Sun", blurb: "Bright", layout: "twin" },
  { id: "vintage", name: "Vintage", blurb: "Old time", layout: "top" },
  { id: "rugged", name: "Rugged", blurb: "Mil-spec", layout: "side" },
] as const;

export const OPERATOR_FACES = [
  { id: "fox", name: "Fox" },
  { id: "hawk", name: "Hawk" },
  { id: "wolf", name: "Wolf" },
  { id: "bear", name: "Bear" },
  { id: "owl", name: "Owl" },
  { id: "lynx", name: "Lynx" },
] as const;

export type RadioFaceId = (typeof RADIO_FACES)[number]["id"];
export type OperatorFaceId = (typeof OPERATOR_FACES)[number]["id"];

const RADIO_IDS = new Set<string>(RADIO_FACES.map((f) => f.id));
const OPERATOR_IDS = new Set<string>(OPERATOR_FACES.map((f) => f.id));

export function resolveRadioFace(id: string | null | undefined): RadioFaceId {
  if (id && RADIO_IDS.has(id)) return id as RadioFaceId;
  return "steel";
}

export function resolveOperatorFace(id: string | null | undefined): OperatorFaceId {
  if (id && OPERATOR_IDS.has(id)) return id as OperatorFaceId;
  return "fox";
}

export function radioFaceName(id: string | null | undefined): string {
  const resolved = resolveRadioFace(id);
  return RADIO_FACES.find((f) => f.id === resolved)?.name ?? "Steel";
}

export function radioFaceLayout(id: string | null | undefined): RadioLayout {
  const resolved = resolveRadioFace(id);
  return RADIO_FACES.find((f) => f.id === resolved)?.layout ?? "stack";
}
