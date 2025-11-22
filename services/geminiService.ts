
import { GoogleGenAI } from '@google/genai';
import { NlsDatabase } from '../types';

// Helper: Định dạng nguồn tham khảo từ Google Search
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

// Hàm 1: Gợi ý hoạt động
export const getGeminiSuggestion = async (
    lessonTitle: string,
    nlsCodes: string[],
    nlsDatabase: NlsDatabase,
    selectedClass: string,
    subject: string = 'TinHoc'
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const lop = selectedClass === '3' ? 'Lớp 3 (8-9 tuổi)' : `Lớp ${selectedClass} (9-11 tuổi)`;
    const subjectName = subject === 'TinHoc' ? 'Tin học' : 'Công nghệ';
    const nlsDescriptions = nlsCodes.map(code => `- **${code}:** ${nlsDatabase[code] || ''}`).join('\n');

    const systemPrompt = `Bạn là giáo viên ${subjectName} tiểu học. Nhiệm vụ: Gợi ý hoạt động dạy học sáng tạo phát triển Năng lực số.`;
    const userQuery = `Gợi ý hoạt động cho bài: "${lessonTitle}" (${lop}, ${subjectName}).
    Phát triển NLS:
    ${nlsDescriptions}
    Yêu cầu: Trả lời tiếng Việt, Markdown, ngắn gọn.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: "user", parts: [{ text: userQuery }] }],
            config: {
                temperature: 0.7,
                tools: [{ googleSearch: {} }] // Vẫn giữ tìm kiếm Google
            }
        });
        return (response.text || "") + formatSources(response.candidates?.[0]?.groundingMetadata);
    } catch (error) {
        console.error("Lỗi Gemini:", error);
        throw new Error("Lỗi kết nối AI. Vui lòng thử lại sau.");
    }
};

// Hàm 2: Soạn giáo án
export const getGeminiLessonPlan = async (
    lessonTitle: string,
    nlsCodes: string[],
    nlsDatabase: NlsDatabase,
    selectedClass: string,
    initialSuggestion: string,
    subject: string = 'TinHoc'
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const subjectName = subject === 'TinHoc' ? 'Tin học' : 'Công nghệ';
    const nlsDescriptions = nlsCodes.map(code => `- **${code}:** ${nlsDatabase[code] || ''}`).join('\n');
    
    const userQuery = `Hãy soạn giáo án chi tiết cho bài học: "${lessonTitle}" (Lớp ${selectedClass}, môn ${subjectName}).
    
    MỤC TIÊU CỐT LÕI: Tích hợp và phát triển các Năng lực số (NLS) sau:
    ${nlsDescriptions}
    
    Dựa trên ý tưởng hoạt động: ${initialSuggestion}

    YÊU CẦU CẤU TRÚC VÀ TRÌNH BÀY (BẮT BUỘC):
    
    1. **I. Yêu cầu cần đạt (Mục tiêu):**
       - Phẩm chất chủ yếu, Năng lực chung.
       - **Năng lực đặc thù (Tin học/Công nghệ):** Nêu rõ mục tiêu kiến thức kĩ năng.
       - **Mục tiêu Năng lực số (NLS):** Liệt kê rõ ràng các mã NLS (ví dụ: 1.1.CB1a) vào phần này, giải thích học sinh sẽ làm gì để đạt được.
    
    2. **II. Đồ dùng dạy học**
    
    3. **III. Các hoạt động dạy học chủ yếu:**
       - Chia thành các hoạt động cụ thể (Khởi động, Khám phá, Luyện tập, Vận dụng).
       - Trong mỗi hoạt động, phải tách biệt rõ hai phần: **"Hoạt động của Giáo viên"** và **"Hoạt động của Học sinh"**.
       - **QUAN TRỌNG:** Bạn phải chỉ rõ NLS được hình thành ở hành động cụ thể nào. Hãy gắn tag **[Mã NLS]** ngay cuối câu mô tả hành động của Giáo viên hoặc Học sinh.
       
       *Ví dụ minh họa cách viết:*
       > **Hoạt động 2: Tìm kiếm thông tin**
       > * **Hoạt động của Giáo viên:**
       >   - Yêu cầu học sinh mở trình duyệt web và truy cập Google.com. [1.1.CB2c]
       >   - Hướng dẫn học sinh sử dụng từ khóa chính xác để tìm ảnh hoa hướng dương. [1.1.CB2a]
       > * **Hoạt động của Học sinh:**
       >   - Học sinh mở trình duyệt Chrome trên máy tính. [1.1.CB2c]
       >   - Nhập từ khóa "hoa hướng dương" và nhấn Enter, sau đó chọn thẻ Hình ảnh. [1.1.CB2b]
    
    4. **IV. Điều chỉnh sau bài dạy**
    
    Hãy trình bày giáo án dưới dạng Markdown chuyên nghiệp, rõ ràng.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: "user", parts: [{ text: userQuery }] }],
            config: {
                thinkingConfig: { thinkingBudget: 2048 },
                maxOutputTokens: 8192
            }
        });
        return response.text || "Không có nội dung.";
    } catch (error) {
        console.error(error);
        throw new Error("Lỗi tạo giáo án.");
    }
};

// Hàm 3: Tích hợp NLS
export const integrateNlsIntoLessonPlan = async (
    lessonTitle: string,
    nlsCodes: string[],
    nlsDatabase: NlsDatabase,
    selectedClass: string,
    userLessonPlanContent: string,
    subject: string = 'TinHoc'
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const nlsDescriptions = nlsCodes.map(code => `- **${code}:** ${nlsDatabase[code] || ''}`).join('\n');
    
    const userQuery = `Bạn là một chuyên gia giáo dục tiểu học. Nhiệm vụ của bạn là chỉnh sửa giáo án dưới đây để tích hợp sâu các Năng lực số (NLS).

    Thông tin bài học: "${lessonTitle}", Lớp ${selectedClass}, Môn ${subject === 'TinHoc' ? 'Tin học' : 'Công nghệ'}.
    
    Các NLS CẦN TÍCH HỢP VÀO BÀI:
    ${nlsDescriptions}

    NỘI DUNG GIÁO ÁN GỐC CỦA GIÁO VIÊN:
    \`\`\`markdown
    ${userLessonPlanContent}
    \`\`\`

    YÊU CẦU ĐẦU RA (BẮT BUỘC TUÂN THỦ):
    1. **Mục tiêu (Yêu cầu cần đạt):** Bổ sung mục riêng cho "Năng lực số", liệt kê các mã NLS (ví dụ 1.1.CB1a) mà bài học này hướng tới.
    2. **Tiến trình dạy học (Các hoạt động):** 
       - Giữ nguyên cấu trúc các hoạt động của giáo án gốc.
       - Rà soát từng hoạt động. Nếu cần thiết, hãy viết lại hoặc bổ sung hành động để đảm bảo NLS được phát triển.
       - Tại các mục **"Hoạt động của Giáo viên"** và **"Hoạt động của Học sinh"**, hãy gắn thẻ **[Mã NLS]** vào cuối các câu mô tả hành động tương ứng để chỉ rõ NLS đó được rèn luyện ở đâu.
       
       *Ví dụ:*
       - *GV: Yêu cầu học sinh thảo luận nhóm và tìm thông tin trên mạng. [2.4.CB2a]*
       - *HS: Sử dụng máy tính bảng để truy cập trang web được giao. [1.1.CB2c]*

    Hãy trả về toàn bộ giáo án đã được chỉnh sửa và tích hợp NLS dưới dạng Markdown.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: "user", parts: [{ text: userQuery }] }],
            config: {
                thinkingConfig: { thinkingBudget: 2048 },
                maxOutputTokens: 8192
            }
        });
        return (response.text || "").replace(/^```markdown\n/, '').replace(/\n```$/, '');
    } catch (error) {
        console.error(error);
        throw new Error("Lỗi tích hợp NLS.");
    }
};

// Hàm 4: Tạo công cụ đánh giá (Rubric / Quiz)
export const getGeminiAssessment = async (
    type: 'rubric' | 'quiz',
    lessonTitle: string,
    nlsCodes: string[],
    nlsDatabase: NlsDatabase,
    selectedClass: string,
    subject: string = 'TinHoc'
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const subjectName = subject === 'TinHoc' ? 'Tin học' : 'Công nghệ';
    const nlsDescriptions = nlsCodes.map(code => `- **${code}:** ${nlsDatabase[code] || ''}`).join('\n');
    
    let prompt = '';

    if (type === 'rubric') {
        prompt = `Tạo phiếu đánh giá (Rubric) cho học sinh Tiểu học trong bài: "${lessonTitle}" lớp ${selectedClass}, môn ${subjectName}.
        
        Mục tiêu đánh giá tập trung vào các Năng lực số (NLS) sau:
        ${nlsDescriptions}

        Yêu cầu:
        - Tạo bảng Rubric với 3 hoặc 4 mức độ (Ví dụ: Cần cố gắng, Đạt, Tốt).
        - Tiêu chí đánh giá phải cụ thể, dễ quan sát, phù hợp lứa tuổi tiểu học.
        - Trình bày dưới dạng Markdown Table.
        - Ngôn ngữ thân thiện, khích lệ học sinh.`;
    } else {
        prompt = `Tạo bộ câu hỏi trắc nghiệm (5 câu) cho bài học: "${lessonTitle}" lớp ${selectedClass}, môn ${subjectName}.
        
        Mục tiêu kiểm tra kiến thức bài học và các kỹ năng NLS sau:
        ${nlsDescriptions}

        Yêu cầu:
        - 5 câu hỏi trắc nghiệm (4 lựa chọn A, B, C, D).
        - Cuối cùng cung cấp Đáp án đúng và Giải thích ngắn gọn.
        - Câu hỏi phù hợp với trình độ học sinh tiểu học.
        - Trình bày Markdown rõ ràng.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        return response.text || "Không có nội dung đánh giá.";
    } catch (error) {
        console.error("Lỗi Gemini Assessment:", error);
        throw new Error("Lỗi khi tạo công cụ đánh giá. Vui lòng thử lại.");
    }
};
