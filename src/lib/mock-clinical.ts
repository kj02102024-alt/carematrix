export type MedDocLine = { id: string; text: string };
export type MedDocument = {
  id: string;
  title: string;
  kind: "intake" | "chart" | "mar";
  subtitle: string;
  author: string;
  timestamp: string;
  pages: string;
  lines: MedDocLine[];
};

export type Evidence = { docId: string; lineId: string; quote: string };

export type Discrepancy = {
  id: string;
  category: "Contradiction" | "Omission" | "Stale value" | "Allergy conflict" | "Dose mismatch";
  severity: "critical" | "high" | "moderate";
  title: string;
  summary: string;
  recommendation: string;
  aiRationale: string;
  confidence: number;
  evidence: Evidence[];
};

export type MedPatient = {
  id: string;
  name: string;
  mrn: string;
  age: number;
  sex: string;
  unit: string;
  problem: string;
  risk: "critical" | "high" | "moderate";
  documents: MedDocument[];
  discrepancies: Discrepancy[];
};

export const MED_PATIENTS: MedPatient[] = [
  {
    id: "PX-4471",
    name: "Rohan Iyer",
    mrn: "MRN 4471-08",
    age: 68,
    sex: "M",
    unit: "ICU-A · Bay 06",
    problem: "AKI stage 2 · hyperkalaemia · AF",
    risk: "critical",
    documents: [
      {
        id: "doc-intake-4471",
        title: "ED intake note",
        kind: "intake",
        subtitle: "Free-text triage & medication history",
        author: "Dr. H. Chen · Emergency",
        timestamp: "Today · 02:14",
        pages: "2 pages · scanned OCR",
        lines: [
          { id: "i1", text: "68-year-old male, 4-day history of lethargy and reduced oral intake." },
          { id: "i2", text: "PMH: atrial fibrillation, CKD stage 3b, hypertension, type 2 diabetes." },
          { id: "i3", text: "Home anticoagulation: warfarin 5 mg daily, INR monitored weekly at community clinic." },
          { id: "i4", text: "Patient reports taking apixaban 5 mg twice daily since cardiology review in March." },
          { id: "i5", text: "Other home meds: metoprolol succinate 50 mg, furosemide 40 mg, ramipril 5 mg." },
          { id: "i6", text: "Denies bleeding, melaena or falls. NKDA documented at triage." },
        ],
      },
      {
        id: "doc-mar-4471",
        title: "Current medication administration record",
        kind: "chart",
        subtitle: "Active inpatient chart · eMAR",
        author: "Ward pharmacist · ICU-A",
        timestamp: "Today · 09:40",
        pages: "Live feed · FHIR MedicationRequest",
        lines: [
          { id: "c1", text: "Warfarin 5 mg PO once daily — ACTIVE — INR 5.4 this morning." },
          { id: "c2", text: "Apixaban 5 mg PO twice daily — ACTIVE — indication DVT prophylaxis." },
          { id: "c3", text: "Ketorolac 30 mg IV q6h PRN — ACTIVE — started 03:20 for flank pain." },
          { id: "c4", text: "Potassium chloride 40 mmol IV — given 08:10 during resuscitation." },
          { id: "c5", text: "Serum potassium 6.8 mmol/L at 09:05 — critical flag; peaked T waves on ECG." },
          { id: "c6", text: "No reversal agent (vitamin K / PCC) currently ordered." },
        ],
      },
    ],
    discrepancies: [
      {
        id: "mm-4471-1",
        category: "Contradiction",
        severity: "critical",
        title: "Dual anticoagulation active: warfarin + apixaban",
        summary:
          "Intake history documents apixaban started by cardiology while warfarin remained on the community list. Both agents are now active in the eMAR with no stop order.",
        recommendation: "Hold apixaban immediately, confirm intended agent with cardiology, and document a single anticoagulant plan.",
        aiRationale:
          "Two anticoagulants with overlapping mechanisms appear in the current chart. The intake note places the apixaban start after the warfarin regimen, indicating an undocumented switch rather than intentional combination therapy.",
        confidence: 0.97,
        evidence: [
          {
            docId: "doc-intake-4471",
            lineId: "i3",
            quote: "Home anticoagulation: warfarin 5 mg daily, INR monitored weekly at community clinic.",
          },
          {
            docId: "doc-intake-4471",
            lineId: "i4",
            quote: "Patient reports taking apixaban 5 mg twice daily since cardiology review in March.",
          },
          {
            docId: "doc-mar-4471",
            lineId: "c1",
            quote: "Warfarin 5 mg PO once daily — ACTIVE — INR 5.4 this morning.",
          },
          {
            docId: "doc-mar-4471",
            lineId: "c2",
            quote: "Apixaban 5 mg PO twice daily — ACTIVE — indication DVT prophylaxis.",
          },
        ],
      },
      {
        id: "mm-4471-2",
        category: "Omission",
        severity: "critical",
        title: "INR 5.4 with no reversal agent ordered",
        summary:
          "Supra-therapeutic INR is flagged by pathology but the eMAR contains no vitamin K, PCC or warfarin hold instruction.",
        recommendation: "Order vitamin K 2.5 mg IV and haematology review; hold warfarin until INR < 3.0.",
        aiRationale:
          "Chart contains a critical INR and the order set lacks any reversal action within the 60-minute window expected by CL-114 and the hospital anticoagulation policy.",
        confidence: 0.93,
        evidence: [
          { docId: "doc-mar-4471", lineId: "c1", quote: "Warfarin 5 mg PO once daily — ACTIVE — INR 5.4 this morning." },
          { docId: "doc-mar-4471", lineId: "c6", quote: "No reversal agent (vitamin K / PCC) currently ordered." },
        ],
      },
      {
        id: "mm-4471-3",
        category: "Contradiction",
        severity: "high",
        title: "Ketorolac administered beside acute kidney injury",
        summary:
          "NSAID analgesia was started overnight while creatinine is rising; no renal-risk review is documented in the intake note.",
        recommendation: "Discontinue ketorolac, substitute paracetamol, and recheck creatinine in 6 hours.",
        aiRationale:
          "Intake documents CKD stage 3b; an NSAID is active in the eMAR and the chart shows acute kidney injury. This combination is contraindicated in the hospital formulary.",
        confidence: 0.89,
        evidence: [
          { docId: "doc-intake-4471", lineId: "i2", quote: "PMH: atrial fibrillation, CKD stage 3b, hypertension, type 2 diabetes." },
          { docId: "doc-mar-4471", lineId: "c3", quote: "Ketorolac 30 mg IV q6h PRN — ACTIVE — started 03:20 for flank pain." },
        ],
      },
    ],
  },
  {
    id: "PX-9012",
    name: "Fatima Delgado",
    mrn: "MRN 9012-17",
    age: 54,
    sex: "F",
    unit: "GM-3W · Room 312",
    problem: "Community-acquired pneumonia · AF",
    risk: "high",
    documents: [
      {
        id: "doc-intake-9012",
        title: "Admission clerking",
        kind: "intake",
        subtitle: "Physician clerking · scanned",
        author: "Dr. P. Nair · Internal Medicine",
        timestamp: "Today · 06:55",
        pages: "3 pages · typed",
        lines: [
          { id: "i1", text: "Allergies: penicillin — documented urticaria and facial swelling in 2019." },
          { id: "i2", text: "Admitted with productive cough, CXR right lower lobe consolidation." },
          { id: "i3", text: "Home amiodarone 200 mg daily for rate control of atrial fibrillation." },
          { id: "i4", text: "Renal function at admission: eGFR 38 mL/min/1.73m² (baseline 54)." },
          { id: "i5", text: "Plan: IV antibiotics, telemetry, and amiodarone continuation." },
        ],
      },
      {
        id: "doc-mar-9012",
        title: "Active orders & MAR",
        kind: "mar",
        subtitle: "Pharmacy verification queue",
        author: "Pharmacy system · auto",
        timestamp: "Today · 10:05",
        pages: "Live feed",
        lines: [
          { id: "c1", text: "Piperacillin-tazobactam 4.5 g IV q6h — ACTIVE — first dose given 07:30." },
          { id: "c2", text: "Amiodarone 400 mg PO twice daily loading — ACTIVE — day 1 of 7." },
          { id: "c3", text: "Apixaban 5 mg PO twice daily — ACTIVE — no renal dose adjustment applied." },
          { id: "c4", text: "No allergy overrides documented against penicillin order." },
          { id: "c5", text: "INR not ordered since admission." },
        ],
      },
    ],
    discrepancies: [
      {
        id: "mm-9012-1",
        category: "Allergy conflict",
        severity: "critical",
        title: "Piperacillin ordered despite documented penicillin allergy",
        summary:
          "The clerking note records urticaria and facial swelling to penicillin; piperacillin-tazobactam is active with no allergy override recorded.",
        recommendation: "Stop piperacillin-tazobactam, switch to levofloxacin ± vancomycin, and document allergy review.",
        aiRationale:
          "Allergy section in the intake document is a direct contradiction of the active beta-lactam order. No override reason appears anywhere in the order set.",
        confidence: 0.99,
        evidence: [
          { docId: "doc-intake-9012", lineId: "i1", quote: "Allergies: penicillin — documented urticaria and facial swelling in 2019." },
          { docId: "doc-mar-9012", lineId: "c1", quote: "Piperacillin-tazobactam 4.5 g IV q6h — ACTIVE — first dose given 07:30." },
        ],
      },
      {
        id: "mm-9012-2",
        category: "Dose mismatch",
        severity: "high",
        title: "Apixaban dose not reduced for eGFR 38",
        summary:
          "Clerking documents a 30% renal function decline. Apixaban remains at 5 mg BID without documented indication review.",
        recommendation: "Confirm indication and weight; reduce to 2.5 mg BID if criteria met. Recheck renal function in 48h.",
        aiRationale: "Two independent renal markers support dose review; the MAR has no adjustment note and the plan does not mention renal dosing.",
        confidence: 0.88,
        evidence: [
          { docId: "doc-intake-9012", lineId: "i4", quote: "Renal function at admission: eGFR 38 mL/min/1.73m² (baseline 54)." },
          { docId: "doc-mar-9012", lineId: "c3", quote: "Apixaban 5 mg PO twice daily — ACTIVE — no renal dose adjustment applied." },
        ],
      },
      {
        id: "mm-9012-3",
        category: "Stale value",
        severity: "moderate",
        title: "Clerking plan references amiodarone continuation, MAR shows loading dose",
        summary:
          "Intake documents maintenance amiodarone 200 mg daily, while the MAR carries a 400 mg BID loading schedule with no end date.",
        recommendation: "Add stop date to loading regimen and revert to 200 mg daily on day 2.",
        aiRationale: "Dose escalation is not explained in the clerking plan or pharmacy notes, which creates a continuity gap.",
        confidence: 0.82,
        evidence: [
          { docId: "doc-intake-9012", lineId: "i3", quote: "Home amiodarone 200 mg daily for rate control of atrial fibrillation." },
          { docId: "doc-mar-9012", lineId: "c2", quote: "Amiodarone 400 mg PO twice daily loading — ACTIVE — day 1 of 7." },
        ],
      },
    ],
  },
  {
    id: "PX-2280",
    name: "Tunde Okafor",
    mrn: "MRN 2280-44",
    age: 32,
    sex: "M",
    unit: "ED-01 · Resus 2",
    problem: "Blunt trauma · haemorrhagic anaemia",
    risk: "critical",
    documents: [
      {
        id: "doc-intake-2280",
        title: "Trauma triage sheet",
        kind: "intake",
        subtitle: "Handwritten triage · OCR",
        author: "RN M. Silva · Emergency",
        timestamp: "Today · 04:02",
        pages: "1 page · OCR confidence 92%",
        lines: [
          { id: "i1", text: "Attached motorcyclist, GCS 15, HR 118, BP 92/58, SpO2 96% on 2L." },
          { id: "i2", text: "Known allergy: morphine — severe pruritus and hypotension." },
          { id: "i3", text: "Point-of-care Hb 9.4 g/dL at arrival. Consents to blood products." },
          { id: "i4", text: "Pain score 9/10, left femur deformity, guarded abdomen." },
        ],
      },
      {
        id: "doc-chart-2280",
        title: "Resus flowsheet & lab chart",
        kind: "chart",
        subtitle: "Live chart · Q2h observations",
        author: "Emergency flow · auto",
        timestamp: "Today · 08:48",
        pages: "Live feed",
        lines: [
          { id: "c1", text: "Laboratory Hb 6.1 g/dL at 08:30 — critical; 2 units pRBC requested." },
          { id: "c2", text: "Morphine 5 mg IV administered 05:12 and 06:40 for pain control." },
          { id: "c3", text: "Repeat FAST shows increasing free fluid in left upper quadrant." },
          { id: "c4", text: "Transfusion consent not scanned; verbal consent noted by RN." },
        ],
      },
    ],
    discrepancies: [
      {
        id: "mm-2280-1",
        category: "Contradiction",
        severity: "critical",
        title: "Morphine administered despite severe allergy",
        summary:
          "Triage sheet documents morphine allergy with hypotension. Two morphine doses are recorded on the resus flowsheet.",
        recommendation: "Administer adrenaline per anaphylaxis protocol if symptomatic; switch analgesia to fentanyl and flag chart.",
        aiRationale: "Direct allergy-to-administration contradiction with two timestamps. No allergy override appears in the flowsheet.",
        confidence: 0.98,
        evidence: [
          { docId: "doc-intake-2280", lineId: "i2", quote: "Known allergy: morphine — severe pruritus and hypotension." },
          { docId: "doc-chart-2280", lineId: "c2", quote: "Morphine 5 mg IV administered 05:12 and 06:40 for pain control." },
        ],
      },
      {
        id: "mm-2280-2",
        category: "Stale value",
        severity: "high",
        title: "Haemoglobin fell 3.3 g/dL in 4.5 hours",
        summary: "Arrival POC Hb 9.4 g/dL versus lab Hb 6.1 g/dL. The drop is consistent with ongoing haemorrhage.",
        recommendation: "Activate massive transfusion protocol, repeat FAST, and clear for operative intervention.",
        aiRationale: "Two haemoglobin values in the same encounter differ beyond the expected assay variance for the documented interval.",
        confidence: 0.94,
        evidence: [
          { docId: "doc-intake-2280", lineId: "i3", quote: "Point-of-care Hb 9.4 g/dL at arrival. Consents to blood products." },
          { docId: "doc-chart-2280", lineId: "c1", quote: "Laboratory Hb 6.1 g/dL at 08:30 — critical; 2 units pRBC requested." },
        ],
      },
      {
        id: "mm-2280-3",
        category: "Omission",
        severity: "moderate",
        title: "Transfusion consent not attached to chart",
        summary: "Triage records consent to blood products; the chart has only a verbal note with no signed form.",
        recommendation: "Attach signed consent or document emergency exception per policy TR-22.",
        aiRationale: "Consent is present in one document but the chart records it as missing, creating a documentation compliance gap.",
        confidence: 0.81,
        evidence: [
          { docId: "doc-intake-2280", lineId: "i3", quote: "Point-of-care Hb 9.4 g/dL at arrival. Consents to blood products." },
          { docId: "doc-chart-2280", lineId: "c4", quote: "Transfusion consent not scanned; verbal consent noted by RN." },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ doseguard */

export type Prescription = {
  id: string;
  drug: string;
  ingredient: string;
  drugClass: string;
  dose: string;
  route: string;
  frequency: string;
  prescriber: string;
  specialty: string;
  start: string;
  status: "active" | "held";
};

export type DosePatient = {
  id: string;
  name: string;
  mrn: string;
  age: number;
  sex: string;
  weight: string;
  egfr: string;
  unit: string;
  allergies: string[];
  prescriptions: Prescription[];
};

export const DOSE_PATIENTS: DosePatient[] = [
  {
    id: "PX-9012",
    name: "Fatima Delgado",
    mrn: "MRN 9012-17",
    age: 54,
    sex: "F",
    weight: "72 kg",
    egfr: "38 mL/min",
    unit: "GM-3W · 312",
    allergies: ["Penicillin"],
    prescriptions: [
      {
        id: "rx-1",
        drug: "Warfarin",
        ingredient: "warfarin",
        drugClass: "Vitamin K antagonist",
        dose: "5 mg",
        route: "PO",
        frequency: "once daily",
        prescriber: "Dr. L. Ortiz",
        specialty: "Cardiology",
        start: "Day 1 · 07:00",
        status: "active",
      },
      {
        id: "rx-2",
        drug: "Aspirin (low dose)",
        ingredient: "aspirin",
        drugClass: "Antiplatelet / NSAID",
        dose: "81 mg",
        route: "PO",
        frequency: "once daily",
        prescriber: "Dr. A. Sharma",
        specialty: "Internal Medicine",
        start: "Day 1 · 08:15",
        status: "active",
      },
      {
        id: "rx-3",
        drug: "Tylenol",
        ingredient: "acetaminophen",
        drugClass: "Analgesic",
        dose: "1 g",
        route: "PO",
        frequency: "q6h PRN",
        prescriber: "Dr. P. Nair",
        specialty: "Surgery",
        start: "Day 1 · 09:40",
        status: "active",
      },
      {
        id: "rx-4",
        drug: "Paracetamol",
        ingredient: "acetaminophen",
        drugClass: "Analgesic",
        dose: "500 mg",
        route: "PO",
        frequency: "q6h scheduled",
        prescriber: "Dr. A. Sharma",
        specialty: "Internal Medicine",
        start: "Day 1 · 06:20",
        status: "active",
      },
      {
        id: "rx-5",
        drug: "Panadol Extra",
        ingredient: "acetaminophen",
        drugClass: "Analgesic",
        dose: "1 tablet (500 mg)",
        route: "PO",
        frequency: "q8h PRN",
        prescriber: "RN-initiated protocol",
        specialty: "Nursing",
        start: "Day 1 · 10:05",
        status: "active",
      },
      {
        id: "rx-6",
        drug: "Simvastatin",
        ingredient: "simvastatin",
        drugClass: "Statin",
        dose: "40 mg",
        route: "PO",
        frequency: "nightly",
        prescriber: "Dr. A. Sharma",
        specialty: "Internal Medicine",
        start: "Day 1 · 06:25",
        status: "active",
      },
      {
        id: "rx-7",
        drug: "Amiodarone",
        ingredient: "amiodarone",
        drugClass: "Antiarrhythmic",
        dose: "400 mg",
        route: "PO",
        frequency: "twice daily",
        prescriber: "Dr. L. Ortiz",
        specialty: "Cardiology",
        start: "Day 1 · 07:10",
        status: "active",
      },
      {
        id: "rx-8",
        drug: "Enoxaparin",
        ingredient: "enoxaparin",
        drugClass: "LMWH",
        dose: "40 mg",
        route: "SC",
        frequency: "once daily",
        prescriber: "Dr. P. Nair",
        specialty: "Surgery",
        start: "Day 1 · 09:45",
        status: "active",
      },
    ],
  },
  {
    id: "PX-5540",
    name: "Mei Chen",
    mrn: "MRN 5540-02",
    age: 71,
    sex: "F",
    weight: "58 kg",
    egfr: "27 mL/min",
    unit: "ICU-A · Bay 02",
    allergies: ["Sulfonamides"],
    prescriptions: [
      {
        id: "rx-21",
        drug: "Sertraline",
        ingredient: "sertraline",
        drugClass: "SSRI",
        dose: "50 mg",
        route: "PO",
        frequency: "once daily",
        prescriber: "Dr. M. Haddad",
        specialty: "Psychiatry",
        start: "Day 2 · 08:00",
        status: "active",
      },
      {
        id: "rx-22",
        drug: "Tramadol",
        ingredient: "tramadol",
        drugClass: "Opioid / SNRI",
        dose: "50 mg",
        route: "PO",
        frequency: "q6h PRN",
        prescriber: "Dr. P. Nair",
        specialty: "Surgery",
        start: "Day 2 · 11:30",
        status: "active",
      },
      {
        id: "rx-23",
        drug: "Lisinopril",
        ingredient: "lisinopril",
        drugClass: "ACE inhibitor",
        dose: "10 mg",
        route: "PO",
        frequency: "once daily",
        prescriber: "Dr. L. Ortiz",
        specialty: "Cardiology",
        start: "Day 1 · 07:30",
        status: "active",
      },
      {
        id: "rx-24",
        drug: "Spironolactone",
        ingredient: "spironolactone",
        drugClass: "Aldosterone antagonist",
        dose: "25 mg",
        route: "PO",
        frequency: "once daily",
        prescriber: "Dr. L. Ortiz",
        specialty: "Cardiology",
        start: "Day 2 · 07:35",
        status: "active",
      },
      {
        id: "rx-25",
        drug: "Ibuprofen",
        ingredient: "ibuprofen",
        drugClass: "NSAID",
        dose: "400 mg",
        route: "PO",
        frequency: "q8h PRN",
        prescriber: "Dr. H. Chen",
        specialty: "Emergency",
        start: "Day 1 · 02:20",
        status: "active",
      },
      {
        id: "rx-26",
        drug: "Naproxen",
        ingredient: "naproxen",
        drugClass: "NSAID",
        dose: "250 mg",
        route: "PO",
        frequency: "twice daily",
        prescriber: "Dr. A. Sharma",
        specialty: "Internal Medicine",
        start: "Day 2 · 09:10",
        status: "active",
      },
      {
        id: "rx-27",
        drug: "Omeprazole",
        ingredient: "omeprazole",
        drugClass: "PPI",
        dose: "20 mg",
        route: "PO",
        frequency: "once daily",
        prescriber: "Dr. H. Chen",
        specialty: "Emergency",
        start: "Day 1 · 02:30",
        status: "active",
      },
      {
        id: "rx-28",
        drug: "Omeprazole (IV)",
        ingredient: "omeprazole",
        drugClass: "PPI",
        dose: "40 mg",
        route: "IV",
        frequency: "twice daily",
        prescriber: "Dr. M. Haddad",
        specialty: "Psychiatry",
        start: "Day 2 · 10:15",
        status: "active",
      },
    ],
  },
];

export type InteractionRule = {
  id: string;
  a: string;
  b: string;
  severity: "major" | "moderate";
  title: string;
  mechanism: string;
  recommendation: string;
  citation: { source: string; reference: string; quote: string };
};

export const INTERACTION_RULES: InteractionRule[] = [
  {
    id: "ix-warfarin-aspirin",
    a: "warfarin",
    b: "aspirin",
    severity: "major",
    title: "Warfarin + aspirin — additive bleeding risk",
    mechanism: "Anticoagulant plus antiplatelet effect on primary and secondary haemostasis increases major bleeding.",
    recommendation: "Review dual therapy. If no recent ACS/stent, stop aspirin and monitor INR; add gastroprotection.",
    citation: {
      source: "CareMatrix formulary monograph",
      reference: "FM-ANTI-0142 · §4.2",
      quote: "Concurrent warfarin and antiplatelet therapy doubles major bleeding events; continue only with a documented cardiovascular indication.",
    },
  },
  {
    id: "ix-simvastatin-amiodarone",
    a: "simvastatin",
    b: "amiodarone",
    severity: "major",
    title: "Simvastatin + amiodarone — myopathy risk",
    mechanism: "Amiodarone inhibits CYP3A4, raising simvastatin exposure and risk of rhabdomyolysis.",
    recommendation: "Cap simvastatin at 20 mg daily or switch to pravastatin. Counsel on muscle pain and check CK if symptomatic.",
    citation: {
      source: "FDA Drug Safety Communication",
      reference: "Simvastatin dose limits · 2011",
      quote: "Do not exceed simvastatin 20 mg daily with amiodarone due to increased risk of rhabdomyolysis.",
    },
  },
  {
    id: "ix-warfarin-enoxaparin",
    a: "warfarin",
    b: "enoxaparin",
    severity: "major",
    title: "Warfarin + enoxaparin — overlapping anticoagulation",
    mechanism: "Bridge therapy is valid only with a documented plan and INR monitoring; VTE prophylaxis dosing is not a bridge.",
    recommendation: "Clarify indication with the surgical team; hold enoxaparin while INR > 2.0.",
    citation: {
      source: "Hospital anticoagulation policy CL-207",
      reference: "§3.1 bridging",
      quote: "Prophylactic LMWH must be withheld once warfarin INR is therapeutic unless a documented bridging plan exists.",
    },
  },
  {
    id: "ix-sertraline-tramadol",
    a: "sertraline",
    b: "tramadol",
    severity: "major",
    title: "Sertraline + tramadol — serotonin syndrome",
    mechanism: "Both agents increase serotonergic transmission; risk rises with age and CYP2D6 inhibition.",
    recommendation: "Use non-serotonergic analgesia (e.g., low-dose oxycodone) and monitor for clonus, hyperreflexia, agitation.",
    citation: {
      source: "CareMatrix interaction knowledge base",
      reference: "KB-SER-0088",
      quote: "Avoid concurrent SSRI and tramadol when alternative analgesia is available; if unavoidable, limit dose and monitor neurologically.",
    },
  },
  {
    id: "ix-lisinopril-spironolactone",
    a: "lisinopril",
    b: "spironolactone",
    severity: "major",
    title: "Lisinopril + spironolactone — hyperkalaemia in CKD",
    mechanism: "Dual RAAS blockade plus reduced renal excretion raises serum potassium.",
    recommendation: "Check potassium and creatinine within 72h; hold if K⁺ ≥ 5.5 mmol/L.",
    citation: {
      source: "CareMatrix formulary monograph",
      reference: "FM-RAAS-0031",
      quote: "Combined ACE inhibitor and mineralocorticoid antagonism requires potassium monitoring, particularly at eGFR < 45.",
    },
  },
  {
    id: "ix-ibuprofen-naproxen",
    a: "ibuprofen",
    b: "naproxen",
    severity: "moderate",
    title: "Two NSAIDs — therapeutic duplication",
    mechanism: "Overlapping COX inhibition adds GI, renal and cardiovascular toxicity without added analgesia.",
    recommendation: "Discontinue naproxen; if pain persists, escalate via non-NSAID pathway.",
    citation: {
      source: "CareMatrix interaction knowledge base",
      reference: "KB-NSAID-0004",
      quote: "Concurrent NSAID therapy increases GI bleeding risk 2.4-fold and is not additive for analgesia.",
    },
  },
];
