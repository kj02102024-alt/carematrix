"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BedDouble,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Command,
  Files,
  FlaskConical,
  HeartPulse,
  ScanLine,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import {
  NAV_GROUPS,
  NAV_ITEMS,
  ROLE_ORDER,
  ROLE_PROFILES,
  type Role,
} from "@/lib/nav";
import { useWorkspace } from "@/lib/workspace";
import { Badge, StatusDot } from "@/components/ui";

const ICONS: Record<string, ReactNode> = {
  bed: <BedDouble className="size-[15px]" strokeWidth={1.8} />,
  flask: <FlaskConical className="size-[15px]" strokeWidth={1.8} />,
  files: <Files className="size-[15px]" strokeWidth={1.8} />,
  shield: <ShieldAlert className="size-[15px]" strokeWidth={1.8} />,
  activity: <Activity className="size-[15px]" strokeWidth={1.8} />,
  scan: <ScanLine className="size-[15px]" strokeWidth={1.8} />,
  heart: <HeartPulse className="size-[15px]" strokeWidth={1.8} />,
};

const ROLE_ICONS: Record<Role, ReactNode> = {
  admin: <ShieldCheck className="size-[13px]" strokeWidth={2} />,
  clinician: <Stethoscope className="size-[13px]" strokeWidth={2} />,
  patient: <UserRound className="size-[13px]" strokeWidth={2} />,
};

export function Sidebar() {
  const pathname = usePathname();
  const {
    role,
    switchRole,
    profile,
    collapsed,
    setCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
  } = useWorkspace();

  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-surface transition-[width,transform] duration-200",
          collapsed ? "w-[76px]" : "w-[266px]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* brand */}
        <div className="flex h-[54px] shrink-0 items-center gap-2.5 border-b border-line px-3">
          <div className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-[color:var(--surface)] shadow-[0_6px_16px_-8px_rgba(13,148,136,0.9)]">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <rect x="2" y="2" width="8.4" height="8.4" rx="2.2" fill="currentColor" />
              <rect x="13.6" y="2" width="8.4" height="8.4" rx="2.2" fill="currentColor" opacity="0.5" />
              <rect x="2" y="13.6" width="8.4" height="8.4" rx="2.2" fill="currentColor" opacity="0.5" />
              <path
                d="M17.8 13.6v8.4M13.6 17.8h8.4"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1">
                <span className="truncate text-[14px] font-semibold tracking-[-0.02em] text-ink">
                  CareMatrix
                </span>
                <span className="rounded border border-brand-line bg-brand-soft px-1 font-mono text-[8.5px] font-semibold tracking-[0.1em] text-brand">
                  OS
                </span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                Clinical ops fabric
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
            className="ml-auto grid size-6 place-items-center rounded text-faint hover:bg-surface-2 hover:text-ink lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* facility */}
        {!collapsed ? (
          <div className="px-2.5 pt-2.5">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-left transition-colors hover:bg-surface-3"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded border border-line bg-surface font-mono text-[9px] font-semibold text-brand">
                SAC
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-medium leading-tight text-ink">
                  {profile.facility}
                </span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.08em] text-faint">
                  IDN-04 · 42 wards
                </span>
              </span>
              <ChevronDown className="size-3.5 text-faint" />
            </button>
          </div>
        ) : null}

        {/* role switcher */}
        <div className={cn("border-b border-line pb-2.5", collapsed ? "px-2 pt-2.5" : "px-2.5 pt-2.5")}>
          {!collapsed ? (
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                Access context
              </span>
              <span className="font-mono text-[9px] text-brand">{profile.clearance}</span>
            </div>
          ) : null}
          <div
            className={cn(
              "grid gap-1 rounded-lg border border-line bg-surface-2 p-1",
              collapsed ? "grid-cols-1" : "grid-cols-3",
            )}
            role="group"
            aria-label="Switch role context"
          >
            {ROLE_ORDER.map((item) => {
              const isActive = item === role;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => switchRole(item)}
                  aria-pressed={isActive}
                  title={ROLE_PROFILES[item].label}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[10.5px] font-medium transition-all",
                    isActive
                      ? "bg-brand text-[color:var(--surface)] shadow-[0_4px_12px_-8px_rgba(13,148,136,0.9)]"
                      : "text-muted hover:bg-surface hover:text-ink",
                  )}
                >
                  {ROLE_ICONS[item]}
                  {!collapsed ? <span>{ROLE_PROFILES[item].shortLabel}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* navigation */}
        <nav className="cm-scroll flex-1 overflow-y-auto px-2 py-2">
          {NAV_GROUPS.map((group) => {
            const items = visible.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-2.5 last:mb-0">
                {!collapsed ? (
                  <div className="mb-1 flex items-center justify-between px-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-faint">
                      {group}
                    </span>
                    <span className="font-mono text-[9px] text-faint/70">
                      {String(items.length).padStart(2, "0")}
                    </span>
                  </div>
                ) : (
                  <div className="mx-1.5 mb-1.5 border-t border-line" />
                )}
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileNavOpen(false)}
                          title={`${item.label} — ${item.description}`}
                          className={cn(
                            "group relative flex items-center gap-2 rounded-md py-1.5 text-[11.5px] transition-colors",
                            collapsed ? "justify-center px-1" : "px-2",
                            active
                              ? "bg-brand-soft font-medium text-brand"
                              : "text-muted hover:bg-surface-2 hover:text-ink",
                          )}
                        >
                          {active ? (
                            <span className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-brand" />
                          ) : null}
                          <span className={cn("shrink-0", active ? "text-brand" : "text-faint group-hover:text-ink")}>
                            {ICONS[item.icon]}
                          </span>
                          {!collapsed ? (
                            <>
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {item.tag ? (
                                <Badge tone={item.tagTone ?? "neutral"} mono className="px-1 py-0 text-[8.5px]">
                                  {item.tag}
                                </Badge>
                              ) : null}
                            </>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* footer */}
        <div className="shrink-0 border-t border-line p-2">
          {!collapsed ? (
            <div className="mb-2 rounded-lg border border-line bg-surface-2 px-2.5 py-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-faint">
                  <StatusDot tone="ok" /> Core status
                </span>
                <span className="font-mono text-[9.5px] text-ok">OPERATIONAL</span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[9px] text-faint">
                <span>UPTIME</span>
                <span className="text-right text-ink">99.982%</span>
                <span>HL7 FEED</span>
                <span className="text-right text-ok">CONNECTED</span>
                <span>SYNC</span>
                <span className="text-right text-ink">42 ms</span>
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border border-line bg-surface-2 p-1.5",
              collapsed && "justify-center",
            )}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand text-[10px] font-semibold text-[color:var(--surface)]">
              {profile.initials}
            </span>
            {!collapsed ? (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold leading-tight text-ink">
                    {profile.name}
                  </span>
                  <span className="block truncate text-[9.5px] text-faint">{profile.title}</span>
                </span>
                <Settings2 className="size-3.5 shrink-0 text-faint" />
              </>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden h-8 shrink-0 items-center justify-center gap-1.5 border-t border-line font-mono text-[9px] uppercase tracking-[0.1em] text-faint transition-colors hover:bg-surface-2 hover:text-ink lg:flex"
        >
          {collapsed ? (
            <ChevronsRight className="size-3.5" />
          ) : (
            <>
              <ChevronsLeft className="size-3.5" /> Collapse <Command className="size-3 opacity-50" />K
            </>
          )}
        </button>
      </aside>
    </>
  );
}
