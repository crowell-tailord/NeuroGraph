import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { MindMapNode } from '../types/mindmap';

interface ExportPdfOptions {
  title: string;
  elementId: string;
  nodes: MindMapNode[];
}

export async function exportToPDF({ title, elementId, nodes }: ExportPdfOptions): Promise<void> {
  const container = document.getElementById(elementId);
  if (!container || nodes.length === 0) {
    alert('Canvas has no nodes to export.');
    return;
  }

  // Calculate precise bounding box of all nodes
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((n) => {
    const w = n.width || 230;
    const h = n.height || 90;
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x + w);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + h);
  });

  const padding = 60;
  const cropX = minX - padding;
  const cropY = minY - padding;
  const cropWidth = maxX - minX + padding * 2;
  const cropHeight = maxY - minY + padding * 2;

  // Capture canvas element using html2canvas
  const canvas = await html2canvas(container, {
    backgroundColor: '#08090c',
    scale: 2, // 2x high resolution
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  });

  const imgData = canvas.toDataURL('image/png');
  const isLandscape = cropWidth >= cropHeight;

  // Initialize jsPDF
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Top header banner in PDF
  pdf.setFillColor(12, 14, 20);
  pdf.rect(0, 0, pdfWidth, 45, 'F');

  pdf.setFont('courier', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(244, 63, 94); // tactical rose
  pdf.text(`NEUROGRAPH // ${title.toUpperCase()}`, 25, 24);

  pdf.setFont('courier', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(148, 163, 184);
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  pdf.text(`NODES: ${nodes.length}  |  GENERATED: ${dateStr}`, 25, 38);

  // Calculate scaled image dimensions to fit within PDF page margins
  const contentWidth = pdfWidth - 40;
  const contentHeight = pdfHeight - 65;

  const widthRatio = contentWidth / cropWidth;
  const heightRatio = contentHeight / cropHeight;
  const scale = Math.min(widthRatio, heightRatio, 1);

  const finalWidth = cropWidth * scale;
  const finalHeight = cropHeight * scale;
  const posX = (pdfWidth - finalWidth) / 2;
  const posY = 52 + (contentHeight - finalHeight) / 2;

  pdf.addImage(imgData, 'PNG', posX, posY, finalWidth, finalHeight);

  // Save the PDF file
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_neurograph.pdf`;
  pdf.save(filename);
}

export async function exportToPNG({ title, elementId, nodes }: ExportPdfOptions): Promise<void> {
  const container = document.getElementById(elementId);
  if (!container || nodes.length === 0) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((n) => {
    const w = n.width || 230;
    const h = n.height || 90;
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x + w);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + h);
  });

  const padding = 50;
  const cropX = minX - padding;
  const cropY = minY - padding;
  const cropWidth = maxX - minX + padding * 2;
  const cropHeight = maxY - minY + padding * 2;

  const canvas = await html2canvas(container, {
    backgroundColor: '#08090c',
    scale: 2,
    useCORS: true,
    logging: false,
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  });

  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`;
  a.click();
}
