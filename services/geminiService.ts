
import { GoogleGenAI } from "@google/genai";
import { GameStats } from "../types";

// Initialize with process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTacticalAdvice = async (stats: GameStats): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `System: You are 'Vanguard Control', a sarcastic but supportive tactical AI in a retro space shooter. 
      The player's current stats:
      Score: ${stats.score}
      Level: ${stats.level}
      Lives Left: ${stats.lives}
      Accuracy: ${Math.round((stats.hits / (stats.shotsFired || 1)) * 100)}%
      
      Provide a brief (max 20 words) tactical update or taunt for the next wave. Be punchy and retro-styled.`,
      config: {
        temperature: 0.9,
      },
    });

    // The 'text' property is a getter, not a method.
    return response.text || "STAY VIGILANT, PILOT. THE SWARM APPROACHES.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "GOOD LUCK, STARFIGHTER.";
  }
};
