export type Role = "admin" | "clinician" | "patient";

export type RoleProfile = {
  id: Role;
  label: string;
  shortLabel: string;
  name: string;
  title: string;
  initials: string;
  facility: string;
  clearance: string;
  scope: string;
};

export const ROLE_PROFILES: Record<Role, RoleProfile> = {
  admin: {
    id: "admin",
    label: "Admin",
    shortLabel: "Admin",
    name: "Meera Kapoor",
    title: "Operations Director",
    initials: "MK",
    facility: "St. Aurelia Central",
    clearance: "Tier 3 · Ops",
    scope: "Capacity, throughput & audit governance",
  },
  clinician: {
    id: "clinician",
    label: "Clinician",
    shortLabel: "Clinician",
    name: "Dr. Arjun Sharma",
    title: "Attending · Internal Medicine",
    initials: "AS",
    facility: "St. Aurelia Central",
    clearance: "Tier 4 · Clinical",
    scope: "Labs, prescriptions & deterioration watch",
  },
  patient: {
    id: "patient",
    label: "Patient",
    shortLabel: "Patient",
    name: "Lina Alvarez",
    title: "Post-discharge · MRN 8842-01",
    initials: "LA",
    facility: "St. Aurelia Central",
    clearance: "Consent scoped",
    scope: "Care plan, medication & follow-up actions",
  },
};

export const ROLE_ORDER: Role[] = ["admin", "clinician", "patient"];

export type NavGroup =
  | "Admin & Operations"
  | "Clinical Safety Engine"
  | "Vitals & Diagnostics"
  | "Patient Experience";

export type NavItem = {
  href: string;
  label: string;
  code: string;
  icon: string;
  group: NavGroup;
  roles: Role[];
  description: string;
  tag?: string;
  tagTone?: "ok" | "warn" | "crit" | "info" | "ai";
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/bedflow",
    label: "BedFlow",
    code: "BF-01",
    icon: "bed",
    group: "Admin & Operations",
    roles: ["admin", "clinician"],
    description: "Live bed capacity, ward pressure & what-if simulation",
    tag: "92%",
    tagTone: "warn",
  },
  {
    href: "/clinical/labloop",
    label: "LabLoop",
    code: "LL-02",
    icon: "flask",
    group: "Clinical Safety Engine",
    roles: ["admin", "clinician"],
    description: "Critical result tracking with escalation countdowns",
    tag: "3 crit",
    tagTone: "crit",
  },
  {
    href: "/clinical/medmismatch",
    label: "MedMismatch",
    code: "MM-03",
    icon: "files",
    group: "Clinical Safety Engine",
    roles: ["admin", "clinician"],
    description: "Cross-document discrepancy detection with cited evidence",
    tag: "2 open",
    tagTone: "warn",
  },
  {
    href: "/clinical/doseguard",
    label: "DoseGuard",
    code: "DG-04",
    icon: "shield",
    group: "Clinical Safety Engine",
    roles: ["admin", "clinician"],
    description: "Duplicate ingredient & interaction detection across prescribers",
    tag: "4 flags",
    tagTone: "crit",
  },
  {
    href: "/clinical/silentsignal",
    label: "SilentSignal",
    code: "SS-05",
    icon: "activity",
    group: "Vitals & Diagnostics",
    roles: ["admin", "clinician"],
    description: "Multi-parameter deterioration watchdog with EWS trends",
    tag: "LIVE",
    tagTone: "ok",
  },
  {
    href: "/clinical/scancompare",
    label: "ScanCompare",
    code: "SC-06",
    icon: "scan",
    group: "Vitals & Diagnostics",
    roles: ["admin", "clinician"],
    description: "Prior vs current imaging alignment and visual diff",
  },
  {
    href: "/patient/followupshield",
    label: "FollowUpShield",
    code: "FS-07",
    icon: "heart",
    group: "Patient Experience",
    roles: ["admin", "clinician", "patient"],
    description: "Multi-document intake into a risk-scored daily checklist",
    tag: "62 risk",
    tagTone: "info",
  },
];

export const NAV_GROUPS: NavGroup[] = [
  "Admin & Operations",
  "Clinical Safety Engine",
  "Vitals & Diagnostics",
  "Patient Experience",
];

export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
