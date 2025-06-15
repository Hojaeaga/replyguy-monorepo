import { NextResponse } from "next/server";

const INGESTION_SERVICE_URL = process.env.INGESTION_SERVICE_URL || "http://localhost:3001";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid } = body;

    if (!fid) {
      return NextResponse.json(
        { error: "FID is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${INGESTION_SERVICE_URL}/user/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fid }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch trending data from ingestion service");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in trending API route:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending data" },
      { status: 500 }
    );
  }
} 