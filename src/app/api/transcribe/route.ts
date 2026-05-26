import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDynamicModel } from "@/utils/gemini";

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2
].filter(Boolean) as string[];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const previousSummary = formData.get("previousSummary") as string || "";
    const apiKeyIndexStr = formData.get("apiKeyIndex") as string || "0";
    let currentApiKeyIndex = parseInt(apiKeyIndexStr);

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");

    // Successive fallback logic
    let lastError = null;
    while (currentApiKeyIndex < API_KEYS.length) {
      try {
        const apiKey = API_KEYS[currentApiKeyIndex];
        const bestModel = await getDynamicModel(apiKey);
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: bestModel });

        const prompt = `
You are a dual-mode academic expert: a meticulous scribe and a senior university professor. Your task is to process this lecture chunk into a "Hybrid Academic Note."

STRICT Note Creation Strategy (50/50 Hybrid):
1. THE LECTURER'S WORDS (50%): Capture exactly what the lecturer said. Do not miss any examples, analogies, or practical tips they shared.
2. GEMINI'S THEORETICAL EXPANSION (50%): For every theory or concept the lecturer mentions, you must add an "In Detail" section. Formally explain the theory from your own deep academic knowledge base, provide standard definitions, and add more advanced real-world examples that the lecturer might have skipped.

The final output must be EXTREMELY DETAILED and MASSIVE in length. A 15-minute chunk should result in several pages of content.

You must generate TWO distinct sections:

--- SECTION 1: HYBRID DETAILED NOTE (SINHALA) ---
- Language: Natural, academic Sinhala (සුලභ සිංහල) with Technical Terms in [English].
- Structure: 
    - Use ## for main topics.
    - Use ### for lecturer's specific points.
    - VERY IMPORTANT: Use double line breaks between EVERY paragraph to ensure readability.
    - Put Line breaks suitably and frequently.
    - Use > BLOCKQUOTES for "In Detail" sections.
    - Within "In Detail" sections, provide deep academic context and textbook definitions.
- Goal: If a student only reads this, they should understand the lecture AND the textbook theory behind it perfectly. Formatted for a physical notebook.

--- SECTION 2: QUICK REVIEW (ENGLISH) ---
- Language: English.
- Goal: Specially for to generate a note for a notebook. A high-level, scannable summary in bullet points for quick exam revision.

STRICT REQUIREMENT: You must output the exact markers "--- SECTION 1: HYBRID DETAILED NOTE (SINHALA) ---" and "--- SECTION 2: QUICK REVIEW (ENGLISH) ---".
        `;

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: "audio/mp3",
              data: base64Data
            }
          }
        ]);

        const responseText = result.response.text();
        
        // Parsing logic
        const p1 = responseText.indexOf("--- SECTION 1: HYBRID DETAILED NOTE (SINHALA) ---");
        const p2 = responseText.indexOf("--- SECTION 2: QUICK REVIEW (ENGLISH) ---");
        
        let sinhalaContent = "";
        let englishContent = "";

        if (p1 !== -1 && p2 !== -1) {
          sinhalaContent = responseText.substring(p1 + 49, p2).trim();
          englishContent = responseText.substring(p2 + 41).trim();
        } else {
          const parts = responseText.split(/--- SECTION \d: .* ---/);
          sinhalaContent = parts[1]?.trim() || responseText;
          englishContent = parts[2]?.trim() || "Review section not generated correctly.";
        }

        return NextResponse.json({
          success: true,
          data: {
            translation: sinhalaContent,
            quickSummary: englishContent,
            transcription: ""
          },
          apiKeyIndex: currentApiKeyIndex
        });

      } catch (error: any) {
        lastError = error;
        const isRateLimit = error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED");
        if (isRateLimit && currentKeyIdx < API_KEYS.length - 1) {
          currentApiKeyIndex++;
          continue;
        }
        break;
      }
    }

    throw lastError || new Error("Failed to process chunk");

  } catch (error: any) {
    console.error("Transcription Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
