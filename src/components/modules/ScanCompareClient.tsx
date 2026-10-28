"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronsLeftRight,
  Contrast,
  Crosshair,
  Eye,
  Focus,
  Grid3x3,
  Layers,
  Maximize2,
  MoveHorizontal,
  Ruler,
  ScanLine,
  ShieldCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
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
  SectionLabel,
  StatTile,
  Th,
} from "@/components/ui";

type Mode = "split" | "side" | "overlay";

const FINDINGS = [
  {
    id: "f1",
    label: "Index nodule · right lower lobe",
    prior: "9 mm",
    current: "13 mm",
    delta: "+4 mm",
    tone: "crit" as const,
    status: "Progression",
    note: "Solid component now measures 13 mm with irregular margins; previously 9 mm smooth.",
  },
  {
    id: "f2",
    label: "Left lower lobe consolidation",
    prior: "Present",
    current: "Resolved",
    delta: "−",
    tone: "ok" as const,
    status: "Improved",
    note: "Previously documented consolidation has cleared; no residual opacity on this slice.",
  },
  {
    id: "f3",
    label: "Mediastinal lymph node (station 7)",
    prior: "8 mm",
    current: "11 mm",
    delta: "+3 mm",
    tone: "warn" as const,
    status: "Borderline",
    note: "Subcarinal node at upper limit; correlate with PET if clinically indicated.",
  },
  {
    id: "f4",
    label: "Pleural effusion",
    prior: "Trace",
    current: "None",
    delta: "−",
    tone: "ok" as const,
    status: "Resolved",
    note: "No pleural fluid identified on the current acquisition.",
  },
];

function Viewer({
  mode,
  position,
  setPosition,
  zoom,
  diff,
  masks,
  labels,
  grid,
}: {
  mode: Mode;
  position: number;
  setPosition: (value: number) => void;
  zoom: number;
  diff: boolean;
  masks: boolean;
  labels: boolean;
  grid: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const update = useCallback(
    (clientX: number) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const next = ((clientX - rect.left) / rect.width) * 100;
      setPosition(Math.min(98, Math.max(2, next)));
    },
    [setPosition],
  );

  return (
    <div
      ref={ref}
      className={cn(
        "relative select-none overflow-hidden rounded-lg border border-line bg-black",
        mode === "side" ? "aspect-[16/9]" : "aspect-[4/3]",
      )}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging.current) update(event.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerLeave={() => {
        dragging.current = false;
      }}
    >
      {mode === "side" ? (
        <div className="grid h-full grid-cols-2 gap-px bg-line">
          {[
            { src: "/images/scan-prior.jpg", label: "PRIOR · 14 Mar 2025", badge: "BASELINE" },
            { src: "/images/scan-current.jpg", label: "CURRENT · 02 Apr 2026", badge: "INDEX" },
          ].map((item) => (
            <div key={item.src} className="relative h-full overflow-hidden bg-black">
              <Image
                src={item.src}
                alt={item.label}
                fill
                sizes="(max-width: 1024px) 50vw, 30vw"
                className="object-cover transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
                priority
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent px-2 py-1">
                <span className="font-mono text-[9px] tracking-[0.06em] text-white/90">{item.label}</span>
                <span className="rounded border border-white/25 px-1 font-mono text-[8px] text-white/70">
                  {item.badge}
                </span>
              </div>
              {masks ? (
                <div className="absolute left-[31%] top-[56%] size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-crit/90 shadow-[0_0_18px_rgba(244,63,94,0.5)]" />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{ transform: `scale(${zoom})`, transition: "transform 160ms ease-out" }}
        >
          <Image
            src="/images/scan-prior.jpg"
            alt="Prior axial chest CT slice"
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              clipPath: mode === "split" ? `inset(0 0 0 ${position}%)` : undefined,
              opacity: mode === "overlay" ? 0.55 : 1,
              mixBlendMode: mode === "overlay" && diff ? "difference" : "normal",
            }}
          >
            <Image
              src="/images/scan-current.jpg"
              alt="Current axial chest CT slice"
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      {/* diff heat overlay */}
      {diff ? (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-70 mix-blend-screen" style={{ background: "radial-gradient(circle at 31% 56%, rgba(244,63,94,0.5), transparent 15%), radial-gradient(circle at 69% 62%, rgba(56,189,248,0.26), transparent 18%), radial-gradient(ellipse at 46% 34%, rgba(139,92,246,0.18), transparent 26%)" }} />
          <div className="absolute left-[31%] top-[56%] size-[78px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-crit/90 shadow-[0_0_28px_rgba(244,63,94,0.45)]">
            {labels ? (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-crit-line bg-black/70 px-1 font-mono text-[8px] text-crit">
                AI DIFF +18.4%
              </span>
            ) : null}
          </div>
          <div className="absolute left-[69%] top-[62%] size-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-info/70">
            {labels ? (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-info-line bg-black/70 px-1 font-mono text-[8px] text-info">
                RESOLVED −92%
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {grid ? (
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.16) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      ) : null}

      {mode === "split" ? (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-brand shadow-[0_0_12px_rgba(45,212,191,0.8)]"
            style={{ left: `${position}%` }}
          >
            <span className="absolute left-1/2 top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-brand-line bg-surface/95 text-brand">
              <ChevronsLeftRight className="size-3.5" />
            </span>
            <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b border border-brand-line bg-surface/90 px-1 font-mono text-[8px] text-brand">
              {position.toFixed(0)}%
            </span>
          </div>
        </>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-2 py-1 font-mono text-[9px] text-white/80">
        <span>AXIAL · 1.25 mm · LUNG WINDOW · SLICE 84/220</span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-400" /> ALIGNED Δ0.8mm
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-2 py-1 font-mono text-[9px] text-white/70">
        <span>{mode === "split" ? "PRIOR ◀ | ▶ CURRENT" : mode === "side" ? "SIDE-BY-SIDE" : "OVERLAY REGISTRATION"}</span>
        <span>W: 1500 · L: −600 · ZOOM {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}

export function ScanCompareClient() {
  const { log } = useWorkspace();
  const [mode, setMode] = useState<Mode>("split");
  const [position, setPosition] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [diff, setDiff] = useState(true);
  const [masks, setMasks] = useState(true);
  const [labels, setLabels] = useState(true);
  const [grid, setGrid] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const logAction = async (action: string, severity: "info" | "success" | "warning" = "info") => {
    await log({ action, module: "ScanCompare", severity });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        code="SC-06"
        eyebrow="Vitals & Diagnostics · Longitudinal imaging"
        title="ScanCompare — prior vs current alignment"
        description="Registers two studies on the same anatomical plane so interval change is visible at a glance. Diff overlays are visual assists only — every measurement must be confirmed by a radiologist."
        icon={<ScanLine className="size-5" />}
        meta={
          <>
            <Badge tone="ai" dot>
              AI registration · 0.8 mm residual
            </Badge>
            <Badge tone="neutral" mono>
              Study ST-2026-0412
            </Badge>
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Ruler className="size-3.5" />}
              onClick={() => void logAction("Measurement tool engaged on study ST-2026-0412", "info")}
            >
              Measure
            </Button>
            <Button
              variant="primary"
              icon={reviewed ? <Check className="size-3.5" /> : <Focus className="size-3.5" />}
              onClick={() => {
                setReviewed(true);
                void logAction(
                  "Index nodule progression flagged for radiologist review (13 mm vs 9 mm)",
                  "warning",
                );
              }}
            >
              {reviewed ? "Flagged for review" : "Flag for radiologist"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        <StatTile label="Modality" value="CT" hint="Chest · axial · lung window" tone="brand" icon={<ScanLine className="size-3.5" />} />
        <StatTile label="Interval" value="12.6" unit="mo" hint="14 Mar 2025 → 02 Apr 2026" icon={<Layers className="size-3.5" />} />
        <StatTile label="Registration" value="0.8" unit="mm" hint="Residual after rigid + affine" tone="ok" icon={<Focus className="size-3.5" />} />
        <StatTile label="Change volume" value="+18.4" unit="%" hint="Index lesion segment overlap" tone="crit" icon={<Crosshair className="size-3.5" />} delta={{ value: "PROGRESSION", tone: "crit" }} />
        <StatTile label="Radiologist" value="Pending" hint="AI pre-read complete · 96% conf." tone="warn" icon={<Eye className="size-3.5" />} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title="Imaging comparison viewer"
            subtitle="Drag the divider to align prior and current acquisitions"
            icon={<Maximize2 className="size-3.5" />}
            tag={<Badge tone="brand" mono>DICOMweb · non-diagnostic</Badge>}
            right={
              <div className="flex items-center gap-0.5 rounded-md border border-line bg-surface-2 p-0.5">
                {(
                  [
                    { id: "split", label: "Split" },
                    { id: "side", label: "Side-by-side" },
                    { id: "overlay", label: "Overlay" },
                  ] as Array<{ id: Mode; label: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMode(item.id);
                      void logAction(`Comparison layout set to ${item.label}`, "info");
                    }}
                    className={cn(
                      "rounded px-1.5 py-1 text-[10px] font-medium transition-colors",
                      mode === item.id ? "bg-surface text-ink shadow-sm" : "text-faint hover:text-ink",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="p-2.5">
            <Viewer
              mode={mode}
              position={position}
              setPosition={setPosition}
              zoom={zoom}
              diff={diff}
              masks={masks}
              labels={labels}
              grid={grid}
            />

            {mode === "split" ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-faint">Prior</span>
                <input
                  type="range"
                  className="cm-range flex-1"
                  min={2}
                  max={98}
                  value={position}
                  aria-label="Split position"
                  onChange={(event) => setPosition(Number(event.target.value))}
                  style={{ "--range-fill": `${position}%` } as React.CSSProperties}
                />
                <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-faint">Current</span>
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-md border border-line bg-surface-2 p-0.5">
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.max(1, Math.round((value - 0.25) * 100) / 100))}
                  className="grid size-6 place-items-center rounded text-muted hover:bg-surface hover:text-ink"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="w-9 text-center font-mono text-[9.5px] text-ink">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.min(2.5, Math.round((value + 0.25) * 100) / 100))}
                  className="grid size-6 place-items-center rounded text-muted hover:bg-surface hover:text-ink"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="size-3.5" />
                </button>
              </div>

              {[
                { label: "Visual diff", active: diff, toggle: () => setDiff((value) => !value), icon: <Contrast className="size-3" />, note: "Toggle non-diagnostic diff heatmap" },
                { label: "Lesion mask", active: masks, toggle: () => setMasks((value) => !value), icon: <Crosshair className="size-3" />, note: "AI lesion segmentation overlay" },
                { label: "Labels", active: labels, toggle: () => setLabels((value) => !value), icon: <Eye className="size-3" />, note: "Show detection labels" },
                { label: "Grid", active: grid, toggle: () => setGrid((value) => !value), icon: <Grid3x3 className="size-3" />, note: "Anatomical alignment grid" },
              ].map((toggle) => (
                <button
                  key={toggle.label}
                  type="button"
                  title={toggle.note}
                  onClick={() => {
                    toggle.toggle();
                    void logAction(`${toggle.label} ${toggle.active ? "disabled" : "enabled"} on comparison viewer`, "info");
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors",
                    toggle.active
                      ? "border-brand-line bg-brand-soft text-brand"
                      : "border-line bg-surface text-muted hover:text-ink",
                  )}
                >
                  {toggle.icon}
                  {toggle.label}
                </button>
              ))}
              <span className="ml-auto inline-flex items-center gap-1 rounded border border-line bg-surface-2 px-1.5 py-1 font-mono text-[9px] text-faint">
                <MoveHorizontal className="size-3" /> drag to align
              </span>
            </div>

            <Callout
              tone="warn"
              className="mt-2"
              icon={<AlertTriangle className="size-3.5" />}
              title="Non-diagnostic visual diff"
            >
              Overlays highlight pixel-level interval change for navigation only. They are not a radiological
              finding and must be verified against source DICOM by a qualified radiologist.
            </Callout>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-surface-2 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.05em] text-faint">
            <span className="text-muted">Viewer state · session live</span>
            <span>Series aligned · {mode}</span>
            <span className="ml-auto flex items-center gap-1 text-ok">
              <ShieldCheck className="size-3" /> PHI-reduced render · audit logged
            </span>
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel>
            <PanelHeader
              title="Study metadata"
              subtitle="Prior vs current acquisition parameters"
              icon={<Layers className="size-3.5" />}
            />
            <div className="p-2.5">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-1 rounded-lg border border-line bg-surface-2 p-2 font-mono text-[9.5px]">
                <span className="text-faint">PARAMETER</span>
                <span className="text-right text-faint">PRIOR</span>
                <span className="text-right text-faint">CURRENT</span>
                {[
                  ["Study date", "14 Mar 2025", "02 Apr 2026"],
                  ["Slice", "84 / 214", "84 / 220"],
                  ["kVp / mAs", "120 / 140", "120 / 96"],
                  ["Kernel", "Bf / soft", "Br / sharp"],
                  ["Dose (CTDI)", "6.8 mGy", "4.2 mGy"],
                  ["Series", "2 (lung)", "3 (lung)"],
                ].map(([label, prior, current]) => (
                  <div key={label} className="col-span-3 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-line/60 pt-1">
                    <span className="text-muted">{label}</span>
                    <span className="text-right text-ink">{prior}</span>
                    <span className="text-right text-brand">{current}</span>
                  </div>
                ))}
              </div>

              <div className="mt-2 rounded-lg border border-ai-line bg-ai-soft p-2">
                <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.05em] text-ai">
                  <Sparkles className="size-3" /> AI interval summary
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-ink">
                  Index solid nodule in the right lower lobe increased from 9 mm to 13 mm (+44% bi-dimensional),
                  with new irregular margins. Subcarinal node enlarged 8 → 11 mm. Left lower lobe consolidation
                  has resolved.
                </p>
                <blockquote className="mt-1 border-l-2 border-ai-line pl-2 font-mono text-[9.5px] leading-relaxed text-muted">
                  “Right lower lobe nodule measures 13 mm on this study (series 3, image 84), previously 9 mm on
                  14 Mar 2025.” — Radiology report line 18, verified source
                </blockquote>
                <div className="mt-1 font-mono text-[8.5px] text-faint">
                  Grounding: report line 18 + DICOM SR measurement · confidence 0.94
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Interval findings"
              subtitle="Measured change with source-linked status"
              icon={<Crosshair className="size-3.5" />}
              right={<Badge tone="warn" mono>4 findings</Badge>}
            />
            <DataTableShell>
              <table className="w-full min-w-[380px] border-collapse text-[11px]">
                <thead>
                  <tr>
                    <Th>Finding</Th>
                    <Th align="right">Prior</Th>
                    <Th align="right">Current</Th>
                    <Th align="right">Δ</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {FINDINGS.map((finding) => (
                    <tr key={finding.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                      <td className="px-2.5 py-1.5">
                        <div className="text-[10.5px] font-medium text-ink">{finding.label}</div>
                        <div className="text-[9.5px] leading-snug text-faint">{finding.note}</div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[10px] text-muted">{finding.prior}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-[10px] text-ink">{finding.current}</td>
                      <td className={cn("px-2 py-1.5 text-right font-mono text-[10px]", finding.tone === "crit" ? "text-crit" : finding.tone === "warn" ? "text-warn" : "text-ok")}>
                        {finding.delta}
                      </td>
                      <td className="px-2 py-1.5">
                        <Badge tone={finding.tone} className="px-1 py-0 text-[8.5px]">
                          {finding.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
            <div className="border-t border-line bg-surface-2 p-2.5">
              <SectionLabel>Clinical context</SectionLabel>
              <p className="text-[10.5px] leading-relaxed text-muted">
                Patient is a 54-year-old former smoker with a 22 pack-year history. Interval nodule growth meets
                Lung-RADS 4A criteria; multidisciplinary review is recommended within 7 days.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
