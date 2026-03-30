-- Script de Limpieza para TIENDA GRUPO DK
-- Este script elimina clientes de prueba y sus deudas asociadas.

DO $$ 
DECLARE 
    target_tenant_id UUID;
BEGIN
    -- 1. Identificar el Tenant ID para TIENDA GRUPO DK
    SELECT id INTO target_tenant_id FROM tenants WHERE name = 'TIENDA GRUPO DK' LIMIT 1;

    IF target_tenant_id IS NOT NULL THEN
        RAISE NOTICE 'Limpiando datos para Tenant ID: %', target_tenant_id;

        -- 2. Eliminar ventas de crédito (CreditSales) asociadas a los clientes indicados
        DELETE FROM credit_sales 
        WHERE customer_id IN (
            SELECT id FROM customers 
            WHERE tenant_id = target_tenant_id 
            AND name IN ('Cliente Genérico', 'Cliente Recuperado', 'daniel', 'Juan Perez')
        );

        -- 3. Eliminar los clientes de la tienda Grupo DK
        DELETE FROM customers 
        WHERE tenant_id = target_tenant_id 
        AND name IN ('Cliente Genérico', 'Cliente Recuperado', 'daniel', 'Juan Perez');

        RAISE NOTICE 'Limpieza completada exitosamente.';
    ELSE
        RAISE NOTICE 'No se encontró la tienda "TIENDA GRUPO DK". Verifique el nombre.';
    END IF;
END $$;
