import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, customerId, productContext } = body;

    // Bridge to External Platform via Webhook
    // In a real scenario, you would fetch your WEBHOOK_URL from env
    const WEBHOOK_URL = process.env.AI_WEBHOOK_URL;

    if (!WEBHOOK_URL) {
      // Mock response if webhook is not configured yet
      return NextResponse.json({
        response: "Lumia AI is initializing. Our external systems are being synchronized. How can I assist you with our product technical specs today?",
        status: "mock_success"
      });
    }

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        customerId,
        productContext,
        timestamp: new Date().toISOString(),
      }),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("AI Bridge Error:", error);
    return NextResponse.json(
      { error: "Failed to connect to AI ecosystem" },
      { status: 500 }
    );
  }
}
