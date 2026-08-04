-- payment_transactions.currency was created as CHAR(3) in V2.4. PostgreSQL
-- stores CHAR(n) as bpchar (blank-padded fixed length), which fails Hibernate
-- schema validation under the prod profile (ddl-auto=validate) because the JPA
-- entity maps currency as a String/VARCHAR(3). Reconcile the column to VARCHAR(3).
ALTER TABLE payment_transactions
    ALTER COLUMN currency TYPE VARCHAR(3);
