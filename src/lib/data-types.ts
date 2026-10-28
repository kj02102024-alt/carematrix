export type WardKind = "icu" | "general" | "emergency";

export type Ward = {
  id: string;
  name: string;
  code: string;
  kind: WardKind;
  capacity: number;
  occupied: number;
  blocked: number;
  admissionsToday: number;
  pendingDischarge: number;
  avgLosDays: string;
  nursesOnShift: number;
  updatedAt?: string;
};

export type LabSeverity = "critical" | "high" | "abnormal";
export type LabStatus = "pending" | "acknowledged";

export type LabResult = {
  id: string;
  patientId: string;
  patientName: string;
  location: string;
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  severity: LabSeverity;
  slaMinutes: number;
  collectedAt: string;
  status: LabStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  orderCode: string;
};
