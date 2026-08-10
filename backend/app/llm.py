# """Groq LLM client with JSON-mode helpers and token accounting."""

# import json
# import re
# from typing import Any, Dict, List, Tuple

# from langchain_groq import ChatGroq

# from .config import (
#     GROQ_API_KEY,
#     GROQ_MODEL,
#     PRICE_COMPLETION_PER_1M,
#     PRICE_PROMPT_PER_1M,
# )


# class TokenMeter:
#     """Accumulates token usage across every agent call in one investigation."""

#     def __init__(self) -> None:
#         self.prompt = 0
#         self.completion = 0

#     def add(self, prompt: int, completion: int) -> None:
#         self.prompt += prompt
#         self.completion += completion

#     @property
#     def total(self) -> int:
#         return self.prompt + self.completion

#     @property
#     def cost_usd(self) -> float:
#         return (
#             self.prompt / 1_000_000 * PRICE_PROMPT_PER_1M
#             + self.completion / 1_000_000 * PRICE_COMPLETION_PER_1M
#         )


# def get_llm(temperature: float = 0.1) -> ChatGroq:
#     if not GROQ_API_KEY:
#         raise RuntimeError("GROQ_API_KEY is not set on the backend.")
#     return ChatGroq(
#         api_key=GROQ_API_KEY,
#         model=GROQ_MODEL,
#         temperature=temperature,
#         max_tokens=2048,
#     )


# def _extract_json(text: str) -> Dict[str, Any]:
#     text = text.strip()
#     fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
#     if fence:
#         text = fence.group(1).strip()
#     start, end = text.find("{"), text.rfind("}")
#     if start != -1 and end != -1:
#         text = text[start : end + 1]
#     return json.loads(text)


# def call_json(
#     system: str,
#     user: str,
#     meter: TokenMeter,
#     temperature: float = 0.1,
# ) -> Tuple[Dict[str, Any], str]:
#     """Calls Groq and parses a JSON object response. Returns (data, raw_text)."""
#     llm = get_llm(temperature)
#     messages: List[Any] = [
#         ("system", system + "\n\nRespond with a single valid JSON object and nothing else."),
#         ("human", user),
#     ]
#     response = llm.invoke(messages)
#     usage = (response.response_metadata or {}).get("token_usage", {}) or {}
#     meter.add(int(usage.get("prompt_tokens", 0)), int(usage.get("completion_tokens", 0)))
#     raw = response.content if isinstance(response.content, str) else str(response.content)
#     try:
#         return _extract_json(raw), raw
#     except Exception:
#         return {}, raw


"""OpenAI LLM client with JSON-mode helpers and token accounting."""

import json
import re
from typing import Any, Dict, List, Tuple

from langchain_openai import ChatOpenAI

from .config import (
    OPENAI_API_KEY,
    OPENAI_MODEL,
    PRICE_COMPLETION_PER_1M,
    PRICE_PROMPT_PER_1M,
)


class TokenMeter:
    """Accumulates token usage across every agent call in one investigation."""

    def __init__(self) -> None:
        self.prompt = 0
        self.completion = 0

    def add(self, prompt: int, completion: int) -> None:
        self.prompt += prompt
        self.completion += completion

    @property
    def total(self) -> int:
        return self.prompt + self.completion

    @property
    def cost_usd(self) -> float:
        return (
            self.prompt / 1_000_000 * PRICE_PROMPT_PER_1M
            + self.completion / 1_000_000 * PRICE_COMPLETION_PER_1M
        )


def get_llm(temperature: float = 0.1) -> ChatOpenAI:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set on the backend.")

    return ChatOpenAI(
        api_key=OPENAI_API_KEY,
        model=OPENAI_MODEL,
        temperature=temperature,
        max_tokens=2048,
    )


def _extract_json(text: str) -> Dict[str, Any]:
    text = text.strip()

    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)

    if fence:
        text = fence.group(1).strip()

    start, end = text.find("{"), text.rfind("}")

    if start != -1 and end != -1:
        text = text[start : end + 1]

    return json.loads(text)


def call_json(
    system: str,
    user: str,
    meter: TokenMeter,
    temperature: float = 0.1,
) -> Tuple[Dict[str, Any], str]:
    """Calls OpenAI and parses a JSON object response. Returns (data, raw_text)."""

    llm = get_llm(temperature)

    messages: List[Any] = [
        (
            "system",
            system
            + "\n\nRespond with a single valid JSON object and nothing else.",
        ),
        ("human", user),
    ]

    response = llm.invoke(messages)

    usage = (response.response_metadata or {}).get("token_usage", {}) or {}

    meter.add(
        int(usage.get("prompt_tokens", 0)),
        int(usage.get("completion_tokens", 0)),
    )

    raw = (
        response.content
        if isinstance(response.content, str)
        else str(response.content)
    )

    try:
        return _extract_json(raw), raw
    except Exception:
        return {}, raw


