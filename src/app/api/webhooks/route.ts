import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // TODO: Implement webhook handler
  const body = await request.json();

  return NextResponse.json({ received: true });
}
