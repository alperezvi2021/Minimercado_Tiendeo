const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { WebSocketServer } = require('ws');
const { exec } = require('child_process');

/**
 * TIENDEO HARDWARE BRIDGE v1.0
 * Este agente permite la conexión estable y automática con básculas digitales
 * eliminando los bloqueos del navegador y permitiendo el auto-reset por software.
 */

// CONFIGURACIÓN - Ajusta según tu puerto COM
const COM_PORT = 'COM7'; 
const BAUD_RATE = 9600;
const WS_PORT = 8081;

const wss = new WebSocketServer({ port: WS_PORT });
console.log('=========================================');
console.log('🚀 TIENDEO HARDWARE BRIDGE ACTIVO');
console.log(`📡 WebSocket: ws://localhost:${WS_PORT}`);
console.log(`🔌 Puerto Serial: ${COM_PORT}`);
console.log('=========================================');

let port;
let isConnecting = false;

function connectHardware() {
    if (isConnecting) return;
    isConnecting = true;

    console.log(`[${new Date().toLocaleTimeString()}] Intentando conectar a ${COM_PORT}...`);
    
    port = new SerialPort({ path: COM_PORT, baudRate: BAUD_RATE }, (err) => {
        if (err) {
            console.log('❌ ERROR DE APERTURA:', err.message);
            
            if (err.message.includes('Access denied') || err.message.includes('File not found')) {
                console.log('⚠️ PUERTO BLOQUEADO O NO ENCONTRADO. Ejecutando Maniobra de Reset...');
                
                // Maniobra de Reset mediante PowerShell (Tu investigación)
                const psCommand = `powershell -Command "Disable-PnpDevice -InstanceId (Get-PnpDevice | Where-Object {$_.FriendlyName -like '*CH340*' or $_.FriendlyName -like '*USB2.0-Ser*'}).InstanceId -Confirm:$false; Start-Sleep -Seconds 2; Enable-PnpDevice -InstanceId (Get-PnpDevice | Where-Object {$_.FriendlyName -like '*CH340*' or $_.FriendlyName -like '*USB2.0-Ser*'}).InstanceId -Confirm:$false"`;
                
                exec(psCommand, (psErr) => {
                    if (psErr) console.log('Info: No se pudo ejecutar el reset automático (se requiere permisos de Admin).');
                    else console.log('✅ Reset de puerto enviado con éxito.');
                });
            }
            
            isConnecting = false;
            setTimeout(connectHardware, 5000);
            return;
        }
        
        console.log('✅ CONECTADO EXITOSAMENTE');
        isConnecting = false;
        
        const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
        
        parser.on('data', (data) => {
            // Enviar a todos los navegadores Tiendeo abiertos
            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(data);
                }
            });
        });

        port.on('close', () => {
            console.log('🔌 Puerto cerrado. Reintentando...');
            isConnecting = false;
            setTimeout(connectHardware, 5000);
        });
    });
}

connectHardware();
