-- Script para poblar el campo sellerName en ventas existentes
-- Esto evitará que aparezca "Sistema" en los reportes de ventas pasadas

UPDATE sales 
SET "sellerName" = users.name
FROM users 
WHERE sales.user_id::text = users.id::text 
AND (sales."sellerName" IS NULL OR sales."sellerName" = '');

-- Si alguna venta aún queda sin nombre (vía turnos de caja), intentamos desde cash_closures
UPDATE sales
SET "sellerName" = cash_closures.user_name
FROM cash_closures
WHERE sales.closure_id::text = cash_closures.id::text
AND (sales."sellerName" IS NULL OR sales."sellerName" = '');
