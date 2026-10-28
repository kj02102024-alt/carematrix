"use client";

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Droplets,
  HeartPulse,
  Radio,
  ShieldCheck,
  Siren,
  Sparkles,
  Stethoscope,
  Thermometer,
  Wind,
} from "lucide-react";
import { VITALS_PATIENTS, mewsScore, type VitalsPoint } from "@/lib/mock-vitals";
import { cn } from "@/lib/format";
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
  type Tone,
} from "@/components/ui";

const AXIS = {
  stroke: "var(--line-strong)",
  tick: { fill: "var(--faint)", fontSize: 9.5, fontFamily: "var(--font-mono)" },
};

function tooltipStyle() {
  return {
    contentStyle: {
      background: "var(--surface)",
      border: "1px solid var(--line-strong)",
      borderRadius: 8,
      fontSize: 11,
      color: "var(--ink)",
      boxShadow: "var(--shadow)",
    },
    labelStyle: { color: "var(--ink)", fontWeight: 600, fontSize: 10.5 },
    itemStyle: { fontSize: 10.5 },
  } as const;
}

function latest(point: VitalsPoint[], key: keyof VitalsPoint): number {
  const value = point[point.length - 1]?.[key];
  return typeof value === "number" ? value : 0;
}

const mewsTone = (score: number): Tone =>
  score >= 7 ? "crit" : score >= 5 ? "warn" : score >= 3 ? "info" : "ok";

export function SilentSignalClient() {
  const { log, profile } = useWorkspace();
  const [patientId, setPatientId] = useState(VITALS_PATIENTS[0].id);
  const [range, setRange] = useState<12 | 8>(12);
  const [expandedAlert, setExpandedAlert] = useState<string | null>("alert-5540-1");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const patient = VITALS_PATIENTS.find((item) => item.id === patientId) ?? VITALS_PATIENTS[0];
  const data = patient.series.slice(-range).map((point) => ({ ...point, mews: mewsScore(point) }));
  const last = patient.series[patient.series.length - 1];
  const first = data[0];
  const score = mewsScore(last);
  const scoreDelta = score - mewsScore(first);

  const trend = {
    spo2: last.spo2 - first.spo2,
    hr: last.hr - first.hr,
    sbp: last.sbp - first.sbp,
    rr: last.rr - first.rr,
  };

  const activateRapidResponse = async () => {
    await log({
      action: `Rapid response activated for ${patient.id} — MEWS ${score}, SpO₂ ${last.spo2}%, HR ${last.hr} bpm`,
      module: "SilentSignal · Escalation",
      severity: "critical",
      meta: { patient: patient.id, mews: score, unit: patient.unit },
    });
  };

  const acknowledgeAlert = async (alertId: string, title: string) => {
    setAcknowledged((prev) => [...prev, alertId]);
    await log({
      action: `Deterioration warning acknowledged by ${profile.name}: ${title} (${patient.id})`,
      module: "SilentSignal",
      severity: "success",
      meta: { alert: alertId, patient: patient.id },
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        code="SS-05"
        eyebrow="Vitals & Diagnostics · Deterioration watchdog"
        title="SilentSignal — multi-parameter early warning"
        description="Continuous fusion of heart rate, blood pressure, oxygen saturation, respiratory rate and temperature. The watchdog fires on multi-parameter trends, not isolated thresholds."
        icon={<Activity className="size-5" />}
        meta={
          <>
            <Badge tone="ok" dot pulse={autoRefresh}>
              {autoRefresh ? "Streaming q4h obs" : "Stream paused"}
            </Badge>
            <Badge tone={mewsTone(score)} mono>
              MEWS {score} · {score >= 5 ? "HIGH RISK" : score >= 3 ? "WATCH" : "STABLE"}
            </Badge>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Radio className={cn("size-3.5", autoRefresh && "text-ok")} />}
              onClick={() => setAutoRefresh((value) => !value)}
            >
              {autoRefresh ? "Pause telemetry" : "Resume telemetry"}
            </Button>
            <Button
              variant="danger"
              icon={<Siren className="size-3.5" />}
              onClick={() => void activateRapidResponse()}
            >
              Activate rapid response
            </Button>
          </>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {VITALS_PATIENTS.map((item) => {
          const itemLast = item.series[item.series.length - 1];
          const itemScore = mewsScore(itemLast);
          const selected = item.id === patient.id;
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
              <div className="flex items-center gap-2">
                <HeartPulse className={cn("size-4", selected ? "text-brand" : "text-faint")} />
                <span className="font-mono text-[10.5px] font-semibold text-ink">{item.id}</span>
                <span className="truncate text-[12px] font-semibold text-ink">{item.name}</span>
                <Badge tone={mewsTone(itemScore)} mono className="ml-auto">
                  MEWS {itemScore}
                </Badge>
              </div>
              <div className="mt-0.5 truncate font-mono text-[9.5px] text-faint">
                {item.unit} · {item.diagnosis}
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-[9.5px] text-muted">
                <span className="text-crit">HR {itemLast.hr}</span>
                <span className="text-info">SpO₂ {itemLast.spo2}%</span>
                <span>
                  BP {itemLast.sbp}/{itemLast.dbp}
                </span>
                <span className="ml-auto">{item.alerts.length} alerts</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Heart rate"
          value={last.hr}
          unit="bpm"
          tone={last.hr > 110 ? "crit" : last.hr > 100 ? "warn" : "ok"}
          hint={`${trend.hr >= 0 ? "+" : ""}${trend.hr} bpm vs ${range}h ago`}
          icon={<HeartPulse className="size-3.5" />}
        />
        <StatTile
          label="Blood pressure"
          value={`${last.sbp}/${last.dbp}`}
          unit="mmHg"
          tone={last.sbp < 100 || last.sbp > 180 ? "crit" : "warn"}
          hint={`MAP ${Math.round((last.sbp + 2 * last.dbp) / 3)} mmHg`}
          icon={<Activity className="size-3.5" />}
        />
        <StatTile
          label="SpO₂"
          value={last.spo2}
          unit="%"
          tone={last.spo2 <= 91 ? "crit" : last.spo2 <= 94 ? "warn" : "ok"}
          hint={`${trend.spo2 >= 0 ? "+" : ""}${trend.spo2} pts · ${last.spo2 <= 94 ? "below 94% target" : "within target"}`}
          icon={<Droplets className="size-3.5" />}
          delta={{ value: `${trend.spo2}pts`, tone: trend.spo2 < 0 ? "crit" : "ok" }}
        />
        <StatTile
          label="Respiratory rate"
          value={last.rr}
          unit="/min"
          tone={last.rr >= 25 ? "crit" : last.rr >= 21 ? "warn" : "ok"}
          hint={`${trend.rr >= 0 ? "+" : ""}${trend.rr} vs ${range}h ago`}
          icon={<Wind className="size-3.5" />}
        />
        <StatTile
          label="Temperature"
          value={last.temp.toFixed(1)}
          unit="°C"
          tone={last.temp >= 38.5 ? "crit" : last.temp >= 38 ? "warn" : "ok"}
          hint={last.temp >= 38.5 ? "Febrile · cultures indicated" : "Afebrile"}
          icon={<Thermometer className="size-3.5" />}
        />
        <StatTile
          label="MEWS"
          value={score}
          unit={`/ ${12}`}
          tone={mewsTone(score)}
          hint={`${scoreDelta >= 0 ? "+" : ""}${scoreDelta} in ${range}h · ${score >= 5 ? "escalate" : "monitor"}`}
          icon={<ShieldCheck className="size-3.5" />}
          delta={{ value: score >= 5 ? "ESCALATE" : "MONITOR", tone: mewsTone(score) }}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Panel>
            <PanelHeader
              title="Multi-parameter trend"
              subtitle={`${patient.name} · ${patient.unit} · ${patient.device}`}
              icon={<Activity className="size-3.5" />}
              tag={<Badge tone="brand" mono>HL7 ORU^R01</Badge>}
              right={
                <div className="flex items-center gap-0.5 rounded-md border border-line bg-surface-2 p-0.5">
                  {[8, 12].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRange(value as 8 | 12)}
                      className={cn(
                        "rounded px-1.5 py-1 text-[10px] font-medium transition-colors",
                        range === value ? "bg-surface text-ink shadow-sm" : "text-faint hover:text-ink",
                      )}
                    >
                      {value * 2}h
                    </button>
                  ))}
                </div>
              }
            />
            <div className="p-2.5">
              <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.05em] text-faint">
                <span className="flex items-center gap-1">
                  <span className="h-[2px] w-3 rounded bg-[var(--crit)]" /> HR (bpm)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-[2px] w-3 rounded bg-[var(--info)]" /> SpO₂ (%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-[2px] w-3 rounded bg-[var(--ai)]" /> RR (/min)
                </span>
                <span className="ml-auto">Shaded = deterioration window</span>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="spo2Fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--info)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--info)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" stroke={AXIS.stroke} tick={AXIS.tick} tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="left"
                      domain={[40, 160]}
                      stroke={AXIS.stroke}
                      tick={AXIS.tick}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[80, 100]}
                      stroke={AXIS.stroke}
                      tick={AXIS.tick}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <ReferenceArea yAxisId="left" x1={data[Math.max(0, data.length - 4)]?.time} x2={data[data.length - 1]?.time} fill="var(--crit)" fillOpacity={0.07} />
                    <ReferenceLine yAxisId="left" y={110} stroke="var(--warn)" strokeDasharray="4 4" strokeOpacity={0.6} />
                    <ReferenceLine yAxisId="right" y={94} stroke="var(--crit)" strokeDasharray="4 4" strokeOpacity={0.5} />
                    <Tooltip {...tooltipStyle()} />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="spo2"
                      name="SpO₂ %"
                      stroke="var(--info)"
                      strokeWidth={1.8}
                      fill="url(#spo2Fill)"
                      dot={{ r: 1.6, strokeWidth: 0, fill: "var(--info)" }}
                      activeDot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="hr"
                      name="HR bpm"
                      stroke="var(--crit)"
                      strokeWidth={2}
                      dot={{ r: 1.6, strokeWidth: 0, fill: "var(--crit)" }}
                      activeDot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="rr"
                      name="RR /min"
                      stroke="var(--ai)"
                      strokeWidth={1.6}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 rounded-lg border border-line bg-surface-2 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <SectionLabel>Blood pressure trend</SectionLabel>
                  <span className="font-mono text-[9px] text-faint">
                    MAP target ≥ 65 mmHg
                  </span>
                </div>
                <div className="h-[130px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                      <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" stroke={AXIS.stroke} tick={AXIS.tick} tickLine={false} axisLine={false} />
                      <YAxis domain={[40, 200]} stroke={AXIS.stroke} tick={AXIS.tick} tickLine={false} axisLine={false} />
                      <ReferenceLine y={65} stroke="var(--warn)" strokeDasharray="4 4" strokeOpacity={0.6} />
                      <Tooltip {...tooltipStyle()} />
                      <Line yAxisId={0} type="monotone" dataKey="sbp" name="Systolic" stroke="var(--brand)" strokeWidth={2} dot={{ r: 1.4, strokeWidth: 0, fill: "var(--brand)" }} />
                      <Line yAxisId={0} type="monotone" dataKey="dbp" name="Diastolic" stroke="var(--ok)" strokeWidth={1.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-surface-2 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.05em] text-faint">
              <span className="text-muted">Last obs · live device feed</span>
              <span>Sampling {range * 2}h window</span>
              <span className="ml-auto flex items-center gap-1 text-ok">
                <ShieldCheck className="size-3" /> Device link verified · {patient.device}
              </span>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Parameter detail"
              subtitle="Raw observations behind the watchdog score"
              icon={<Stethoscope className="size-3.5" />}
              right={<Badge tone="neutral" mono>{data.length} observations</Badge>}
            />
            <DataTableShell className="max-h-[250px]">
              <table className="w-full min-w-[620px] border-collapse text-[11px]">
                <thead>
                  <tr>
                    <Th>Time</Th>
                    <Th align="right">HR</Th>
                    <Th align="right">SBP / DBP</Th>
                    <Th align="right">SpO₂</Th>
                    <Th align="right">RR</Th>
                    <Th align="right">Temp</Th>
                    <Th align="right">MEWS</Th>
                    <Th>Signal</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map((point) => (
                    <tr key={point.time} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                      <td className="px-3 py-1.5 font-mono text-[10.5px] text-ink">{point.time}</td>
                      <td className={cn("px-3 py-1.5 text-right font-mono", point.hr > 110 ? "text-crit" : "text-muted")}>{point.hr}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted">
                        {point.sbp}/{point.dbp}
                      </td>
                      <td className={cn("px-3 py-1.5 text-right font-mono", point.spo2 <= 93 ? "text-crit" : "text-muted")}>{point.spo2}%</td>
                      <td className={cn("px-3 py-1.5 text-right font-mono", point.rr >= 25 ? "text-warn" : "text-muted")}>{point.rr}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted">{point.temp.toFixed(1)}</td>
                      <td className="px-3 py-1.5 text-right">
                        <Badge tone={mewsTone(point.mews)} mono className="px-1 py-0 text-[9px]">
                          {point.mews}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5">
                        {point.spo2 <= 91 && point.hr >= 111 ? (
                          <Badge tone="crit" dot pulse className="px-1 py-0 text-[9px]">
                            Multi-parameter
                          </Badge>
                        ) : point.mews >= 4 ? (
                          <Badge tone="warn" className="px-1 py-0 text-[9px]">
                            Single breach
                          </Badge>
                        ) : (
                          <span className="font-mono text-[9px] text-ok">stable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel className="border-crit-line">
            <PanelHeader
              title="Watchdog alerts"
              subtitle="Multi-parameter patterns with grounded evidence"
              icon={<Siren className="size-3.5" />}
              tag={
                <Badge tone="crit" mono>
                  {patient.alerts.filter((alert) => !acknowledged.includes(alert.id)).length} ACTIVE
                </Badge>
              }
            />
            <div className="space-y-2 p-2.5">
              {patient.alerts.map((alert) => {
                const isOpen = expandedAlert === alert.id;
                const isAck = acknowledged.includes(alert.id);
                const tone: Tone =
                  alert.severity === "critical" ? "crit" : alert.severity === "warning" ? "warn" : "ok";
                return (
                  <article
                    key={alert.id}
                    className={cn(
                      "overflow-hidden rounded-lg border",
                      tone === "crit" ? "border-crit-line bg-crit-soft/40" : tone === "warn" ? "border-warn-line bg-warn-soft/40" : "border-ok-line bg-ok-soft/40",
                      isAck && "opacity-70",
                    )}
                  >
                    <div className="px-2.5 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={tone} dot pulse={alert.severity === "critical" && !isAck}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-[9.5px] text-faint">{alert.time}</span>
                        {isAck ? (
                          <Badge tone="ok" className="ml-auto px-1 py-0 text-[9px]">
                            <Check className="size-2.5" /> Acknowledged
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="mt-1 text-[12px] font-semibold leading-snug text-ink">{alert.title}</h3>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{alert.detail}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {alert.parameters.map((parameter) => (
                          <span
                            key={parameter}
                            className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted"
                          >
                            {parameter}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpandedAlert(isOpen ? null : alert.id)}
                          className="inline-flex items-center gap-1 rounded border border-ai-line bg-ai-soft px-1.5 py-1 text-[10px] font-medium text-ai"
                        >
                          <Sparkles className="size-3" /> {isOpen ? "Hide evidence" : "View evidence"}
                          {isOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>
                        <Button
                          size="xs"
                          variant={alert.severity === "critical" ? "danger" : "secondary"}
                          className="ml-auto"
                          icon={<Check className="size-3" />}
                          disabled={isAck}
                          onClick={() => void acknowledgeAlert(alert.id, alert.title)}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                    {isOpen ? (
                      <div className="cm-rise border-t border-ai-line bg-ai-soft/60 px-2.5 py-2">
                        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.05em] text-ai">
                          <Sparkles className="size-3" /> {alert.citation.source} · {alert.citation.reference}
                        </div>
                        <blockquote className="mt-1 border-l-2 border-ai-line pl-2 text-[10.5px] leading-relaxed text-ink">
                          “{alert.citation.quote}”
                        </blockquote>
                        <div className="mt-1 font-mono text-[9px] text-faint">
                          Observations cited:{" "}
                          {patient.series
                            .filter((point) => alert.parameters.some((parameter) => parameter.includes(String(point.spo2)) || parameter.includes(String(point.hr))))
                            .slice(-3)
                            .map((point) => `${point.time} SpO₂ ${point.spo2}% / HR ${point.hr}`)
                            .join(" · ") || "latest observation window"}
                        </div>
                        <div className="mt-1 rounded border border-line bg-surface px-2 py-1 text-[10.5px] text-ink">
                          <span className="font-semibold">Action:</span> {alert.recommendation}
                        </div>
                        <div className="mt-1 flex items-center gap-1 font-mono text-[9px] text-faint">
                          confidence {(alert.confidence * 100).toFixed(0)}% ·
                          <Progress className="ml-1 w-16" value={alert.confidence * 100} tone="ai" height="h-1" />
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Deterioration drivers"
              subtitle={`Change over the last ${range * 2} hours`}
              icon={<AlertTriangle className="size-3.5" />}
            />
            <div className="space-y-2 p-3">
              {[
                { label: "Oxygen saturation", value: trend.spo2, unit: "pts", bad: trend.spo2 < 0, weight: 3 },
                { label: "Heart rate", value: trend.hr, unit: "bpm", bad: trend.hr > 0, weight: 2 },
                { label: "Respiratory rate", value: trend.rr, unit: "/min", bad: trend.rr > 0, weight: 2 },
                { label: "Systolic pressure", value: trend.sbp, unit: "mmHg", bad: trend.sbp < 0, weight: 1 },
              ].map((driver) => (
                <div key={driver.label} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-[10.5px] text-muted">{driver.label}</span>
                  <Progress
                    className="flex-1"
                    value={Math.min(100, Math.abs(driver.value) * driver.weight * 6 + 6)}
                    tone={driver.bad ? (driver.weight >= 2 ? "crit" : "warn") : "ok"}
                    height="h-1.5"
                  />
                  <span
                    className={cn(
                      "w-14 text-right font-mono text-[10.5px]",
                      driver.bad ? "text-crit" : "text-ok",
                    )}
                  >
                    {driver.value > 0 ? "+" : ""}
                    {driver.value}
                    <span className="ml-0.5 text-[8.5px] text-faint">{driver.unit}</span>
                  </span>
                </div>
              ))}
              <Callout tone={score >= 5 ? "crit" : "warn"} title={score >= 5 ? "Escalation threshold met" : "Watchlist"}>
                {score >= 5
                  ? `MEWS ${score} with sustained SpO₂ < 92% and rising respiratory rate. Multi-parameter deterioration is 4.2× more predictive than any single value.`
                  : "Isolated parameters remain in range. Continue q4h observations and repeat MEWS after next round."}
              </Callout>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
