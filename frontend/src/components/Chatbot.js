import React, { useState } from 'react';
import axios from 'axios';

const Chatbot = ({ pdfFile, onReferenceClick, disabled }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);

  // Send query to backend
  const handleQuery = async () => {
    if (!query.trim() || disabled) return;
    setMessages([...messages, { type: 'user', text: query }]);
    setQuery('');
    try {
      const response = await axios.post('http://localhost:5000/query', { query });
      // Expecting response.data.messages[0].content and response.data.messages[0].references
      const botMsg = response.data.messages[response.data.messages.length - 1];
      setMessages(prev => [
        ...prev,
        {
          type: 'bot',
          text: botMsg.content,
          references: botMsg.references || []
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { type: 'bot', text: 'Error: Could not get response from server.' }
      ]);
    }
  };

  // Optionally, handle PDF upload to backend here if needed
  // (Currently handled in App.js and PDFViewer)

  // Render references as clickable chips/buttons
  const renderReferences = (references) => {
    if (!references || references.length === 0) return null;
    return (
      <div className="references">
        {references.map((ref, idx) => (
          <button
            key={idx}
            className="reference-btn"
            onClick={() => {
              console.log('Reference clicked:', ref);
              onReferenceClick(ref);
            }}
          >
            Reference {idx + 1}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="chatbot-container">
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            <div>{msg.text}</div>
            {msg.type === 'bot' && renderReferences(msg.references)}
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={disabled ? "Processing PDF..." : "Type your question..."}
          disabled={disabled}
        />
        <button onClick={handleQuery} disabled={!query.trim() || disabled}>Send</button>
      </div>
    </div>
  );
};

export default Chatbot;