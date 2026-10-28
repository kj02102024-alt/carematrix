"use client";

import type { ReactNode } from "react";
import { Activity, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/format";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { AuditDrawer } from "@/components/shell/AuditDrawer";

function ShellFrame({ children }: { children: ReactNode }) {
  const { collapsed, theme } = useWorkspace();

  return (
    <div className={cn("min-h-screen bg-canvas", collapsed ? "lg:pl-[76px]" : "lg:pl-[266px]")}>
      <Sidebar />
      <div className="flex min-h-screen flex-col">
        <Topbar />
        <main className="cm-grid-bg mx-auto w-full max-w-[1680px] flex-1 px-3 pb-24 pt-4 sm:px-4">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-faint sm:px-4">
          <span className="flex items-center gap-1 text-muted">
            <Activity className="size-3 text-brand" /> CareMatrix OS v4.18.2
          </span>
          <span>Tenant: St. Aurelia Central · IDN-04</span>
          <span className="hidden md:inline">HL7 v2.5 · FHIR R4 · DICOMweb</span>
          <span className="hidden lg:inline">Contrast: {theme}</span>
          <span className="ml-auto flex items-center gap-1 text-ok">
            <ShieldCheck className="size-3" /> HIPAA · SOC 2 Type II
          </span>
          <span className="w-full text-faint/70 sm:w-auto">
            Clinical decision support · not a substitute for professional judgement
          </span>
        </footer>
      </div>
      <AuditDrawer />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <ShellFrame>{children}</ShellFrame>
    </WorkspaceProvider>
  );
}
