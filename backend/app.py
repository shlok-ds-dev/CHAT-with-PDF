from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pathlib import Path
from tempfile import mkdtemp
from langchain_core.prompts import PromptTemplate
from langchain_docling.loader import ExportType
from langchain_docling import DoclingLoader
from docling.chunking import HybridChunker
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_community.chat_models import ChatOpenAI

app = Flask(__name__)
CORS(app)

# Load env variables
load_dotenv()
os.environ["TOKENIZERS_PARALLELISM"] = "false"
HF_TOKEN = os.getenv("HF_TOKEN")


# PDF Processing and Chunking
from werkzeug.utils import secure_filename
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
EMBED_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
EXPORT_TYPE = ExportType.DOC_CHUNKS
TOP_K = 5

PROMPT = PromptTemplate.from_template(
    "Context information is below.\n---------------------\n{context}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: {input}\nAnswer:\n",
)

def process_pdf(file_path):
    loader = DoclingLoader(
        file_path=[file_path],
        export_type=EXPORT_TYPE,
        chunker=HybridChunker(tokenizer=EMBED_MODEL_ID),
    )
    docs = loader.load()
    splits = docs if EXPORT_TYPE == ExportType.DOC_CHUNKS else None
    # print("Sample chunk metadata:")
    # print(splits[0].metadata if splits else "No splits found")
    embedding = HuggingFaceEmbeddings(model_name=EMBED_MODEL_ID)
    vectorstore = FAISS.from_documents(
        splits,
        embedding,
    )
    return vectorstore, splits

# Store current vectorstore and splits in memory (per session, for demo)
current_vectorstore = None
current_splits = None

import os

os.environ["AZURE_OPENAI_API_KEY"] = os.getenv('AZURE_OPENAI_API_KEY')
os.environ["AZURE_OPENAI_ENDPOINT"] = os.getenv('AZURE_OPENAI_ENDPOINT')

from langchain_openai import AzureChatOpenAI


# Store current vectorstore and splits in memory (per session, for demo)
current_vectorstore = None
current_splits = None

llm = AzureChatOpenAI(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    azure_deployment="gpt-4.1-mini",
    openai_api_version="2024-10-21",
)

# Tool for retrieval
@tool(response_format="content_and_artifact")
def retrieve(query: str):
    """Retrieve information related to a query."""
    global current_vectorstore
    if current_vectorstore is None:
        raise Exception("No PDF uploaded yet.")
    retrieved_docs = current_vectorstore.similarity_search(query, k=TOP_K)
    serialized = "\n".join(
        (f"Source: {doc.metadata}\nContent: {doc.page_content}") for doc in retrieved_docs
    )
    # Add metadata for frontend highlighting
    # Extract only the required metadata for frontend highlighting
    references = []
    for doc in retrieved_docs:
        # Handle Docling's nested metadata structure
        dl_meta = doc.metadata.get('dl_meta', {})
        doc_items = dl_meta.get('doc_items', [])
        if doc_items and 'prov' in doc_items[0] and doc_items[0]['prov']:
            prov = doc_items[0]['prov'][0]
            bbox_dict = prov.get('bbox', {})
            # Convert bbox dict to [x0, y0, x1, y1] (l, t, r, b)
            bbox = [
                bbox_dict.get('l', 0),
                bbox_dict.get('b', 0),  # bottom (PDF origin is bottom-left)
                bbox_dict.get('r', 0),
                bbox_dict.get('t', 0)   # top
            ]
            references.append({
                'pageNumber': prov.get('page_no'),
                'bbox': bbox,
                'text': doc.page_content
            })
        else:
            references.append({
                'pageNumber': None,
                'bbox': None,
                'text': doc.page_content
            })
    return {"content": serialized, "references": references}

# LangGraph Nodes
def query_or_respond(state: MessagesState):
    llm_with_tools = llm.bind_tools([retrieve])
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

tools = ToolNode([retrieve])

def generate(state: MessagesState):
    recent_tool_messages = [m for m in reversed(state["messages"]) if m.type == "tool"]
    tool_messages = recent_tool_messages[::-1]
    docs_content = "\n".join(doc.content for doc in tool_messages)

    system_message_content = (
        "You are an expert financial analyst."
        "Use the following data retrieved from a financial statement to answer the question."
        "Tables have been converted into triplet notation i.e. <row_name>, <col_name> = <cell_value>."
        "If you don't know the answer, say that you don't know.\n"
        f"{docs_content}"
    )

    conversation_messages = [
        m for m in state["messages"]
        if m.type in ("human", "system") or (m.type == "ai" and not m.tool_calls)
    ]
    prompt = [SystemMessage(system_message_content)] + conversation_messages
    response = llm.invoke(prompt)
    return {"messages": [response]}

# Graph Construction
graph_builder = StateGraph(MessagesState)
graph_builder.add_node(query_or_respond)
graph_builder.add_node(tools)
graph_builder.add_node(generate)

graph_builder.set_entry_point("query_or_respond")
graph_builder.add_conditional_edges(
    "query_or_respond", tools_condition, {END: END, "tools": "tools"}
)
graph_builder.add_edge("tools", "generate")
graph_builder.add_edge("generate", END)

# Graph Compilation with Memory
graph = graph_builder.compile(checkpointer=MemorySaver())

# Endpoint to upload PDF
@app.route('/upload', methods=['POST'])
def upload_pdf():
    global current_vectorstore, current_splits
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    current_vectorstore, current_splits = process_pdf(file_path)
    return jsonify({'success': True})



# --- Chat functionality with history and history size limit ---
from collections import defaultdict, deque

# Store chat history in memory (per session/thread)
CHAT_HISTORY_LIMIT = 10  # Number of previous exchanges to keep
chat_histories = defaultdict(lambda: deque(maxlen=CHAT_HISTORY_LIMIT))

@app.route('/query', methods=['POST'])
def query():
    data = request.json
    query_text = data.get('query')
    thread_id = data.get('thread_id', 'default')  # Use a thread_id from frontend, or 'default'
    if current_vectorstore is None:
        return jsonify({"messages": [{"content": "No PDF uploaded yet.", "references": []}]}), 400

    # Retrieve context for the current query
    retrieved_docs = current_vectorstore.similarity_search(query_text, k=TOP_K)
    context = "\n".join(doc.page_content for doc in retrieved_docs)
    references = []
    for doc in retrieved_docs:
        dl_meta = doc.metadata.get('dl_meta', {})
        doc_items = dl_meta.get('doc_items', [])
        if doc_items and 'prov' in doc_items[0] and doc_items[0]['prov']:
            prov = doc_items[0]['prov'][0]
            bbox_dict = prov.get('bbox', {})
            bbox = [
                bbox_dict.get('l', 0),
                bbox_dict.get('b', 0),
                bbox_dict.get('r', 0),
                bbox_dict.get('t', 0)
            ]
            references.append({
                'pageNumber': prov.get('page_no'),
                'bbox': bbox,
                'text': doc.page_content
            })
        else:
            references.append({
                'pageNumber': None,
                'bbox': None,
                'text': doc.page_content
            })

    # Update chat history (store user query and model response)
    history = chat_histories[thread_id]
    # Prepare messages for LLM: system prompt, then history, then current user message
    system_message = SystemMessage("You are an expert financial analyst. Use the following data retrieved from a financial statement to answer the question. Tables have been converted into triplet notation i.e. <row_name>, <col_name> = <cell_value>. If you don't know the answer, say that you don't know.\n" + context)
    # Build message list: system, then history, then current user
    messages = [system_message]
    for user, bot in history:
        messages.append({"role": "user", "content": user})
        messages.append({"role": "assistant", "content": bot})
    messages.append({"role": "user", "content": query_text})

    # Call LLM
    answer = llm.invoke(messages)
    # Add to history
    history.append((query_text, getattr(answer, 'content', str(answer))))

    # Debug: print the raw answer
    print("[DEBUG] LLM answer:")
    print(answer)
    return jsonify({"messages": [{"content": getattr(answer, 'content', str(answer)), "references": references}]})

# --- Old LangGraph-based code (commented out for reference) ---
# @app.route('/query', methods=['POST'])
# def query():
#     data = request.json
#     query_text = data.get('query')
#     config = {"configurable": {"thread_id": "1234"}}
#     response = graph.invoke({"messages": [{"content": query_text, "type": "human"}]}, config)
#
#     # Debug: print the raw response from the model/graph
#     print("[DEBUG] Raw response from graph.invoke:")
#     print(response)
#
#     messages = response.get("messages", [])
#     result = []
#     for msg in messages:
#         # Get content
#         content = getattr(msg, "content", None)
#         if content is None and hasattr(msg, "text"):
#             content = msg.text
#         if content is None and isinstance(msg, dict):
#             content = msg.get("content")
#         # Get references
#         references = getattr(msg, "references", None)
#         if references is None and isinstance(msg, dict):
#             references = msg.get("references")
#         # Only include references if present
#         result.append({
#             "content": content,
#             "references": references if references is not None else []
#         })
#     return jsonify({"messages": result})

if __name__ == '__main__':
    app.run(debug=True)