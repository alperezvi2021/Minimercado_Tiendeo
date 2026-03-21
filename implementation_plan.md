# SuperAdmin Console & Platform Management

Este plan detalla la creación de una capa de administración global para Tiendeo POS, permitiendo gestionar múltiples negocios (tenants) y usuarios desde un único panel centralizado.

## Cambios Propuestos

### 1. Modelo de Datos y Seguridad (Backend)
- **Role Enum**: Añadir `SUPER_ADMIN` al enumerador de roles.
- **Users**: Asegurar que `alperezvi@gmail.com` sea el `OWNER` principal con acceso restaurado.
- **SuperAdmin User**: Crear un usuario semilla con rol `SUPER_ADMIN`.

### 2. Infraestructura Global (Backend)
- **Global Controller**: Rutas específicas para SuperAdmin que NO estén filtradas por `tenantId`.
  - `GET /admin/tenants`: Listar todos los negocios.
  - `GET /admin/users`: Listar todos los usuarios del sistema.
  - `POST /admin/reset-password`: Restablecer contraseña de cualquier usuario.

### 5. Módulo de Proveedores (Backend & Frontend)
- **Entidades**: [Supplier](file:///c:/Proyecto%20MiniMercado/Proyecto/frontend/src/app/dashboard/suppliers/page.tsx#5-13), [SupplierInvoice](file:///c:/Proyecto%20MiniMercado/Proyecto/backend/src/suppliers/entities/supplier-invoice.entity.ts#5-44), [InvoiceItem](file:///c:/Proyecto%20MiniMercado/Proyecto/frontend/src/app/dashboard/suppliers/page.tsx#14-20).
- **Funcionalidad**: Registro de facturas con desglose de cantidades, costos netos, IVA y totales.
- **Frontend**: Panel de gestión de compras y base de datos de proveedores.

### 6. Módulo de Contabilidad (Backend & Frontend)
- **Funcionalidad**: Resumen de caja, balance de ventas vs. compras, cálculo de utilidades brutas y netas.
- **Frontend**: Dashboard financiero con gráficas de rendimiento.

### 7. Refuerzo de Seguridad (RBAC)
- **Cajeros (`CASHIER`)**: Restricción total. Solo podrán ver:
  - Ruta `/dashboard` (Caja POS)
  - Ruta `/dashboard/profile` (Ajustes de perfil)
- **Dueños/Admin**: Acceso completo a Inventario, Reportes, Proveedores y Contabilidad.
### 8. Pinceladas Finales (Frontend) - Exportación Digital
- **Landing Page Dark**: Rediseño total de [frontend/src/app/page.tsx](file:///c:/Proyecto%20MiniMercado/Proyecto/frontend/src/app/page.tsx). (Completado)
- **Reportes Contables Digitales**: 
  - Eliminar botón "Imprimir" y añadir botones "Exportar PDF" y "Exportar Excel".
  - Implementar generación de PDF con `jspdf` y `jspdf-autotable`.
  - Implementar generación de Excel con `xlsx` (SheetJS).
  - Aplicar la misma lógica al módulo de **Reportes** general.

### 10. Ventas a Crédito y Cierre de Caja (Flujo Optimizado)
- **POS Mejorado**: Opción directa "A Crédito (2)" en el modal de cobro que solicita el nombre del cliente al instante.
- **Backend - Estabilización**: 
  - Fix de acceso a `userId` para evitar errores `500` en ventas.
  - Inclusión de `name` en el payload JWT para identificación correcta del cajero.
  - Hardening de [AccountingService](file:///c:/Proyecto%20MiniMercado/Proyecto/backend/src/accounting/accounting.service.ts#5-41) contra valores `NaN` y nulos.
- **Frontend - Robustez**:
  - Protección de la página de Cierre de Caja ante estados nulos del turno.
  - Reemplazo definitivo del botón "Tarjeta" por "Crédito" para alinearse con la operativa del negocio.
- **Contabilidad**: Integración total de deudas en balances y exportaciones.

### 11. Preparación Despliegue (VPS - Dockerización) [COMPLETADO]
- [x] **Backend**: Crear [Dockerfile](file:///c:/Proyecto%20MiniMercado/Proyecto/backend/Dockerfile) optimizado para NestJS (multi-stage build para reducir tamaño).
- [x] **Frontend**: Crear [Dockerfile](file:///c:/Proyecto%20MiniMercado/Proyecto/backend/Dockerfile) optimizado para Next.js en modo 'standalone'.
- [x] **Orquestación**: Actualizar la raíz de [docker-compose.yml](file:///c:/Proyecto%20MiniMercado/Proyecto/docker-compose.yml) para levantar la DB (Postgres), Backend y Frontend con sus variables de entorno de Producción.
- [x] **Subida**: Completar otro `commit` en GitHub con estos archivos de infraestructura.
- [x] **Acceso VPS**: Definir los comandos exactos de SSH y la clonación del repositorio en el servidor remoto.

### 12. Refinación UX POS: Flujo de Pago por Pasos
- **Sidebar Dinámico**: Al presionar "Cobrar", la lista de productos en el lateral derecho se ocultará para mostrar las opciones grandes de "Efectivo" y "Crédito".
- **Elección Confirmada**: El sistema no permitirá imprimir el ticket hasta que se haya seleccionado y confirmado el método de pago manualmente.
- **Flujo**: Escaneo -> Botón Cobrar (Sidebar cambia) -> Elegir Medio -> Imprimir.

### 13. Ticket Electrónico Dinámico y Datos Fiscales [NUEVO]
- **Backend**: Añadir campos `ticketPaperSize`, `ticketAutoPrint`, `ticketHeaderMessage`, `ticketFooterMessage` a la entidad [Tenant](file:///c:/Proyecto%20MiniMercado/Proyecto/backend/src/tenants/entities/tenant.entity.ts#4-27).
- **Backend**: Crear rutas `GET /tenants/me` y `PATCH /tenants/me` para gestionar la configuración del negocio.
- **Frontend (Settings)**: Conectar la pestaña `Mi Negocio` y `Formato Ticket` con la API del backend. Agregar campo **NIT/RUT**.
- **Frontend (POS)**: Ajustar el componente visual del ticket para que consuma las variables dinámicas del negocio (tamaño 58mm/80mm, mensajes personalizados extra).

### 14. Mantenimiento y Estabilidad [NUEVO]
- **Next.js Metadata**: Refactorizar `themeColor` y `viewport` en [layout.tsx](file:///c:/Proyecto%20MiniMercado/Proyecto/frontend/src/app/layout.tsx) para usar el nuevo export de `viewport` requerido por Next.js 14+.
- **Docker Fix**: Instrucciones para limpiar el estado de contenedores en el VPS y evitar el error `'ContainerConfig'`.

## Plan de Verificación

### Pruebas Automatizadas
- Probar que un `CASHIER` no puede acceder a las rutas `/admin/*`.
- Probar que un `SUPER_ADMIN` puede ver usuarios de diferentes tenants.

### Verificación Manual
- Iniciar sesión como `CASHIER` y verificar que el Sidebar solo muestra POS y Configuración (Perfil).
- Como `OWNER`, registrar una factura de proveedor y verificar que el total cuadra con el IVA calculado.
- Ver el reporte contable y confirmar que las compras de proveedores restan a la utilidad bruta.
