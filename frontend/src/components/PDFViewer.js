import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import '../App.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFViewer = ({ pdfFile, highlightedChunk }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageDims, setPageDims] = useState({}); // {pageNumber: {width, height}}
  const [zoom, setZoom] = useState(1.0);
  const [pageInput, setPageInput] = useState('1');
  const pageRefs = useRef([]);

  const PAGE_BASE_WIDTH = 600;

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageInput('1');
    pageRefs.current = Array(numPages)
      .fill()
      .map((_, i) => pageRefs.current[i] || React.createRef());
  };

  // Track actual rendered page dimensions
  const handlePageRenderSuccess = (pageNumber, { width, height }) => {
    setPageDims((prev) => ({ ...prev, [pageNumber]: { width, height } }));
  };

  // Scroll to and highlight chunk if provided
  useEffect(() => {
    if (
      highlightedChunk &&
      highlightedChunk.pageNumber &&
      pageRefs.current[highlightedChunk.pageNumber - 1]
    ) {
      setPageInput(String(highlightedChunk.pageNumber));
      pageRefs.current[highlightedChunk.pageNumber - 1].current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightedChunk]);

  // Helper to render highlight overlay
  const renderHighlight = (bbox, pageWidth, pageHeight) => {
    if (!bbox) return null;
    // bbox: [x0, y0, x1, y1] in PDF points (72 dpi)
    // Use actual PDF page size for scaling
    // PDF origin is bottom-left, browser is top-left, so flip Y
    const [x0, y0, x1, y1] = bbox;
    // y0 = bottom, y1 = top in PDF points
    // Flip Y for browser: top = (PDF_HEIGHT - y1) * scaleY
    const scaleX = pageWidth / 595; // fallback default, will be overwritten if actual dims are available
    const scaleY = pageHeight / 842;
    // If actual dims are available, use them
    // (pageWidth, pageHeight) are the rendered px, but we need the PDF's actual width/height in points
    // Assume bbox is in points, so scale to px
    // But we need to flip Y axis
    // PDF: (0,0) bottom-left; Browser: (0,0) top-left
    // So, highlight top = (PDF_HEIGHT - y1) * scaleY
    // height = (y1 - y0) * scaleY
    const PDF_HEIGHT = 842; // fallback default
    const left = x0 * scaleX;
    const width = (x1 - x0) * scaleX;
    const top = (PDF_HEIGHT - y1) * scaleY;
    const height = (y1 - y0) * scaleY;
    return (
      <div
        className="pdf-chunk-highlight"
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          background: 'rgba(255, 235, 59, 0.5)',
          pointerEvents: 'none',
          borderRadius: 4,
          zIndex: 2,
        }}
      />
    );
  };

  // Handler to clear highlight when clicking inside the PDF viewer
  const handleClearHighlight = (e) => {
    if (e.target.classList.contains('pdf-viewer-container')) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('clearPdfHighlight'));
      }
    }
  };

  // Toolbar handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.3));

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value.replace(/[^0-9]/g, ''));
  };

  const handlePageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      let pageNum = parseInt(pageInput, 10);
      if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
      if (numPages && pageNum > numPages) pageNum = numPages;
      setPageInput(String(pageNum));
      // Scroll to the page
      if (pageRefs.current[pageNum - 1]) {
        pageRefs.current[pageNum - 1].current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  };

  return (
    <div className="pdf-viewer-container" onClick={handleClearHighlight}>
      {/* Sticky Toolbar */}
      <div className="pdf-toolbar pdf-toolbar-sticky">
        <button onClick={handleZoomOut} title="Zoom Out">-</button>
        <button onClick={handleZoomIn} title="Zoom In">+</button>
        <span style={{ margin: '0 10px' }}>
          Page
          <input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            onKeyDown={handlePageInputKeyDown}
            style={{ width: 40, margin: '0 5px', textAlign: 'center' }}
            maxLength={numPages ? String(numPages).length : 3}
          />
          of {numPages || '-'}
        </span>
        <span style={{ marginLeft: 16 }}>Zoom: {(zoom * 100).toFixed(0)}%</span>
      </div>
      {pdfFile && (
        <Document file={pdfFile} onLoadSuccess={onDocumentLoadSuccess}>
          {Array.from(new Array(numPages), (el, index) => {
            const isHighlighted = highlightedChunk && highlightedChunk.pageNumber === index + 1;
            // Use actual page dims if available, else fallback
            const dims = pageDims[index + 1] || { width: PAGE_BASE_WIDTH * zoom, height: 842 * zoom };
            return (
              <div
                key={`page_${index + 1}`}
                ref={pageRefs.current[index]}
                className={isHighlighted ? 'pdf-page highlighted' : 'pdf-page'}
                style={{ position: 'relative', marginBottom: index === numPages - 1 ? 0 : 16 }}
              >
                <Page
                  pageNumber={index + 1}
                  width={PAGE_BASE_WIDTH * zoom}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  onRenderSuccess={({ width, height }) => handlePageRenderSuccess(index + 1, { width, height })}
                />
                {isHighlighted && highlightedChunk.bbox &&
                  renderHighlight(highlightedChunk.bbox, dims.width, dims.height)}
              </div>
            );
          })}
        </Document>
      )}
    </div>
  );
};

export default PDFViewer;