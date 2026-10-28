"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  ChevronDown,
  Command,
  FlaskConical,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Timer,
  Wifi,
} from "lucide-react";
import { cn, formatClock } from "@/lib/format";
import { navItemFor, ROLE_PROFILES, ROLE_ORDER } from "@/lib/nav";
import { useWorkspace } from "@/lib/workspace";
import { Badge, Kbd, StatusDot } from "@/components/ui";

const TICKER = [
  { label: "ED wait", value: "18m", tone: "warn" as const },
  { label: "ICU free", value: "02", tone: "crit" as const },
  { label: "Crit labs", value: "05", tone: "crit" as const },
  { label: "Deteriorating", value: "01", tone: "warn" as const },
  { label: "OR turnover", value: "24m", tone: "ok" as const },
];

export function Topbar() {
  const pathname = usePathname();
  const { profile, role, switchRole, theme, toggleTheme, setMobileNavOpen, setAuditOpen } =
    useWorkspace();
  const [profileOpen, setProfileOpen] = useState(false);
  const [clock, setClock] = useState<string>("--:--:--");
  const active = navItemFor(pathname);

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    const kickoff = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(kickoff);
    };
  }, []);

  const crumbs = useMemo(() => {
    if (!active) return ["CareMatrix", "Workspace"];
    return [active.group, active.label];
  }, [active]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div className="flex h-[54px] items-center gap-2 px-3 sm:px-4">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
          className="grid size-8 place-items-center rounded-md border border-line text-muted hover:bg-surface-2 hover:text-ink lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <div className="hidden min-w-0 items-center gap-1.5 text-[11px] md:flex">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">CareMatrix</span>
          <span className="text-faint">/</span>
          <span className="truncate text-muted">{crumbs[0]}</span>
          <span className="text-faint">/</span>
          <span className="truncate font-medium text-ink">{crumbs[1]}</span>
          {active ? (
            <Badge tone="brand" mono className="ml-1">
              {active.code}
            </Badge>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
            <input
              aria-label="Search patients, orders and modules"
              placeholder="Search patient, MRN, order…"
              className="h-8 w-[220px] rounded-lg border border-line bg-surface-2 pl-7 pr-12 text-[11.5px] text-ink outline-none placeholder:text-faint focus:border-brand-line focus:bg-surface focus:ring-2 focus:ring-brand-soft"
            />
            <span className="pointer-events-none absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-0.5">
              <Kbd>
                <Command className="inline size-2.5" />
              </Kbd>
              <Kbd>K</Kbd>
            </span>
          </div>

          <div className="hidden items-center gap-1.5 rounded-lg border border-ok-line bg-ok-soft px-2 py-1 md:flex">
            <StatusDot tone="ok" />
            <span className="text-[10.5px] font-medium text-ok">All systems operational</span>
            <span className="font-mono text-[9.5px] text-ok/70">42ms</span>
          </div>

          <div className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 xl:flex">
            <Wifi className="size-3 text-info" />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted">
              HL7 · MLLP
            </span>
            <span className="font-mono text-[10px] text-ink">{clock}</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAuditOpen(true)}
              aria-label="Open audit trail"
              className="relative grid size-8 place-items-center rounded-md border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Bell className="size-4" />
              <span className="absolute right-1 top-1 size-1.5 rounded-full bg-crit" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="grid size-8 place-items-center rounded-md border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface py-1 pl-1 pr-1.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="grid size-6 place-items-center rounded bg-brand text-[10px] font-semibold text-[color:var(--surface)]">
                {profile.initials}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-[130px] truncate text-[11px] font-semibold leading-tight text-ink">
                  {profile.name}
                </span>
                <span className="block max-w-[130px] truncate font-mono text-[8.5px] uppercase tracking-[0.06em] text-faint">
                  {profile.label} · {profile.clearance}
                </span>
              </span>
              <ChevronDown className="size-3.5 text-faint" />
            </button>

            {profileOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close profile menu"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="cm-card cm-rise absolute right-0 top-[38px] z-40 w-[286px] p-2">
                  <div className="rounded-lg border border-line bg-surface-2 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="grid size-9 place-items-center rounded-md bg-brand text-[11px] font-semibold text-[color:var(--surface)]">
                        {profile.initials}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold text-ink">{profile.name}</div>
                        <div className="truncate text-[10.5px] text-muted">{profile.title}</div>
                      </div>
                      <ShieldCheck className="ml-auto size-4 text-ok" />
                    </div>
                    <div className="mt-2 grid gap-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-faint">
                      <div className="flex justify-between">
                        <span>Facility</span>
                        <span className="text-ink">{profile.facility}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Session</span>
                        <span className="text-ok">MFA VERIFIED</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 px-1 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                    Switch role context
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {ROLE_ORDER.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          switchRole(item);
                          setProfileOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11.5px] transition-colors",
                          item === role
                            ? "bg-brand-soft font-medium text-brand"
                            : "text-muted hover:bg-surface-2 hover:text-ink",
                        )}
                      >
                        <span>{ROLE_PROFILES[item].label}</span>
                        <span className="truncate font-mono text-[9.5px] text-faint">
                          {ROLE_PROFILES[item].name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuditOpen(true);
                        setProfileOpen(false);
                      }}
                      className="flex items-center justify-center gap-1 rounded-md border border-line bg-surface px-2 py-1.5 text-[10.5px] font-medium text-ink hover:bg-surface-2"
                    >
                      <ShieldCheck className="size-3.5 text-brand" /> Audit trail
                    </button>
                    <Link
                      href="/clinical/labloop"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center justify-center gap-1 rounded-md border border-line bg-surface px-2 py-1.5 text-[10.5px] font-medium text-ink hover:bg-surface-2"
                    >
                      <FlaskConical className="size-3.5 text-crit" /> Critical labs
                    </Link>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* live ops strip */}
      <div className="cm-scroll flex h-7 items-center gap-3 overflow-x-auto border-t border-line bg-surface-2 px-3 sm:px-4">
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
          <Timer className="size-3 text-brand" /> Live ops
        </span>
        <span className="h-3 w-px shrink-0 bg-line" />
        {TICKER.map((item) => (
          <span key={item.label} className="flex shrink-0 items-center gap-1.5 text-[10px]">
            <span className="text-faint">{item.label}</span>
            <span
              className={cn(
                "font-mono font-medium",
                item.tone === "crit" && "text-crit",
                item.tone === "warn" && "text-warn",
                item.tone === "ok" && "text-ok",
              )}
            >
              {item.value}
            </span>
          </span>
        ))}
        <span className="ml-auto hidden shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-faint sm:flex">
          <Activity className="size-3 text-brand" /> Node EU-WEST-2 · v4.18.2
        </span>
      </div>
    </header>
  );
}
