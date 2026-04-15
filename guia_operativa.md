# Guía Operativa: Gestión de Ambientes (Producción y Laboratorio)

Esta guía detalla los procedimientos para trabajar con el nuevo esquema de ambientes aislados en tu VPS.

## 1. Flujo de Trabajo en el Laboratorio

Cuando necesites probar una nueva funcionalidad, corrección o cambio estético, sigue este flujo:

1.  **Desarrollo Local:** Haz los cambios en tu computadora y súbelos a GitHub (`git push`).
2.  **Actualizar el Laboratorio:**
    Entra a tu servidor VPS y ejecuta:
    ```bash
    cd /opt/Minimercado_Tiendeo_Pruebas
    git pull origin main
    docker compose up -d --build
    ```
3.  **Pruebas:** Entra a [tiendeopos-prueba.grupodksoluciones.com](https://tiendeopos-prueba.grupodksoluciones.com) y verifica que todo funcione como esperas.

---

## 2. Cómo actualizar el VPS desde GitHub

El comando `git pull` es el que trae los cambios desde la nube a tu servidor.

-   **Para el Laboratorio:** Se hace en `/opt/Minimercado_Tiendeo_Pruebas`.
-   **Para Producción:** Se hace en `/opt/Minimercado_Tiendeo`.

> [!TIP]
> Siempre actualiza primero el **Laboratorio**. Solo después de confirmar que no hay errores, procede a actualizar Producción.

---

## 3. Del Laboratorio a Producción (Paso a Grito)

Una vez que has validado en el Laboratorio que todo está perfecto, sigue estos pasos para llevar los cambios a tus clientes:

1.  **Entrar a la carpeta de Producción:**
    ```bash
    cd /opt/Minimercado_Tiendeo
    ```
2.  **Sincronizar el código:**
    ```bash
    git pull origin main
    ```
3.  **Reconstruir y Reiniciar:**
    ```bash
    docker compose up -d --build
    ```
    *El uso de `--build` asegura que Docker compile las nuevas versiones del Frontend y Backend.*

---

## 4. Extras: Sincronizar Datos de Producción a Lab

Si después de muchas pruebas los datos del Laboratorio están muy desordenados y quieres volver a tener una copia fresca de lo que hay en Producción hoy:

1.  **Detener Laboratorio:** `cd /opt/Minimercado_Tiendeo_Pruebas && docker compose stop`
2.  **Copiar Volumen:** 
    ```bash
    docker run --rm -v tiendeo-pro_pgdata:/from -v tiendeo-lab_pgdata:/to alpine ash -c "cd /from ; cp -av . /to"
    ```
3.  **Iniciar Laboratorio:** `docker compose up -d`

> [!CAUTION]
> **NUNCA** hagas el proceso inverso (copiar datos de Lab a Pro) a menos que sepas exactamente lo que haces, ya que podrías borrar las ventas reales de tus clientes por error.

---

## Resumen de Direcciones
| Ambiente | URL | Carpeta en VPS | Proyecto Docker |
| :--- | :--- | :--- | :--- |
| **Producción** | tiendeopos.grupodksoluciones.com | `/opt/Minimercado_Tiendeo` | `tiendeo-pro` |
| **Laboratorio** | tiendeopos-prueba.grupodksoluciones.com | `/opt/Minimercado_Tiendeo_Pruebas` | `tiendeo-lab` |
