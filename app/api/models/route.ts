import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    models: ["llama3-70b-8192"],
  });
}