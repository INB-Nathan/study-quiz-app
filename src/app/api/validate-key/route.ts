import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const accessKey = process.env.ACCESS_KEY;

    if (!accessKey) {
      // If no ACCESS_KEY is configured, deny all
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const valid = key === accessKey;

    return NextResponse.json({ valid });
  } catch {
    // Never leak token info on failure
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}
