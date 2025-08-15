// src/app/api/model/[...path]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_ORB_MODEL = process.env.PRIVATE_ORB_MODEL!.replace(/\/+$/, "");
const TENANT_SECRET = process.env.TENANT_SECRET!;

function joinPath(parts: string[] = []) {
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
  req: Request,
  method: string,
  path: string[],
  login: string,
) {
  const url = new URL(req.url);
  const backendUrl = `${PRIVATE_ORB_MODEL}/${joinPath(path)}${url.search}`;

  const headers = new Headers();
  const accept = req.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  headers.set("x-orb-internal", TENANT_SECRET);
  headers.set("x-orb-login", login);

  const r = await fetch(backendUrl, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : req.body,
    ...(method === "GET" || method === "HEAD"
      ? {}
      : { duplex: "half" as const }),
    next: { revalidate: 0 },
  });

  const outHeaders = new Headers();
  const rct = r.headers.get("content-type");
  if (rct) outHeaders.set("content-type", rct);
  const rcc = r.headers.get("cache-control");
  if (rcc) outHeaders.set("cache-control", rcc);
  return new NextResponse(r.body, { status: r.status, headers: outHeaders });
}

export async function GET(
  req: Request,
  { params }: { params: { path?: string[] } },
) {
  const gate = await ensureSession();
  if (!gate.ok) return gate.res;
  const { path = [] } = await params;
  return forward(req, "GET", path, gate.session.user?.login ?? "");
}

export async function POST(
  req: Request,
  { params }: { params: { path?: string[] } },
) {
  const gate = await ensureSession();
  if (!gate.ok) return gate.res;
  const { path = [] } = await params;
  return forward(req, "POST", path, gate.session.user?.login ?? "");
}
