import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPrioritizedModels } from "@/utils/gemini";

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

    if (API_KEYS.length === 0) {
      return NextResponse.json({ error: "No API keys configured" }, { status: 500 });
    }

    const firstKey = API_KEYS[0];
    const prioritizedModels = await getPrioritizedModels(firstKey);
    
    let lastError = null;
    
    // Try prioritized models for the first key (standard chat behavior)
    for (const modelId of prioritizedModels) {
      try {
        const genAI = new GoogleGenerativeAI(firstKey);
        const model = genAI.getGenerativeModel({ 
          model: modelId,
          systemInstruction: `You are an advanced academic tutor. A student is asking a follow-up question regarding a topic they are studying. 
          
Here is the context/notes from the lecture they are currently viewing:
"""
${context || "No context provided."}
"""

Answer the student's question accurately using both the reference notes provided above AND your own foundation model knowledge to explain the concept deeply, provide fresh real-world examples, and simplify it so the student understands perfectly. You must reply in the same language the student uses (If they ask in Sinhala/Singlish, reply in clear Sinhala. If they ask in English, reply in English).`
        });

        const chat = model.startChat({
          history: history || [],
        });

        const result = await chat.sendMessageStream(message);

        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                controller.enqueue(new TextEncoder().encode(chunkText));
              }
            } catch (streamErr) {
              console.error("Stream error:", streamErr);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      } catch (err: any) {
        lastError = err;
        const isRetryable = err.message?.includes("404") || 
                           err.message?.includes("not found") ||
                           err.message?.includes("429") ||
                           err.message?.includes("503");
        
        if (isRetryable) {
          console.warn(`[Chat] Model ${modelId} failed, trying next prioritized model...`);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("No models available for chat");

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
