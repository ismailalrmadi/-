
import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, AttendanceType } from "../types";

// Fixed: Optimized Gemini initialization and updated model to recommended gemini-3-flash-preview
export const generateSmartReport = async (records: AttendanceRecord[], workerName: string): Promise<string> => {
  // Always initialize right before use with the provided API key as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Simplify records for the prompt to save tokens
  const simplifiedRecords = records.slice(0, 30).map(r => ({
    date: new Date(r.timestamp).toLocaleString('ar-EG'),
    type: r.type === AttendanceType.CHECK_IN ? 'حضور' : 'انصراف',
    verified: r.locationVerified ? 'نعم' : 'لا (خارج الموقع)'
  }));

  const prompt = `
    أنت مدير موارد بشرية خبير. قم بتحليل بيانات الحضور والانصراف التالية للعامل "${workerName}".
    
    البيانات:
    ${JSON.stringify(simplifiedRecords, null, 2)}

    المطلوب:
    اكتب تقريرًا موجزًا واحترافيًا باللغة العربية يلخص:
    1. مدى التزام العامل بالمواعيد.
    2. أي ملاحظات حول التواجد خارج الموقع الجغرافي المحدد.
    3. رسالة تشجيعية أو تحذيرية مهذبة بناءً على الأداء.
    
    اجعل التقرير قصيراً ومباشراً (أقل من 150 كلمة).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Recommended for basic text tasks
      contents: prompt,
    });
    
    // Access .text property directly
    return response.text || "لم يتم إنشاء تقرير.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ أثناء تحليل البيانات.";
  }
};
