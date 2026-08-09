"""ChromaDB-backed RAG store: chunking, embeddings, retrieval."""

import base64
import io
import time
from typing import Dict, List

import chromadb
from chromadb.utils import embedding_functions
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import (
    CHROMA_COLLECTION,
    CHROMA_DIR,
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    EMBEDDING_MODEL,
    TOP_K,
)

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n## ", "\n# ", "\n\n", "\n", " ", ""],
)

_client = chromadb.PersistentClient(path=CHROMA_DIR)
_embedder = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL)


def _collection():
    return _client.get_or_create_collection(
        name=CHROMA_COLLECTION,
        embedding_function=_embedder,
        metadata={"hnsw:space": "cosine"},
    )


def decode_document(name: str, content: str) -> str:
    """Turns an uploaded payload into plain text (PDFs arrive base64 encoded)."""
    if content.startswith("data:application/pdf;base64,"):
        raw = base64.b64decode(content.split(",", 1)[1])
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(raw))
            return "\n\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception as exc:  # pragma: no cover - depends on file
            return f"[Could not extract text from {name}: {exc}]"
    return content


def ingest(documents: List[Dict[str, str]]) -> Dict[str, int]:
    """Chunks, embeds and upserts documents into ChromaDB."""
    col = _collection()
    total_chunks = 0
    ts = str(int(time.time()))
    for doc in documents:
        name = doc["name"]
        text = decode_document(name, doc["content"])
        if not text.strip():
            continue
        col.delete(where={"document": name})
        chunks = _splitter.split_text(text)
        if not chunks:
            continue
        col.add(
            ids=[f"{name}::{i}" for i in range(len(chunks))],
            documents=chunks,
            metadatas=[
                {
                    "document": name,
                    "chunk_index": i,
                    "characters": len(text),
                    "ingested_at": ts,
                }
                for i in range(len(chunks))
            ],
        )
        total_chunks += len(chunks)
    return {"indexed": len(documents), "chunks": total_chunks}


def list_documents() -> List[Dict[str, object]]:
    col = _collection()
    data = col.get(include=["metadatas"])
    stats: Dict[str, Dict[str, object]] = {}
    for meta in data.get("metadatas", []) or []:
        name = str(meta.get("document", "unknown"))
        entry = stats.setdefault(
            name,
            {
                "name": name,
                "chunks": 0,
                "characters": int(meta.get("characters", 0) or 0),
                "ingested_at": meta.get("ingested_at"),
            },
        )
        entry["chunks"] = int(entry["chunks"]) + 1
    return sorted(stats.values(), key=lambda d: str(d["name"]))


def clear() -> None:
    try:
        _client.delete_collection(CHROMA_COLLECTION)
    except Exception:
        pass
    _collection()


def retrieve(query: str, k: int = TOP_K) -> List[Dict[str, object]]:
    col = _collection()
    if col.count() == 0:
        return []
    res = col.query(query_texts=[query], n_results=min(k, col.count()))
    out: List[Dict[str, object]] = []
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    for text, meta, dist in zip(docs, metas, dists):
        out.append(
            {
                "document": str((meta or {}).get("document", "unknown")),
                "chunk": text,
                "score": round(max(0.0, 1.0 - float(dist)), 4),
            }
        )
    return out
