declare module 'pdfjs-dist' {
  const pdfjsLib: {
    getDocument: (data: { data: Uint8Array }) => Promise<any>;
    version: string;
    GlobalWorkerOptions: {
      workerSrc: string;
    };
  };
  export = pdfjsLib;
}

declare module 'pdfjs-worker' {
  const worker: any;
  export default worker;
}

declare module 'pdfjs-dist/build/pdf.worker' {
  const worker: any;
  export = worker;
}

declare module 'pdfjs-dist/build/pdf.worker.entry' {
  const workerEntry: any;
  export default workerEntry;
} 