
import { GoogleGenAI } from "@google/genai";

// Assume process.env.API_KEY is available in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// A simple type definition for a product
interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
}

export async function getSalesbotResponse(query: string, products: Product[]): Promise<string> {
  if (!query.trim()) {
    return "Por favor, haz una pregunta.";
  }

  const model = 'gemini-2.5-flash';

  const productContext = products.map(p => 
    `- ${p.name}: ${p.description} (Precio: ${p.price}€)`
  ).join('\n');

  const prompt = `
    Eres un asistente de ventas amigable y experto para una tienda de velas en línea llamada "Luz de Luna".
    Tu objetivo es ayudar a los clientes con sus preguntas sobre los productos. Sé servicial, conciso y responde siempre en español.
    Si una pregunta no está relacionada con los productos o la tienda, declina cortésmente la respuesta.

    Aquí está la lista de productos disponibles:
    ${productContext}

    Ahora, por favor responde la siguiente pregunta del cliente: "${query}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `Lo siento, estoy teniendo problemas para conectar con mi cerebro ahora mismo. Por favor, inténtalo de nuevo más tarde. Error: ${error.message}`;
    }
    return "Ocurrió un error desconocido. Por favor, inténtalo de nuevo más tarde.";
  }
}
