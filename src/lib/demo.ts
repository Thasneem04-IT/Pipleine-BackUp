import type { IncidentInput } from "./types";

export const DEMO_LOGS = `2026-08-09T02:14:03Z INFO  airflow.task  Starting DAG run sales_daily_etl execution_id=run_2026_08_09_0214
2026-08-09T02:14:05Z INFO  extract.crm_api  GET https://crm.internal/api/v4/customers?updated_since=2026-08-08 -> 200 OK (12,481 records)
2026-08-09T02:14:09Z INFO  extract.crm_api  Payload schema version reported by source: v3.2
2026-08-09T02:14:09Z WARN  extract.crm_api  Local contract pinned at v3.1 (config/data_contracts/crm_customers.yaml)
2026-08-09T02:14:12Z INFO  transform.normalize  Applying mapping sales_daily_etl.customer_dim
2026-08-09T02:14:12Z ERROR transform.normalize  KeyError: 'customer_age'
2026-08-09T02:14:12Z ERROR transform.normalize  Traceback (most recent call last):
  File "/opt/etl/transform/normalize.py", line 148, in build_customer_dim
    df["customer_age"] = df["customer_age"].astype("Int64")
KeyError: 'customer_age'
2026-08-09T02:14:13Z ERROR load.snowflake  Aborting COPY INTO ANALYTICS.PUBLIC.CUSTOMER_DIM - upstream task failed
2026-08-09T02:14:13Z ERROR airflow.task  Task transform_customer_dim failed after 1 attempt (retries=2 remaining)
2026-08-09T02:14:41Z ERROR transform.normalize  KeyError: 'customer_age' (retry 1/2)
2026-08-09T02:15:22Z ERROR transform.normalize  KeyError: 'customer_age' (retry 2/2)
2026-08-09T02:15:23Z ERROR airflow.dag  DAG run sales_daily_etl marked FAILED. Downstream: revenue_daily_rollup SKIPPED, exec_kpi_dashboard STALE`;

export const DEMO_SCHEMA = `# Expected schema (pinned contract v3.1) - ANALYTICS.PUBLIC.CUSTOMER_DIM
customer_id      STRING     NOT NULL
customer_name    STRING
customer_age     INTEGER
signup_date      DATE
region           STRING
lifetime_value   NUMBER(18,2)

# Observed payload from CRM API (source-reported v3.2)
customer_id      STRING     NOT NULL
customer_name    STRING
date_of_birth    DATE          <-- new
signup_date      DATE
region           STRING
lifetime_value   STRING        <-- type changed from NUMBER(18,2)
# customer_age   MISSING       <-- removed in v3.2`;

export const DEMO_DOCS = [
  {
    name: "crm_customers_data_contract_v3.2.md",
    content: `# Data Contract - CRM Customers (v3.2)
Owner: Customer Data Platform
Effective: 2026-08-08

## Breaking changes from v3.1
- REMOVED: \`customer_age\` (INTEGER). The CRM no longer stores derived age.
- ADDED: \`date_of_birth\` (DATE). Consumers must derive age downstream.
- CHANGED: \`lifetime_value\` is emitted as STRING and must be cast to NUMBER(18,2).

## Consumer obligations
Any consumer pinned to v3.1 will fail on the first v3.2 payload. Consumers must
apply schema migration v3.2 before the effective date. sales_daily_etl is a
registered consumer of this contract.`,
  },
  {
    name: "runbook_schema_drift.md",
    content: `# Runbook - Schema Drift Failures (RB-014)

## Symptom
Transform tasks raise KeyError or ColumnNotFound for a column that previously existed.

## Diagnosis
1. Compare the source-reported schema version against the pinned local contract.
2. Check the contract changelog for REMOVED / CHANGED columns.
3. Confirm the error column matches a removed field.

## Recovery
1. Apply schema migration v3.2 (\`migrations/v3.2_customer_dim.sql\`) to add
   \`date_of_birth\` and derive \`customer_age\` in the transform layer.
2. Bump the pinned contract in \`config/data_contracts/crm_customers.yaml\` to v3.2.
3. Rerun the pipeline with \`airflow dags backfill sales_daily_etl -s <failed_date>\`.
4. Verify downstream revenue_daily_rollup completes before the 07:00 UTC SLA.

Do not hot-patch by dropping the column: revenue models depend on age banding.`,
  },
  {
    name: "incident_INC-2291_postmortem.md",
    content: `# Postmortem INC-2291 - orders_hourly_etl schema drift
Date: 2026-05-12  Severity: SEV-2  Duration: 3h 40m

The vendor removed \`order_channel\` in contract v2.4 while the pipeline stayed
pinned to v2.3. The transform failed with KeyError: 'order_channel'.
Resolution: applied the vendor migration, bumped the pinned contract, and
backfilled. Root cause classified as SCHEMA DRIFT (uncoordinated contract bump).
Action item: alert on source-reported schema version mismatch (still open).`,
  },
  {
    name: "sales_daily_etl_pipeline_docs.md",
    content: `# Pipeline - sales_daily_etl
Schedule: daily 02:00 UTC   SLA: CUSTOMER_DIM loaded by 07:00 UTC
Source: CRM API (v4)   Destination: Snowflake ANALYTICS.PUBLIC.CUSTOMER_DIM

## Downstream consumers
- revenue_daily_rollup (blocking)
- exec_kpi_dashboard (Tableau, refreshed 07:30 UTC)
- finance_close_extract (month-end only)

## Escalation
Data Platform on-call, then Revenue Analytics owner. Any miss of the 07:00 UTC
load is an SLA breach and must be logged as an incident.`,
  },
];

export const DEMO_INCIDENT: IncidentInput = {
  pipelineName: "sales_daily_etl",
  source: "CRM API",
  destination: "Snowflake",
  executionId: "run_2026_08_09_0214",
  failureDescription:
    "Nightly run failed during the transform stage: customer_age column not found. Downstream revenue_daily_rollup was skipped and the executive KPI dashboard is stale. The 07:00 UTC SLA is at risk.",
  logs: DEMO_LOGS,
  schemaInfo: DEMO_SCHEMA,
  documents: DEMO_DOCS,
};

export const EMPTY_INCIDENT: IncidentInput = {
  pipelineName: "",
  source: "",
  destination: "",
  executionId: "",
  failureDescription: "",
  logs: "",
  schemaInfo: "",
  documents: [],
};
