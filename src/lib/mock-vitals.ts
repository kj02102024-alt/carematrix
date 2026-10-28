export type VitalsPoint = {
  time: string;
  hr: number;
  sbp: number;
  dbp: number;
  spo2: number;
  rr: number;
  temp: number;
};

export type VitalsAlert = {
  id: string;
  time: string;
  severity: "critical" | "warning" | "success";
  title: string;
  detail: string;
  recommendation: string;
  parameters: string[];
  citation: { source: string; reference: string; quote: string };
  confidence: number;
};

export type VitalsPatient = {
  id: string;
  name: string;
  mrn: string;
  age: number;
  sex: string;
  unit: string;
  diagnosis: string;
  admitted: string;
  device: string;
  series: VitalsPoint[];
  alerts: VitalsAlert[];
};

const TIMES = [
  "02:00",
  "04:00",
  "06:00",
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "22:00",
  "00:00",
];

function seriesOf(
  hr: number[],
  sbp: number[],
  dbp: number[],
  spo2: number[],
  rr: number[],
  temp: number[],
): VitalsPoint[] {
  return TIMES.map((time, index) => ({
    time,
    hr: hr[index],
    sbp: sbp[index],
    dbp: dbp[index],
    spo2: spo2[index],
    rr: rr[index],
    temp: temp[index],
  }));
}

export const VITALS_PATIENTS: VitalsPatient[] = [
  {
    id: "PX-5540",
    name: "Mei Chen",
    mrn: "MRN 5540-02",
    age: 71,
    sex: "F",
    unit: "ICU-A · Bay 02",
    diagnosis: "Post-op perforated diverticulitis · evolving sepsis",
    admitted: "Day 2 · ICU",
    device: "Telemetry + continuous SpO₂ · 2L nasal cannula",
    series: seriesOf(
      [84, 86, 88, 96, 104, 110, 116, 120, 122, 124, 126, 128],
      [116, 114, 112, 108, 104, 100, 98, 96, 94, 92, 90, 88],
      [68, 66, 64, 62, 60, 58, 56, 55, 54, 52, 50, 48],
      [97, 97, 96, 95, 93, 92, 91, 90, 89, 88, 88, 87],
      [18, 18, 19, 21, 23, 25, 26, 27, 28, 29, 30, 31],
      [37.1, 37.2, 37.4, 37.8, 38.1, 38.4, 38.6, 38.7, 38.8, 38.9, 39.0, 39.1],
    ),
    alerts: [
      {
        id: "alert-5540-1",
        time: "22:00",
        severity: "critical",
        title: "Multi-parameter degradation — sepsis trajectory",
        detail:
          "SpO₂ has fallen 10 points while heart rate rose 44 bpm and respiratory rate rose 13 breaths/min across an 8-hour window. Three simultaneous parameter breaches of the deterioration policy.",
        recommendation:
          "Activate rapid response, draw blood cultures and lactate, start sepsis-six bundle, and discuss ICU escalation with the attending.",
        parameters: ["SpO₂ 88%", "HR 126 bpm", "RR 30/min", "SBP 90 mmHg", "Temp 39.0°C"],
        citation: {
          source: "CareMatrix deterioration policy CL-114",
          reference: "§6.2 · multi-parameter early warning",
          quote:
            "Two or more simultaneous parameter breaches with a rising MEWS score require rapid response activation within 15 minutes.",
        },
        confidence: 0.96,
      },
      {
        id: "alert-5540-2",
        time: "14:00",
        severity: "warning",
        title: "Tachycardia with preserved blood pressure",
        detail:
          "HR crossed 116 bpm before any blood pressure change. Isolated tachycardia can be masked by beta-blockade and precede hypotension by several hours.",
        recommendation: "Repeat lactate, fluid bolus 250 mL, and hourly urine output review.",
        parameters: ["HR 116 bpm", "SBP 98 mmHg", "SpO₂ 91%"],
        citation: {
          source: "CareMatrix deterioration policy CL-114",
          reference: "§4.1 · compensating tachycardia",
          quote:
            "Sustained heart rate above 110 bpm with rising respiratory rate should trigger a clinician review even when blood pressure is preserved.",
        },
        confidence: 0.9,
      },
    ],
  },
  {
    id: "PX-4471",
    name: "Rohan Iyer",
    mrn: "MRN 4471-08",
    age: 68,
    sex: "M",
    unit: "ICU-A · Bay 06",
    diagnosis: "AKI stage 2 · hyperkalaemia resolved · AF",
    admitted: "Day 3 · ICU",
    device: "Telemetry + intermittent SpO₂",
    series: seriesOf(
      [112, 110, 108, 104, 100, 98, 96, 94, 92, 90, 88, 86],
      [104, 106, 108, 110, 112, 116, 118, 120, 122, 124, 126, 124],
      [62, 64, 64, 66, 68, 70, 70, 72, 74, 74, 76, 74],
      [93, 94, 94, 95, 96, 96, 97, 97, 98, 98, 98, 98],
      [24, 23, 22, 21, 20, 19, 18, 18, 17, 16, 16, 16],
      [38.9, 38.7, 38.4, 38.1, 37.8, 37.5, 37.2, 37.0, 36.9, 36.8, 36.8, 36.7],
    ),
    alerts: [
      {
        id: "alert-4471-1",
        time: "02:00",
        severity: "success",
        title: "Reversal trajectory confirmed",
        detail:
          "Potassium normalised after calcium gluconate and insulin-dextrose. SpO₂ recovered from 93% to 98% and heart rate normalised over 12 hours.",
        recommendation: "Continue hourly monitoring for 6 more hours; repeat ECG at 06:00.",
        parameters: ["SpO₂ 98%", "HR 86 bpm", "Temp 36.7°C"],
        citation: {
          source: "Pathology analyzer AU-5800",
          reference: "Result LAB-88421 follow-up",
          quote: "Potassium 4.8 mmol/L at 23:40 — critical flag cleared after reversal therapy.",
        },
        confidence: 0.95,
      },
    ],
  },
  {
    id: "PX-7734",
    name: "Katarzyna Nowak",
    mrn: "MRN 7734-11",
    age: 59,
    sex: "F",
    unit: "GM-3W · 214",
    diagnosis: "Hypertensive emergency · hyponatraemia",
    admitted: "Day 1 · Ward",
    device: "Spot obs q4h",
    series: seriesOf(
      [76, 74, 78, 80, 82, 84, 86, 88, 90, 92, 94, 96],
      [178, 182, 186, 190, 188, 184, 180, 176, 172, 168, 164, 160],
      [98, 100, 102, 104, 102, 100, 98, 96, 94, 92, 90, 88],
      [98, 98, 97, 97, 97, 96, 96, 96, 95, 95, 95, 94],
      [16, 16, 16, 17, 17, 17, 18, 18, 18, 19, 19, 20],
      [36.9, 36.9, 37.0, 37.0, 37.1, 37.1, 37.2, 37.2, 37.3, 37.3, 37.4, 37.4],
    ),
    alerts: [
      {
        id: "alert-7734-1",
        time: "20:00",
        severity: "warning",
        title: "Hypertensive surge with falling SpO₂",
        detail:
          "Systolic pressure remains above 160 mmHg while SpO₂ has drifted from 98% to 95% and respiratory rate is climbing. Possible pulmonary congestion.",
        recommendation: "Auscultate lung bases, request chest radiograph, and review antihypertensive escalation.",
        parameters: ["SBP 164 mmHg", "SpO₂ 95%", "RR 19/min"],
        citation: {
          source: "CareMatrix deterioration policy CL-114",
          reference: "§7.4 · cardiopulmonary coupling",
          quote:
            "Rising respiratory rate with a falling oxygen saturation in a hypertensive patient warrants assessment for pulmonary oedema.",
        },
        confidence: 0.84,
      },
    ],
  },
];

export function mewsScore(point: VitalsPoint): number {
  let score = 0;
  if (point.hr >= 130) score += 3;
  else if (point.hr >= 111) score += 2;
  else if (point.hr >= 101) score += 1;
  else if (point.hr <= 40) score += 2;
  else if (point.hr <= 50) score += 1;

  if (point.sbp >= 200) score += 2;
  else if (point.sbp >= 101) score += 0;
  else if (point.sbp >= 81) score += 1;
  else if (point.sbp >= 71) score += 2;
  else score += 3;

  if (point.rr >= 30) score += 3;
  else if (point.rr >= 21) score += 2;
  else if (point.rr >= 15) score += 1;
  else if (point.rr <= 8) score += 2;

  if (point.temp >= 38.5) score += 2;
  else if (point.temp <= 35) score += 2;

  if (point.spo2 <= 91) score += 3;
  else if (point.spo2 <= 93) score += 2;
  else if (point.spo2 <= 95) score += 1;

  return score;
}
