export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

/**
 * Extracts text page-by-page from a PDF File.
 * Uses window.pdfjsLib loaded from CDN.
 */
export const extractTextFromPdf = async (file: File): Promise<ExtractedPage[]> => {
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("PDF.js library is not yet loaded on window. Please reload the application.");
  }

  // Assign matching CDN worker script
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const maxPages = pdf.numPages;
  const extractedPages: ExtractedPage[] = [];

  let totalCharCount = 0;

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Assemble text from text items on the page
    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    totalCharCount += pageText.length;
    
    extractedPages.push({
      pageNumber: i,
      text: pageText
    });
  }

  // If character count is too low, it's likely a scanned image PDF
  if (totalCharCount < 100) {
    throw new Error("This PDF appears to contain only scanned image pages or lacks selectable text. Please paste the OCR text content directly.");
  }

  return extractedPages;
};
