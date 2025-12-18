import { GoogleGenAI } from "@google/genai";
import { VideoGenerationConfig } from "../types";

// Helper to convert Blob/File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateVeoVideo = async (
  config: VideoGenerationConfig, 
  onStatusUpdate: (status: string) => void
): Promise<string> => {
  
  // Check if API key is selected (Veo requirement)
  if ((window as any).aistudio) {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
       await (window as any).aistudio.openSelectKey();
    }
  }

  // 1. Initialize AI Client
  // Note: We re-initialize here to ensure we capture the latest selected API key if changed.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const model = 'veo-3.1-fast-generate-preview'; // Using fast preview for better UX
  
  onStatusUpdate("Ініціалізація генерації відео...");

  let operation;

  try {
    if (config.imageBase64 && config.mimeType) {
      // Generate with Image reference
      onStatusUpdate("Відправка запиту з зображенням...");
      operation = await ai.models.generateVideos({
        model: model,
        prompt: config.prompt,
        image: {
          imageBytes: config.imageBase64,
          mimeType: config.mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9' 
        }
      });
    } else {
      // Text only generation
      onStatusUpdate("Відправка текстового запиту...");
      operation = await ai.models.generateVideos({
        model: model,
        prompt: config.prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });
    }

    // Polling loop
    onStatusUpdate("Генерація відео... Це може зайняти хвилину.");
    
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      onStatusUpdate("Обробка... (ще трохи)");
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
      throw new Error(`API Error: ${operation.error.message || 'Unknown error'}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("Не вдалося отримати URI відео.");
    }

    onStatusUpdate("Завантаження готового відео...");

    // Fetch the actual video content
    const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
      throw new Error("Не вдалося завантажити відео файл.");
    }

    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error: any) {
    console.error("Video Generation Error:", error);
    throw error;
  }
};