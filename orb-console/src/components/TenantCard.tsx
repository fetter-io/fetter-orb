"use client";

import { IconLinux } from "@/components/IconLinux";
import { IconApple } from "@/components/IconApple";
import { Tenant } from "@/types";

type Props = {
  tenant: Tenant;
  selected: boolean;
};

export function TenantCard({ tenant, selected }: Props) {
  return (
    <div
      className={`border rounded p-4 bg-slate-800 ${
        selected ? "border-blue-500" : "border-slate-600"
      }`}
    >
      <div className="text-xl font-semibold text-zinc-400 mb-2">
        Tenant: {tenant.name}
      </div>

      <div>
        <h3 className="text-zinc-300 text-sm">Updates per day</h3>
        <code className="text-zinc-400 text-sm break-all">
          {tenant.ping_limit}
        </code>
      </div>

      <div>
        <h3 className="text-zinc-300 text-sm">Key</h3>
        <code className="text-zinc-400 text-sm break-all">{tenant.key}</code>
      </div>

      <div className="mt-4 bg-slate-900 p-4">
        <h2 className="text-zinc-300 font-semibold">
          Upload with the{" "}
          <a
            href="https://github.com/fetter-io/fetter-rs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400"
          >
            Fetter
          </a>{" "}
          CLI
        </h2>

        <code className="text-zinc-400 text-xs break-all">
          fetter monitor-scan --url http://localhost:3001/monitor_scan --tenant{" "}
          {tenant.key}
        </code>
      </div>

      <div className="mt-4 bg-slate-900 p-4">
        <h2 className="text-zinc-300 font-semibold">
          Upload with the Fetter Agent
        </h2>

        <div className="flex gap-4 mt-2">
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded opacity-50 cursor-not-allowed"
          >
            <IconLinux />
            Ubuntu Installer
          </button>

          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded opacity-50 cursor-not-allowed"
          >
            <IconApple />
            Mac Installer
          </button>
        </div>
      </div>
    </div>
  );
}
