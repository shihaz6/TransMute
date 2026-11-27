-- Optimistic-lock versions, so concurrent writes to the same record fail instead of overwriting.
alter table customers add column version bigint not null default 0;
alter table sales_orders add column version bigint not null default 0;
alter table purchase_orders add column version bigint not null default 0;
alter table inventory_items add column version bigint not null default 0;

-- Payments are linked to the customer account they reduce.
alter table payment_records add column customer_id varchar(255);
