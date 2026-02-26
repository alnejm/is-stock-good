import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getStockInfo(stockName: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `أعطني ملخصاً شديد الاختصار لسهم ${stockName} في البورصة المصرية في شكل نقاط (كل نقطة في سطر منفصل):
- السعر الحالي التقريبي.
- الاتجاه العام (صاعد/هابط/عرضي).
- أهم خبر أو نصيحة سريعة.
اجعل الإجابة مختصرة جداً وواضحة.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return "تعذر الحصول على معلومات السهم حالياً.";
  }
}

export async function editChartImage(base64Image: string, prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: 'image/png',
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Edit Error:", error);
    return null;
  }
}
