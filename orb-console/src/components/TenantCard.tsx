"use client";

import { useEffect, useRef, useState } from "react";

import { IconLinux } from "@/components/IconLinux";
import { IconApple } from "@/components/IconApple";
import { Tenant } from "@/types";

type Props = {
  tenant: Tenant;
  selected: boolean;
  scrollIntoViewNow: boolean;
};

export function TenantCard({ tenant, selected, scrollIntoViewNow }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  useEffect(() => {
    if (scrollIntoViewNow && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [scrollIntoViewNow]);

  const copyKeyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tenant.key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const copyCommandToClipboard = async () => {
    const command = `fetter monitor-scan --url https://fetter.io/monitor_scan --tenant ${tenant.key}`;
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div
      ref={ref}
      className={`border rounded py-2 px-2 bg-slate-800 ${
        selected ? "border-blue-500" : "border-slate-600"
      }`}
    >
      <div className="text-xl font-semibold text-zinc-400">{tenant.name}</div>

      <div className="text-sm">
        <span className="text-zinc-300">Updates per day: </span>
        <code className="text-zinc-400">{tenant.ping_limit}</code>
      </div>

      <div className="text-sm">
        <span className="text-zinc-300">Key: </span>
        <code
          className="text-zinc-400 break-all cursor-pointer hover:text-zinc-200 transition-colors"
          onClick={copyKeyToClipboard}
          title={copiedKey ? "Copied!" : "Copy to Clipboard"}
        >
          {tenant.key}
        </code>
      </div>

      <div className="mt-2 bg-slate-900 p-2 rounded">
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

        <code
          className="text-zinc-400 text-xs break-all cursor-pointer hover:text-zinc-200 transition-colors leading-tight"
          onClick={copyCommandToClipboard}
          title={copiedCommand ? "Copied!" : "Copy to clipboard"}
        >
          fetter monitor-scan --url https://fetter.io/monitor_scan --tenant{" "}
          {tenant.key}
        </code>
      </div>

      <div className="mt-2 bg-slate-900 p-2 rounded">
        <h2 className="text-zinc-300 font-semibold">
          Upload with the Fetter Agent
        </h2>

        <div className="flex gap-2 mt-2">
          <button disabled className="button-download-deactivated">
            <IconLinux />
            Ubuntu Installer
          </button>

          <button disabled className="button-download-deactivated">
            <IconApple />
            Mac Installer
          </button>
        </div>
      </div>
    </div>
  );
}
