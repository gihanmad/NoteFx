import { saveAs } from "file-saver";

export const exportToMarkdown = (results: any[], fileName: string) => {
  let content = `# Lecture Notes: ${fileName}\n\n`;
  
  results.forEach((res, index) => {
    content += `## Lecture Part ${index + 1}\n\n`;
    content += `### Detailed Sinhala Note\n${res.data.translation}\n\n`;
    content += `### Quick English Review\n${res.data.quickSummary}\n\n`;
    content += `---\n\n`;
  });

  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, `${fileName.split(".")[0]}_notes.md`);
};

// Replaced DOCX with PDF functionality using Browser Print for high-fidelity export
export const exportToPDF = () => {
  // We trigger the browser's print dialog which is the most reliable way to 
  // capture the styled results with Markdown formatting as a PDF.
  // We specify CSS in globals.css to hide UI elements during print.
  window.print();
};
