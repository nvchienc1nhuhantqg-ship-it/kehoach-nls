import { GoogleGenAI } from '@google/genai';
import { NlsDatabase } from '../types';

// Helper to format grounding metadata from Google Search
const formatSources = (groundingMetadata: any): string => {
    if (!groundingMetadata?.groundingChunks) return '';
    const uniqueSources = new Map();
    groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
            if (!uniqueSources.has(chunk.web.uri)) {
                uniqueSources.set(chunk.web.uri, chunk.web.title);
            }
        }
    });
    if (uniqueSources.size === 0) return '';
    const sourceList = Array.from(uniqueSources.entries()).map(([uri, title]) => {
        return `- [${title}](${uri})`;
    });
    return '\n\n---\n**🌐 Nguồn tham khảo từ Google:**\n' + sourceList.join('\n');
};

export const getGeminiSuggestion = async (
    lessonTitle: string,
    nlsCodes: string[],
    nlsDatabase: NlsDatabase,
    selectedClass: string,
    subject: string = 'TinHoc'
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const lop = selectedClass === '3' ? 'Lớp 3 (8-9 tuổi)' : `Lớp ${selectedClass} (9-11 tuổi)`;
    const subjectName = subject === 'TinHoc' ? 'Tin học' : 'Công nghệ';
    const nlsDescriptions = nlsCodes.map(code => `- **${code}:** ${nlsDatabase[code] || 'Không có mô tả'}`).join('\n');

    const systemPrompt = `Bạn là giáo viên ${subjectName} tiểu học. Nhiệm vụ: Gợi ý hoạt động dạy học.`;
    const userQuery = `Gợi ý hoạt động dạy học bài: "${lessonTitle}" (${lop}, ${subjectName}). Phát triển NLS: ${nlsDescriptions}. Trả lời tiếng Việt, Markdown.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // <--- QUAN TRỌNG: ĐÃ SỬA THÀNH 1.5
            contents: [{ role: "user", parts: [{ text: userQuery }] }],
            config: { temperature: 0.7, tools: [{ googleSearch: {} }] }
        });
        return (response.text || "") + formatSources(response.candidates?.[0]?.groundingMetadata);
    } catch (error) {
        console.error(error);
        throw new Error("Lỗi kết nối Gemini.");
    }
};

export const getGeminiLessonPlan = async (
    lessonTitle: string,
    nlsCodes: string[],
    nlsDatabase: NlsDatabase,
    selectedClass: string,
    initialSuggestion: string,
    subject: string = 'TinHoc'
): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API key is not configured.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const subjectName = subject === 'TinHoc' ? 'Tin học' : 'Công nghệ';
    const nlsDescriptions = nlsCodes.map(code => `- **${code}:** ${nlsDatabase[code] || ''}`).join('\n');
    
    const userQuery = `Soạn giáo án chi tiết cho bài: "${lessonTitle}" lớp ${selectedClass}, môn ${subjectName}. Tích hợp NLS: ${nlsDescriptions}. Dựa trên ý tưởng: ${initialSuggestion}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // <--- QUAN TRỌNG: ĐÃ SỬA THÀNH 1.5
            contents: [{ role: "user", parts: [{ text: userQuery }] }]
        });
        return response.text || "Không có nội dung.";
    } catch (error) {
        console.error(error);
        throw new Error("Lỗi tạo giáo án.");
    }
};

export const integrateNlsIntoLessonPlan = async (
    lessonTitle: string,
    nlsCodes: string[],
    nlsDatabase: NlsDatabase,
    selectedClass: string,
    userLessonPlanContent: string,
    subject: string = 'TinHoc'
): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API key is not configured.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const nlsDescriptions = nlsCodes.map(code => `- **${code}:** ${nlsDatabase[code] || ''}`).join('\n');
    
    const userQuery = `Tích hợp NLS (${nlsDescriptions}) vào giáo án sau đây cho bài "${lessonTitle}": \n\`\`\`markdown\n${userLessonPlanContent}\n\`\`\``;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // <--- QUAN TRỌNG: ĐÃ SỬA THÀNH 1.5
            contents: [{ role: "user", parts: [{ text: userQuery }] }]
        });
        return (response.text || "").replace(/^```markdown\n/, '').replace(/\n```$/, '');
    } catch (error) {
        console.error(error);
        throw new Error("Lỗi tích hợp NLS.");
    }
};
