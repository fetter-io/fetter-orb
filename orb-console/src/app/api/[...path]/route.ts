// app/api/model/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const runtime = "nodejs"; // ensure Node runtime (not Edge)
export const dynamic = "force-dynamic"; // no caching for a proxy

const PRIVATE_ORB_MODEL = process.env.PRIVATE_ORB_MODEL!;
const TENANT_SECRET   = process.env.TENANT_SECRET!;   // same value Axum expects

function joinPath(parts: string[]) {
  return parts.map(encodeURIComponent).join("/");
}

async function ensureSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }
  return { ok: true as const, session };
}

async function forward(
  req: NextRequest,
  method: string,
  path: string[],
  login: string,
) {
  const url = new URL(req.url);
  const qs = url.search; // preserve ?query=...
  const backendUrl = `${PRIVATE_ORB_MODEL}/${joinPath(path)}${qs}`;

  const headers = new Headers();

  const accept = req.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  headers.set("x-orb-internal", TENANT_SECRET);
  headers.set("x-orb-login", login);

  const init: RequestInit = {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : req.body,
    ...(method === "GET" || method === "HEAD"
      ? {}
      : { duplex: "half" as const }),
  };

  const r = await fetch(backendUrl, init);

  // Pass through selected response headers
  const resHeaders = new Headers();
  const ct = r.headers.get("content-type");
  if (ct) resHeaders.set("content-type", ct);
  const cc = r.headers.get("cache-control");
  if (cc) resHeaders.set("cache-control", cc);

  return new NextResponse(r.body, { status: r.status, headers: resHeaders });
}

export async function GET(
  req: NextRequest,
  ctx: { params: { path: string[] } },
) {
  const gate = await ensureSession();
  if (!gate.ok) return gate.res;
  return forward(req, "GET", ctx.params.path, gate.session.user?.login ?? "");
}

export async function POST(
  req: NextRequest,
  ctx: { params: { path: string[] } },
) {
  const gate = await ensureSession();
  if (!gate.ok) return gate.res;
  return forward(req, "POST", ctx.params.path, gate.session.user?.login ?? "");
}
