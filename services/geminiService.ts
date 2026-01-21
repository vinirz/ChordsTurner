
import { GoogleGenAI, Type } from "@google/genai";
import { Song } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getChordsForSong = async (title: string, artist: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Forneça a cifra completa da música "${title}" do artista "${artist}".`,
    config: {
      systemInstruction: "Você é um assistente especializado em música. Retorne APENAS o texto da cifra com os acordes alinhados sobre as letras usando espaços. Não inclua introduções ou comentários, apenas a cifra completa formatada para leitura em tela.",
    },
  });

  return response.text || "Erro ao carregar cifra.";
};
