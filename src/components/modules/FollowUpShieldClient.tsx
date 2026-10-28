"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  FileText,
  HeartPulse,
  Image as ImageIcon,
  Info,
  Loader2,
  Lock,
  Pill,
  Scale,
  Sparkles,
  Trash2,
  UploadCloud,
  Watch,
  Wind,
} from "lucide-react";
import { bytes, cn, formatShortTime } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import {
  Badge,
  Button,
  Callout,
  DataTableShell,
  PageHeader,
  Panel,
  PanelHeader,
  Progress,
  SectionLabel,
  StatTile,
  Th,
} from "@/components/ui";

type DocStatus = "processed" | "parsing";

type ParsedDoc = {
  id: string;
  name: string;
  type: "PDF" | "IMAGE";
  size: number;
  pages: string;
  uploadedAt: string;
  status: DocStatus;
  entities: number;
  citations: number;
};

type Task = {
  id: string;
  time: "Morning" | "Afternoon" | "Evening";
  title: string;
  detail: string;
  icon: React.ReactNode;
  source: string;
  risk: "high" | "moderate" | "low";
};

const INITIAL_DOCS: ParsedDoc[] = [
  {
    id: "doc-1",
    name: "discharge_summary_st_aurelia.pdf",
    type: "PDF",
    size: 384_000,
    pages: "4 pages · typed",
    uploadedAt: "2 days ago",
    status: "processed",
    entities: 42,
    citations: 11,
  },
  {
    id: "doc-2",
    name: "pharmacy_labels_photo.png",
    type: "IMAGE",
    size: 1_240_000,
    pages: "1 image · OCR 93%",
    uploadedAt: "2 days ago",
    status: "processed",
    entities: 18,
    citations: 6,
  },
  {
    id: "doc-3",
    name: "cardiology_followup_letter.pdf",
    type: "PDF",
    size: 220_000,
    pages: "2 pages · typed",
    uploadedAt: "yesterday",
    status: "processed",
    entities: 14,
    citations: 4,
  },
];

const TASKS: Task[] = [
  {
    id: "t1",
    time: "Morning",
    title: "Take apixaban 5 mg with breakfast",
    detail: "Blood thinner for atrial fibrillation. Do not skip a dose; if missed, take within 6 hours.",
    icon: <Pill className="size-3.5" />,
    source: "Discharge summary · p2 line 14",
    risk: "high",
  },
  {
    id: "t2",
    time: "Morning",
    title: "Check blood pressure and pulse",
    detail: "Sit for 5 minutes first. Target below 130/80 mmHg; pulse 60–100 bpm.",
    icon: <HeartPulse className="size-3.5" />,
    source: "Nursing discharge note · p1",
    risk: "moderate",
  },
  {
    id: "t3",
    time: "Morning",
    title: "Weigh yourself before breakfast",
    detail: "Same scale, same clothes. A gain of more than 1 kg in 24 hours is a warning sign.",
    icon: <Scale className="size-3.5" />,
    source: "Heart failure letter · line 9",
    risk: "high",
  },
  {
    id: "t4",
    time: "Afternoon",
    title: "Take furosemide 40 mg at 14:00",
    detail: "Water tablet. Timed to avoid waking at night. Expect more urine for 4–6 hours.",
    icon: <Pill className="size-3.5" />,
    source: "Pharmacy label · OCR block 3",
    risk: "moderate",
  },
  {
    id: "t5",
    time: "Afternoon",
    title: "Wound care — change dressing",
    detail: "Wash hands first. Keep the site dry for 48 hours; report redness, warmth or discharge.",
    icon: <CircleAlert className="size-3.5" />,
    source: "Discharge summary · p3 line 6",
    risk: "moderate",
  },
  {
    id: "t6",
    time: "Afternoon",
    title: "Walk for 10 minutes (2 sessions)",
    detail: "Stop if breathless or dizzy. Increase gradually over the next 2 weeks.",
    icon: <ArrowRight className="size-3.5" />,
    source: "Physiotherapy letter · line 4",
    risk: "low",
  },
  {
    id: "t7",
    time: "Evening",
    title: "Take metoprolol succinate 25 mg",
    detail: "Slow-release heart-rate medicine. Swallow whole with water.",
    icon: <Pill className="size-3.5" />,
    source: "Discharge summary · p2 line 18",
    risk: "high",
  },
  {
    id: "t8",
    time: "Evening",
    title: "Log overnight SpO₂ before bed",
    detail: "Target 94% or above. Share the reading with your remote monitoring team.",
    icon: <Watch className="size-3.5" />,
    source: "Remote monitoring consent · p1",
    risk: "moderate",
  },
];

const UNIFIED_MEDS = [
  { id: "m1", drug: "Apixaban", dose: "5 mg", schedule: "08:00 · twice daily", source: "Discharge summary", flag: "Dose conflict resolved", tone: "warn" as const },
  { id: "m2", drug: "Metoprolol succinate", dose: "25 mg", schedule: "20:00 · once daily", source: "Cardiology letter", flag: "Formulation reconciled", tone: "ok" as const },
  { id: "m3", drug: "Furosemide", dose: "40 mg", schedule: "14:00 · once daily", source: "Pharmacy label", flag: "Timing unified", tone: "ok" as const },
  { id: "m4", drug: "Atorvastatin", dose: "40 mg", schedule: "20:00 · once daily", source: "Discharge summary", flag: "Confirmed", tone: "ok" as const },
  { id: "m5", drug: "Amoxicillin", dose: "500 mg", schedule: "Removed", source: "Discharge summary", flag: "Allergy conflict removed", tone: "crit" as const },
];

const CONFLICTS = [
  {
    id: "c1",
    title: "Apixaban dose differed between documents",
    detail: "Discharge summary 5 mg BID vs pharmacy label 2.5 mg BID. Cardiology note confirmed 5 mg BID.",
    resolution: "Unified to 5 mg twice daily · prescriber confirmed",
    tone: "warn" as const,
  },
  {
    id: "c2",
    title: "Metoprolol tartrate and succinate both listed",
    detail: "Two formulations with different dosing intervals were printed across documents.",
    resolution: "Succinate 25 mg once daily retained",
    tone: "ok" as const,
  },
  {
    id: "c3",
    title: "Amoxicillin listed despite penicillin allergy",
    detail: "Allergy recorded in the discharge summary but the antibiotic appeared on the pharmacy printout.",
    resolution: "Removed from plan · prescriber notified",
    tone: "crit" as const,
  },
];

const PIPELINE = [
  "Extracting text and tables",
  "Normalising medications and dates",
  "Reconciling documents for conflicts",
  "Scoring risk and building actions",
];

export function FollowUpShieldClient() {
  const { log, profile } = useWorkspace();
  const [docs, setDocs] = useState<ParsedDoc[]>(INITIAL_DOCS);
  const [completed, setCompleted] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [stage, setStage] = useState(PIPELINE.length);
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const baseRisk = 62;
  const riskScore = Math.max(18, baseRisk - completed.length * 4);
  const riskLabel = riskScore >= 55 ? "Elevated" : riskScore >= 35 ? "Moderate" : "Improving";

  const grouped = useMemo(
    () => ({
      Morning: TASKS.filter((task) => task.time === "Morning"),
      Afternoon: TASKS.filter((task) => task.time === "Afternoon"),
      Evening: TASKS.filter((task) => task.time === "Evening"),
    }),
    [],
  );

  const runSimulation = useCallback(
    async (newDocs: ParsedDoc[]) => {
      setParsing(true);
      setStage(0);
      for (let index = 0; index < PIPELINE.length; index += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 420));
        setStage(index + 1);
      }
      setDocs((prev) => {
        const merged = [...newDocs, ...prev];
        return merged.map((doc) => ({ ...doc, status: "processed" as const }));
      });
      setParsing(false);
      await log({
        action:
          newDocs.length > 0
            ? `Parsed ${newDocs.length} new discharge document${newDocs.length === 1 ? "" : "s"} · unified plan rebuilt (${TASKS.length} actions, risk ${baseRisk})`
            : "Discharge care plan re-parsed on demand · citations refreshed",
        module: "FollowUpShield",
        severity: "info",
        meta: { documents: newDocs.map((doc) => doc.name), actions: TASKS.length },
      });
    },
    [log],
  );

  const ingestFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    const created: ParsedDoc[] = list.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      name: file.name,
      type: file.type.includes("pdf") ? "PDF" : "IMAGE",
      size: file.size,
      pages: file.type.includes("pdf") ? "Parsing pages…" : "Running OCR…",
      uploadedAt: formatShortTime(new Date()),
      status: "parsing" as const,
      entities: 0,
      citations: 0,
    }));
    setDocs((prev) => [...created, ...prev]);
    void runSimulation(created);
  };

  const toggleTask = async (task: Task) => {
    const next = completed.includes(task.id)
      ? completed.filter((id) => id !== task.id)
      : [...completed, task.id];
    setCompleted(next);
    await log({
      action: `${completed.includes(task.id) ? "Reopened" : "Completed"} care action: ${task.title} (${profile.name})`,
      module: "FollowUpShield",
      severity: "success",
      meta: { action: task.id, remaining: TASKS.length - next.length },
    });
  };

  const removeDoc = async (doc: ParsedDoc) => {
    setDocs((prev) => prev.filter((item) => item.id !== doc.id));
    await log({
      action: `Patient revoked access to ${doc.name} — plan rebuilt from remaining documents`,
      module: "FollowUpShield · Consent",
      severity: "warning",
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        code="FS-07"
        eyebrow="Patient Experience · Post-discharge protection"
        title="FollowUpShield — one plan from every document"
        description="Drop the paperwork you left hospital with. FollowUpShield reads every page, reconciles conflicts, and gives you one risk-scored checklist for today."
        icon={<HeartPulse className="size-5" />}
        meta={
          <>
            <Badge tone="ok" dot>
              Consent scoped · {profile.name}
            </Badge>
            <Badge tone="neutral" mono>
              Discharged 3 days ago
            </Badge>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<FileText className="size-3.5" />}
              onClick={() =>
                void log({
                  action: "Unified care plan printed / downloaded as PDF",
                  module: "FollowUpShield",
                  severity: "info",
                })
              }
            >
              Print plan
            </Button>
            <Button
              variant="primary"
              icon={<UploadCloud className="size-3.5" />}
              onClick={() => fileRef.current?.click()}
            >
              Add documents
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        <StatTile label="Documents parsed" value={docs.filter((doc) => doc.status === "processed").length} hint={`${docs.reduce((sum, doc) => sum + doc.entities, 0)} entities extracted`} tone="brand" icon={<FileText className="size-3.5" />} />
        <StatTile label="Today's actions" value={TASKS.length - completed.length} unit={`/ ${TASKS.length}`} hint={`${completed.length} completed · ${TASKS.length - completed.length} remaining`} tone="info" icon={<CheckCircle2 className="size-3.5" />} />
        <StatTile label="Conflicts resolved" value={CONFLICTS.length} hint="Across summaries, labels & letters" tone="warn" icon={<Sparkles className="size-3.5" />} delta={{ value: "AI", tone: "ai" }} />
        <StatTile label="Risk exposure" value={riskScore} unit="/100" hint={`${riskLabel} · falls + bleeding risk`} tone={riskScore >= 55 ? "warn" : "ok"} icon={<HeartPulse className="size-3.5" />} delta={{ value: riskLabel.toUpperCase(), tone: riskScore >= 55 ? "warn" : "ok" }} />
        <StatTile label="Next appointment" value="3" unit="days" hint="Cardiology · Thu 10:30 · Dr. Ortiz" tone="ok" icon={<CalendarClock className="size-3.5" />} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Panel>
            <PanelHeader
              title="Drop your discharge paperwork"
              subtitle="Discharge summary, pharmacy labels, clinic letters — PDF or photo. Nothing leaves your consent scope."
              icon={<UploadCloud className="size-3.5" />}
              tag={<Badge tone="ok" mono><Lock className="size-2.5" /> Encrypted</Badge>}
            />
            <div className="p-2.5">
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg,image/jpg"
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files) ingestFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") fileRef.current?.click();
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  ingestFiles(event.dataTransfer.files);
                }}
                className={cn(
                  "grid cursor-pointer place-items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
                  dragging
                    ? "border-brand bg-brand-soft"
                    : "border-line-strong bg-surface-2 hover:border-brand-line hover:bg-brand-soft/40",
                )}
              >
                <span className="grid size-10 place-items-center rounded-full border border-brand-line bg-brand-soft text-brand">
                  {parsing ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                </span>
                <div className="text-[12px] font-semibold text-ink">
                  {parsing ? "Reading your documents…" : "Drop files here, or tap to choose"}
                </div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-faint">
                  PDF · JPG · PNG · max 20 MB per document
                </div>
              </div>

              {parsing ? (
                <div className="mt-2 rounded-lg border border-ai-line bg-ai-soft p-2.5">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-ai">
                    <BrainCircuit className="size-3.5" /> Simulated AI ingest pipeline
                    <span className="ml-auto">{Math.round((stage / PIPELINE.length) * 100)}%</span>
                  </div>
                  <Progress className="mt-1" value={(stage / PIPELINE.length) * 100} tone="ai" />
                  <ul className="mt-1.5 space-y-0.5">
                    {PIPELINE.map((step, index) => (
                      <li key={step} className="flex items-center gap-1.5 text-[10.5px]">
                        {index < stage ? (
                          <Check className="size-3 text-ok" />
                        ) : index === stage ? (
                          <Loader2 className="size-3 animate-spin text-ai" />
                        ) : (
                          <span className="size-3 rounded-full border border-line" />
                        )}
                        <span className={index < stage ? "text-ink" : "text-muted"}>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-2 space-y-1.5">
                <SectionLabel right={<Badge tone="neutral" mono>{docs.length} FILES</Badge>}>
                  Ingested documents
                </SectionLabel>
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5"
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded border",
                        doc.type === "PDF"
                          ? "border-crit-line bg-crit-soft text-crit"
                          : "border-info-line bg-info-soft text-info",
                      )}
                    >
                      {doc.type === "PDF" ? <FileText className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium text-ink">{doc.name}</div>
                      <div className="font-mono text-[9px] text-faint">
                        {doc.pages} · {bytes(doc.size)} · {doc.uploadedAt}
                      </div>
                    </div>
                    {doc.status === "parsing" ? (
                      <Badge tone="ai" dot pulse>
                        Parsing
                      </Badge>
                    ) : (
                      <Badge tone="ok" mono>
                        <Check className="size-2.5" /> {doc.entities} entities
                      </Badge>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${doc.name}`}
                      onClick={() => void removeDoc(doc)}
                      className="grid size-6 place-items-center rounded text-faint hover:bg-crit-soft hover:text-crit"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Today's action plan"
              subtitle="Unified from every document · tick as you go"
              icon={<CheckCircle2 className="size-3.5" />}
              tag={<Badge tone="brand" mono>Unified plan v4</Badge>}
              right={
                <div className="flex items-center gap-1.5">
                  <Progress className="w-20" value={(completed.length / TASKS.length) * 100} tone="ok" height="h-1.5" />
                  <span className="font-mono text-[9.5px] text-muted">
                    {completed.length}/{TASKS.length}
                  </span>
                </div>
              }
            />
            <div className="grid gap-2 p-2.5 md:grid-cols-3">
              {(["Morning", "Afternoon", "Evening"] as const).map((slot) => (
                <div key={slot} className="rounded-lg border border-line bg-surface-2 p-1.5">
                  <div className="mb-1 flex items-center justify-between px-0.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-faint">{slot}</span>
                    <Badge tone="neutral" className="px-1 py-0 text-[8.5px]">
                      {grouped[slot].length} tasks
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {grouped[slot].map((task) => {
                      const done = completed.includes(task.id);
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "rounded-md border px-2 py-1.5 transition-colors",
                            done ? "border-ok-line bg-ok-soft/60" : "border-line bg-surface",
                          )}
                        >
                          <div className="flex items-start gap-1.5">
                            <button
                              type="button"
                              aria-label={`Mark ${task.title} as ${done ? "not done" : "done"}`}
                              onClick={() => void toggleTask(task)}
                              className={cn(
                                "mt-[1px] grid size-4 shrink-0 place-items-center rounded border transition-colors",
                                done
                                  ? "border-ok bg-ok text-[color:var(--surface)]"
                                  : "border-line-strong bg-surface hover:border-brand",
                              )}
                            >
                              {done ? <Check className="size-2.5" /> : null}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className={cn("text-[10.5px] font-medium leading-snug", done ? "text-muted line-through" : "text-ink")}>
                                {task.title}
                              </div>
                              <div className="mt-0.5 text-[9.5px] leading-snug text-muted">{task.detail}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                <Badge
                                  tone={task.risk === "high" ? "crit" : task.risk === "moderate" ? "warn" : "ok"}
                                  className="px-1 py-0 text-[8px]"
                                >
                                  {task.risk}
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => setExpanded(expanded === task.id ? null : task.id)}
                                  className="inline-flex items-center gap-0.5 rounded border border-line bg-surface-2 px-1 py-0 font-mono text-[8px] text-faint hover:text-ink"
                                >
                                  <FileText className="size-2" />
                                  {task.source.split(" · ")[0]}
                                  {expanded === task.id ? " ▴" : " ▾"}
                                </button>
                                <span className="ml-auto text-faint">{task.icon}</span>
                              </div>
                              {expanded === task.id ? (
                                <div className="cm-rise mt-1 rounded border border-ai-line bg-ai-soft px-1.5 py-1 font-mono text-[8.5px] leading-relaxed text-ai">
                                  Cited from {task.source} · verified OCR line, confidence{" "}
                                  {task.risk === "high" ? "98" : "93"}%
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line bg-crit-soft/50 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-crit">
                <AlertTriangle className="size-3.5" /> Red flags — call for help immediately
              </div>
              <div className="mt-1 grid gap-1 sm:grid-cols-3">
                {[
                  { icon: <Wind className="size-3" />, text: "Breathless at rest or SpO₂ below 92%" },
                  { icon: <Scale className="size-3" />, text: "Weight gain above 1 kg in 24 hours" },
                  { icon: <HeartPulse className="size-3" />, text: "Chest pain, fainting or black stools" },
                ].map((flag) => (
                  <div key={flag.text} className="flex items-start gap-1 rounded border border-crit-line bg-surface px-1.5 py-1 text-[9.5px] text-ink">
                    <span className="mt-[1px] text-crit">{flag.icon}</span>
                    {flag.text}
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[9px] text-ink">
                  Clinic: 0800 118 4402
                </span>
                <span className="rounded border border-crit-line bg-crit-soft px-1.5 py-0.5 font-mono text-[9px] font-semibold text-crit">
                  Emergency: 999
                </span>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Unified medication list"
              subtitle="Every source merged — duplicates removed, single schedule kept"
              icon={<Pill className="size-3.5" />}
              tag={<Badge tone="ok" mono>Reconciled</Badge>}
            />
            <DataTableShell>
              <table className="w-full min-w-[600px] border-collapse text-[11px]">
                <thead>
                  <tr>
                    <Th>Medicine</Th>
                    <Th>Dose</Th>
                    <Th>When</Th>
                    <Th>Source document</Th>
                    <Th>Reconciliation</Th>
                  </tr>
                </thead>
                <tbody>
                  {UNIFIED_MEDS.map((med) => (
                    <tr key={med.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                      <td className="px-3 py-1.5 font-medium text-ink">{med.drug}</td>
                      <td className="px-3 py-1.5 font-mono text-[10.5px] text-ink">{med.dose}</td>
                      <td className="px-3 py-1.5 font-mono text-[10.5px] text-muted">{med.schedule}</td>
                      <td className="px-3 py-1.5 font-mono text-[9.5px] text-faint">{med.source}</td>
                      <td className="px-3 py-1.5">
                        <Badge tone={med.tone} className="px-1 py-0 text-[8.5px]">
                          {med.flag}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel className="border-brand-line">
            <PanelHeader
              title="Risk exposure score"
              subtitle="Recomputed as you complete today's actions"
              icon={<HeartPulse className="size-3.5" />}
              tag={<Badge tone={riskScore >= 55 ? "warn" : "ok"} mono>{riskLabel}</Badge>}
            />
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className="grid size-[104px] shrink-0 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--${riskScore >= 55 ? "warn" : "ok"}) ${riskScore * 3.6}deg, var(--surface-3) 0deg)`,
                  }}
                >
                  <div className="grid size-[82px] place-items-center rounded-full border border-line bg-surface">
                    <div className="text-center">
                      <div className="text-[24px] font-semibold leading-none tracking-[-0.03em] text-ink">
                        {riskScore}
                      </div>
                      <div className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-faint">
                        / 100 risk
                      </div>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-ink">
                    {riskScore >= 55 ? "Elevated — close follow-up" : riskScore >= 35 ? "Moderate — improving" : "Low — on track"}
                  </div>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                    Driven by anticoagulation, heart failure and three medications with narrow monitoring
                    requirements. Completing actions lowers today&apos;s exposure.
                  </p>
                  <div className="mt-1 flex items-center gap-1 font-mono text-[9px] text-faint">
                    <Sparkles className="size-3 text-ai" /> Recalculated after every completed action
                  </div>
                </div>
              </div>

              <div className="mt-2 space-y-1.5">
                {[
                  { label: "Anticoagulation bleeding risk", value: 30, tone: "crit" as const },
                  { label: "Heart failure fluid balance", value: 22, tone: "warn" as const },
                  { label: "Fall risk at home", value: 14, tone: "warn" as const },
                  { label: "Missed-dose probability", value: 10, tone: "info" as const },
                ].map((factor) => (
                  <div key={factor.label}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted">{factor.label}</span>
                      <span className="font-mono text-ink">{factor.value}</span>
                    </div>
                    <Progress className="mt-0.5" value={factor.value * 2.6} tone={factor.tone} height="h-1" />
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Conflicts reconciled by AI"
              subtitle="What the parser changed, and why"
              icon={<BrainCircuit className="size-3.5" />}
              tag={<Badge tone="ai" mono><Sparkles className="size-2.5" />Grounding v3</Badge>}
            />
            <div className="space-y-1.5 p-2.5">
              {CONFLICTS.map((conflict) => (
                <div key={conflict.id} className="rounded-lg border border-line bg-surface-2 px-2 py-1.5">
                  <div className="flex items-start gap-1.5">
                    <CircleAlert
                      className={cn(
                        "mt-[1px] size-3.5 shrink-0",
                        conflict.tone === "crit" ? "text-crit" : conflict.tone === "warn" ? "text-warn" : "text-ok",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-semibold text-ink">{conflict.title}</div>
                      <div className="text-[9.5px] leading-snug text-muted">{conflict.detail}</div>
                      <div className="mt-1 flex items-center gap-1 text-[9.5px] text-ok">
                        <Check className="size-3" /> {conflict.resolution}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="What happens next"
              subtitle="Appointments and monitoring"
              icon={<CalendarClock className="size-3.5" />}
            />
            <div className="space-y-1.5 p-3">
              {[
                { date: "Thu 10:30", title: "Cardiology review · Dr. Ortiz", detail: "Bring your BP log and this plan. Outpatient wing 2." },
                { date: "Fri 09:00", title: "Blood test · INR and renal panel", detail: "No fasting required. Community lab, 5 min walk." },
                { date: "Daily", title: "Remote SpO₂ + weight upload", detail: "Automatic from your paired device; nurse reviews at 16:00." },
              ].map((item) => (
                <div key={item.title} className="flex gap-2 rounded-md border border-line bg-surface-2 px-2 py-1.5">
                  <span className="w-14 shrink-0 font-mono text-[9px] uppercase tracking-[0.04em] text-brand">
                    {item.date}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-medium text-ink">{item.title}</div>
                    <div className="text-[9.5px] leading-snug text-muted">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Callout tone="info" title="Your data, your consent" icon={<Info className="size-4" />}>
            Only you and your named care team can see these documents. Every access and change is written to an
            immutable audit chain you can request at any time.
          </Callout>
        </div>
      </div>

      <Panel>
        <PanelHeader
          title="Parsed citations"
          subtitle="Every action above is traced to a source line — expand to inspect"
          icon={<FileText className="size-3.5" />}
          right={
            <Button
              size="xs"
              variant="secondary"
              icon={<BrainCircuit className="size-3" />}
              onClick={() => void runSimulation([])}
            >
              Re-run parser
            </Button>
          }
        />
        <div className="grid gap-2 p-2.5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Discharge summary", line: "“Apixaban 5 mg twice daily, continue for 3 months.”", ref: "p2 line 14", source: "discharge_summary_st_aurelia.pdf", count: 11 },
            { title: "Pharmacy label", line: "“Furosemide 40 mg — take at 2 pm.”", ref: "OCR block 3", source: "pharmacy_labels_photo.png", count: 6 },
            { title: "Cardiology letter", line: "“Continue metoprolol succinate 25 mg nightly.”", ref: "line 18", source: "cardiology_followup_letter.pdf", count: 4 },
            { title: "Allergy record", line: "“Penicillin allergy — anaphylaxis 2019.”", ref: "p1 line 7", source: "discharge_summary_st_aurelia.pdf", count: 3 },
          ].map((citation) => (
            <div key={citation.title} className="rounded-lg border border-ai-line/60 bg-ai-soft/50 px-2 py-1.5">
              <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.05em] text-ai">
                <FileText className="size-3" /> {citation.title}
                <span className="ml-auto">{citation.ref}</span>
              </div>
              <blockquote className="mt-1 border-l-2 border-ai-line pl-1.5 text-[10px] leading-relaxed text-ink">
                {citation.line}
              </blockquote>
              <div className="mt-1 truncate font-mono text-[8.5px] text-faint">{citation.source}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
