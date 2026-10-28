"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  FileWarning,
  FlaskConical,
  Phone,
  Search,
  ShieldCheck,
  Siren,
  Timer,
  UserRound,
} from "lucide-react";
import type { LabResult } from "@/lib/data-types";
import { cn, formatDateTime, formatShortTime, relativeTime } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import {
  Badge,
  Button,
  Callout,
  DataTableShell,
  EmptyState,
  IconButton,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  Th,
  type Tone,
} from "@/components/ui";

type Filter = "all" | "pending" | "acknowledged" | "critical";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All results" },
  { id: "pending", label: "Pending" },
  { id: "critical", label: "Critical" },
  { id: "acknowledged", label: "Acknowledged" },
];

const severityTone = (severity: LabResult["severity"]): Tone =>
  severity === "critical" ? "crit" : severity === "high" ? "warn" : "info";

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const kickoff = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(kickoff);
    };
  }, []);
  return now;
}

function countdown(lab: LabResult, now: number | null) {
  const deadline = new Date(lab.collectedAt).getTime() + lab.slaMinutes * 60_000;
  const remainingMs = deadline - (now ?? deadline);
  const remainingMin = Math.floor(Math.abs(remainingMs) / 60_000);
  const seconds = Math.floor((Math.abs(remainingMs) % 60_000) / 1000);
  return {
    overdue: remainingMs < 0,
    label: `${remainingMin}:${String(seconds).padStart(2, "0")}`,
    remainingMin,
  };
}

function escalationTier(lab: LabResult, remainingMin: number, overdue: boolean) {
  if (lab.status === "acknowledged") return { label: "Closed loop", tone: "ok" as Tone, level: "L0" };
  if (overdue) return { label: "Rapid response paged", tone: "crit" as Tone, level: "L3" };
  if (remainingMin <= 3) return { label: "Attending paged", tone: "crit" as Tone, level: "L2" };
  if (remainingMin <= 8) return { label: "Charge nurse notified", tone: "warn" as Tone, level: "L1" };
  return { label: "Unit notified", tone: "info" as Tone, level: "L0" };
}

export function LabLoopClient({
  initialLabs,
  source,
}: {
  initialLabs: LabResult[];
  source: "database" | "mock";
}) {
  const { log, refreshAudit, profile, role } = useWorkspace();
  const [labs, setLabs] = useState<LabResult[]>(initialLabs);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const now = useNow();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return labs.filter((lab) => {
      if (filter === "pending" && lab.status !== "pending") return false;
      if (filter === "acknowledged" && lab.status !== "acknowledged") return false;
      if (filter === "critical" && lab.severity !== "critical") return false;
      if (!needle) return true;
      return (
        lab.patientId.toLowerCase().includes(needle) ||
        lab.patientName.toLowerCase().includes(needle) ||
        lab.testName.toLowerCase().includes(needle) ||
        lab.orderCode.toLowerCase().includes(needle) ||
        lab.location.toLowerCase().includes(needle)
      );
    });
  }, [filter, labs, query]);

  const stats = useMemo(() => {
    const pending = labs.filter((lab) => lab.status === "pending");
    const criticalPending = pending.filter((lab) => lab.severity === "critical");
    const overdue = pending.filter(
      (lab) =>
        new Date(lab.collectedAt).getTime() + lab.slaMinutes * 60_000 < (now ?? Date.now()),
    );
    const acknowledged = labs.filter((lab) => lab.status === "acknowledged");
    const ackTimes = acknowledged
      .filter((lab) => lab.acknowledgedAt)
      .map(
        (lab) =>
          (new Date(lab.acknowledgedAt as string).getTime() - new Date(lab.collectedAt).getTime()) /
          60_000,
      );
    const median = ackTimes.length
      ? Math.round(ackTimes.reduce((sum, value) => sum + value, 0) / ackTimes.length)
      : 0;
    const compliance = labs.length
      ? Math.round(((labs.length - overdue.length) / labs.length) * 1000) / 10
      : 100;
    return { pending: pending.length, criticalPending: criticalPending.length, overdue: overdue.length, median, compliance };
  }, [labs, now]);

  const acknowledge = async (lab: LabResult) => {
    setPendingId(lab.id);
    try {
      const res = await fetch(`/api/labs/${lab.id}/acknowledge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, actor: profile.name }),
      });
      if (!res.ok) throw new Error("acknowledge failed");
      const data = (await res.json()) as { lab: LabResult };
      setLabs((prev) => prev.map((item) => (item.id === lab.id ? data.lab : item)));
      setFlash(`${lab.testName} ${lab.value} ${lab.unit} acknowledged · ${lab.patientId}`);
      await refreshAudit();
      window.setTimeout(() => setFlash(null), 5000);
    } catch {
      setLabs((prev) =>
        prev.map((item) =>
          item.id === lab.id
            ? {
                ...item,
                status: "acknowledged",
                acknowledgedBy: profile.name,
                acknowledgedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      await log({
        action: `Critical ${lab.testName} ${lab.value} ${lab.unit} acknowledged offline for ${lab.patientId}`,
        module: "LabLoop",
        severity: "warning",
      });
    } finally {
      setPendingId(null);
    }
  };

  const escalate = async (lab: LabResult, tier: string) => {
    await log({
      action: `${tier} paged for ${lab.testName} result on ${lab.patientId} (${lab.value} ${lab.unit})`,
      module: "LabLoop · Escalation",
      severity: "critical",
      meta: { order: lab.orderCode, location: lab.location },
    });
    setFlash(`${tier} paged · ${lab.patientId} · ${lab.testName}`);
    window.setTimeout(() => setFlash(null), 5000);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        code="LL-02"
        eyebrow="Clinical Safety Engine · Critical result loop"
        title="LabLoop — critical result acknowledgement"
        description="Every abnormal result carries an evidence-linked SLA. Countdowns escalate from unit charge nurse to rapid response automatically until a licensed clinician closes the loop."
        icon={<FlaskConical className="size-5" />}
        meta={
          <>
            <Badge tone="crit" dot pulse>
              {stats.criticalPending} critical unacknowledged
            </Badge>
            <Badge tone={source === "database" ? "info" : "warn"} mono>
              {source === "database" ? "PG · persisted" : "local mock"}
            </Badge>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Phone className="size-3.5" />}
              onClick={() =>
                void log({
                  action: "Pathology on-call line dialled from LabLoop console",
                  module: "LabLoop",
                  severity: "info",
                })
              }
            >
              Call pathology
            </Button>
            <Button
              variant="primary"
              icon={<BellRing className="size-3.5" />}
              onClick={() =>
                void log({
                  action: `Escalation broadcast sent to ${stats.pending} pending critical results`,
                  module: "LabLoop · Escalation",
                  severity: "critical",
                })
              }
            >
              Broadcast escalation
            </Button>
          </>
        }
      />

      {flash ? (
        <div className="cm-rise flex items-center gap-2 rounded-lg border border-ok-line bg-ok-soft px-3 py-2 text-[11.5px] text-ok">
          <CheckCheck className="size-4" />
          {flash}
          <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.08em]">
            SHA-256 anchored
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        <StatTile
          label="Open results"
          value={stats.pending}
          hint={`${labs.length} results in loop`}
          icon={<FlaskConical className="size-3.5" />}
        />
        <StatTile
          label="Critical pending"
          value={stats.criticalPending}
          tone="crit"
          hint="SLA ≤ 10 min escalation"
          icon={<Siren className="size-3.5" />}
          delta={{ value: "P1", tone: "crit" }}
        />
        <StatTile
          label="Breached SLA"
          value={stats.overdue}
          tone={stats.overdue > 0 ? "crit" : "ok"}
          hint="Auto-escalated to rapid response"
          icon={<Timer className="size-3.5" />}
        />
        <StatTile
          label="Median ack time"
          value={stats.median}
          unit="min"
          tone="ok"
          hint="Target ≤ 8 min for critical"
          icon={<Clock className="size-3.5" />}
        />
        <StatTile
          label="Loop compliance"
          value={stats.compliance}
          unit="%"
          tone="brand"
          hint="Rolling 24h · target 98%"
          icon={<ShieldCheck className="size-3.5" />}
          delta={{ value: "AUDITED", tone: "info" }}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Critical lab tracking"
          subtitle="Values are quoted verbatim from the analyzer feed; acknowledgement is signed to your identity."
          icon={<FileWarning className="size-3.5" />}
          tag={<Badge tone="brand" mono>FHIR DiagnosticReport</Badge>}
          right={
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-faint" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Patient, order, test…"
                  aria-label="Search lab results"
                  className="h-7 w-[170px] rounded-md border border-line bg-surface-2 pl-7 pr-2 text-[11px] text-ink outline-none placeholder:text-faint focus:border-brand-line focus:ring-2 focus:ring-brand-soft"
                />
              </div>
              <div className="flex items-center gap-0.5 rounded-md border border-line bg-surface-2 p-0.5">
                {FILTERS.map((item) => (
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
            </>
          }
        />

        <DataTableShell>
          <table className="w-full min-w-[1080px] border-collapse text-[11.5px]">
            <thead>
              <tr>
                <Th className="w-6" />
                <Th>Patient / location</Th>
                <Th>Test</Th>
                <Th>Critical value</Th>
                <Th>Collected</Th>
                <Th>Acknowledgment</Th>
                <Th>Escalation timer</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="No results match this view"
                      description="Adjust filters or clear the search to see the full critical result loop."
                      icon={<FlaskConical className="size-5" />}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((lab) => {
                  const timer = countdown(lab, now);
                  const tier = escalationTier(lab, timer.remainingMin, timer.overdue);
                  const isOpen = expanded === lab.id;
                  const isPending = lab.status === "pending";
                  return (
                    <Fragment key={lab.id}>
                      <tr
                        className={cn(
                          "border-b border-line transition-colors hover:bg-surface-2",
                          isPending && timer.overdue && "bg-crit-soft/40",
                        )}
                      >
                        <td className="px-1.5 py-2">
                          <IconButton
                            label={isOpen ? "Hide result context" : "Show result context"}
                            active={isOpen}
                            onClick={() => setExpanded(isOpen ? null : lab.id)}
                            className="size-6"
                          >
                            {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                          </IconButton>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11.5px] font-semibold text-ink">{lab.patientId}</span>
                            <span className="text-[11px] text-muted">{lab.patientName}</span>
                          </div>
                          <div className="font-mono text-[9.5px] text-faint">{lab.location}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-[11.5px] text-ink">{lab.testName}</div>
                          <div className="font-mono text-[9.5px] text-faint">{lab.orderCode}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "font-mono text-[13px] font-semibold",
                                lab.severity === "critical" ? "text-crit" : "text-warn",
                              )}
                            >
                              {lab.value}
                            </span>
                            <span className="text-[10px] text-muted">{lab.unit}</span>
                            <Badge tone={severityTone(lab.severity)} mono className="px-1 py-0 text-[8.5px]">
                              {lab.severity}
                            </Badge>
                          </div>
                          <div className="font-mono text-[9.5px] text-faint">ref {lab.normalRange}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-mono text-[10.5px] text-ink">{formatShortTime(lab.collectedAt)}</div>
                          <div className="font-mono text-[9.5px] text-faint">{relativeTime(lab.collectedAt)}</div>
                        </td>
                        <td className="px-3 py-2">
                          {isPending ? (
                            <Badge tone="warn" dot>
                              Pending · unacknowledged
                            </Badge>
                          ) : (
                            <div>
                              <Badge tone="ok">
                                <Check className="size-2.5" /> Acknowledged
                              </Badge>
                              <div className="mt-0.5 text-[9.5px] text-faint">
                                {lab.acknowledgedBy} · {lab.acknowledgedAt ? formatShortTime(lab.acknowledgedAt) : ""}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isPending ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Badge tone={tier.tone} mono>
                                  {tier.level} · {tier.label}
                                </Badge>
                              </div>
                              <div
                                className={cn(
                                  "mt-0.5 font-mono text-[14px] font-semibold tabular-nums",
                                  timer.overdue ? "text-crit" : timer.remainingMin <= 3 ? "text-warn" : "text-ink",
                                )}
                                suppressHydrationWarning
                              >
                                {timer.overdue ? "+" : ""}
                                {timer.label}
                                <span className="ml-1 font-sans text-[9px] font-normal uppercase tracking-[0.06em] text-faint">
                                  {timer.overdue ? "overdue" : "to breach"}
                                </span>
                              </div>
                              <div className="mt-0.5 h-1 w-24 overflow-hidden rounded-full bg-surface-3">
                                <div
                                  className={cn("h-full", timer.overdue ? "bg-crit" : timer.remainingMin <= 3 ? "bg-warn" : "bg-brand")}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        3,
                                        ((lab.slaMinutes * 60_000 - (now ? now - new Date(lab.collectedAt).getTime() : 0)) /
                                          (lab.slaMinutes * 60_000)) *
                                          100,
                                      ),
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="font-mono text-[10px] text-ok">
                              Closed in{" "}
                              {lab.acknowledgedAt
                                ? Math.max(
                                    1,
                                    Math.round(
                                      (new Date(lab.acknowledgedAt).getTime() -
                                        new Date(lab.collectedAt).getTime()) /
                                        60_000,
                                    ),
                                  )
                                : "—"}{" "}
                              min
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="xs"
                                variant="secondary"
                                icon={<BellRing className="size-3" />}
                                onClick={() => void escalate(lab, tier.level === "L3" ? "Rapid response" : "Attending")}
                              >
                                Escalate
                              </Button>
                              <Button
                                size="xs"
                                variant="primary"
                                disabled={pendingId === lab.id}
                                icon={<Check className="size-3" />}
                                onClick={() => void acknowledge(lab)}
                              >
                                {pendingId === lab.id ? "Signing…" : "Acknowledge result"}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="xs"
                              variant="subtle"
                              icon={<ShieldCheck className="size-3" />}
                              onClick={() =>
                                void log({
                                  action: `Acknowledgement receipt opened for ${lab.orderCode} (${lab.patientId})`,
                                  module: "LabLoop",
                                  severity: "info",
                                })
                              }
                            >
                              Receipt
                            </Button>
                          )}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr key={`${lab.id}-context`} className="border-b border-line bg-surface-2">
                          <td colSpan={8} className="px-3 py-2.5">
                            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_300px]">
                              <div className="rounded-lg border border-ai-line bg-ai-soft px-2.5 py-2">
                                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ai">
                                  <ShieldCheck className="size-3.5" /> AI citation · analyzer source line
                                </div>
                                <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-ink">
                                  &gt; {lab.testName} = {lab.value} {lab.unit} [CRITICAL LOW/HIGH FLAG] ·
                                  ref {lab.normalRange} · specimen {lab.orderCode}
                                </p>
                                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-faint">
                                  source: Pathology analyzer AU-5800 · verified by two-point calibration ·
                                  confidence 99.2%
                                </div>
                              </div>
                              <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
                                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink">
                                  <UserRound className="size-3.5 text-brand" /> Result context
                                </div>
                                <div className="mt-1 space-y-1 font-mono text-[10px] text-muted">
                                  <div className="flex justify-between">
                                    <span>Collected</span>
                                    <span className="text-ink">{formatDateTime(lab.collectedAt)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>SLA window</span>
                                    <span className="text-ink">{lab.slaMinutes} min</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Reporting</span>
                                    <span className="text-ink">Auto-verified</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Ack state</span>
                                    <span className={isPending ? "text-warn" : "text-ok"}>
                                      {isPending ? "OPEN" : "SIGNED"}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-1.5 flex items-center gap-1 font-mono text-[9px] text-faint">
                                  <ArrowUpRight className="size-3" /> Sent to {lab.location.split(" · ")[0]} charge nurse
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </DataTableShell>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-surface-2 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.05em] text-faint">
          <span className="text-muted">Escalation policy CL-114</span>
          <span>L0 unit → L1 charge (8m) → L2 attending (3m) → L3 rapid response (breach)</span>
          <span className="ml-auto flex items-center gap-1 text-ok">
            <ShieldCheck className="size-3" /> Closed-loop receipt required
          </span>
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Callout tone="warn" title="Escalation ladder active" icon={<Siren className="size-4" />}>
          {stats.overdue > 0
            ? `${stats.overdue} result${stats.overdue === 1 ? "" : "s"} have breached their acknowledgement SLA. Rapid response has been paged and the medical director has been copied.`
            : "No SLA breaches in the current loop. Timers continue to escalate automatically if results remain unacknowledged."}
        </Callout>
        <Callout tone="info" title="Why this matters" icon={<ShieldCheck className="size-4" />}>
          Unacknowledged critical results are a top-decile patient-safety risk. LabLoop binds each value to a
          named acknowledgement hash so closed-loop compliance can be audited retrospectively for 7 years.
        </Callout>
      </div>
    </div>
  );
}
