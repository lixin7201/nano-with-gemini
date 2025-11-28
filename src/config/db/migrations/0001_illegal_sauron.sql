CREATE UNIQUE INDEX "idx_order_no" ON "order" USING btree ("order_no");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transaction_id" ON "order" USING btree ("transaction_id");