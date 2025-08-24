// src/app/api/model/[...path]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_ORB_MODEL = process.env.PRIVATE_ORB_MODEL!;
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
  user_id: number,
  github_id: number,
) {
  const url = new URL(req.url);
  const backendUrl = `${PRIVATE_ORB_MODEL}/${joinPath(path)}${url.search}`;

  const headers = new Headers();
  const accept = req.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  headers.set("x-orb-internal", TENANT_SECRET);
  headers.set("x-orb-github-id", github_id.toString());

  const fetchOptions: RequestInit & {
    next?: { revalidate: number };
    duplex?: "half";
  } = {
    method,
    headers,
    next: { revalidate: 0 },
  };

  if (method !== "GET" && method !== "HEAD") {
    fetchOptions.body = req.body;
    fetchOptions.duplex = "half" as const;
  }

  const r = await fetch(backendUrl, fetchOptions);

  const outHeaders = new Headers();
  const rct = r.headers.get("content-type");
  if (rct) outHeaders.set("content-type", rct);
  const rcc = r.headers.get("cache-control");
  if (rcc) outHeaders.set("cache-control", rcc);
  return new NextResponse(r.body, { status: r.status, headers: outHeaders });
}

/** Narrow `ctx` without `any` and satisfy Next's "await params" rule */
type RouteContext = { params: Promise<{ path?: string[] }> };
async function extractPath(ctx: unknown): Promise<string[]> {
  const { params } = ctx as RouteContext; // narrow once
  const { path = [] } = await params; // must await
  return path;
}

async function handleRequest(req: Request, ctx: unknown, method: string) {
  const gate = await ensureSession();
  if (!gate.ok) return gate.res;

  const path = await extractPath(ctx);

  const github_id = gate.session.user?.github_id;
  if (!github_id) {
    return NextResponse.json({ error: "missing github_id" }, { status: 401 });
  }

  const user_id = gate.session.user?.user_id;
  if (!user_id) {
    return NextResponse.json({ error: "missing user_id" }, { status: 401 });
  }

  return forward(req, method, path, user_id, github_id);
}

export async function GET(req: Request, ctx: unknown) {
  return handleRequest(req, ctx, "GET");
}

export async function POST(req: Request, ctx: unknown) {
  return handleRequest(req, ctx, "POST");
}
