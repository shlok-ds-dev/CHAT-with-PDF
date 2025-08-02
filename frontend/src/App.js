import React, { useState, useEffect } from 'react';
import PDFViewer from './components/PDFViewer';
import Chatbot from './components/Chatbot';
import './App.css';

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [highlightedChunk, setHighlightedChunk] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const handleFileUpload = async (file) => {
    setPdfFile(file);
    setHighlightedChunk(null);
    setIsProcessing(true);
    // Upload PDF to backend
    const formData = new FormData();
    formData.append('file', file);
    try {
      await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData
      });
      setIsProcessing(false);
    } catch (err) {
      setIsProcessing(false);
      alert('Failed to upload PDF to backend.');
    }
  };

  // Listen for clearPdfHighlight event to clear highlight
  useEffect(() => {
    const clearHighlight = () => setHighlightedChunk(null);
    window.addEventListener('clearPdfHighlight', clearHighlight);
    return () => window.removeEventListener('clearPdfHighlight', clearHighlight);
  }, []);

  const handleReferenceClick = (chunkMeta) => {
    setHighlightedChunk(chunkMeta);
  };

  // Handler to clear highlight when clicking anywhere in the app except reference buttons
  const handleAppClick = (e) => {
    if (e.target.classList && e.target.classList.contains('reference-btn')) return;
    setHighlightedChunk(null);
  };

  return (
    <div className="App" onClick={handleAppClick}>
      <div className="left-panel">
        {!pdfFile ? (
          <div className="upload-container">
            <input
              type="file"
              accept="application/pdf"
              onChange={e => handleFileUpload(e.target.files[0])}
              disabled={isProcessing}
            />
            <p>Upload a PDF to get started</p>
          </div>
        ) : (
          <PDFViewer pdfFile={pdfFile} highlightedChunk={highlightedChunk} />
        )}
        {isProcessing && (
          <div className="processing-overlay">
            <div className="loader"></div>
            <p>Processing PDF... Please wait.</p>
          </div>
        )}
      </div>
      <div className="right-panel">
        <Chatbot
          pdfFile={pdfFile}
          onReferenceClick={handleReferenceClick}
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}

export default App;