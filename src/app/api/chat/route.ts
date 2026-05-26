import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL, AVAILABLE_MODELS } from "@/utils/gemini";

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2
].filter(Boolean) as string[];

export async function POST(req: NextRequest) {
  try {
    const { message, history, context } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let lastError = null;
    
    // Try each available model in order
    for (const modelId of AVAILABLE_MODELS) {
      try {
        const genAI = new GoogleGenerativeAI(API_KEYS[0]);
        const model = genAI.getGenerativeModel({ 
          model: modelId,
          systemInstruction: `You are an advanced academic tutor. A student is asking a follow-up question regarding a topic they are studying. 
          
Here is the context/notes from the lecture they are currently viewing:
"""
${context || "No context provided."}
"""

Answer the student's question accurately using both the reference notes provided above AND your own foundation model knowledge to explain the concept deeply, provide fresh real-world examples, and simplify it so the student understands perfectly. You must reply in the same language the student uses (If they ask in Sinhala/Singlish, reply in clear Sinhala. If they ask in English, reply in English).`
        });

        // We can use a chat session for history
        const chat = model.startChat({
          history: history || [],
        });

        const result = await chat.sendMessageStream(message);

        // Create a stream for the response
        const stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      } catch (err: any) {
        lastError = err;
        if (err.message?.includes("404") || err.message?.includes("not found")) {
          console.warn(`[Chat] Model ${modelId} not found, trying next...`);
          continue;
        }
        throw err; // For other errors like 429
      }
    }

    throw lastError || new Error("No models available for chat");

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
