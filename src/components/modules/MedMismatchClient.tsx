"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Files,
  Filter,
  GitCompareArrows,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { MED_PATIENTS, type Discrepancy, type MedDocument } from "@/lib/mock-clinical";
import { cn, formatShortTime } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import {
  Badge,
  Button,
  Callout,
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  Progress,
  SectionLabel,
  StatTile,
  type Tone,
} from "@/components/ui";

const severityTone = (severity: Discrepancy["severity"]): Tone =>
  severity === "critical" ? "crit" : severity === "high" ? "warn" : "info";

const patientRiskTone = (risk: "critical" | "high" | "moderate"): Tone =>
  risk === "critical" ? "crit" : risk === "high" ? "warn" : "info";

function DocumentPanel({
  doc,
  highlight,
  compact,
}: {
  doc: MedDocument;
  highlight: Set<string>;
  compact: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-2.5 py-1.5">
        <FileSearch className="size-3.5 text-brand" />
        <div className="min-w-0">
          <div className="truncate text-[11.5px] font-semibold text-ink">{doc.title}</div>
          <div className="truncate font-mono text-[9px] text-faint">
            {doc.author} · {doc.timestamp} · {doc.pages}
          </div>
        </div>
        <Badge tone={doc.kind === "intake" ? "info" : "brand"} mono className="ml-auto">
          {doc.kind}
        </Badge>
      </div>
      <ol className={cn("cm-scroll divide-y divide-line/60 overflow-y-auto", compact ? "max-h-[230px]" : "max-h-[330px]")}>
        {doc.lines.map((line, index) => {
          const key = `${doc.id}:${line.id}`;
          const isHighlighted = highlight.has(key);
          return (
            <li
              key={line.id}
              className={cn(
                "flex gap-2 px-2.5 py-1.5 text-[11px] leading-relaxed transition-colors",
                isHighlighted ? "bg-crit-soft" : "hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "w-5 shrink-0 select-none text-right font-mono text-[9px] leading-5",
                  isHighlighted ? "text-crit" : "text-faint",
                )}
              >
                {index + 1}
              </span>
              <span className={cn("min-w-0", isHighlighted ? "font-medium text-ink" : "text-muted")}>
                {line.text}
                {isHighlighted ? (
                  <span className="ml-1.5 inline-flex translate-y-[-1px] items-center rounded border border-crit-line bg-crit-soft px-1 font-mono text-[8px] uppercase tracking-[0.05em] text-crit">
                    cited
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MedMismatchClient() {
  const { log } = useWorkspace();
  const [activePatientId, setActivePatientId] = useState(MED_PATIENTS[0].id);
  const [expanded, setExpanded] = useState<string | null>("mm-4471-1");
  const [resolved, setResolved] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanAt, setScanAt] = useState<string | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);

  const patient = MED_PATIENTS.find((item) => item.id === activePatientId) ?? MED_PATIENTS[0];

  const discrepancies = useMemo(
    () =>
      patient.discrepancies.filter((item) => {
        if (onlyOpen && (resolved.includes(item.id) || dismissed.includes(item.id))) return false;
        return true;
      }),
    [dismissed, onlyOpen, patient.discrepancies, resolved],
  );

  const openCount = patient.discrepancies.filter(
    (item) => !resolved.includes(item.id) && !dismissed.includes(item.id),
  ).length;
  const criticalCount = patient.discrepancies.filter((item) => item.severity === "critical").length;

  const activeHighlight = useMemo(() => {
    const set = new Set<string>();
    const target = patient.discrepancies.find((item) => item.id === expanded);
    const source = target ? [target] : patient.discrepancies;
    source.forEach((item) => item.evidence.forEach((evidence) => set.add(`${evidence.docId}:${evidence.lineId}`)));
    return set;
  }, [expanded, patient.discrepancies]);

  const runScan = async () => {
    setScanning(true);
    await log({
      action: `Cross-document reconciliation re-run for ${patient.id} (${patient.documents.length} documents)`,
      module: "MedMismatch",
      severity: "info",
      meta: { patient: patient.id, documents: patient.documents.map((doc) => doc.title) },
    });
    window.setTimeout(() => {
      setScanning(false);
      setScanAt(formatShortTime(new Date()));
    }, 1400);
  };

  const act = async (discrepancy: Discrepancy, action: "resolve" | "dismiss" | "escalate") => {
    if (action === "resolve") setResolved((prev) => [...prev, discrepancy.id]);
    if (action === "dismiss") setDismissed((prev) => [...prev, discrepancy.id]);
    await log({
      action:
        action === "resolve"
          ? `Discrepancy corrected: ${discrepancy.title} (${patient.id})`
          : action === "dismiss"
            ? `Discrepancy dismissed with rationale: ${discrepancy.title} (${patient.id})`
            : `Discrepancy escalated to attending: ${discrepancy.title} (${patient.id})`,
      module: "MedMismatch",
      severity: action === "escalate" ? "critical" : "success",
      meta: {
        patient: patient.id,
        severity: discrepancy.severity,
        evidence: discrepancy.evidence.length,
      },
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        code="MM-03"
        eyebrow="Clinical Safety Engine · Cross-document integrity"
        title="MedMismatch — record discrepancy intelligence"
        description="Compares intake notes, MAR and live lab charts to surface contradictions before they reach the bedside. Every flag carries verbatim source lines you can audit."
        icon={<GitCompareArrows className="size-5" />}
        meta={
          <>
            <Badge tone="ai" dot>
              AI grounded · {patient.discrepancies.length} findings
            </Badge>
            <Badge tone="neutral" mono>
              {scanAt ? `SCAN ${scanAt}` : "SCAN PENDING"}
            </Badge>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Filter className="size-3.5" />}
              onClick={() => setOnlyOpen((value) => !value)}
            >
              {onlyOpen ? "Showing open" : "Show open only"}
            </Button>
            <Button
              variant="primary"
              icon={<ScanSearch className={cn("size-3.5", scanning && "animate-spin")} />}
              disabled={scanning}
              onClick={() => void runScan()}
            >
              {scanning ? "Reconciling…" : "Run reconciliation"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        <StatTile
          label="Patient record"
          value={patient.id}
          hint={`${patient.name} · ${patient.mrn}`}
          tone="brand"
          icon={<Files className="size-3.5" />}
        />
        <StatTile
          label="Open discrepancies"
          value={openCount}
          hint={`${patient.discrepancies.length} total findings this encounter`}
          tone={openCount > 0 ? "warn" : "ok"}
          icon={<AlertTriangle className="size-3.5" />}
          delta={{ value: patient.risk.toUpperCase(), tone: patientRiskTone(patient.risk) }}
        />
        <StatTile
          label="Critical contradictions"
          value={criticalCount}
          hint="Requires named clinician decision"
          tone="crit"
          icon={<ShieldAlert className="size-3.5" />}
        />
        <StatTile
          label="Documents compared"
          value={patient.documents.length}
          hint={patient.documents.map((doc) => doc.kind.toUpperCase()).join(" · ")}
          tone="info"
          icon={<FileSearch className="size-3.5" />}
        />
        <StatTile
          label="Grounding precision"
          value={Math.round(
            (patient.discrepancies.reduce((sum, item) => sum + item.confidence, 0) /
              patient.discrepancies.length) *
              100,
          )}
          unit="%"
          hint="Verbatim citation coverage"
          tone="ai"
          icon={<Sparkles className="size-3.5" />}
          delta={{ value: "AUDITABLE", tone: "ai" }}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {MED_PATIENTS.map((item) => {
          const open = item.discrepancies.filter(
            (discrepancy) => !resolved.includes(discrepancy.id) && !dismissed.includes(discrepancy.id),
          ).length;
          const selected = item.id === patient.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActivePatientId(item.id);
                setExpanded(item.discrepancies[0]?.id ?? null);
              }}
              className={cn(
                "rounded-xl border p-2.5 text-left transition-all",
                selected
                  ? "border-brand-line bg-brand-soft shadow-sm"
                  : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] font-semibold text-ink">{item.id}</span>
                <Badge tone={patientRiskTone(item.risk)} mono>
                  {item.risk}
                </Badge>
              </div>
              <div className="mt-0.5 truncate text-[12px] font-semibold text-ink">{item.name}</div>
              <div className="truncate font-mono text-[9.5px] text-faint">
                {item.unit} · {item.problem}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge tone={open > 0 ? "warn" : "ok"} className="px-1 py-0 text-[9px]">
                  {open} open
                </Badge>
                <Badge tone="neutral" className="px-1 py-0 text-[9px]">
                  {item.documents.length} docs
                </Badge>
                {selected ? (
                  <span className="ml-auto flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.06em] text-brand">
                    Active <Check className="size-3" />
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel
              right={
                <Badge tone="neutral" mono>
                  {discrepancies.length} findings
                </Badge>
              }
            >
              Discrepancy queue · expand for AI citation
            </SectionLabel>
          </div>

          {discrepancies.length === 0 ? (
            <Panel>
              <EmptyState
                title="No open discrepancies"
                description="All findings for this patient have been resolved or dismissed with a documented rationale."
                icon={<Check className="size-5" />}
              />
            </Panel>
          ) : (
            discrepancies.map((discrepancy) => {
              const isOpen = expanded === discrepancy.id;
              const isResolved = resolved.includes(discrepancy.id);
              const isDismissed = dismissed.includes(discrepancy.id);
              const tone = severityTone(discrepancy.severity);
              return (
                <article
                  key={discrepancy.id}
                  className={cn(
                    "cm-card overflow-hidden border-l-[3px]",
                    tone === "crit" ? "border-l-crit" : tone === "warn" ? "border-l-warn" : "border-l-info",
                    (isResolved || isDismissed) && "opacity-70",
                  )}
                >
                  <div className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={tone} dot>
                        {discrepancy.severity.toUpperCase()}
                      </Badge>
                      <Badge tone="neutral" mono>
                        {discrepancy.category}
                      </Badge>
                      <span className="font-mono text-[9.5px] text-faint">{discrepancy.id}</span>
                      {isResolved ? (
                        <Badge tone="ok" className="ml-auto">
                          <Check className="size-2.5" /> Corrected
                        </Badge>
                      ) : null}
                      {isDismissed ? (
                        <Badge tone="neutral" className="ml-auto">
                          <X className="size-2.5" /> Dismissed
                        </Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 text-[12.5px] font-semibold leading-snug text-ink">
                      {discrepancy.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{discrepancy.summary}</p>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {discrepancy.evidence.map((evidence) => {
                        const doc = patient.documents.find((item) => item.id === evidence.docId);
                        return (
                          <span
                            key={`${evidence.docId}-${evidence.lineId}`}
                            className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] text-faint"
                          >
                            {doc?.title ?? evidence.docId} · L{evidence.lineId.replace(/\D/g, "")}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-2 rounded-md border border-line bg-surface-2 px-2 py-1.5">
                      <div className="flex items-start gap-1.5 text-[10.5px] leading-snug text-ink">
                        <ArrowRight className="mt-[1px] size-3 shrink-0 text-brand" />
                        <span>
                          <span className="font-semibold">Recommended action:</span>{" "}
                          {discrepancy.recommendation}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : discrepancy.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors",
                          isOpen
                            ? "border-ai-line bg-ai-soft text-ai"
                            : "border-line bg-surface text-muted hover:text-ink",
                        )}
                      >
                        <BrainCircuit className="size-3" />
                        {isOpen ? "Hide AI citation" : "Show AI citation"}
                        {isOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      </button>
                      <span className="ml-auto flex items-center gap-1.5">
                        <Button
                          size="xs"
                          variant="secondary"
                          icon={<X className="size-3" />}
                          onClick={() => void act(discrepancy, "dismiss")}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          icon={<AlertTriangle className="size-3" />}
                          onClick={() => void act(discrepancy, "escalate")}
                        >
                          Escalate
                        </Button>
                        <Button
                          size="xs"
                          variant="primary"
                          icon={<Check className="size-3" />}
                          onClick={() => void act(discrepancy, "resolve")}
                        >
                          Accept correction
                        </Button>
                      </span>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="cm-rise border-t border-ai-line bg-ai-soft/60 px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="ai" mono>
                          <Sparkles className="size-2.5" /> AI CITATION
                        </Badge>
                        <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-faint">
                          CareMatrix Grounding v3 · retrieval + entailment
                        </span>
                        <span className="ml-auto flex items-center gap-1 font-mono text-[9.5px] text-ai">
                          confidence {(discrepancy.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        className="mt-1"
                        value={discrepancy.confidence * 100}
                        tone="ai"
                        height="h-1"
                      />
                      <p className="mt-2 text-[11px] leading-relaxed text-ink">{discrepancy.aiRationale}</p>
                      <div className="mt-2 space-y-1.5">
                        {discrepancy.evidence.map((evidence) => {
                          const doc = patient.documents.find((item) => item.id === evidence.docId);
                          return (
                            <div
                              key={`${evidence.docId}-${evidence.lineId}`}
                              className="rounded-md border border-ai-line/60 bg-surface px-2 py-1.5"
                            >
                              <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.05em] text-faint">
                                <FileSearch className="size-3 text-ai" />
                                {doc?.title}
                                <span className="text-ai">
                                  line {evidence.lineId.replace(/\D/g, "")}
                                </span>
                                <span className="ml-auto">{doc?.timestamp}</span>
                              </div>
                              <blockquote className="mt-0.5 border-l-2 border-ai-line pl-2 font-mono text-[10.5px] leading-relaxed text-ink">
                                “{evidence.quote}”
                              </blockquote>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 font-mono text-[9px] text-faint">
                        <Check className="size-3 text-ok" /> Citation verified against document hash ·
                        read-only evidence snapshot retained 7y
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}

          <Callout tone="warn" title="Non-diagnostic decision support" icon={<AlertTriangle className="size-4" />}>
            Findings are generated from source documents and require clinician confirmation. Nothing on this
            screen alters the medication record automatically.
          </Callout>
        </div>

        <div className="space-y-2.5">
          <Panel>
            <PanelHeader
              title="Source documents"
              subtitle={`${patient.name} · ${patient.unit}`}
              icon={<Files className="size-3.5" />}
              tag={<Badge tone="brand" mono>evidence locked</Badge>}
              right={
                <Badge tone={activeHighlight.size > 0 ? "crit" : "neutral"} className="px-1 py-0 text-[9px]">
                  {activeHighlight.size} cited lines
                </Badge>
              }
            />
            <div className="space-y-2 p-2.5">
              {patient.documents.map((doc) => (
                <DocumentPanel key={doc.id} doc={doc} highlight={activeHighlight} compact={false} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-surface-2 px-3 py-1.5 font-mono text-[9px] text-faint">
              <span className="flex items-center gap-1 text-muted">
                <GitCompareArrows className="size-3" /> {patient.documents.length} documents aligned
              </span>
              <span>OCR 94.2%</span>
              <span className="ml-auto">FHIR DocumentReference</span>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Reconciliation coverage"
              subtitle="What the engine was able to verify"
              icon={<Sparkles className="size-3.5" />}
            />
            <div className="space-y-2 p-3">
              {[
                { label: "Allergy vs active orders", value: 100 },
                { label: "Anticoagulation plan", value: 96 },
                { label: "Renal dose adjustments", value: 78 },
                { label: "Transfusion documentation", value: 64 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-muted">{item.label}</span>
                    <span className="font-mono text-ink">{item.value}%</span>
                  </div>
                  <Progress
                    className="mt-0.5"
                    value={item.value}
                    tone={item.value >= 90 ? "ok" : item.value >= 70 ? "warn" : "crit"}
                    height="h-1"
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
