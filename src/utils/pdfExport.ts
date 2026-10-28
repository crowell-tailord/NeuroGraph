import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { MindMapNode } from '../types/mindmap';

interface ExportPdfOptions {
  title: string;
  elementId: string;
  nodes: MindMapNode[];
}

interface CanvasCaptureResult {
  canvas: HTMLCanvasElement;
  cropWidth: number;
  cropHeight: number;
}

/**
 * Normalizes and captures the mindmap canvas element using html2canvas.
 * Solves:
 * 1. Missing SVG lines caused by negative node/curve coordinates outside the default SVG viewport.
 * 2. Text descender and edge cropping caused by tight element bounds, overflow: hidden, and unrendered web fonts.
 * 3. Misalignment or clipping when the canvas is zoomed or panned by decoupling the export capture from the live viewport transform.
 */
async function captureMindMapCanvas({
  elementId,
  nodes,
}: {
  elementId: string;
  nodes: MindMapNode[];
}): Promise<CanvasCaptureResult | null> {
  const container = document.getElementById(elementId);
  if (!container || nodes.length === 0) {
    return null;
  }

  // Ensure all web fonts (Geist Mono, JetBrains Mono, etc.) are fully loaded before capturing
  if (document.fonts) {
    await document.fonts.ready;
  }

  // Calculate precise bounding box across all nodes
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((n) => {
    const w = n.width || (n.shape === 'circle' ? 140 : 200);
    const h = n.height || (n.shape === 'circle' ? 140 : 70);
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x + w);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + h);
  });

  // Generous padding around the nodes so glow effects and curves are never sliced
  const padding = 70;
  const cropX = minX - padding;
  const cropY = minY - padding;
  const cropWidth = Math.ceil(maxX - minX + padding * 2);
  const cropHeight = Math.ceil(maxY - minY + padding * 2);

  const canvas = await html2canvas(container, {
    backgroundColor: '#08090c',
    scale: Math.max(window.devicePixelRatio || 1, 2), // 2x or device Retina resolution for crisp rendering
    useCORS: true,
    logging: false,
    x: 0,
    y: 0,
    width: cropWidth,
    height: cropHeight,
    windowWidth: cropWidth,
    windowHeight: cropHeight,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc, clonedElement) => {
      // 1. Prevent any parent or document element in the cloned iframe from clipping
      clonedDoc.documentElement.style.overflow = 'visible';
      clonedDoc.documentElement.style.width = `${cropWidth}px`;
      clonedDoc.documentElement.style.height = `${cropHeight}px`;

      clonedDoc.body.style.overflow = 'visible';
      clonedDoc.body.style.width = `${cropWidth}px`;
      clonedDoc.body.style.height = `${cropHeight}px`;

      const clonedContainer = clonedElement || clonedDoc.getElementById(elementId);
      if (!clonedContainer) return;

      if (clonedContainer.parentElement) {
        clonedContainer.parentElement.style.overflow = 'visible';
        clonedContainer.parentElement.style.width = `${cropWidth}px`;
        clonedContainer.parentElement.style.height = `${cropHeight}px`;
      }

      // 2. Reset live viewport pan and zoom on cloned container to isolate 100% true scale
      clonedContainer.style.transform = 'none';
      clonedContainer.style.transformOrigin = '0 0';
      clonedContainer.style.position = 'relative';
      clonedContainer.style.left = '0px';
      clonedContainer.style.top = '0px';
      clonedContainer.style.width = `${cropWidth}px`;
      clonedContainer.style.height = `${cropHeight}px`;
      clonedContainer.style.overflow = 'visible';

      // 3. Shift each node position so (cropX, cropY) maps perfectly to (0, 0)
      nodes.forEach((node) => {
        const nodeEl = clonedDoc.getElementById(`mindmap-node-${node.id}`);
        if (nodeEl) {
          const shiftedX = node.x - cropX;
          const shiftedY = node.y - cropY;
          nodeEl.style.transform = `translate3d(${shiftedX}px, ${shiftedY}px, 0)`;
        }
      });

      // 4. Update SVG Connectors layer: Set dimensions and viewBox so no paths are in negative space
      const svgEl =
        clonedContainer.querySelector('#mindmap-svg-connectors') ||
        clonedContainer.querySelector('svg');

      if (svgEl) {
        const htmlSvg = svgEl as SVGElement;
        htmlSvg.style.position = 'absolute';
        htmlSvg.style.left = '0px';
        htmlSvg.style.top = '0px';
        htmlSvg.style.width = `${cropWidth}px`;
        htmlSvg.style.height = `${cropHeight}px`;
        htmlSvg.style.overflow = 'visible';
        htmlSvg.setAttribute('width', `${cropWidth}px`);
        htmlSvg.setAttribute('height', `${cropHeight}px`);
        htmlSvg.setAttribute('viewBox', `${cropX} ${cropY} ${cropWidth} ${cropHeight}`);
      }

      // 5. Hide all interactive buttons, grips, indicators, and hover widgets
      clonedDoc
        .querySelectorAll(
          'button, [role="button"], [data-resize-handle="true"], [data-interactive="true"]'
        )
        .forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });

      // 6. Fix text descender clipping: ensure all text containers have visible overflow and room for descenders
      clonedDoc
        .querySelectorAll(
          '.prose-invert, .prose-xs, [class*="prose"], #mindmap-canvas-container p, #mindmap-canvas-container div'
        )
        .forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.overflow = 'visible';
          if (htmlEl.tagName === 'P') {
            htmlEl.style.lineHeight = '1.65';
            htmlEl.style.paddingBottom = '3px';
            htmlEl.style.marginBottom = '0px';
          }
        });
    },
  });

  return { canvas, cropWidth, cropHeight };
}

export async function exportToPDF({ title, elementId, nodes }: ExportPdfOptions): Promise<void> {
  const capture = await captureMindMapCanvas({ elementId, nodes });
  if (!capture) {
    alert('Canvas has no nodes to export.');
    return;
  }

  const { canvas, cropWidth, cropHeight } = capture;
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
  const capture = await captureMindMapCanvas({ elementId, nodes });
  if (!capture) return;

  const { canvas } = capture;
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`;
  a.click();
}
