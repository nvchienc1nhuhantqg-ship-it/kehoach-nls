import React, { useState } from 'react';
import ModalWrapper from './ModalWrapper';
import SpinnerIcon from '../icons/SpinnerIcon';

// Make TypeScript aware of the global mammoth object from the CDN
declare const mammoth: any;

interface GeminiSuggestModalProps {
    isLoading: boolean;
    suggestion: string | null;
    error: string | null;
    lessonTitle: string;
    nlsString: string;
    onClose: () => void;
    onGeneratePlan: () => void;
    isGeneratingPlan: boolean;
    generatedPlan: string | null;
    planError: string | null;
    onIntegratePlan: (planContent: string) => void;
    isIntegrating: boolean;
    integratedPlan: string | null;
    integrationError: string | null;
}

// A simple function to convert markdown-like syntax to HTML
const simpleMarkdownToHtml = (text: string): { __html: string } => {
    if (!text) return { __html: '' };
    let processedText = text;

    // First, escape HTML to prevent weirdness
    processedText = processedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Handle tables
    const tableRegex = /(\|.*\|(?:\r?\n|\r)?)+/g;
    processedText = processedText.replace(tableRegex, (match) => {
        const rows = match.trim().split(/\r?\n|\r/);
        if (rows.length < 2) return match; // Not a valid table

        const headerRow = rows[0];
        const separatorRow = rows[1];
        if (!separatorRow.match(/\|[:-\s]+\|/)) return match; // No separator, not a table

        let tableHtml = '<table class="prose-table"><thead><tr>';
        const headers = headerRow.split('|').slice(1, -1);
        tableHtml += headers.map(h => `<th>${h.trim()}</th>`).join('');
        tableHtml += '</tr></thead><tbody>';

        const bodyRows = rows.slice(2);
        bodyRows.forEach(rowStr => {
            const cells = rowStr.split('|').slice(1, -1);
            tableHtml += '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
        });

        tableHtml += '</tbody></table>';
        return tableHtml;
    });
    
    // Handle headings
    processedText = processedText.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    processedText = processedText.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    processedText = processedText.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold, Italic, Code
    processedText = processedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');

    // Lists (more robustly)
    processedText = processedText.replace(/^\s*[-*]\s+(.*)/gm, '<li>$1</li>');
    processedText = processedText.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g, '');

    // Replace newlines with <br>, but not inside lists or after block elements
    processedText = processedText.replace(/\n/g, '<br />');
    processedText = processedText.replace(/<\/li><br \/>/g, '</li>');
    processedText = processedText.replace(/<br \/><ul>/g, '<ul>');
    processedText = processedText.replace(/<\/ul><br \/>/g, '</ul>');
    processedText = processedText.replace(/(<\/[h1|h2|h3|table]>)\s*<br \/>/g, '$1');


    return { __html: processedText };
};


const GeminiSuggestModal: React.FC<GeminiSuggestModalProps> = ({
    isLoading,
    suggestion,
    error,
    lessonTitle,
    nlsString,
    onClose,
    onGeneratePlan,
    isGeneratingPlan,
    generatedPlan,
    planError,
    onIntegratePlan,
    isIntegrating,
    integratedPlan,
    integrationError,
}) => {
    const [pastedText, setPastedText] = useState('');
    const [fileName, setFileName] = useState('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const activeContent = pastedText || fileContent;

    const footer = <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold transition">Đóng</button>;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setPastedText(''); // Clear pasted text when a file is selected
            setFileError(null);
            setFileContent(null);
            setFileName(file.name);
            
            const fileType = file.name.split('.').pop()?.toLowerCase();
            const reader = new FileReader();

            if (fileType === 'txt' || fileType === 'md') {
                reader.onload = (e) => setFileContent(e.target?.result as string);
                reader.onerror = () => setFileError('Không thể đọc file. Vui lòng thử lại.');
                reader.readAsText(file);
            } else if (fileType === 'doc' || fileType === 'docx') {
                if(typeof mammoth === 'undefined') {
                    setFileError('Thư viện đọc file .docx chưa sẵn sàng. Vui lòng thử lại sau giây lát.');
                    return;
                }
                reader.onload = (e) => {
                    const arrayBuffer = e.target?.result;
                    if (arrayBuffer) {
                        mammoth.extractRawText({ arrayBuffer })
                            .then((result: { value: string; }) => {
                                setFileContent(result.value);
                            })
                            .catch((err: any) => {
                                console.error('Error reading docx file:', err);
                                setFileError('Không thể trích xuất nội dung từ file .docx này.');
                            });
                    }
                };
                reader.onerror = () => setFileError('Không thể đọc file. Vui lòng thử lại.');
                reader.readAsArrayBuffer(file);
            } else {
                setFileError('Định dạng file không hợp lệ. Vui lòng chọn .txt, .md, .doc, hoặc .docx.');
                setFileName('');
            }
        }
    }

    const handlePastedTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPastedText(event.target.value);
         if (event.target.value) {
            // Clear file input if user starts typing
            setFileContent(null);
            setFileName('');
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        }
    }

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            alert('Đã sao chép vào clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Sao chép thất bại.');
        });
    };

    const handleDownload = (content: string) => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GiaoAn_${lessonTitle.replace(/[\s/\\?%*:|"<>]/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const renderMainContent = () => {
        if (isGeneratingPlan || isIntegrating) {
             return (
                <div className="text-center p-10 flex flex-col items-center justify-center">
                    <SpinnerIcon className="w-12 h-12 text-orange-600" />
                    <p className="mt-4 font-semibold text-gray-600">
                        {isIntegrating ? 'AI đang tích hợp NLS vào giáo án của bạn...' : 'AI đang soạn giáo án chi tiết...'}
                        <br />Vui lòng chờ.
                    </p>
                </div>
            );
        }

        const finalPlan = generatedPlan || integratedPlan;
        if (finalPlan) {
            return (
                <div>
                    <h4 className="text-xl font-bold text-gray-800 mb-2">
                        {generatedPlan ? 'Kế hoạch bài dạy chi tiết (AI tạo mới)' : 'Giáo án của bạn (đã được AI tích hợp NLS)'}
                    </h4>
                    <div className="flex gap-2 mb-4">
                        <button onClick={() => handleCopy(finalPlan)} className="btn-table-attach">Sao chép</button>
                        <button onClick={() => handleDownload(finalPlan)} className="btn-table-gemini">Tải về (.md)</button>
                    </div>
                    <div className="prose prose-sm max-w-none border p-4 rounded-md bg-white h-96 overflow-y-auto" dangerouslySetInnerHTML={simpleMarkdownToHtml(finalPlan)} />
                </div>
            )
        }
        
        const finalError = planError || integrationError;
        if(finalError) {
             return (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg my-4">
                    <p className="font-bold">Lỗi khi xử lý giáo án</p>
                    <p>{finalError}</p>
                </div>
            )
        }

        if (suggestion) {
            return (
                <div>
                    <div>
                        <h4 className="text-xl font-bold text-gray-800 mb-2">Gợi ý hoạt động ban đầu</h4>
                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={simpleMarkdownToHtml(suggestion)} />
                        <div className="mt-6 text-center">
                            <button onClick={onGeneratePlan} className="btn-autobuild px-6 py-3 text-base">
                                🚀 Soạn Giáo án đầy đủ với AI
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t-2 border-dashed">
                        <h4 className="text-xl font-bold text-gray-800 mb-4 text-center">Hoặc Tích hợp vào Giáo án có sẵn của bạn</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                             {/* Paste Area */}
                            <div className="flex flex-col">
                                <label htmlFor="paste-area" className="block text-sm font-medium text-gray-700 mb-2">
                                    1. Dán nội dung giáo án vào đây:
                                </label>
                                <textarea
                                    id="paste-area"
                                    rows={8}
                                    value={pastedText}
                                    onChange={handlePastedTextChange}
                                    className="p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                                    placeholder="Dán nội dung từ Word, Google Docs..."
                                />
                            </div>
                            
                            {/* Upload Area */}
                            <div className="flex flex-col">
                                 <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                                    2. Hoặc tải lên file giáo án:
                                </label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500">
                                                <span>Tải lên một file</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".txt,.md,.doc,.docx" onChange={handleFileChange} />
                                            </label>
                                            <p className="pl-1">hoặc kéo và thả</p>
                                        </div>
                                        <p className="text-xs text-gray-500">.txt, .md, .doc, .docx</p>
                                    </div>
                                </div>
                                {fileName && <p className="text-green-700 text-sm mt-2 font-semibold">Đã chọn file: {fileName}</p>}
                                {fileError && <p className="text-red-600 text-sm mt-2">{fileError}</p>}
                            </div>
                        </div>

                        {activeContent && (
                            <div className="mt-6 text-center">
                                    <button onClick={() => onIntegratePlan(activeContent)} disabled={!activeContent || isIntegrating} className="btn-secondary px-6 py-3 text-base">
                                    ✨ Tích hợp NLS vào Giáo án của tôi
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        
        return null;
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-10 flex flex-col items-center justify-center">
                    <SpinnerIcon className="w-12 h-12 text-orange-600" />
                    <p className="mt-4 font-semibold text-gray-600">Đang tạo gợi ý hoạt động...<br />Thầy/Cô vui lòng chờ trong giây lát.</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg">
                    <p className="font-bold">Đã xảy ra lỗi</p>
                    <p>{error}</p>
                </div>
            );
        }
        
        return renderMainContent();
    };

    return (
        <ModalWrapper
            title="✨ Gợi ý Hoạt động & Soạn Giáo án (AI)"
            onClose={onClose}
            footer={footer}
            headerColorClass="bg-orange-700 border-b-4 border-orange-900"
            maxWidthClass="max-w-4xl"
        >
            <div className="p-6 overflow-y-auto bg-gray-50">
                <div className="bg-white p-4 rounded-lg border mb-4">
                    <p className="text-sm font-semibold text-gray-700">Đang xử lý cho bài học:</p>
                    <h3 className="text-lg font-bold text-orange-800">{lessonTitle}</h3>
                    <p className="text-sm font-semibold text-gray-700 mt-2">Với các năng lực số:</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 whitespace-pre-wrap font-sans">{nlsString}</pre>
                </div>
                <div className="mt-4">
                    {renderContent()}
                </div>
            </div>
            <style>{`
                .prose table, .prose-table { width: 100%; border-collapse: collapse; margin-top: 1em; margin-bottom: 1em;}
                .prose td, .prose th, .prose-table td, .prose-table th { border: 1px solid #ccc; padding: 8px; text-align: left; }
                .prose th, .prose-table th { font-weight: bold; background-color: #f7fafc; }
                .prose ul { list-style-type: disc; margin-left: 20px; margin-top: 0.5em; margin-bottom: 0.5em; }
                .prose li { margin-bottom: 0.25em; }
                .prose code { background-color: #edf2f7; color: #b72802; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
                .prose h1, .prose h2, .prose h3 { font-weight: bold; margin-top: 1.2em; margin-bottom: 0.6em; }
                .btn-autobuild { background-color: #d84315; color: white; border-color: #d84315; font-weight: 600; transition: all 0.2s ease; border-radius: 0.5rem; }
                .btn-autobuild:hover { background-color: #a02f0c; border-color: #a02f0c; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
                .btn-autobuild:disabled { background-color: #fca5a5; cursor: not-allowed; }
                .btn-secondary { background-color: #1e88e5; color: white; border-color: #1e88e5; font-weight: 600; transition: all 0.2s ease; border-radius: 0.5rem; }
                .btn-secondary:hover { background-color: #1565c0; border-color: #1565c0; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
                .btn-secondary:disabled { background-color: #93c5fd; cursor: not-allowed; }
                .btn-table-attach, .btn-table-gemini {
                    font-size: 0.8rem; font-weight: 600; padding: 4px 8px; border-radius: 6px;
                    border: 1px solid; cursor: pointer; transition: all 0.2s ease;
                }
                .btn-table-attach { border-color: #00796b; background-color: #e0f2f1; color: #00796b; }
                .btn-table-attach:hover { background-color: #00796b; color: white; }
                .btn-table-gemini { border-color: #d84315; background-color: #fbe9e7; color: #d84315; }
                .btn-table-gemini:hover { background-color: #d84315; color: white; }
            `}</style>
        </ModalWrapper>
    );
};

export default GeminiSuggestModal;