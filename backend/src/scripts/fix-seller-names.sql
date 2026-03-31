-- Script para poblar el campo sellerName en ventas existentes
-- Esto evitará que aparezca "Sistema" en los reportes de ventas pasadas

UPDATE sales 
SET "sellerName" = users.name
FROM users 
WHERE sales.user_id = users.id 
AND sales."sellerName" IS NULL;

-- Si alguna venta aún queda sin nombre (vía turnos de caja), intentamos desde cash_closures
UPDATE sales
SET "sellerName" = cash_closures."userName"
FROM cash_closures
WHERE sales.closure_id = cash_closures.id
AND sales."sellerName" IS NULL;
