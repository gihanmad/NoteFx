import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import { GEMINI_MODEL } from "@/utils/gemini";
// Set binary paths directly from node_modules to avoid Next.js webpack path mangling
const ffmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
const ffprobePath = path.join(process.cwd(), "node_modules", "ffprobe-static", "bin", process.platform, process.arch, process.platform === "win32" ? "ffprobe.exe" : "ffprobe");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2
].filter(Boolean) as string[];

const CHUNK_DURATION = 15 * 60;
const OVERLAP_DURATION = 1 * 60;
const DELAY_BETWEEN_CHUNKS = 10000;

export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  const tmpDir = path.join(process.cwd(), "tmp", requestId);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!fs.existsSync(tmpDir)) {
      await mkdir(tmpDir, { recursive: true });
    }

    const inputPath = path.join(tmpDir, "input.mp3");
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    const duration: number = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration || 0);
      });
    });

    const totalChunks = Math.ceil(duration / (CHUNK_DURATION - OVERLAP_DURATION));

    // Create a ReadableStream for streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let currentApiKeyIndex = 0;
        let previousSummary = "";
        let chunksProcessed = 0;

        for (let start = 0; start < duration; start += (CHUNK_DURATION - OVERLAP_DURATION)) {
          const chunkIndex = chunksProcessed;
          const chunkPath = path.join(tmpDir, `chunk_${chunkIndex}.mp3`);

          try {
            // 1. Send status update before starting chunk
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify({
                type: "status",
                message: `Processing Chunk ${chunkIndex + 1} of ${totalChunks}`,
                progress: Math.round(((chunkIndex) / totalChunks) * 100),
                currentChunk: chunkIndex + 1,
                totalChunks
              }) + "\n")
            );

            // 2. Audio Chunking
            await new Promise((resolve, reject) => {
              ffmpeg(inputPath)
                .setStartTime(start)
                .setDuration(CHUNK_DURATION)
                .output(chunkPath)
                .on("end", resolve)
                .on("error", reject)
                .run();
            });

            const chunkData = fs.readFileSync(chunkPath).toString("base64");

            // 3. Process with Fallback
            const transcription = await processWithFallback(
              chunkData,
              previousSummary,
              currentApiKeyIndex,
              (newIndex) => { currentApiKeyIndex = newIndex; }
            );

            previousSummary = transcription.quickSummary || "";
            chunksProcessed++;

            // 4. Stream the result for this chunk
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify({
                type: "result",
                chunkIndex,
                startOffset: start,
                endOffset: Math.min(start + CHUNK_DURATION, duration),
                data: transcription
              }) + "\n")
            );

            await unlink(chunkPath).catch(() => { });

            // 5. Delay before next chunk
            if (start + (CHUNK_DURATION - OVERLAP_DURATION) < duration) {
              await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
            }
          } catch (chunkError: any) {
            console.error(`Error processing chunk ${chunkIndex}:`, chunkError);
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify({
                type: "error",
                chunkIndex,
                message: chunkError.message
              }) + "\n")
            );
          }
        }

        // Cleanup and finish
        await unlink(inputPath).catch(() => { });
        await fs.promises.rm(tmpDir, { recursive: true }).catch(() => { });
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    console.error("Transcription Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { getDynamicModel } from "@/utils/gemini";

async function processWithFallback(
  base64Data: string,
  previousSummary: string,
  apiKeyIndex: number,
  onApiKeyChange: (index: number) => void
): Promise<any> {
  let currentKeyIdx = apiKeyIndex;

  // Try all API keys
  while (currentKeyIdx < API_KEYS.length) {
    try {
      const apiKey = API_KEYS[currentKeyIdx];
      // Step 1: Dynamically find the best model for THIS specific key
      const bestAvailableModel = await getDynamicModel(apiKey);

      console.log(`[Gemini] Key ${currentKeyIdx + 1} -> Using Model: ${bestAvailableModel}`);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: bestAvailableModel });

      const prompt = `
You are a dual-mode academic expert: a meticulous scribe and a senior university professor. Your task is to process this 15-minute lecture chunk into a "Hybrid Academic Note."

STRICT Note Creation Strategy (50/50 Hybrid):
1. THE LECTURER'S WORDS (50%): Capture exactly what the lecturer said. Do not miss any examples, analogies, or practical tips they shared.
2. GEMINI'S THEORETICAL EXPANSION (50%): For every theory or concept the lecturer mentions, you must add an "Expert Context" section. Formally explain the theory from your own deep academic knowledge base, provide standard definitions, and add more advanced real-world examples that the lecturer might have skipped. Mention it as "In Detail" on the note.

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

      // Robust parsing logic
      const p1 = responseText.indexOf("--- SECTION 1: HYBRID DETAILED NOTE (SINHALA) ---");
      const p2 = responseText.indexOf("--- SECTION 2: QUICK REVIEW (ENGLISH) ---");

      let sinhalaContent = "";
      let englishContent = "";

      if (p1 !== -1 && p2 !== -1) {
        sinhalaContent = responseText.substring(p1 + 49, p2).trim();
        englishContent = responseText.substring(p2 + 41).trim();
      } else {
        // Fallback parsing
        const parts = responseText.split(/--- SECTION \d: .* ---/);
        sinhalaContent = parts[1]?.trim() || responseText;
        englishContent = parts[2]?.trim() || "Review section not generated correctly.";
      }

      return {
        translation: sinhalaContent,
        quickSummary: englishContent,
        transcription: ""
      };

    } catch (error: any) {
      const errorMsg = error.message || "";
      const isRateLimit = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED");

      // Only switch API keys on rate limits.
      // 404s/Other errors should not typically happen since we listModels first.
      if (isRateLimit && currentKeyIdx < API_KEYS.length - 1) {
        console.warn(`[Gemini] Rate limit hit for Key ${currentKeyIdx + 1}. Switching to next key...`);
        currentKeyIdx++;
        onApiKeyChange(currentKeyIdx);
        continue;
      }

      throw error;
    }
  }

  throw new Error("All API keys and models exhausted. Could not process audio chunk.");
}
