import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, AttendanceType } from "../types";

const initGemini = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSmartReport = async (records: AttendanceRecord[], workerName: string): Promise<string> => {
  const ai = initGemini();
  if (!ai) return "عذراً، خدمة الذكاء الاصطناعي غير متوفرة حالياً.";

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
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "لم يتم إنشاء تقرير.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ أثناء تحليل البيانات.";
  }
};