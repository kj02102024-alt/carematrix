"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleSlash,
  CopyX,
  Layers,
  Pill,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import {
  DOSE_PATIENTS,
  INTERACTION_RULES,
  type DosePatient,
  type Prescription,
} from "@/lib/mock-clinical";
import { cn, formatShortTime } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import {
  Badge,
  Button,
  Callout,
  DataTableShell,
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  SectionLabel,
  StatTile,
  Th,
  type Tone,
} from "@/components/ui";

type FlagKind = "duplicate" | "class" | "interaction" | "renal" | "allergy";

type Flag = {
  id: string;
  kind: FlagKind;
  severity: "critical" | "high" | "moderate";
  title: string;
  detail: string;
  recommendation: string;
  rxIds: string[];
  prescribers: string[];
  citation: { source: string; reference: string; quote: string };
};

const KIND_META: Record<FlagKind, { label: string; tone: Tone; icon: React.ReactNode }> = {
  duplicate: { label: "Duplicate ingredient", tone: "crit", icon: <CopyX className="size-3" /> },
  class: { label: "Therapeutic duplication", tone: "warn", icon: <Layers className="size-3" /> },
  interaction: { label: "Drug interaction", tone: "crit", icon: <TriangleAlert className="size-3" /> },
  renal: { label: "Renal dose review", tone: "warn", icon: <ShieldAlert className="size-3" /> },
  allergy: { label: "Allergy conflict", tone: "crit", icon: <CircleSlash className="size-3" /> },
};

const severityTone = (severity: Flag["severity"]): Tone =>
  severity === "critical" ? "crit" : severity === "high" ? "warn" : "info";

function deriveFlags(patient: DosePatient): Flag[] {
  const flags: Flag[] = [];
  const active = patient.prescriptions.filter((rx) => rx.status === "active");

  const byIngredient = new Map<string, Prescription[]>();
  active.forEach((rx) => {
    byIngredient.set(rx.ingredient, [...(byIngredient.get(rx.ingredient) ?? []), rx]);
  });

  byIngredient.forEach((group, ingredient) => {
    if (group.length < 2) return;
    const prescribers = [...new Set(group.map((rx) => `${rx.prescriber} (${rx.specialty})`))];
    const totalDose = group.map((rx) => `${rx.drug} ${rx.dose} ${rx.route} ${rx.frequency}`).join(" + ");
    flags.push({
      id: `dup-${patient.id}-${ingredient}`,
      kind: "duplicate",
      severity: "high",
      title: `${group.length}× ${ingredient} active across ${prescribers.length} prescribers`,
      detail: `Overlapping active ingredient detected: ${totalDose}. Maximum cumulative exposure is not tracked because each order carries an independent stop date.`,
      recommendation: `Keep one ${ingredient} order, cancel the remainder, and document the intended total daily dose in the MAR.`,
      rxIds: group.map((rx) => rx.id),
      prescribers,
      citation: {
        source: "CareMatrix medication safety KB",
        reference: "KB-DUP-0011 · ingredient reconciliation",
        quote:
          "More than one active order containing the same active ingredient requires a documented dose ceiling and prescriber confirmation.",
      },
    });
  });

  const byClass = new Map<string, Prescription[]>();
  active.forEach((rx) => {
    byClass.set(rx.drugClass, [...(byClass.get(rx.drugClass) ?? []), rx]);
  });
  byClass.forEach((group, drugClass) => {
    const distinctIngredients = new Set(group.map((rx) => rx.ingredient));
    if (distinctIngredients.size < 2) return;
    flags.push({
      id: `class-${patient.id}-${drugClass}`,
      kind: "class",
      severity: "moderate",
      title: `Therapeutic duplication within ${drugClass}`,
      detail: `${group.map((rx) => rx.drug).join(" + ")} act through the same pharmacological class with no additive benefit.`,
      recommendation: "Consolidate to a single agent from this class and re-evaluate the indication for each order.",
      rxIds: group.map((rx) => rx.id),
      prescribers: [...new Set(group.map((rx) => `${rx.prescriber} (${rx.specialty})`))],
      citation: {
        source: "CareMatrix formulary monograph",
        reference: "FM-DUP-0007",
        quote: "Duplicate agents within a class increase adverse effects without improving efficacy.",
      },
    });
  });

  INTERACTION_RULES.forEach((rule) => {
    const a = active.find((rx) => rx.ingredient === rule.a);
    const b = active.find((rx) => rx.ingredient === rule.b);
    if (!a || !b) return;
    flags.push({
      id: `${rule.id}-${patient.id}`,
      kind: "interaction",
      severity: rule.severity === "major" ? "critical" : "moderate",
      title: rule.title,
      detail: rule.mechanism,
      recommendation: rule.recommendation,
      rxIds: [a.id, b.id],
      prescribers: [...new Set([`${a.prescriber} (${a.specialty})`, `${b.prescriber} (${b.specialty})`])],
      citation: rule.citation,
    });
  });

  const egfr = Number(patient.egfr.replace(/[^\d.]/g, ""));
  if (Number.isFinite(egfr) && egfr < 45) {
    const renalRxs = active.filter((rx) =>
      ["enoxaparin", "apixaban", "rivaroxaban", "dabigatran"].includes(rx.ingredient),
    );
    if (renalRxs.length > 0) {
      flags.push({
        id: `renal-${patient.id}`,
        kind: "renal",
        severity: "high",
        title: `Renal dose review required (eGFR ${patient.egfr})`,
        detail: `${renalRxs.map((rx) => `${rx.drug} ${rx.dose}`).join(", ")} prescribed without a documented renal adjustment.`,
        recommendation: "Verify indication and weight-based criteria; adjust or hold per renal dosing matrix.",
        rxIds: renalRxs.map((rx) => rx.id),
        prescribers: [...new Set(renalRxs.map((rx) => `${rx.prescriber} (${rx.specialty})`))],
        citation: {
          source: "Hospital renal dosing matrix",
          reference: "RD-2026.1 · LMWH / DOAC",
          quote: "eGFR below 45 mL/min requires documented dose review for anticoagulants before next administration.",
        },
      });
    }
  }

  patient.allergies.forEach((allergy) => {
    const match = active.find(
      (rx) =>
        rx.ingredient.toLowerCase().includes(allergy.toLowerCase().slice(0, 5)) ||
        rx.drug.toLowerCase().includes(allergy.toLowerCase().slice(0, 5)),
    );
    if (match) {
      flags.push({
        id: `allergy-${patient.id}-${allergy}`,
        kind: "allergy",
        severity: "critical",
        title: `Allergy conflict: ${allergy} vs ${match.drug}`,
        detail: `Documented allergy to ${allergy} with an active order for ${match.drug}.`,
        recommendation: "Stop the order immediately and substitute a non-cross-reactive agent.",
        rxIds: [match.id],
        prescribers: [`${match.prescriber} (${match.specialty})`],
        citation: {
          source: "CareMatrix allergy guardrail",
          reference: "ALG-0033",
          quote: "Orders matching a recorded allergy require an explicit override with attending sign-off.",
        },
      });
    }
  });

  return flags;
}

const DOSE_ORDER: Flag["severity"][] = ["critical", "high", "moderate"];

export function DoseGuardClient() {
  const { log } = useWorkspace();
  const [patientId, setPatientId] = useState(DOSE_PATIENTS[0].id);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | FlagKind>("all");
  const [resolved, setResolved] = useState<string[]>([]);
  const [notified, setNotified] = useState<string[]>([]);
  const [sweepAt, setSweepAt] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);

  const patient = DOSE_PATIENTS.find((item) => item.id === patientId) ?? DOSE_PATIENTS[0];
  const flags = useMemo(() => deriveFlags(patient), [patient]);
  const activePrescriptions = patient.prescriptions.filter((rx) => rx.status === "active");
  const prescribers = [...new Set(activePrescriptions.map((rx) => rx.prescriber))];

  const filteredFlags = useMemo(() => {
    const list = flags.filter((flag) => (filter === "all" ? true : flag.kind === filter));
    return list.sort(
      (a, b) => DOSE_ORDER.indexOf(a.severity) - DOSE_ORDER.indexOf(b.severity),
    );
  }, [filter, flags]);

  const flagForRx = (rxId: string) =>
    flags.filter((flag) => flag.rxIds.includes(rxId) && !resolved.includes(flag.id));

  const stats = useMemo(() => {
    const allFlags = DOSE_PATIENTS.flatMap((item) => deriveFlags(item));
    return {
      total: allFlags.length,
      duplicates: allFlags.filter((flag) => flag.kind === "duplicate").length,
      interactions: allFlags.filter((flag) => flag.kind === "interaction").length,
      critical: allFlags.filter((flag) => flag.severity === "critical").length,
      prescriptions: DOSE_PATIENTS.reduce((sum, item) => sum + item.prescriptions.length, 0),
    };
  }, []);

  const runSweep = async () => {
    setSweeping(true);
    await log({
      action: `DoseGuard interaction sweep across ${DOSE_PATIENTS.length} patients · ${flags.length} flags returned for ${patient.id}`,
      module: "DoseGuard",
      severity: flags.some((flag) => flag.severity === "critical") ? "critical" : "warning",
      meta: { patient: patient.id, flags: flags.map((flag) => flag.id) },
    });
    window.setTimeout(() => {
      setSweeping(false);
      setSweepAt(formatShortTime(new Date()));
    }, 1200);
  };

  const onNotify = async (flag: Flag) => {
    setNotified((prev) => [...prev, flag.id]);
    await log({
      action: `Prescriber notified of ${flag.title} (${patient.id}) — ${flag.prescribers.join(", ")}`,
      module: "DoseGuard",
      severity: "critical",
      meta: { flag: flag.id, prescribers: flag.prescribers },
    });
  };

  const onResolve = async (flag: Flag) => {
    setResolved((prev) => [...prev, flag.id]);
    await log({
      action: `DoseGuard flag resolved: ${flag.title} (${patient.id})`,
      module: "DoseGuard",
      severity: "success",
      meta: { flag: flag.id },
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        code="DG-04"
        eyebrow="Clinical Safety Engine · Medication reconciliation"
        title="DoseGuard — duplicate & interaction detector"
        description="Cross-references every active prescription from every consulting doctor, flagging overlapping active ingredients, therapeutic duplication and interaction pairs before the next administration."
        icon={< Pill className="size-5" />}
        meta={
          <>
            <Badge tone="crit" dot>
              {stats.critical} major interactions
            </Badge>
            <Badge tone="neutral" mono>
              {sweepAt ? `SWEEP ${sweepAt}` : "SWEEP PENDING"}
            </Badge>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<RefreshCw className={cn("size-3.5", sweeping && "animate-spin")} />}
              disabled={sweeping}
              onClick={() => void runSweep()}
            >
              {sweeping ? "Sweeping…" : "Run interaction sweep"}
            </Button>
            <Button
              variant="primary"
              icon={<UserRound className="size-3.5" />}
              onClick={() =>
                void log({
                  action: `Medication review huddle requested for ${patient.id} with ${prescribers.length} prescribers`,
                  module: "DoseGuard",
                  severity: "warning",
                })
              }
            >
              Request prescriber huddle
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        <StatTile label="Patients screened" value={DOSE_PATIENTS.length} hint="Active MAR reconciliation" tone="brand" icon={<UserRound className="size-3.5" />} />
        <StatTile label="Active prescriptions" value={stats.prescriptions} hint={`${prescribers.length} prescribers on this chart`} icon={<Pill className="size-3.5" />} />
        <StatTile label="Duplicate ingredients" value={stats.duplicates} tone="crit" hint="Same active ingredient across orders" icon={<CopyX className="size-3.5" />} delta={{ value: "DUPLICATE", tone: "crit" }} />
        <StatTile label="Major interactions" value={stats.interactions} tone="warn" hint="Severity ≥ major per KB" icon={<TriangleAlert className="size-3.5" />} />
        <StatTile label="Total open flags" value={flags.filter((flag) => !resolved.includes(flag.id)).length} tone="info" hint={`${resolved.length} resolved this session`} icon={<ShieldAlert className="size-3.5" />} delta={{ value: "AI + KB", tone: "ai" }} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {DOSE_PATIENTS.map((item) => {
          const selected = item.id === patient.id;
          const itemFlags = deriveFlags(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPatientId(item.id)}
              className={cn(
                "rounded-xl border p-2.5 text-left transition-all",
                selected ? "border-brand-line bg-brand-soft shadow-sm" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10.5px] font-semibold text-ink">{item.id}</span>
                <span className="text-[12px] font-semibold text-ink">{item.name}</span>
                <Badge tone={selected ? "brand" : "neutral"} mono className="ml-auto">
                  {item.prescriptions.length} RX
                </Badge>
                <Badge tone="crit">{itemFlags.filter((flag) => flag.severity === "critical").length} CRIT</Badge>
              </div>
              <div className="mt-0.5 font-mono text-[9.5px] text-faint">
                {item.unit} · {item.age}{item.sex} · {item.weight} · eGFR {item.egfr}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <Stethoscope className="size-3 text-faint" />
                  {[...new Set(item.prescriptions.map((rx) => rx.prescriber))].length} consulting doctors
                </span>
                <span className="ml-auto text-crit">
                  Allergy: {item.allergies.join(", ") || "none"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title={`Active prescription register — ${patient.name}`}
            subtitle="Every row is an active order from a distinct prescriber; warning badges are derived from overlapping ingredients and interaction rules."
            icon={<Pill className="size-3.5" />}
            tag={<Badge tone="brand" mono>FHIR MedicationRequest</Badge>}
            right={
              <Badge tone="neutral" mono>
                eGFR {patient.egfr}
              </Badge>
            }
          />
          <DataTableShell>
            <table className="w-full min-w-[820px] border-collapse text-[11.5px]">
              <thead>
                <tr>
                  <Th>Medication</Th>
                  <Th>Active ingredient</Th>
                  <Th>Dose / route / frequency</Th>
                  <Th>Prescriber</Th>
                  <Th>Start</Th>
                  <Th>Flags</Th>
                </tr>
              </thead>
              <tbody>
                {patient.prescriptions.map((rx) => {
                  const rowFlags = flagForRx(rx.id);
                  const critical = rowFlags.some((flag) => flag.severity === "critical");
                  return (
                    <tr
                      key={rx.id}
                      className={cn(
                        "border-b border-line transition-colors hover:bg-surface-2",
                        critical && "bg-crit-soft/30",
                      )}
                    >
                      <td className="px-3 py-2">
                        <div className="text-[11.5px] font-medium text-ink">{rx.drug}</div>
                        <div className="font-mono text-[9px] text-faint">{rx.drugClass}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={rx.ingredient === "acetaminophen" ? "crit" : "neutral"} mono className="normal-case">
                          {rx.ingredient}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-ink">
                        {rx.dose} · {rx.route} · {rx.frequency}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-[10.5px] text-ink">{rx.prescriber}</div>
                        <div className="font-mono text-[9px] text-faint">{rx.specialty}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted">{rx.start}</td>
                      <td className="px-3 py-2">
                        {rowFlags.length === 0 ? (
                          <Badge tone="ok" className="px-1 py-0 text-[9px]">
                            <Check className="size-2.5" /> Clear
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {rowFlags.slice(0, 3).map((flag) => (
                              <Badge
                                key={flag.id}
                                tone={KIND_META[flag.kind].tone}
                                className="px-1 py-0 text-[8.5px]"
                              >
                                {KIND_META[flag.kind].icon}
                                {KIND_META[flag.kind].label}
                              </Badge>
                            ))}
                            {rowFlags.length > 3 ? (
                              <Badge tone="neutral" className="px-1 py-0 text-[8.5px]">
                                +{rowFlags.length - 3}
                              </Badge>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableShell>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-surface-2 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.05em] text-faint">
            <span className="text-muted">MAR snapshot · live reconciliation</span>
            <span>{prescribers.length} prescribers reconciled</span>
            <span className="ml-auto flex items-center gap-1 text-ok">
              <ShieldCheck className="size-3" /> Every change is hash-chained
            </span>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Detected issues"
            subtitle="Ranked by severity · expand the citation for the exact knowledge-base line"
            icon={<Sparkles className="size-3.5" />}
            tag={
              <Badge tone="ai" mono>
                KB + LLM entailment
              </Badge>
            }
            right={
              <div className="flex items-center gap-0.5 rounded-md border border-line bg-surface-2 p-0.5">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "duplicate", label: "Duplicates" },
                    { id: "interaction", label: "Interactions" },
                  ] as Array<{ id: "all" | FlagKind; label: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={cn(
                      "rounded px-1.5 py-1 text-[10px] font-medium transition-colors",
                      filter === item.id ? "bg-surface text-ink shadow-sm" : "text-faint hover:text-ink",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="cm-scroll max-h-[620px] space-y-2 overflow-y-auto p-2.5">
            {filteredFlags.length === 0 ? (
              <EmptyState
                title="No flags in this view"
                description="This patient has no active duplicates or interactions matching the current filter."
                icon={<ShieldCheck className="size-5" />}
              />
            ) : (
              filteredFlags.map((flag) => {
                const isOpen = expanded === flag.id;
                const isResolved = resolved.includes(flag.id);
                const kind = KIND_META[flag.kind];
                return (
                  <article
                    key={flag.id}
                    className={cn(
                      "cm-card overflow-hidden border-l-[3px]",
                      flag.severity === "critical" ? "border-l-crit" : flag.severity === "high" ? "border-l-warn" : "border-l-info",
                      isResolved && "opacity-60",
                    )}
                  >
                    <div className="px-2.5 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={kind.tone}>
                          {kind.icon}
                          {kind.label}
                        </Badge>
                        <Badge tone={severityTone(flag.severity)} mono>
                          {flag.severity}
                        </Badge>
                        {notified.includes(flag.id) ? (
                          <Badge tone="info" className="ml-auto px-1 py-0 text-[9px]">
                            Prescriber notified
                          </Badge>
                        ) : null}
                        {isResolved ? (
                          <Badge tone="ok" className="ml-auto">
                            <Check className="size-2.5" /> Resolved
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="mt-1.5 text-[12px] font-semibold leading-snug text-ink">{flag.title}</h3>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{flag.detail}</p>

                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {flag.rxIds.map((rxId) => {
                          const rx = patient.prescriptions.find((item) => item.id === rxId);
                          if (!rx) return null;
                          return (
                            <span
                              key={rxId}
                              className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] text-faint"
                            >
                              {rx.drug} · {rx.prescriber}
                            </span>
                          );
                        })}
                      </div>

                      <div className="mt-1.5 rounded-md border border-line bg-surface-2 px-2 py-1.5">
                        <div className="flex items-start gap-1.5 text-[10.5px] leading-snug text-ink">
                          <ArrowRight className="mt-[1px] size-3 shrink-0 text-brand" />
                          <span>{flag.recommendation}</span>
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : flag.id)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded border px-1.5 py-1 text-[10px] font-medium transition-colors",
                            isOpen ? "border-ai-line bg-ai-soft text-ai" : "border-line bg-surface text-muted hover:text-ink",
                          )}
                        >
                          <Sparkles className="size-3" /> {isOpen ? "Hide citation" : "AI citation"}
                          {isOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>
                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            size="xs"
                            variant="secondary"
                            disabled={notified.includes(flag.id)}
                            onClick={() => void onNotify(flag)}
                          >
                            Notify prescriber
                          </Button>
                          <Button
                            size="xs"
                            variant="primary"
                            disabled={isResolved}
                            icon={<Check className="size-3" />}
                            onClick={() => void onResolve(flag)}
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="cm-rise border-t border-ai-line bg-ai-soft/60 px-2.5 py-2">
                        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-ai">
                          <Sparkles className="size-3" /> {flag.citation.source} · {flag.citation.reference}
                        </div>
                        <blockquote className="mt-1 border-l-2 border-ai-line pl-2 text-[10.5px] leading-relaxed text-ink">
                          “{flag.citation.quote}”
                        </blockquote>
                        <div className="mt-1 font-mono text-[9px] text-faint">
                          Prescriber scope: {flag.prescribers.join(" · ")}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Prescriber × ingredient matrix"
          subtitle="Consulting doctors with overlapping active ingredients on this chart"
          icon={<Stethoscope className="size-3.5" />}
          tag={<Badge tone="warn" mono>{prescribers.length} prescribers</Badge>}
        />
        <DataTableShell>
          <table className="w-full min-w-[640px] border-collapse text-[11px]">
            <thead>
              <tr>
                <Th>Prescriber</Th>
                <Th>Specialty</Th>
                <Th>Active orders</Th>
                <Th>Ingredients</Th>
                <Th align="right">Overlap</Th>
              </tr>
            </thead>
            <tbody>
              {prescribers.map((prescriber) => {
                const rows = activePrescriptions.filter((rx) => rx.prescriber === prescriber);
                const ingredients = [...new Set(rows.map((rx) => rx.ingredient))];
                const overlap = ingredients.filter(
                  (ingredient) =>
                    activePrescriptions.filter((rx) => rx.ingredient === ingredient).length > 1,
                );
                return (
                  <tr key={prescriber} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                    <td className="px-3 py-2 font-medium text-ink">{prescriber}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted">{rows[0]?.specialty}</td>
                    <td className="px-3 py-2 font-mono text-[10.5px] text-ink">{rows.length}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {ingredients.map((ingredient) => (
                          <span
                            key={ingredient}
                            className="rounded border border-line bg-surface-2 px-1 py-0.5 font-mono text-[9px] text-faint"
                          >
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {overlap.length > 0 ? (
                        <Badge tone="crit" mono>
                          {overlap.length} shared
                        </Badge>
                      ) : (
                        <Badge tone="ok" mono>
                          clear
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTableShell>
        <div className="border-t border-line bg-surface-2 p-2.5">
          <Callout tone="crit" title="Highest-risk combination on this chart" icon={<TriangleAlert className="size-4" />}>
            {flags.find((flag) => flag.kind === "interaction")?.title ??
              "No interaction rules matched for this patient."}{" "}
            Review the source orders and notify every prescriber involved before the next medication round.
          </Callout>
        </div>
      </Panel>
    </div>
  );
}
