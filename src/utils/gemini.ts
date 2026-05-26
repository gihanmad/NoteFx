/**
 * Fetches and sorts ALL available flash models from highest to lowest.
 */
export const getPrioritizedModels = async (apiKey: string): Promise<string[]> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
      throw new Error("Invalid response from ModelService");
    }

    const availableModels = data.models
      .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
      .map((m: any) => m.name.replace("models/", ""));

    const getVersion = (name: string) => {
      const match = name.match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[0]) : 0;
    };

    const flashModels = availableModels
      .filter((m: string) => m.includes("flash"))
      .sort((a: string, b: string) => {
        const vA = getVersion(a);
        const vB = getVersion(b);
        if (vA !== vB) return vB - vA; // Version 2.0 before 1.5
        
        // Priority: 1. Stable, 2. Experimental (unless specific newer version)
        const aIsExp = a.includes("exp");
        const bIsExp = b.includes("exp");
        if (aIsExp && !bIsExp) return 1;
        if (!aIsExp && bIsExp) return -1;
        
        // Priority: Smaller footprint (8b) comes last for quality
        const aIs8b = a.includes("8b");
        const bIs8b = b.includes("8b");
        if (aIs8b && !bIs8b) return 1;
        if (!aIs8b && bIs8b) return -1;

        return b.localeCompare(a);
      });

    // Final fallback sequence if listing fails or is empty
    return flashModels.length > 0 ? flashModels : ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
  } catch (error) {
    return ["gemini-1.5-flash", "gemini-1.5-flash-8b"];
  }
};
