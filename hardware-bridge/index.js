const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { WebSocketServer } = require('ws');
const { exec } = require('child_process');

/**
 * TIENDEO HARDWARE BRIDGE v1.1 - MODO AUTO-DETECT
 * Este agente detecta automáticamente la báscula y sirve los datos
 * vía WebSocket para una conexión ultra-estable.
 */

const WS_PORT = 8081;
const wss = new WebSocketServer({ port: WS_PORT });

console.log('=========================================');
console.log('🚀 TIENDEO HARDWARE BRIDGE - INTELIGENTE');
console.log(`📡 Servidor: ws://localhost:${WS_PORT}`);
console.log('=========================================');

async function findAndConnect() {
    try {
        const ports = await SerialPort.list();
        
        // Buscar puertos que coincidan con los drivers comunes de básculas
        const target = ports.find(p => 
            p.friendlyName?.toUpperCase().includes('CH340') || 
            p.friendlyName?.toUpperCase().includes('USB-SERIAL') ||
            p.pnpId?.toUpperCase().includes('CH340') ||
            p.manufacturer?.toUpperCase().includes('CH340')
        );

        if (!target) {
            console.log(`[${new Date().toLocaleTimeString()}] 🔎 Buscando báscula... (Asegúrate de que esté conectada)`);
            setTimeout(findAndConnect, 4000);
            return;
        }

        console.log(`✅ DISPOSITIVO DETECTADO: ${target.path}`);
        console.log(`📝 Info: ${target.friendlyName || 'Genérico'}`);
        
        const port = new SerialPort({ path: target.path, baudRate: 9600 }, (err) => {
            if (err) {
                console.log('❌ Error al abrir:', err.message);
                
                // Si el puerto está bloqueado, intentamos el Reset de tu investigación
                if (err.message.includes('Access denied')) {
                    console.log('⚠️ Puerto bloqueado. Ejecutando reset de PowerShell...');
                    const psCommand = `powershell -Command "Disable-PnpDevice -InstanceId '${target.pnpId}' -Confirm:$false; Start-Sleep -Seconds 2; Enable-PnpDevice -InstanceId '${target.pnpId}' -Confirm:$false"`;
                    exec(psCommand, (psErr) => {
                        if (psErr) console.log('Info: Ejecuta este programa como Administrador para usar el Auto-Reset.');
                        else console.log('✅ Reset enviado.');
                    });
                }
                
                setTimeout(findAndConnect, 5000);
                return;
            }
        });

        const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
        
        parser.on('data', (data) => {
            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(data);
                }
            });
        });

        port.on('close', () => {
            console.log('🔌 Conexión cerrada. Reiniciando búsqueda...');
            setTimeout(findAndConnect, 3000);
        });

        port.on('error', (err) => {
            console.log('❌ Error en puerto:', err.message);
        });

    } catch (e) {
        console.error('Error fatal:', e);
        setTimeout(findAndConnect, 5000);
    }
}

// Iniciar proceso
findAndConnect();
