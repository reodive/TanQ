// lib/http.ts - small helpers for consistent API responses
import { NextResponse } from "next/server";

type JsonBody = Record<string, unknown> | Array<unknown> | null;

export function json(data: JsonBody, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json({ success: true, data }, responseInit);
}

export function error(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { message, ...extra } }, { status });
}
