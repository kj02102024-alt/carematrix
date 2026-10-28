"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  Check,
  ClipboardList,
  Download,
  Gauge,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Siren,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Wand2,
} from "lucide-react";
import type { Ward } from "@/lib/data-types";
import { clamp, cn, formatShortTime, pct } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";
import {
  Badge,
  Button,
  Callout,
  DataTableShell,
  IconButton,
  KeyValue,
  Meter,
  PageHeader,
  Panel,
  PanelHeader,
  Progress,
  SectionLabel,
  StatTile,
  StatusDot,
  Th,
  type Tone,
} from "@/components/ui";

type Scenario = {
  trauma: number;
  boarding: number;
  discharge: number;
  staffing: number;
  elective: number;
};

const DEFAULT_SCENARIO: Scenario = {
  trauma: 20,
  boarding: 3,
  discharge: 5,
  staffing: 0,
  elective: 0,
};

const WEIGHTS: Record<string, { trauma: number; boarding: number; discharge: number; elective: number }> = {
  icu: { trauma: 0.2, boarding: 0.8, discharge: -0.12, elective: -0.03 },
  general: { trauma: 0.12, boarding: 0.5, discharge: -0.22, elective: -0.55 },
  emergency: { trauma: 0.32, boarding: 1.1, discharge: -0.05, elective: -0.02 },
};

const PLAYBOOK: Record<string, string[]> = {
  icu: [
    "Activate step-down transfer protocol for 3 stable patients",
    "Hold 2 elective cardiac bypass cases in pre-op queue",
  ],
  general: [
    "Release 18 predicted discharges before 14:00",
    "Open overflow cohort ward 3E (14 beds)",
  ],
  emergency: [
    "Raise ED boarding escalation to level 2",
    "Staff fast-track triage pod with 2 additional nurses",
  ],
};

const PRESSURE_TONE = (value: number): Tone =>
  value >= 100 ? "crit" : value >= 92 ? "warn" : value >= 85 ? "info" : "ok";

type Projection = {
  ward: Ward;
  occupied: number;
  capacity: number;
  pressure: number;
  delta: number;
  eta: number | null;
  tone: Tone;
};

function projectWards(wards: Ward[], scenario: Scenario): Projection[] {
  return wards.map((ward) => {
    const weight = WEIGHTS[ward.kind] ?? WEIGHTS.general;
    const projectedOccupied = Math.round(
      ward.occupied +
        scenario.trauma * weight.trauma +
        scenario.boarding * weight.boarding +
        scenario.discharge * weight.discharge +
        scenario.elective * weight.elective,
    );
    const capacity = Math.max(1, ward.capacity + Math.round(scenario.staffing * 0.6));
    const occupied = clamp(projectedOccupied, 0, capacity + 2);
    const pressure = Math.round((occupied / capacity) * 1000) / 10;
    const severity = scenario.trauma / 20 + scenario.boarding / 3 + 0.35;
    const eta =
      pressure >= 100 ? 0 : Math.max(1, Math.round(((100 - pressure) / (severity * 4)) * 10) / 10);
    return {
      ward,
      occupied,
      capacity,
      pressure,
      delta: occupied - ward.occupied,
      eta: pressure >= 92 ? eta : null,
      tone: PRESSURE_TONE(pressure),
    };
  });
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  hint: string;
  onChange: (value: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[11px] font-medium text-ink">{label}</label>
        <span
          className={cn(
            "font-mono text-[11px] font-semibold",
            value === 0 ? "text-muted" : value > 0 ? "text-brand" : "text-info",
          )}
        >
          {value > 0 ? "+" : ""}
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        className="cm-range mt-1.5"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--range-fill": `${fill}%` } as React.CSSProperties}
      />
      <div className="mt-0.5 flex items-center justify-between font-mono text-[9px] text-faint">
        <span>
          {min}
          {suffix}
        </span>
        <span className="text-center normal-case tracking-normal">{hint}</span>
        <span>
          +{max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

function BedMatrix({ ward }: { ward: Ward }) {
  const total = Math.min(ward.capacity, 60);
  const occupiedShare = Math.round((ward.occupied / ward.capacity) * total);
  const blockedShare = Math.round((ward.blocked / ward.capacity) * total);
  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9px,1fr))] gap-[3px]">
        {Array.from({ length: total }).map((_, index) => {
          const status =
            index < occupiedShare
              ? "occupied"
              : index < occupiedShare + blockedShare
                ? "blocked"
                : "free";
          return (
            <span
              key={index}
              title={`Bed ${ward.code}-${String(index + 1).padStart(2, "0")} · ${status}`}
              className={cn(
                "aspect-square rounded-[2px] transition-colors",
                status === "occupied" && (ward.occupied / ward.capacity > 0.92 ? "bg-crit/75" : "bg-brand/65"),
                status === "blocked" && "bg-warn/70",
                status === "free" && "bg-surface-3 ring-1 ring-inset ring-line",
              )}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.04em] text-faint">
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-[1px] bg-brand/70" /> Occupied
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-[1px] bg-warn/70" /> Blocked
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-[1px] bg-surface-3 ring-1 ring-inset ring-line" /> Available
        </span>
      </div>
    </div>
  );
}

export function BedFlowClient({
  initialWards,
  source,
}: {
  initialWards: Ward[];
  source: "database" | "mock";
}) {
  const { log, refreshAudit, profile } = useWorkspace();
  const [wards, setWards] = useState<Ward[]>(initialWards);
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO);
  const [live, setLive] = useState(true);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string>("Profile loaded from ADT feed");
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    setSyncedAt(new Date());
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      setWards((prev) =>
        prev.map((ward) => {
          if (Math.random() > 0.35) return ward;
          const drift = Math.random() > 0.5 ? 1 : -1;
          const next = clamp(ward.occupied + drift, 0, ward.capacity - ward.blocked);
          return { ...ward, occupied: next };
        }),
      );
      setSyncedAt(new Date());
    }, 9000);
    return () => window.clearInterval(id);
  }, [live]);

  const projections = useMemo(() => projectWards(wards, scenario), [scenario, wards]);
  const baseProjections = useMemo(
    () =>
      projectWards(wards, { trauma: 0, boarding: 0, discharge: 0, staffing: 0, elective: 0 }),
    [wards],
  );

  const totals = useMemo(() => {
    const capacity = wards.reduce((sum, ward) => sum + ward.capacity, 0);
    const occupied = wards.reduce((sum, ward) => sum + ward.occupied, 0);
    const blocked = wards.reduce((sum, ward) => sum + ward.blocked, 0);
    return {
      capacity,
      occupied,
      blocked,
      available: capacity - occupied - blocked,
      pressure: Math.round((occupied / capacity) * 1000) / 10,
      admissions: wards.reduce((sum, ward) => sum + ward.admissionsToday, 0),
      discharges: wards.reduce((sum, ward) => sum + ward.pendingDischarge, 0),
      nurses: wards.reduce((sum, ward) => sum + ward.nursesOnShift, 0),
    };
  }, [wards]);

  const projectedTotals = useMemo(() => {
    const capacity = projections.reduce((sum, item) => sum + item.capacity, 0);
    const occupied = projections.reduce((sum, item) => sum + item.occupied, 0);
    return {
      occupied,
      capacity,
      pressure: Math.round((occupied / capacity) * 1000) / 10,
      delta: occupied - totals.occupied,
    };
  }, [projections, totals.occupied]);

  const bottlenecks = projections.filter((item) => item.pressure >= 92);
  const icu = wards.find((ward) => ward.kind === "icu");
  const ed = wards.find((ward) => ward.kind === "emergency");

  const adjustWard = useCallback(
    async (ward: Ward, delta: number) => {
      setAdjusting(ward.id);
      setWards((prev) =>
        prev.map((item) =>
          item.id === ward.id
            ? {
                ...item,
                occupied: clamp(item.occupied + delta, 0, item.capacity - item.blocked),
              }
            : item,
        ),
      );
      try {
        const res = await fetch("/api/wards", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: ward.id,
            delta,
            role: profile.id,
            actor: profile.name,
            reason: delta > 0 ? "ED admission from command center" : "Discharge processed from command center",
          }),
        });
        if (res.ok) {
          await refreshAudit();
        } else {
          throw new Error("ward update failed");
        }
      } catch {
        await log({
          action: `Offline-ready capacity adjustment in ${ward.code}: ${delta > 0 ? "+" : ""}${delta} bed`,
          module: "BedFlow",
          severity: "warning",
        });
      } finally {
        setAdjusting(null);
      }
      setLastAction(
        `${delta > 0 ? "Admission" : "Discharge"} · ${ward.code} · ${profile.name} · ${formatShortTime(new Date())}`,
      );
    },
    [log, profile.id, profile.name, refreshAudit],
  );

  const applyScenario = async () => {
    setLastAction(`What-if scenario committed · ${formatShortTime(new Date())}`);
    await log({
      action: `What-if simulation committed — trauma ${scenario.trauma >= 0 ? "+" : ""}${scenario.trauma}%, boarding ${scenario.boarding}h, discharge velocity ${scenario.discharge >= 0 ? "+" : ""}${scenario.discharge}%, staffing ${scenario.staffing >= 0 ? "+" : ""}${scenario.staffing} FTE`,
      module: "BedFlow · Simulation",
      severity: bottlenecks.length > 0 ? "warning" : "info",
      meta: {
        projectedPressure: projectedTotals.pressure,
        bottlenecks: bottlenecks.map((item) => item.ward.code),
      },
    });
  };

  const togglePlaybook = async (action: string) => {
    const next = completed.includes(action)
      ? completed.filter((item) => item !== action)
      : [...completed, action];
    setCompleted(next);
    await log({
      action: `${completed.includes(action) ? "Reopened" : "Completed"} surge action: ${action}`,
      module: "BedFlow · Escalation",
      severity: "success",
    });
  };

  const pressureSeries = useMemo(() => {
    return Array.from({ length: 8 }).map((_, hour) => ({
      hour: `+${hour}h`,
      value: clamp(
        Math.round(projectedTotals.pressure + (bottlenecks.length > 0 ? hour * 1.6 : hour * 0.4)),
        40,
        130,
      ),
    }));
  }, [bottlenecks.length, projectedTotals.pressure]);

  return (
    <div className="space-y-4">
      <PageHeader
        code="BF-01"
        eyebrow="Admin & Operations · Capacity command"
        title="BedFlow — live capacity & surge simulation"
        description="Ward-level occupancy telemetry from the ADT feed, with forward-looking bottleneck forecasts and a what-if sandbox for surge planning."
        icon={<BedDouble className="size-5" />}
        meta={
          <>
            <Badge tone={live ? "ok" : "neutral"} dot pulse={live}>
              {live ? "Live stream" : "Stream paused"}
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
              icon={<RefreshCw className={cn("size-3.5", live && "text-brand")} />}
              onClick={() => {
                setLive((value) => !value);
                setSyncedAt(new Date());
              }}
            >
              {live ? "Pause feed" : "Resume feed"}
            </Button>
            <Button
              variant="primary"
              icon={<Download className="size-3.5" />}
              onClick={() =>
                void log({
                  action: "Capacity report exported (CSV · 4 wards · PHI-minimised)",
                  module: "BedFlow",
                  severity: "info",
                })
              }
            >
              Export report
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Staffed beds"
          value={totals.capacity}
          hint={`${totals.nurses} nurses on shift`}
          icon={<Building2 className="size-3.5" />}
        />
        <StatTile
          label="Occupied"
          value={totals.occupied}
          unit={`/ ${totals.capacity}`}
          hint={
            <span className="flex items-center gap-1 text-warn">
              <ArrowUpRight className="size-3" /> +{totals.admissions} admissions today
            </span>
          }
          tone="warn"
          icon={<BedDouble className="size-3.5" />}
          delta={{ value: `${totals.pressure}%`, tone: PRESSURE_TONE(totals.pressure) }}
        />
        <StatTile
          label="Available now"
          value={totals.available}
          hint={`${totals.blocked} blocked for isolation / cleaning`}
          tone="ok"
          icon={<Check className="size-3.5" />}
        />
        <StatTile
          label="ICU pressure"
          value={icu ? pct(icu.occupied, icu.capacity) : 0}
          unit="%"
          hint={icu ? `${icu.capacity - icu.occupied - icu.blocked} staffed ICU beds free` : "—"}
          tone="crit"
          icon={<Activity className="size-3.5" />}
          delta={{ value: icu && pct(icu.occupied, icu.capacity) > 90 ? "SURGE" : "WATCH", tone: icu && pct(icu.occupied, icu.capacity) > 90 ? "crit" : "warn" }}
        />
        <StatTile
          label="ED boarding"
          value={ed ? ed.pendingDischarge : 0}
          unit="pts"
          hint="Admitted patients waiting for inpatient bed"
          tone="warn"
          icon={<Siren className="size-3.5" />}
        />
        <StatTile
          label="Predicted 6h"
          value={projectedTotals.pressure}
          unit="%"
          hint={
            <span className={projectedTotals.delta > 0 ? "text-crit" : "text-ok"}>
              {projectedTotals.delta > 0 ? "+" : ""}
              {projectedTotals.delta} beds vs now
            </span>
          }
          tone={PRESSURE_TONE(projectedTotals.pressure)}
          icon={<TrendingUp className="size-3.5" />}
          delta={{ value: "SIM", tone: "ai" }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <Panel>
            <PanelHeader
              title="Ward capacity telemetry"
              subtitle="Occupancy against staffed capacity · update stream every 9s"
              icon={<Gauge className="size-3.5" />}
              tag={
                <Badge tone="neutral" mono>
                  ADT · HL7
                </Badge>
              }
              right={
                <>
                  <span className="hidden font-mono text-[9.5px] text-faint sm:block">
                    LAST SYNC {syncedAt ? formatShortTime(syncedAt) : "--:--"}
                  </span>
                  <Badge tone={bottlenecks.length > 0 ? "warn" : "ok"} dot>
                    {bottlenecks.length > 0 ? `${bottlenecks.length} pressure alerts` : "Within thresholds"}
                  </Badge>
                </>
              }
            />
            <div className="grid grid-cols-1 gap-2 p-2.5 md:grid-cols-2">
              {wards.map((ward) => {
                const occupancy = pct(ward.occupied, ward.capacity);
                const tone = PRESSURE_TONE(occupancy);
                const projection = projections.find((item) => item.ward.id === ward.id);
                return (
                  <article
                    key={ward.id}
                    className="rounded-lg border border-line bg-surface-2 p-2.5 transition-colors hover:border-line-strong"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-[12.5px] font-semibold text-ink">{ward.name}</h3>
                          <Badge tone="neutral" mono className="px-1 py-0 text-[8.5px]">
                            {ward.code}
                          </Badge>
                        </div>
                        <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.05em] text-faint">
                          Avg LOS {ward.avgLosDays}d · {ward.nursesOnShift} RN
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            "text-[20px] font-semibold leading-none tracking-[-0.03em]",
                            tone === "crit" ? "text-crit" : tone === "warn" ? "text-warn" : "text-ink",
                          )}
                        >
                          {occupancy}
                          <span className="text-[11px] text-muted">%</span>
                        </div>
                        <div className="font-mono text-[9.5px] text-faint">
                          {ward.occupied}/{ward.capacity} beds
                        </div>
                      </div>
                    </div>

                    <Meter
                      className="mt-2"
                      segments={[
                        { label: "Occupied", value: ward.occupied, tone: tone === "crit" ? "crit" : "brand" },
                        { label: "Blocked", value: ward.blocked, tone: "warn" },
                        {
                          label: "Available",
                          value: Math.max(0, ward.capacity - ward.occupied - ward.blocked),
                          tone: "neutral",
                        },
                      ]}
                    />

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {[
                        { label: "Admits", value: ward.admissionsToday },
                        { label: "Pend. disch.", value: ward.pendingDischarge },
                        { label: "Free", value: Math.max(0, ward.capacity - ward.occupied - ward.blocked) },
                      ].map((cell) => (
                        <div key={cell.label} className="rounded border border-line bg-surface px-1.5 py-1">
                          <div className="font-mono text-[8.5px] uppercase tracking-[0.06em] text-faint">
                            {cell.label}
                          </div>
                          <div className="text-[12px] font-semibold text-ink">{cell.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2">
                      <BedMatrix ward={ward} />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-line pt-2">
                      <div className="min-w-0 font-mono text-[9px] text-faint">
                        {projection && projection.delta !== 0 ? (
                          <span className={projection.delta > 0 ? "text-warn" : "text-ok"}>
                            SIM {projection.delta > 0 ? "+" : ""}
                            {projection.delta} → {projection.pressure}%
                          </span>
                        ) : (
                          <span>SIM stable</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <IconButton
                          label={`Process discharge in ${ward.code}`}
                          disabled={adjusting === ward.id}
                          onClick={() => void adjustWard(ward, -1)}
                        >
                          <Minus className="size-3" />
                        </IconButton>
                        <span
                          className={cn(
                            "grid h-7 min-w-[34px] place-items-center rounded border px-1 font-mono text-[10px] font-semibold",
                            adjusting === ward.id
                              ? "border-brand-line bg-brand-soft text-brand"
                              : "border-line bg-surface text-ink",
                          )}
                        >
                          {adjusting === ward.id ? "…" : `${ward.occupied}`}
                        </span>
                        <IconButton
                          label={`Admit patient to ${ward.code}`}
                          disabled={adjusting === ward.id}
                          onClick={() => void adjustWard(ward, 1)}
                        >
                          <Plus className="size-3" />
                        </IconButton>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-surface-2 px-3 py-1.5 font-mono text-[9px] text-faint">
              <span className="text-muted">{lastAction}</span>
              <span className="ml-auto flex items-center gap-1">
                <StatusDot tone="ok" /> ADT FEED HEALTHY · 42 ms
              </span>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Bottleneck forecast & surge playbook"
              subtitle="Deterministic recommendations derived from the active simulation"
              icon={<AlertTriangle className="size-3.5" />}
              tag={
                <Badge tone={bottlenecks.length > 0 ? "crit" : "ok"} mono>
                  {bottlenecks.length > 0 ? "INTERVENTION REQUIRED" : "STABLE"}
                </Badge>
              }
            />
            <DataTableShell>
              <table className="w-full min-w-[720px] border-collapse text-[11.5px]">
                <thead>
                  <tr>
                    <Th>Ward</Th>
                    <Th align="right">Now</Th>
                    <Th align="right">Projected</Th>
                    <Th align="right">Δ beds</Th>
                    <Th align="right">ETA saturation</Th>
                    <Th>Playbook action</Th>
                    <Th align="center">Done</Th>
                  </tr>
                </thead>
                <tbody>
                  {projections.map((item) => {
                    const playbook = PLAYBOOK[item.ward.kind] ?? PLAYBOOK.general;
                    const action = playbook[0];
                    const isDone = completed.includes(action);
                    return (
                      <tr key={item.ward.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                        <td className="px-3 py-2">
                          <div className="font-medium text-ink">{item.ward.name}</div>
                          <div className="font-mono text-[9px] text-faint">{item.ward.code}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[11px] text-muted">
                          {pct(item.ward.occupied, item.ward.capacity)}%
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={cn(
                              "font-mono text-[11.5px] font-semibold",
                              item.tone === "crit" ? "text-crit" : item.tone === "warn" ? "text-warn" : "text-ok",
                            )}
                          >
                            {item.pressure}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[11px]">
                          <span className={item.delta > 0 ? "text-crit" : item.delta < 0 ? "text-ok" : "text-muted"}>
                            {item.delta > 0 ? "+" : ""}
                            {item.delta}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[10.5px] text-muted">
                          {item.eta === null ? "—" : item.eta === 0 ? "NOW" : `${item.eta}h`}
                        </td>
                        <td className="px-3 py-2 text-[10.5px] text-muted">{action}</td>
                        <td className="px-3 py-2 text-center">
                          <IconButton
                            label={`Toggle playbook action for ${item.ward.code}`}
                            active={isDone}
                            onClick={() => void togglePlaybook(action)}
                          >
                            <Check className="size-3" />
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataTableShell>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel className="border-brand-line">
            <PanelHeader
              title="What-If Simulation Sandbox"
              subtitle="Model surge scenarios before they hit the floor"
              icon={<Wand2 className="size-3.5" />}
              tag={
                <Badge tone="ai" mono>
                  <Sparkles className="size-2.5" /> SIM
                </Badge>
              }
            />
            <div className="space-y-3 p-3">
              <div className="rounded-lg border border-line bg-surface-2 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-faint">
                    Projected enterprise pressure
                  </span>
                  <Badge tone={PRESSURE_TONE(projectedTotals.pressure)} mono>
                    {projectedTotals.pressure}%
                  </Badge>
                </div>
                <div className="mt-1 flex items-end gap-1.5">
                  <span className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
                    {projectedTotals.occupied}
                  </span>
                  <span className="pb-1 text-[11px] text-muted">/ {projectedTotals.capacity} beds</span>
                  <span
                    className={cn(
                      "ml-auto pb-1 font-mono text-[10.5px]",
                      projectedTotals.delta > 0 ? "text-crit" : "text-ok",
                    )}
                  >
                    {projectedTotals.delta > 0 ? "+" : ""}
                    {projectedTotals.delta} vs current
                  </span>
                </div>
                <Progress
                  className="mt-2"
                  value={projectedTotals.pressure}
                  tone={PRESSURE_TONE(projectedTotals.pressure)}
                  height="h-2"
                />
                <div className="mt-2 flex items-end gap-1">
                  {pressureSeries.map((point) => (
                    <div key={point.hour} className="flex flex-1 flex-col items-center gap-0.5">
                      <div
                        className={cn(
                          "w-full rounded-t-sm transition-[height] duration-500",
                          point.value >= 100 ? "bg-crit" : point.value >= 92 ? "bg-warn" : "bg-brand/70",
                        )}
                        style={{ height: `${clamp((point.value - 55) * 1.4, 4, 40)}px` }}
                      />
                      <span className="font-mono text-[8px] text-faint">{point.hour}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Slider
                label="Trauma & surge load"
                value={scenario.trauma}
                min={-20}
                max={60}
                suffix="%"
                hint="mass casualty / seasonal surge"
                onChange={(value) => setScenario((prev) => ({ ...prev, trauma: value }))}
              />
              <Slider
                label="ED boarding duration"
                value={scenario.boarding}
                min={0}
                max={12}
                suffix="h"
                hint="admitted patients waiting"
                onChange={(value) => setScenario((prev) => ({ ...prev, boarding: value }))}
              />
              <Slider
                label="Discharge velocity"
                value={scenario.discharge}
                min={-30}
                max={30}
                suffix="%"
                hint="pharmacy / transport clearance"
                onChange={(value) => setScenario((prev) => ({ ...prev, discharge: value }))}
              />
              <Slider
                label="Staffing delta"
                value={scenario.staffing}
                min={-10}
                max={10}
                suffix=" FTE"
                hint="staffed bed elasticity"
                onChange={(value) => setScenario((prev) => ({ ...prev, staffing: value }))}
              />
              <Slider
                label="Elective cancellations"
                value={scenario.elective}
                min={0}
                max={40}
                suffix="%"
                hint="surgical hold for capacity"
                onChange={(value) => setScenario((prev) => ({ ...prev, elective: value }))}
              />

              <div className="space-y-1.5">
                <SectionLabel
                  right={
                    <Badge tone={bottlenecks.length > 0 ? "crit" : "ok"} mono>
                      {bottlenecks.length} flagged
                    </Badge>
                  }
                >
                  Dynamic bottleneck warnings
                </SectionLabel>
                {bottlenecks.length === 0 ? (
                  <Callout tone="ok" icon={<Check className="size-3.5" />} title="No saturation predicted">
                    Current scenario stays below the 92% pressure threshold across all four wards.
                  </Callout>
                ) : (
                  bottlenecks.map((item) => (
                    <div
                      key={item.ward.id}
                      className={cn(
                        "cm-rise rounded-lg border px-2.5 py-2",
                        item.pressure >= 100
                          ? "border-crit-line bg-crit-soft"
                          : "border-warn-line bg-warn-soft",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[11px] font-semibold",
                            item.pressure >= 100 ? "text-crit" : "text-warn",
                          )}
                        >
                          <AlertTriangle className="size-3.5" /> {item.ward.code} · {item.pressure}%
                        </span>
                        <Badge tone={item.pressure >= 100 ? "crit" : "warn"} mono>
                          {item.pressure >= 100 ? "SATURATION" : "BOTTLENECK"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[10.5px] leading-snug text-muted">
                        {item.pressure >= 100
                          ? `Predicted overflow of ${item.occupied - item.capacity} patients. Activate diversion protocol and transfer ${Math.max(1, item.occupied - item.capacity)} to network partner.`
                          : `Saturation in ~${item.eta}h. ${PLAYBOOK[item.ward.kind]?.[1] ?? ""}`}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  icon={<Sparkles className="size-3.5" />}
                  onClick={() => void applyScenario()}
                >
                  Commit scenario
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  icon={<RotateCcw className="size-3.5" />}
                  onClick={() => {
                    setScenario(DEFAULT_SCENARIO);
                    setCompleted([]);
                  }}
                >
                  Reset
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { label: "Mass casualty +40%", value: { trauma: 40, boarding: 6, discharge: 0, staffing: 0, elective: 10 } },
                  { label: "Elective hold 30%", value: { trauma: 10, boarding: 2, discharge: 0, staffing: 0, elective: 30 } },
                  { label: "Discharge sprint", value: { trauma: 20, boarding: 3, discharge: 25, staffing: 2, elective: 5 } },
                  { label: "Winter baseline", value: { trauma: 15, boarding: 4, discharge: -10, staffing: -2, elective: 0 } },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setScenario(preset.value)}
                    className="rounded border border-line bg-surface px-1.5 py-1 text-left text-[10px] text-muted transition-colors hover:border-brand-line hover:text-ink"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Network snapshot"
              subtitle="Transfer partners & cohort options"
              icon={<Users className="size-3.5" />}
            />
            <div className="p-3">
              <KeyValue label="Baseline pressure (no scenario)" value={`${baseProjections.length} wards modelled`} />
              {baseProjections.map((item) => (
                <KeyValue
                  key={item.ward.id}
                  label={item.ward.code}
                  value={`${item.pressure}%`}
                  tone={item.tone === "crit" ? "crit" : item.tone === "warn" ? "warn" : undefined}
                  mono
                />
              ))}
              <div className="mt-2">
                <Callout
                  tone="info"
                  icon={<Stethoscope className="size-3.5" />}
                  title="Cohort recommendation"
                >
                  {scenario.trauma >= 30
                    ? "Divert 4 low-acuity ED presentations to St. Aurelia North urgent care. Keep 2 ICU beds ring-fenced for trauma."
                    : "Maintain ring-fenced ICU capacity. Route medical admissions to GM-3W overflow cohort."}
                </Callout>
              </div>
              <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-faint">
                <TrendingUp className="size-3 text-brand" />
                Forecast model: ARIMA + ADT 8w baseline · v2.4
                <ArrowDownRight className="ml-auto size-3" />
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Escalation checklist"
              subtitle="Tick actions to anchor them in the audit chain"
              icon={<ClipboardList className="size-3.5" />}
            />
            <div className="space-y-1 p-2">
              {Object.entries(PLAYBOOK).flatMap(([kind, actions]) =>
                actions.slice(0, 2).map((action) => (
                  <button
                    key={`${kind}-${action}`}
                    type="button"
                    onClick={() => void togglePlaybook(action)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[10.5px] transition-colors",
                      completed.includes(action)
                        ? "border-ok-line bg-ok-soft text-ok"
                        : "border-line bg-surface-2 text-muted hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-[1px] grid size-3.5 shrink-0 place-items-center rounded-[3px] border",
                        completed.includes(action)
                          ? "border-ok bg-ok text-[color:var(--surface)]"
                          : "border-line-strong",
                      )}
                    >
                      {completed.includes(action) ? <Check className="size-2.5" /> : null}
                    </span>
                    <span className="flex-1">{action}</span>
                  </button>
                )),
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

