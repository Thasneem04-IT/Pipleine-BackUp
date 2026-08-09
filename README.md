# Pipeline Guardian

Build a full-stack AI application called:

# PipelineMind AI

Autonomous Data Pipeline Incident Investigation Platform

## PURPOSE

Build an AI system that investigates failed data pipelines.

INPUT:

- Pipeline name

- Source

- Destination

- Failure description

- Pipeline logs (.txt/.log or pasted text)

- Schema information

- Knowledge documents (.pdf/.txt/.csv)

OUTPUT:

- Root cause

- Evidence

- Schema issues

- Business impact

- Recovery recommendation

- Confidence

- Groundedness

- Hallucination risk

- Investigation time

- Token usage

- Estimated cost

The user must be able to change the inputs and run multiple investigations.

## TECH STACK

Frontend:

- React

- TypeScript

- TailwindCSS

- shadcn/ui

- React Flow

Backend:

- Python

- FastAPI

- LangGraph

- LangChain

- ChromaDB

- Groq API

Use Groq as the ONLY LLM provider.

Use environment variable:

GROQ_API_KEY

Do not expose the API key in the frontend.

## RAG

Users can upload knowledge documents such as:

- Pipeline documentation

- Data schemas

- Troubleshooting runbooks

- Previous incident reports

- Data contracts

Process:

Documents

→ Chunking

→ Embeddings

→ ChromaDB

→ Retrieval

→ Agent context

Show the retrieved documents and relevant chunks in the UI.

## MULTI-AGENT LANGGRAPH WORKFLOW

Implement this workflow:

START

 ↓

Planner Agent

 ↓

 ┌──────────────┬──────────────┐

 ↓              ↓              ↓

Log Agent     RAG Agent     Schema Agent

 ↓              ↓              ↓

 └──────────────┴──────────────┘

                ↓

           Risk Agent

                ↓

        Recovery Agent

                ↓

         Reviewer Agent

                ↓

       Evaluation Agent

                ↓

               END

Use LangGraph state to pass information between agents.

## AGENTS

Planner:

Creates investigation plan.

Log Agent:

Analyzes pipeline logs and identifies errors.

RAG Agent:

Retrieves relevant enterprise knowledge from ChromaDB.

Schema Agent:

Detects missing columns, type changes, and schema drift.

Risk Agent:

Determines severity, business impact, affected systems, and SLA risk.

Recovery Agent:

Uses retrieved documentation to recommend recovery steps.

Reviewer:

Checks whether the diagnosis and recommendation are supported by evidence.

Evaluation Agent:

Calculates confidence, groundedness, hallucination risk, latency, tokens, and estimated cost.

Do not automatically execute production actions.

## UI

Create these pages:

1. Dashboard

2. Investigate Incident

3. Workflow

4. Knowledge Base

5. Incident Report

6. Evaluation

### Investigate Incident

Provide fields for:

Pipeline Name

Source

Destination

Execution ID

Failure Description

Pipeline Logs

Schema Information

Knowledge Documents

Buttons:

Load Demo Incident

Start Investigation

Clear

The user must be able to modify the demo data and test their own incidents.

## DEMO INCIDENT

Provide a working demo for:

Pipeline:

sales_daily_etl

Source:

CRM API

Destination:

Snowflake

Failure:

customer_age column not found.

The demo documents should support the conclusion:

Schema drift caused the failure.

Recovery:

Apply schema migration v3.2 and rerun the pipeline.

## WORKFLOW UI

Use React Flow to display:

Planner

→ Log Agent

→ RAG Agent

→ Schema Agent

→ Risk Agent

→ Recovery Agent

→ Reviewer

→ Evaluation

Show agent status:

Waiting / Running / Completed / Failed

Show execution time for each agent.

## FINAL REPORT

Display:

Incident Summary

Root Cause

Evidence

Retrieved Documents

Schema Analysis

Business Impact

Recovery Recommendation

Confidence

Groundedness

Hallucination Risk

Latency

Token Usage

Estimated Cost

## DESIGN

Professional dark enterprise DataOps dashboard.

Make the primary demo flow extremely clear:

INPUT

↓

MULTI-AGENT LANGGRAPH INVESTIGATION

↓

RAG EVIDENCE

↓

FINAL INCIDENT REPORT

Do not build a generic chatbot.

Do not use random mock responses.

The application must actually connect the frontend to the FastAPI backend, Groq API, LangGraph workflow, and ChromaDB RAG pipeline.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a8b431c8-574b-435a-8ee3-a3f0e8cc15dc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
