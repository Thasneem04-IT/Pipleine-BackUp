"""Configuration for the PipelineMind AI backend."""

import os

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

# Groq public pricing (USD per 1M tokens) for the default model.
PRICE_PROMPT_PER_1M = float(os.environ.get("GROQ_PRICE_PROMPT", "0.59"))
PRICE_COMPLETION_PER_1M = float(os.environ.get("GROQ_PRICE_COMPLETION", "0.79"))

CHROMA_DIR = os.environ.get("CHROMA_DIR", "./.chroma")
CHROMA_COLLECTION = os.environ.get("CHROMA_COLLECTION", "pipelinemind_knowledge")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", "900"))
CHUNK_OVERLAP = int(os.environ.get("CHUNK_OVERLAP", "150"))
TOP_K = int(os.environ.get("TOP_K", "6"))

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
