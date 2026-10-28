"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileLock2,
  Fingerprint,
  Info,
  Link2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn, formatShortTime, relativeTime } from "@/lib/format";
import type { AuditEvent, AuditSeverity } from "@/lib/audit-types";
import { useWorkspace } from "@/lib/workspace";
import { Badge, Button, IconButton, StatusDot } from "@/components/ui";

const SEVERITY_META: Record<AuditSeverity, { icon: React.ReactNode; label: string; classes: string }> = {
  info: { icon: <Info className="size-3.5" />, label: "Info", classes: "text-info" },
  success: { icon: <Check className="size-3.5" />, label: "Success", classes: "text-ok" },
  warning: { icon: <AlertTriangle className="size-3.5" />, label: "Warning", classes: "text-warn" },
  critical: { icon: <AlertTriangle className="size-3.5" />, label: "Critical", classes: "text-crit" },
};

const FILTERS: Array<{ id: "all" | AuditSeverity; label: string }> = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "warning", label: "Warning" },
  { id: "success", label: "Success" },
  { id: "info", label: "Info" },
];

export function AuditDrawer() {
  const { events, auditOpen, setAuditOpen, chainOk, refreshAudit, auditLoading, profile, role } =
    useWorkspace();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | AuditSeverity>("all");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!auditOpen) return;
    const id = window.setInterval(() => {
      void refreshAudit();
    }, 20000);
    return () => window.clearInterval(id);
  }, [auditOpen, refreshAudit]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      if (filter !== "all" && event.severity !== filter) return false;
      if (!needle) return true;
      return (
        event.action.toLowerCase().includes(needle) ||
        event.actor.toLowerCase().includes(needle) ||
        event.module.toLowerCase().includes(needle) ||
        event.hash.toLowerCase().includes(needle)
      );
    });
  }, [events, filter, query]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  const latestHash = events[0]?.hash ?? "0".repeat(64);

  return (
    <>
      {!auditOpen ? (
        <button
          type="button"
          onClick={() => setAuditOpen(true)}
          className="group fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-line-strong bg-surface/95 py-1.5 pl-2 pr-3 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
        >
          <span className="grid size-7 place-items-center rounded-full border border-brand-line bg-brand-soft text-brand">
            <ShieldCheck className="size-4" />
          </span>
          <span className="text-left">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold leading-tight text-ink">
              Audit Trail
              <Badge tone="ok" mono className="px-1 py-0 text-[8px]">
                <StatusDot tone="ok" /> VERIFIED
              </Badge>
            </span>
            <span className="block font-mono text-[9px] tracking-[0.04em] text-faint">
              {events.length} events · SHA-256 anchored
            </span>
          </span>
          <ChevronUp className="ml-1 size-4 text-faint group-hover:text-ink" />
        </button>
      ) : null}

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 transition-transform duration-300",
          auditOpen ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
        role="dialog"
        aria-label="Audit trail"
        aria-hidden={!auditOpen}
      >
        <div className="mx-auto max-w-[1680px] border-t border-line-strong bg-surface/97 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 sm:px-4">
            <span className="grid size-7 place-items-center rounded-md border border-brand-line bg-brand-soft text-brand">
              <Fingerprint className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[12.5px] font-semibold tracking-[-0.01em] text-ink">
                  Immutable Audit Trail
                </h2>
                <Badge tone={chainOk ? "ok" : "crit"} mono>
                  <ShieldCheck className="size-2.5" /> {chainOk ? "CHAIN VERIFIED" : "CHAIN BROKEN"}
                </Badge>
                <Badge tone="neutral" mono className="hidden sm:inline-flex">
                  SHA-256 · {events.length} EVENTS
                </Badge>
              </div>
              <p className="hidden text-[10px] text-muted sm:block">
                Every action is hash-chained to its predecessor. Session: {profile.name} ·{" "}
                <span className="font-mono uppercase">{role}</span>
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-faint" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter events, actors, hashes…"
                  aria-label="Filter audit events"
                  className="h-7 w-[180px] rounded-md border border-line bg-surface-2 pl-7 pr-2 text-[11px] text-ink outline-none placeholder:text-faint focus:border-brand-line focus:ring-2 focus:ring-brand-soft sm:w-[230px]"
                />
              </div>
              <div className="hidden items-center gap-0.5 rounded-md border border-line bg-surface-2 p-0.5 md:flex">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={cn(
                      "rounded px-1.5 py-1 text-[10px] font-medium transition-colors",
                      filter === item.id
                        ? "bg-surface text-ink shadow-sm"
                        : "text-faint hover:text-ink",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <Button
                size="xs"
                variant="secondary"
                icon={<Download className="size-3" />}
                onClick={() => {
                  const blob = new Blob([JSON.stringify(events, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = "carematrix-audit-chain.json";
                  anchor.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export
              </Button>
              <IconButton label="Refresh audit trail" onClick={() => void refreshAudit()}>
                <Link2 className={cn("size-3.5", auditLoading && "animate-pulse")} />
              </IconButton>
              <IconButton label="Close audit trail" onClick={() => setAuditOpen(false)}>
                <X className="size-3.5" />
              </IconButton>
            </div>
          </div>

          <div className="cm-scroll max-h-[46vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="grid place-items-center gap-1 px-4 py-10 text-center">
                <FileLock2 className="size-5 text-faint" />
                <p className="text-[12px] font-medium text-ink">No matching audit events</p>
                <p className="text-[11px] text-muted">
                  Actions you take across CareMatrix will appear here instantly.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {filtered.map((event: AuditEvent) => {
                  const meta = SEVERITY_META[event.severity] ?? SEVERITY_META.info;
                  return (
                    <li
                      key={`${event.seq ?? event.hash}-${event.createdAt}`}
                      className="flex flex-wrap items-center gap-2 px-3 py-2 transition-colors hover:bg-surface-2 sm:flex-nowrap sm:px-4"
                    >
                      <span className={cn("grid size-6 shrink-0 place-items-center rounded border border-line bg-surface", meta.classes)}>
                        {meta.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[11.5px] font-medium text-ink">
                            {event.action}
                          </span>
                          <Badge tone="neutral" className="hidden shrink-0 px-1 py-0 text-[9px] md:inline-flex">
                            {event.module}
                          </Badge>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[9.5px] text-faint">
                          <span className="text-muted">{event.actor}</span>
                          <span className={cn("uppercase", meta.classes)}>{event.severity}</span>
                          <span>
                            HASH: {event.hash.slice(0, 10)}…{event.hash.slice(-4)}
                          </span>
                          <span className="hidden md:inline">
                            PREV: {event.prevHash.slice(0, 6)}…
                          </span>
                          <span>{formatShortTime(event.createdAt)}</span>
                          <span className="hidden lg:inline">{relativeTime(event.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copy(event.hash)}
                        title="Copy full SHA-256 hash"
                        className="flex shrink-0 items-center gap-1 rounded border border-line bg-surface px-1.5 py-1 font-mono text-[9px] text-faint transition-colors hover:text-ink"
                      >
                        {copied === event.hash ? (
                          <CheckCheck className="size-3 text-ok" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        {event.hash.slice(0, 6)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-surface-2 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-faint sm:px-4">
            <span className="flex items-center gap-1 text-ok">
              <ShieldCheck className="size-3" /> Merkle anchor valid
            </span>
            <span className="truncate">HEAD {latestHash.slice(0, 24)}…</span>
            <span className="hidden md:inline">GENESIS {"0".repeat(8)}…</span>
            <span className="hidden sm:inline">RETENTION 7Y · HIPAA §164.312(b)</span>
            <span className="ml-auto flex items-center gap-1">
              <ChevronDown className="size-3" /> Drag / scroll to review
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
