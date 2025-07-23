"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

export function UserMenuDropdown() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (status !== "authenticated" || !session?.user) return null;

  const { name, email, image } = session.user;

  return (
    <div className="relative flex flex-col items-start sm:items-end gap-1 mb-2 text-xs text-gray-400" ref={dropdownRef}>

    {/* <div className="relative text-sm text-slate-100" ref={dropdownRef}> */}
      <button
        onClick={() => setOpen(!open)}
        title="User menu"
        className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded-md hover:bg-slate-800 hover:text-white transition"
      >
        <img
          src={image ?? "/default-avatar.png"}
          alt={name ?? "User"}
          className="w-8 h-8 rounded-full border border-slate-600"
        />
        {/* <span className="hidden sm:inline">{name ?? email}</span> */}


      </button>

      {open && (
        <div className="absolute right-0 w-64 rounded-md bg-slate-800/70 backdrop-blur border border-slate-700 shadow-lg z-50">
          <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-700">
            Signed in as<br />
            <span className="text-slate-200 font-medium">{name}</span>
            <br />
            <span className="text-slate-200 font-medium">{email}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-700 transition"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
