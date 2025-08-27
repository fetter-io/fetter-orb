"use client";

import { AccountDelete } from "@/components/AccountDelete";
import { UserRecord } from "@/types";

export function TabAccount({ userInfo }: { userInfo: UserRecord | null }) {
  if (!userInfo) {
    return <div className="text-sm text-gray-400">Loading user info...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-200">Account</h2>
      <div className="text-sm text-gray-300">
        <div className="divide-y divide-slate-600 border border-slate-600 bg-gray-800 rounded overflow-hidden text-sm">
          <div className="grid grid-cols-2 gap-2 px-2 py-2">
            <span className="text-gray-400">GitHub Login</span>
            <span>{userInfo.github_login}</span>
          </div>

          {/* <div className="grid grid-cols-2 gap-2 px-2 py-2">
            <span className="text-gray-400">GitHub ID</span>
            <span>{userInfo.github_id}</span>
          </div> */}

          <div className="grid grid-cols-2 gap-2 px-2 py-2">
            <span className="text-gray-400">Email</span>
            <span>{userInfo.email ?? "—"}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 px-2 py-2">
            <span className="text-gray-400">Name</span>
            <span>{userInfo.name ?? "—"}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 px-2 py-2">
            <span className="text-gray-400">Tenant Limit</span>
            <span>{userInfo.tenant_limit ?? "—"}</span>
          </div>

          {/* <div className="grid grid-cols-2 gap-2 px-2 py-2">
            <span className="text-gray-400">Terms Accepted</span>
            <span>{userInfo.term_accepted ? "Yes" : "No"}</span>
          </div> */}

          <div className="grid grid-cols-2 gap-2 px-2 py-2">
            <span className="text-gray-400">Created</span>
            <span>{new Date(userInfo.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="pt-2">
        <AccountDelete />
      </div>
    </div>
  );
}
