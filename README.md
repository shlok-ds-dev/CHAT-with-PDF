# CHATwithPDF

A powerful AI-powered PDF chatbot that allows you to upload PDF documents and have intelligent conversations with them using advanced language models and document processing.

##  Features

- **📄 PDF Upload & Processing**: Upload PDF documents and extract text content
- **🤖 AI-Powered Chat**: Interact with your PDF content using Azure OpenAI GPT-4
- **🔍 Smart Document Search**: Advanced semantic search using FAISS vector database
- **📝 Context-Aware Responses**: Get accurate answers based on your PDF content
- **🎯 Document Highlighting**: See exactly where answers come from in your documents
- **⚡ Real-time Chat**: Instant responses with streaming capabilities
- **🌐 Modern Web Interface**: Clean, responsive React-based UI

## 🛠️ Tech Stack

### Backend
- **Flask** - Python web framework
- **LangChain** - LLM orchestration framework
- **Docling** - Advanced PDF processing and chunking
- **FAISS** - Vector similarity search
- **Azure OpenAI** - GPT-4 language model
- **HuggingFace** - Sentence transformers for embeddings

### Frontend
- **React** - Modern JavaScript framework
- **React-PDF** - PDF viewing component
- **Axios** - HTTP client for API calls
- **CSS3** - Modern styling

##  Installation

### Prerequisites
- Python 3.8+
- Node.js 14+
- Azure OpenAI API key
- HuggingFace token

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/shlok-ds-dev/CHATwithPDF.git
   cd CHATwithPDF
   ```

2. **Set up Python virtual environment**
   ```bash
   cd backend
   python -m venv chatenv
   chatenv\Scripts\activate  # Windows
   # or
   source chatenv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   # or using uv (recommended)
   uv pip install -r requirements.txt
   ```

4. **Configure environment variables**
   Create a `.env` file in the `backend` directory:
   ```env
   AZURE_OPENAI_API_KEY=your_azure_openai_api_key
   AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
   HF_TOKEN=your_huggingface_token
   ```

### Frontend Setup

1. **Install Node.js dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server**
   ```bash
   npm start
   ```

##  Usage

1. **Start the backend server**
   ```bash
   cd backend
   python app.py
   ```
   The Flask server will run on `http://localhost:5000`

2. **Start the frontend**
   ```bash
   cd frontend
   npm start
   ```
   The React app will run on `http://localhost:3000`

3. **Upload and Chat**
   - Open your browser and go to `http://localhost:3000`
   - Upload a PDF document
   - Start chatting with your document!

##  Project Structure

```
CHATwithPDF/
├── backend/
│   ├── app.py              # Flask backend server
│   ├── requirements.txt    # Python dependencies
│   ├── uploads/           # PDF upload directory
│   └── chatenv/          # Python virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chatbot.js     # Chat interface component
│   │   │   └── PDFViewer.js   # PDF display component
│   │   ├── App.js             # Main React component
│   │   └── App.css            # Styles
│   ├── public/
│   │   └── index.html
│   └── package.json
├── README.md
└── .gitignore
```

## 🔧 API Endpoints

- `POST /upload` - Upload PDF document
- `POST /query` - Send chat message and get response

##  Deployment

### Backend Deployment
The Flask backend can be deployed to:
- **Heroku** - Easy deployment with Procfile
- **Azure App Service** - Native Azure integration
- **AWS Elastic Beanstalk** - Scalable cloud deployment
- **Docker** - Containerized deployment

### Frontend Deployment
The React frontend can be deployed to:
- **Netlify** - Static site hosting
- **Vercel** - React-optimized hosting
- **GitHub Pages** - Free static hosting
- **AWS S3** - Static website hosting

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Author

**Shlok Raval**
- GitHub: [@shlok-ds-dev](https://github.com/shlok-ds-dev)
- LinkedIn: [shlokraval](https://www.linkedin.com/in/shlokraval)
- Kaggle: [shlokraval](https://www.kaggle.com/shlokraval)

##  Acknowledgments

- LangChain team for the amazing LLM orchestration framework
- Azure OpenAI for providing the GPT-4 model
- HuggingFace for the sentence transformers
- React community for the excellent frontend framework

---

⭐ **Star this repository if you find it helpful!**
