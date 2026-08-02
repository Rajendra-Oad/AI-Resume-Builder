# PostgreSQL Optimization Backlog

This document tracks optional PostgreSQL performance improvements. These
indexes are not schema-compatibility requirements and must not be added to
existing Flyway migrations after those migrations have been applied.

Before implementing an item:

1. Confirm that the associated query occurs frequently in production.
2. Capture its baseline with `EXPLAIN (ANALYZE, BUFFERS)`.
3. Evaluate index size and write overhead.
4. Add the index in a new, dedicated Flyway optimization migration.
5. Compare the post-index execution plan with the baseline.

## AI module

### GIN index on provider capabilities

Candidate:

```sql
CREATE INDEX idx_ai_providers_capabilities_gin
    ON ai_providers
    USING GIN (capabilities);
```

Consider this only if the application filters providers using JSONB
containment, key-existence, or JSONPath predicates. It is unnecessary when
capabilities are only loaded by provider ID or provider key.

### GIN index on generated-content metadata

Candidate:

```sql
CREATE INDEX idx_ai_generated_contents_metadata_gin
    ON ai_generated_contents
    USING GIN (metadata);
```

Consider this only if metadata becomes a frequent JSONB search target. It is
unnecessary when metadata is merely retrieved with its parent AI request.

### Index on AI request provider

Candidate:

```sql
CREATE INDEX idx_ai_requests_provider
    ON ai_requests (provider_id);
```

Consider this for frequent provider-based reporting, filtering, aggregation,
or foreign-key maintenance involving `ai_providers`. Confirm that existing
query plans cannot use a more selective index first.

### Partial indexes for AI request status

Candidate pattern:

```sql
CREATE INDEX idx_ai_requests_pending_created
    ON ai_requests (created_at)
    WHERE status = 'PENDING';
```

Create partial indexes only for statuses that are queried frequently and
represent a sufficiently small portion of the table. Candidate statuses may
include `PENDING`, `PROCESSING`, or `RETRYING`. Do not create one index per
status without production query and data-distribution evidence.
