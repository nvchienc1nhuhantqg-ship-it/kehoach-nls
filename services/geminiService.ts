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
        throw new Error("API key is not configured. Please ensure the API_KEY environment variable is set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const lop = selectedClass === '3' ? 'Lớp 3 (8-9 tuổi)' : `Lớp ${selectedClass} (9-11 tuổi)`;
    const subjectName = subject === 'TinHoc' ? 'Tin học' : 'Công nghệ';

    const nlsDescriptions = nlsCodes.map(code => {
        return `- **${code}:** ${nlsDatabase[code] || 'Không có mô tả'}`;
    }).join('\n');

    const systemPrompt = `Bạn là một chuyên gia giáo dục và là giáo viên ${subjectName} tiểu học giàu kinh nghiệm tại Việt Nam. Bạn am hiểu sâu sắc chương trình giáo dục phổ thông 2018 và Công văn 3456 về Năng lực số (NLS). Nhiệm vụ của bạn là giúp giáo viên thiết kế các hoạt động dạy học sáng tạo.`;

    const userQuery = `Hãy gợi ý MỘT hoạt động dạy học sáng tạo (khoảng 15-20 phút) cho bài học: "${lessonTitle}" (dành cho ${lop}, môn ${subjectName}).

Hoạt động này phải tập trung phát triển các Năng lực số cụ thể sau:
${nlsDescriptions}

Yêu cầu:
- Trả lời bằng tiếng Việt.
- Định dạng Markdown đơn giản (gạch đầu dòng, in đậm).
- Tập trung vào các bước thực hiện cho học sinh.
- Không cần viết giáo án đầy đủ, chỉ cần mô tả hoạt động.
- Nếu cần, hãy tìm kiếm các ví dụ thực tế hoặc công cụ số mới nhất phù hợp với bài học.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // <--- ĐÃ SỬA THÀNH 1.5 (Ổn định nhất)
            contents: [{ role: "user", parts: [{ text: userQuery }] }],
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                topP: 0.95,
                // Vẫn giữ tính năng tìm kiếm Google
                tools: [{ googleSearch: {} }],
            }
        });

        const text = response.text;
        const sources = formatSources(response.candidates?.[0]?.groundingMetadata);

        if (text) {
            return text + sources;
        } else {
            throw new Error("Không nhận được nội dung từ Gemini. Phản hồi có thể trống hoặc bị chặn.");
        }
    } catch (error) {
        console.error("Lỗi khi gọi Gemini API:", error);
        throw new Error("Không thể kết nối với Gemini. Vui lòng kiểm tra lại cấu hình API và thử lại.");
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
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const lop = selectedClass === '3' ? 'Lớp 3 (8-9 tuổi)' : `Lớp ${selectedClass} (9-11 tuổi)`;
    const subjectName = subject === 'TinHoc' ? 'Tin học' : 'Công nghệ';

    const nlsDescriptions = nlsCodes.map(code => {
        return `- **${code}:** ${nlsDatabase[code] || 'Không có mô tả'}`;
    }).join('\n');

    const systemPrompt = `Bạn là một chuyên gia soạn thảo giáo án và là giáo viên ${subjectName} tiểu học xuất sắc tại Việt Nam, am hiểu sâu sắc chương trình giáo dục phổ thông 2018 và Công văn 3456 về Năng lực số (NLS).`;

    const userQuery = `Dựa trên các thông tin dưới đây, hãy soạn một Kế hoạch bài dạy (giáo án) chi tiết, sáng tạo và bám sát thực tế.

**Bối cảnh:**
* **Bài học:** "${lessonTitle}"
* **Môn học:** ${subjectName}
* **Lớp:** ${lop}
* **Các Năng lực số (NLS) cần phát triển:**
${nlsDescriptions}
* **Gợi ý hoạt động chính:**
${initialSuggestion}

**Yêu cầu cấu trúc giáo án:**
Soạn theo định dạng Markdown, bao gồm các mục sau:

**KẾ HOẠCH BÀI DẠY**
* **Môn học:** ${subjectName} - Lớp ${selectedClass}
* **Bài học:** ${lessonTitle}

**I. MỤC TIÊU BÀI HỌC:**
1.  **Kiến thức:** (Nêu rõ kiến thức cốt lõi học sinh cần nắm được sau bài học).
2.  **Năng lực:**
    * **Năng lực chung:** (Tự chủ và tự học, Giao tiếp và hợp tác, Giải quyết vấn đề và sáng tạo).
    * **Năng lực đặc thù (${subjectName}):** (Tích hợp và trích dẫn **TƯỜNG MINH** các mã NLS sau: ${nlsCodes.join(', ')} vào các biểu hiện cụ thể).
3.  **Phẩm chất:** (Chăm chỉ, trách nhiệm, trung thực).

**II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU:**
* **Giáo viên:** (Máy tính, máy chiếu, bài giảng điện tử, vật liệu thực hành...).
* **Học sinh:** (Sách giáo khoa, dụng cụ học tập, ...).

**III. TIẾN TRÌNH DẠY HỌC:**

| **Thời gian** | **Hoạt động của Giáo viên (GV)** | **Hoạt động của Học sinh (HS)** |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| 3-5 phút      | **1. Hoạt động Khởi động:** <br> (Nêu rõ cách thức tổ chức: trò chơi, câu hỏi, video ngắn...).                                                                  | (Nêu rõ hoạt động tương ứng của HS: trả lời, tham gia trò chơi...).                                                               |
| 15-20 phút    | **2. Hoạt động Hình thành kiến thức / Khám phá:** <br> (Phát triển chi tiết từ "Gợi ý hoạt động chính" đã cho. Nêu rõ các bước GV hướng dẫn, đặt câu hỏi, và làm mẫu. **Ghi chú rõ GV đang hỗ trợ HS phát triển NLS nào, ví dụ: [GV hỗ trợ HS phát triển 4.1.CB2a]**). | (Mô tả chi tiết các bước HS thực hiện: quan sát, lắng nghe, thực hành. **Ghi chú rõ HS đang vận dụng NLS nào, ví dụ: [HS vận dụng 4.1.CB2a]**). |
| 5-7 phút      | **3. Hoạt động Luyện tập:** <br> (Nêu rõ bài tập/nhiệm vụ GV giao để củng cố kiến thức và kỹ năng vừa học).                                                         | (Nêu rõ HS thực hành, làm bài tập...).                                                                                            |
| 3-5 phút      | **4. Hoạt động Vận dụng:** <br> (Nêu một tình huống/nhiệm vụ nhỏ để HS áp dụng kiến thức vào thực tế).                                                           | (HS suy nghĩ, trả lời, đề xuất giải pháp...).                                                                                            |

**IV. ĐIỀU CHỈNH SAU BÀI DẠY (NẾU CÓ):**
...

**Lưu ý quan trọng:** Phải tích hợp một cách tự nhiên và logic các mã NLS đã cho vào các hoạt động. Phần mô tả hoạt động của GV và HS phải thể hiện rõ sự hình thành năng lực đó.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // <--- ĐÃ SỬA THÀNH 1.5
            contents: [{ role: "user", parts: [{ text: userQuery }] }],
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.5,
                topP: 0.95,
                // ĐÃ XÓA thinkingConfig ĐỂ TRÁNH LỖI
            }
        });

        const text = response.text;

        if (text) {
            return text;
        } else {
            throw new Error("Không nhận được nội dung giáo án từ Gemini.");
        }
    } catch (error) {
        console.error("Lỗi khi gọi Gemini API để tạo giáo án:", error);
        throw new Error("Không thể tạo giáo án. Vui lòng thử lại.");
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
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const subjectName = subject === 'TinHoc' ? 'Tin học' : 'Công nghệ';

    const nlsDescriptions = nlsCodes.map(code => {
        return `- **${code}:** ${nlsDatabase[code] || 'Không có mô tả'}`;
    }).join('\n');

    const systemPrompt = `Bạn là một chuyên gia thiết kế giảng dạy bộ môn ${subjectName}, chuyên tích hợp các năng lực số (NLS) vào giáo án có sẵn cho giáo viên tiểu học Việt Nam. Vai trò của bạn là một người biên tập tinh tế, nâng cao chất lượng giáo án mà không làm thay đổi cấu trúc hay ý tưởng cốt lõi của giáo viên.`;

    const userQuery = `**Nhiệm vụ:**
Hãy chỉnh sửa và nâng cao Kế hoạch bài dạy (giáo án) do giáo viên cung cấp dưới đây. Bạn phải tích hợp một cách liền mạch các Năng lực số (NLS) đã cho vào giáo án.

**Thông tin bối cảnh:**
* **Bài học:** "${lessonTitle}"
* **Môn học:** ${subjectName}
* **Lớp:** ${selectedClass}
* **Các Năng lực số (NLS) cần tích hợp:**
${nlsDescriptions}

**Giáo án gốc của Giáo viên:**
\`\`\`markdown
${userLessonPlanContent}
\`\`\`

**Yêu cầu Chỉnh sửa:**
1.  **Không thay đổi cấu trúc:** Giữ nguyên các mục lớn (I, II, III, IV), các hoạt động, và trình tự thời gian mà giáo viên đã soạn.
2.  **Tích hợp vào Mục tiêu:**
    * Trong mục **"I. MỤC TIÊU BÀI HỌC"**, tìm đến phần **"Năng lực đặc thù (${subjectName})"** (hoặc thêm nếu chưa có).
    * Thêm các gạch đầu dòng mới hoặc bổ sung vào các gạch đầu dòng có sẵn để mô tả rõ biểu hiện của các NLS sau: ${nlsCodes.join(', ')}. Ví dụ: "- *Phát triển NL Tin học/Công nghệ (biểu hiện ${nlsCodes[0]}):* Học sinh [mô tả hành động cụ thể liên quan đến NLS]."
3.  **Tích hợp vào Tiến trình dạy học:**
    * Trong bảng **"III. TIẾN TRÌNH DẠY HỌC"**, ở các cột **"Hoạt động của Giáo viên (GV)"** và **"Hoạt động của Học sinh (HS)"**, hãy thêm các ghi chú ngắn gọn để chỉ ra thời điểm NLS được phát triển.
    * Sử dụng định dạng \`[GV hỗ trợ HS phát triển ${nlsCodes[0]}]\` hoặc \`[HS vận dụng ${nlsCodes[0]}]\` ở cuối các câu mô tả hoạt động có liên quan.
4.  **Bảo toàn nội dung gốc:** Chỉ thêm vào, không xóa hoặc viết lại các hoạt động gốc của giáo viên. Bạn đang bổ sung và làm rõ, không phải là soạn mới.
5.  **Ngôn ngữ:** Sử dụng tiếng Việt, văn phong sư phạm, phù hợp với giáo viên tiểu học.

**Kết quả trả về:** Chỉ trả về nội dung giáo án hoàn chỉnh đã được chỉnh sửa theo định dạng Markdown. Không thêm bất kỳ lời bình luận hay giải thích nào bên ngoài giáo án.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash', // <--- ĐÃ SỬA THÀNH 1.5
            contents: [{ role: "user", parts: [{ text: userQuery }] }],
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.3,
                topP: 0.95,
                // ĐÃ XÓA thinkingConfig ĐỂ TRÁNH LỖI
            }
        });
        
        const text = response.text;
        
        if (text) {
            return text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
        } else {
            throw new Error("Không nhận được nội dung giáo án đã chỉnh sửa từ Gemini.");
        }
    } catch (error) {
        console.error("Lỗi khi gọi Gemini API để tích hợp NLS:", error);
        throw new Error("Không thể tích hợp NLS vào giáo án. Vui lòng thử lại.");
    }
};
