import mammoth from 'mammoth';
// Removing incorrect imports from docx

/**
 * A utility for extracting text from various file types
 */

/**
 * Get a friendly file type description based on MIME type or extension
 * @param file The file to check
 * @returns A friendly description of the file type
 */
export const getFileTypeDescription = (file: File): string => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'PDF';
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    return 'Word Document (DOCX)';
  } else if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
    return 'Word Document (DOC)';
  } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return 'Text File';
  } else if (fileType === 'application/rtf' || fileName.endsWith('.rtf')) {
    return 'Rich Text Format';
  } else {
    return 'Unknown File Type';
  }
};

/**
 * Extract text from a PDF file using PDF.js via a script loaded dynamically
 * This approach uses the PDF.js viewer which is browser-compatible
 * @param file The PDF file to extract text from
 * @returns A promise that resolves to the extracted text
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    // Check if PDF.js script is already loaded
    if (!(window as any).pdfjsLib) {
      // Load PDF.js script dynamically
      await loadPdfJsScript();
    }
    
    const pdfjsLib = (window as any).pdfjsLib;
    
    // Create a URL for the PDF file
    const url = URL.createObjectURL(file);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    
    let extractedText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent({ normalizeWhitespace: true });

      // Process text content taking character positioning into account
      let lastY: number | undefined;
      let lastX: number | undefined;
      let pageText = '';

      for (const rawItem of textContent.items) {
        const item = rawItem as any;
        const text: string = item.str ?? '';
        if (!text) {
          continue;
        }

        const transform: number[] = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
        const x = transform[4];
        const y = transform[5];
        const itemWidth = typeof item.width === 'number' ? item.width : 0;
        const fontHeight = typeof item.height === 'number'
          ? item.height
          : Math.max(Math.abs(transform[3]), Math.abs(transform[2]));
        const avgCharWidth = text.trim().length > 0
          ? itemWidth / text.trim().length
          : 0;

        if (lastY !== undefined) {
          const lineThreshold = fontHeight ? fontHeight * 0.8 : 5;
          if (Math.abs(y - lastY) > Math.max(lineThreshold, 5)) {
            pageText = pageText.trimEnd();
            pageText += '\n';
            lastX = undefined;
          }
        }

        if (lastX !== undefined) {
          const gap = x - lastX;
          const spaceThreshold = Math.max(avgCharWidth * 0.6, fontHeight * 0.2, 1.5);
          if (gap > spaceThreshold && !pageText.endsWith(' ')) {
            pageText += ' ';
          }
        }

        pageText += text;

        if (item.hasEOL) {
          pageText = pageText.trimEnd();
          pageText += '\n';
          lastX = undefined;
        } else {
          const advanceWidth = itemWidth || (avgCharWidth ? avgCharWidth * text.length : 0);
          lastX = x + advanceWidth;
        }

        lastY = y;
      }

      extractedText += pageText.trimEnd() + '\n\n';
    }
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
    
    // Normalize whitespace and remove redundant line breaks
    extractedText = extractedText
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ line breaks with 2
      .trim();
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from the PDF file. Please make sure it is a valid PDF.');
  }
};

/**
 * Load the PDF.js script dynamically
 */
const loadPdfJsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.onload = () => {
      // Set the worker source after the library is loaded
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Extract text from a DOCX file
 * @param file The DOCX file to extract text from
 * @returns A promise that resolves to the extracted text
 */
export const extractTextFromDOCX = async (file: File): Promise<string> => {
  try {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from the DOCX file');
  }
};

/**
 * Extract text from a DOC file (old Word format)
 * Note: This is a simplistic approach. Full DOC parsing requires more complex libraries.
 * @param file The DOC file to extract text from
 * @returns A promise that resolves to the extracted text
 */
export const extractTextFromDOC = async (file: File): Promise<string> => {
  try {
    // Attempt to use mammoth, which has limited support for DOC files
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
  } catch (error) {
    console.error('Error extracting text from DOC:', error);
    throw new Error('Failed to extract text from the DOC file. Consider converting to DOCX format.');
  }
};

/**
 * Extract text from a TXT file
 * @param file The TXT file to extract text from
 * @returns A promise that resolves to the extracted text
 */
export const extractTextFromTXT = async (file: File): Promise<string> => {
  try {
    const text = await file.text();
    return text;
  } catch (error) {
    console.error('Error extracting text from TXT:', error);
    throw new Error('Failed to extract text from the text file');
  }
};

/**
 * Extract text from an RTF file
 * @param file The RTF file to extract text from
 * @returns A promise that resolves to the extracted text
 */
export const extractTextFromRTF = async (file: File): Promise<string> => {
  try {
    // Simple RTF parsing - strips RTF tags
    const text = await file.text();
    // Basic RTF tag removal (a more robust solution would use a dedicated RTF parser)
    const cleanedText = text.replace(/[\\](?:rtf1|ansi|ansicpg\d+|deff\d|deflang\d|deflangfe\d|pard|par|tab|b|i|ul|strike|sub|super|nosupersub|\b[a-z0-9]+)|\{|\}|\\|\b[a-z0-9]+;/gi, '');
    return cleanedText;
  } catch (error) {
    console.error('Error extracting text from RTF:', error);
    throw new Error('Failed to extract text from the RTF file');
  }
};

/**
 * Extract text from a file based on its MIME type
 * @param file The file to extract text from
 * @returns A promise that resolves to the extracted text
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  // Check file type
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    return extractTextFromDOCX(file);
  } else if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
    return extractTextFromDOC(file);
  } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return extractTextFromTXT(file);
  } else if (fileType === 'application/rtf' || fileName.endsWith('.rtf')) {
    return extractTextFromRTF(file);
  } else {
    // For unknown file types, try to read as text
    try {
      return await file.text();
    } catch (error) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }
}; 
