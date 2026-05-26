let cachedModel: string | null = null;

/**
 * Dynamically fetches the real-time list of supported models from Google AI Service.
 * Selects the best available 'flash' model for speed and cost-effectiveness.
 */
export const getDynamicModel = async (apiKey: string): Promise<string> => {
  if (cachedModel) return cachedModel;

  try {
    // We use the REST API directly to bypass any SDK type/version limitations
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
      throw new Error("Invalid response from ModelService");
    }

    // Filter models that support content generation
    const availableModels = data.models
      .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
      .map((m: any) => m.name.replace("models/", ""));

    console.log("[Gemini] Available Models:", availableModels);

    // Dynamic selection logic:
    // Sort models by version number found in the name
    const getVersion = (name: string) => {
      const match = name.match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[0]) : 0;
    };

    const flashModels = availableModels
      .filter((m: string) => m.includes("flash"))
      .sort((a: string, b: string) => {
        const vA = getVersion(a);
        const vB = getVersion(b);
        if (vA !== vB) return vB - vA; // Higher version first
        // If versions equal, prioritize non-experimental
        if (a.includes("exp") && !b.includes("exp")) return 1;
        if (!a.includes("exp") && b.includes("exp")) return -1;
        return b.localeCompare(a);
      });

    if (flashModels.length > 0) {
      cachedModel = flashModels[0];
      console.log(`[Gemini] Highest Version Flash Model Selected: ${cachedModel}`);
      return cachedModel as string;
    }

    // 2. Fallback to Pro if no Flash
    const proModels = availableModels.filter((m: string) => m.includes("pro"));
    if (proModels.length > 0) {
      cachedModel = proModels[0];
      return cachedModel as string;
    }

    return "gemini-1.5-flash"; // Final hardcoded fallback
  } catch (error) {
    console.error("ModelService.ListModels failed, using fallback:", error);
    return "gemini-1.5-flash";
  }
};

export const AVAILABLE_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

export const GEMINI_MODEL = "gemini-2.0-flash";



