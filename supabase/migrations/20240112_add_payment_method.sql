-- Migration: Add payment_method to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Optional: Update existing records based on the old shipping_carrier label
UPDATE orders SET payment_method = 'vietqr' WHERE shipping_carrier = 'METHOD: VIETQR';
UPDATE orders SET payment_method = 'cod' WHERE shipping_carrier = 'METHOD: COD';
UPDATE orders SET payment_method = 'cod' WHERE payment_method IS NULL;
