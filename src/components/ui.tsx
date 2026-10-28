"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/format";

/* ------------------------------------------------------------------ layout */

export function Panel({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
}) {
  return <Tag className={cn("cm-card overflow-hidden", className)}>{children}</Tag>;
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  right,
  tag,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  tag?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-brand">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            {tag}
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {right ? <div className="flex shrink-0 items-center gap-1.5">{right}</div> : null}
    </div>
  );
}

export function PageHeader({
  code,
  eyebrow,
  title,
  description,
  icon,
  actions,
  meta,
}: {
  code?: string;
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-soft text-brand shadow-sm">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            {code ? (
              <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-brand">
                {code}
              </span>
            ) : null}
            {eyebrow ? <span>{eyebrow}</span> : null}
            {meta}
          </div>
          <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.025em] text-ink">
            {title}
          </h1>
          <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ badges */

export type Tone = "neutral" | "brand" | "ok" | "warn" | "crit" | "info" | "ai";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-line bg-surface-2 text-muted",
  brand: "border-brand-line bg-brand-soft text-brand",
  ok: "border-ok-line bg-ok-soft text-ok",
  warn: "border-warn-line bg-warn-soft text-warn",
  crit: "border-crit-line bg-crit-soft text-crit",
  info: "border-info-line bg-info-soft text-info",
  ai: "border-ai-line bg-ai-soft text-ai",
};

const DOT_CLASSES: Record<Tone, string> = {
  neutral: "bg-faint",
  brand: "bg-brand",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  info: "bg-info",
  ai: "bg-ai",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  pulse = false,
  mono = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-1.5 py-[2px] text-[10.5px] font-medium leading-4",
        TONE_CLASSES[tone],
        mono && "font-mono uppercase tracking-[0.04em]",
        className,
      )}
    >
      {dot ? (
        <span className={cn("relative size-1.5 rounded-full", DOT_CLASSES[tone], pulse && "cm-pulse")} />
      ) : null}
      {children}
    </span>
  );
}

export function StatusDot({ tone = "ok", pulse = true }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-1.5">
      <span className={cn("absolute inset-0 rounded-full", DOT_CLASSES[tone], pulse && "cm-pulse")} />
    </span>
  );
}

/* ------------------------------------------------------------------ buttons */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "subtle";
  size?: "xs" | "sm" | "md";
  icon?: ReactNode;
  trailing?: ReactNode;
};

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border border-transparent bg-brand text-[color:var(--surface)] hover:opacity-90 shadow-[0_6px_16px_-10px_rgba(13,148,136,0.9)]",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "border border-transparent bg-transparent text-muted hover:bg-surface-2 hover:text-ink",
  danger: "border border-crit-line bg-crit-soft text-crit hover:bg-crit hover:text-white",
  subtle: "border border-line bg-surface-2 text-ink hover:bg-surface-3",
};

const BUTTON_SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  xs: "h-6 px-2 text-[10.5px] gap-1 rounded-md",
  sm: "h-7 px-2.5 text-[11.5px] gap-1.5 rounded-md",
  md: "h-8 px-3 text-[12px] gap-1.5 rounded-lg",
};

export function Button({
  children,
  variant = "secondary",
  size = "sm",
  icon,
  trailing,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {trailing}
    </button>
  );
}

export function IconButton({
  children,
  label,
  className,
  active = false,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid size-7 place-items-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        active
          ? "border-brand-line bg-brand-soft text-brand"
          : "border-line bg-surface text-muted hover:bg-surface-2 hover:text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ metrics */

export function StatTile({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "neutral",
  delta,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  delta?: { value: string; tone: Tone };
  className?: string;
}) {
  return (
    <div className={cn("cm-card relative px-3.5 py-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">{label}</span>
        {icon ? <span className={cn("text-faint", tone !== "neutral" && TONE_CLASSES[tone].split(" ").find((c) => c.startsWith("text-")))}>{icon}</span> : null}
      </div>
      <div className="mt-1.5 flex items-end gap-1.5">
        <span className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-ink">
          {value}
        </span>
        {unit ? <span className="pb-0.5 text-[11px] font-medium text-muted">{unit}</span> : null}
        {delta ? (
          <Badge tone={delta.tone} className="mb-0.5 ml-auto">
            {delta.value}
          </Badge>
        ) : null}
      </div>
      {hint ? <div className="mt-1.5 text-[10.5px] leading-snug text-muted">{hint}</div> : null}
    </div>
  );
}

export function Progress({
  value,
  tone = "brand",
  height = "h-1.5",
  label,
  className,
}: {
  value: number;
  tone?: Tone;
  height?: string;
  label?: ReactNode;
  className?: string;
}) {
  const bounded = Math.max(0, Math.min(100, value));
  const fill: Record<Tone, string> = {
    neutral: "bg-faint",
    brand: "bg-brand",
    ok: "bg-ok",
    warn: "bg-warn",
    crit: "bg-crit",
    info: "bg-info",
    ai: "bg-ai",
  };
  return (
    <div className={className}>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-[10.5px] text-muted">{label}</div>
      ) : null}
      <div className={cn("w-full overflow-hidden rounded-full bg-surface-3", height)}>
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", fill[tone])}
          style={{ width: `${bounded}%` }}
        />
      </div>
    </div>
  );
}

export function Meter({
  segments,
  className,
}: {
  segments: Array<{ value: number; tone: Tone; label: string }>;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const fill: Record<Tone, string> = {
    neutral: "bg-faint",
    brand: "bg-brand",
    ok: "bg-ok",
    warn: "bg-warn",
    crit: "bg-crit",
    info: "bg-info",
    ai: "bg-ai",
  };
  return (
    <div className={cn("flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-3", className)}>
      {segments.map((segment) => (
        <div
          key={segment.label}
          title={`${segment.label}: ${segment.value}`}
          className={cn("h-full transition-[width] duration-500 first:rounded-l-full last:rounded-r-full", fill[segment.tone])}
          style={{ width: `${(segment.value / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

export function KeyValue({
  label,
  value,
  mono = false,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  tone?: Tone;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-1.5 last:border-b-0">
      <span className="text-[11px] text-muted">{label}</span>
      <span
        className={cn(
          "text-right text-[11.5px] font-medium text-ink",
          mono && "font-mono text-[11px]",
          tone === "crit" && "text-crit",
          tone === "warn" && "text-warn",
          tone === "ok" && "text-ok",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{children}</span>
      {right}
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
  icon,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg border px-3 py-2.5 text-[11.5px] leading-relaxed",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon ? <span className="mt-[1px] shrink-0">{icon}</span> : null}
      <div className="min-w-0">
        {title ? <div className="font-semibold">{title}</div> : null}
        <div className={cn(title ? "mt-0.5" : undefined, "opacity-95")}>{children}</div>
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-surface-2 px-1 py-[1px] font-mono text-[9.5px] text-faint">
      {children}
    </kbd>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-xl border border-line bg-surface-2 text-faint">
        {icon}
      </span>
      <div className="text-[13px] font-semibold text-ink">{title}</div>
      <p className="max-w-sm text-[11.5px] text-muted">{description}</p>
    </div>
  );
}

export function DataTableShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("cm-scroll overflow-x-auto", className)}>{children}</div>;
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 whitespace-nowrap border-b border-line bg-surface-2 px-3 py-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-faint",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}
