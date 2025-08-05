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
        <div className="divide-y divide-slate-700 border border-slate-700 rounded overflow-hidden">
          <div className="grid grid-cols-2 gap-2 px-4 py-2 bg-slate-800">
            <span className="font-medium text-slate-400">Login</span>
            <span>{userInfo.login}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 py-2 bg-slate-800">
            <span className="font-medium text-slate-400">Email</span>
            <span>{userInfo.email ?? "—"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 py-2 bg-slate-800">
            <span className="font-medium text-slate-400">Name</span>
            <span>{userInfo.name ?? "—"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 py-2 bg-slate-800">
            <span className="font-medium text-slate-400">Terms Accepted</span>
            <span>{userInfo.term_accepted ? "Yes" : "No"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 py-2 bg-slate-800">
            <span className="font-medium text-slate-400">Created</span>
            <span>{new Date(userInfo.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="pt-4">
        <AccountDelete />
      </div>
    </div>
  );
}
