import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export interface KindlePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
}

export const KINDLE_PRESETS: KindlePreset[] = [
  { id: 'paperwhite-11', name: 'Paperwhite (11th Gen)', width: 1236, height: 1648, description: '6.8" Screen (300 ppi)' },
  { id: 'oasis', name: 'Kindle Oasis', width: 1264, height: 1680, description: '7.0" Screen (300 ppi)' },
  { id: 'scribe', name: 'Kindle Scribe', width: 1860, height: 2480, description: '10.2" Notebook (300 ppi)' },
  { id: 'basic', name: 'Kindle Basic / Kids', width: 1072, height: 1448, description: '6.0" Display (300 ppi)' },
];

export interface ConversionOptions {
  preset: KindlePreset;
  rightToLeft: boolean;
  quality: number;
  overlapPx: number;
}

export interface ProgressCallback {
  (status: { stage: string; current: number; total: number; progress: number }): void;
}

async function fileToCanvasElements(file: File): Promise<HTMLCanvasElement[]> {
  const canvases: HTMLCanvasElement[] = [];

  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      canvases.push(canvas);
    }
  } else if (file.type.startsWith('image/')) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((res) => {
      img.onload = res;
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvases.push(canvas);
  }

  return canvases;
}

function sliceVerticalStrip(canvas: HTMLCanvasElement, targetWidth: number, targetHeight: number, overlapPx: number): HTMLCanvasElement[] {
  const targetRatio = targetHeight / targetWidth;
  const sliceHeight = Math.round(canvas.width * targetRatio);

  if (canvas.height <= sliceHeight * 1.25) {
    return [canvas];
  }

  const slices: HTMLCanvasElement[] = [];
  let y = 0;

  while (y < canvas.height) {
    const currentSliceHeight = Math.min(sliceHeight, canvas.height - y);

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = currentSliceHeight;
    const ctx = sliceCanvas.getContext('2d')!;

    ctx.drawImage(canvas, 0, y, canvas.width, currentSliceHeight, 0, 0, canvas.width, currentSliceHeight);
    slices.push(sliceCanvas);

    if (y + currentSliceHeight >= canvas.height) break;
    y += sliceHeight - overlapPx;
  }

  return slices;
}

function splitSpread(canvas: HTMLCanvasElement, rightToLeft: boolean): HTMLCanvasElement[] {
  if (canvas.width <= canvas.height || canvas.width / canvas.height < 1.25) {
    return [canvas];
  }

  const halfWidth = Math.floor(canvas.width / 2);

  const createHalf = (sx: number) => {
    const c = document.createElement('canvas');
    c.width = halfWidth;
    c.height = canvas.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(canvas, sx, 0, halfWidth, canvas.height, 0, 0, halfWidth, canvas.height);
    return c;
  };

  const left = createHalf(0);
  const right = createHalf(halfWidth);

  return rightToLeft ? [right, left] : [left, right];
}

function fitToKindleCanvas(canvas: HTMLCanvasElement, targetWidth: number, targetHeight: number): HTMLCanvasElement {
  const output = document.createElement('canvas');
  output.width = targetWidth;
  output.height = targetHeight;
  const ctx = output.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const scale = Math.min(targetWidth / canvas.width, targetHeight / canvas.height);
  const drawWidth = Math.round(canvas.width * scale);
  const drawHeight = Math.round(canvas.height * scale);

  const offsetX = Math.round((targetWidth - drawWidth) / 2);
  const offsetY = Math.round((targetHeight - drawHeight) / 2);

  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, offsetX, offsetY, drawWidth, drawHeight);

  return output;
}

export async function convertFileToKindlePdf(
  file: File,
  options: ConversionOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const sourceCanvases = await fileToCanvasElements(file);
  const pdfDoc = await PDFDocument.create();

  let totalPagesProcessed = 0;

  for (let i = 0; i < sourceCanvases.length; i++) {
    const rawCanvas = sourceCanvases[i];
    const spreads = splitSpread(rawCanvas, options.rightToLeft);

    for (const spread of spreads) {
      const slices = sliceVerticalStrip(spread, options.preset.width, options.preset.height, options.overlapPx);

      for (const slice of slices) {
        const fittedCanvas = fitToKindleCanvas(slice, options.preset.width, options.preset.height);

        const dataUrl = fittedCanvas.toDataURL('image/jpeg', options.quality);
        const jpegBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());

        const embeddedImage = await pdfDoc.embedJpg(jpegBytes);
        const page = pdfDoc.addPage([432, 576]);
        page.drawImage(embeddedImage, { x: 0, y: 0, width: 432, height: 576 });
      }
    }

    totalPagesProcessed++;
    onProgress?.(totalPagesProcessed, sourceCanvases.length);
  }

  return pdfDoc.save({ useObjectStreams: true });
}

export async function convertZipBundle(
  zipFile: File,
  options: ConversionOptions,
  onProgress: ProgressCallback
): Promise<Blob> {
  const zip = new JSZip();
  const unzipped = await zip.loadAsync(zipFile);
  const outputZip = new JSZip();

  const pdfEntries = Object.keys(unzipped.files).filter(
    (key) => key.toLowerCase().endsWith('.pdf') && !key.includes('__MACOSX')
  );

  if (pdfEntries.length === 0) {
    throw new Error('No PDF files found in the uploaded ZIP archive.');
  }

  for (let idx = 0; idx < pdfEntries.length; idx++) {
    const filename = pdfEntries[idx];
    onProgress({
      stage: `Converting ${filename}`,
      current: idx + 1,
      total: pdfEntries.length,
      progress: Math.round((idx / pdfEntries.length) * 100),
    });

    const fileData = await unzipped.files[filename].async('blob');
    const pdfFile = new File([fileData], filename, { type: 'application/pdf' });

    const convertedPdfBytes = await convertFileToKindlePdf(pdfFile, options);
    const outputFilename = filename.replace(/\.pdf$/i, '_Kindle.pdf');

    outputZip.file(outputFilename, convertedPdfBytes);
  }

  onProgress({
    stage: 'Finalizing ZIP Archive...',
    current: pdfEntries.length,
    total: pdfEntries.length,
    progress: 100,
  });

  return outputZip.generateAsync({ type: 'blob' });
}