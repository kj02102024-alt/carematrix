"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "./nav";
import { ROLE_PROFILES, type RoleProfile } from "./nav";
import type { AuditEvent, AuditLogInput, AuditSeverity } from "./audit-types";
import { FALLBACK_AUDIT } from "./audit-types";
import { sha256Hex } from "./format";

export type ThemeMode = "dark" | "light";

type WorkspaceContextValue = {
  role: Role;
  profile: RoleProfile;
  switchRole: (role: Role) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (value: boolean) => void;
  events: AuditEvent[];
  log: (input: AuditLogInput) => Promise<void>;
  refreshAudit: () => Promise<void>;
  auditOpen: boolean;
  setAuditOpen: (value: boolean) => void;
  chainOk: boolean;
  auditLoading: boolean;
  pendingCount: number;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const GENESIS = "0".repeat(64);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [chainOk, setChainOk] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);

  const profile = ROLE_PROFILES[role];

  useEffect(() => {
    try {
      const storedRole = window.localStorage.getItem("cm.role") as Role | null;
      if (storedRole && storedRole in ROLE_PROFILES) setRole(storedRole);
      const storedTheme = window.localStorage.getItem("cm.theme") as ThemeMode | null;
      if (storedTheme === "dark" || storedTheme === "light") {
        setTheme(storedTheme);
        document.documentElement.dataset.theme = storedTheme;
      } else {
        document.documentElement.dataset.theme = "dark";
      }
      const storedCollapsed = window.localStorage.getItem("cm.collapsed");
      if (storedCollapsed === "1") setCollapsed(true);
    } catch {
      /* storage unavailable — defaults are fine */
    }
  }, []);

  const refreshAudit = useCallback(async () => {
    try {
      const res = await fetch("/api/audit?limit=80", { cache: "no-store" });
      if (!res.ok) throw new Error("audit fetch failed");
      const data = (await res.json()) as { events: AuditEvent[]; chainOk: boolean };
      setEvents(data.events);
      setChainOk(data.chainOk);
    } catch {
      setEvents((prev) => (prev.length > 0 ? prev : FALLBACK_AUDIT));
      setChainOk(true);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAudit();
  }, [refreshAudit]);

  const log = useCallback(
    async (input: AuditLogInput) => {
      const createdAt = new Date().toISOString();
      const severity: AuditSeverity = input.severity ?? "info";
      const tempHash = await sha256Hex(
        `${createdAt}|${profile.name}|${input.action}|${input.module}|${Math.random()}`,
      );
      const optimistic: AuditEvent = {
        hash: tempHash,
        prevHash: events[0]?.hash ?? GENESIS,
        actor: profile.name,
        role,
        action: input.action,
        module: input.module,
        severity,
        createdAt,
        meta: input.meta ?? null,
      };
      setEvents((prev) => [optimistic, ...prev].slice(0, 120));

      try {
        const res = await fetch("/api/audit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...input, severity, role, actor: profile.name }),
        });
        if (!res.ok) throw new Error("audit write failed");
        const data = (await res.json()) as { event: AuditEvent };
        setEvents((prev) =>
          [data.event, ...prev.filter((event) => event.hash !== tempHash)].slice(0, 120),
        );
      } catch {
        /* keep the optimistic entry so the drawer still reflects the action */
      }
    },
    [events, profile.name, role],
  );

  const switchRole = useCallback(
    (next: Role) => {
      if (next === role) return;
      setRole(next);
      try {
        window.localStorage.setItem("cm.role", next);
      } catch {
        /* noop */
      }
      void log({
        action: `Role context switched to ${ROLE_PROFILES[next].label} (${ROLE_PROFILES[next].name})`,
        module: "Workspace · RBAC",
        severity: "info",
        meta: { scope: ROLE_PROFILES[next].scope },
      });
    },
    [log, role],
  );

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem("cm.theme", next);
    } catch {
      /* noop */
    }
    void log({
      action: `Theme contrast profile set to ${next} mode`,
      module: "Workspace · Preferences",
      severity: "info",
    });
  }, [log, theme]);

  const updateCollapsed = useCallback((value: boolean) => {
    setCollapsed(value);
    try {
      window.localStorage.setItem("cm.collapsed", value ? "1" : "0");
    } catch {
      /* noop */
    }
  }, []);

  const pendingCount = useMemo(
    () => events.filter((event) => event.severity === "critical").length,
    [events],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      role,
      profile,
      switchRole,
      theme,
      toggleTheme,
      collapsed,
      setCollapsed: updateCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
      events,
      log,
      refreshAudit,
      auditOpen,
      setAuditOpen,
      chainOk,
      auditLoading,
      pendingCount,
    }),
    [
      auditLoading,
      auditOpen,
      chainOk,
      collapsed,
      events,
      log,
      mobileNavOpen,
      pendingCount,
      profile,
      refreshAudit,
      role,
      switchRole,
      theme,
      toggleTheme,
      updateCollapsed,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return context;
}

export function useAuditLogger(module: string) {
  const { log } = useWorkspace();
  return useCallback(
    (action: string, severity: AuditSeverity = "info", meta?: Record<string, unknown>) =>
      log({ action, module, severity, meta }),
    [log, module],
  );
}
