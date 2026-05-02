const { SerialPort } = require('serialport');
const { WebSocketServer } = require('ws');

/**
 * TIENDEO HARDWARE BRIDGE v1.3 - PRODUCTION
 * Especialista en SAT CS30 (9600 Baud)
 */

const WS_PORT = 8081;
const wss = new WebSocketServer({ port: WS_PORT });

console.log('🚀 TIENDEO HARDWARE BRIDGE - MODO SAT CS30 ACTIVO');

async function connect() {
    try {
        const ports = await SerialPort.list();
        const target = ports.find(p => 
            p.friendlyName?.toUpperCase().includes('CH340') || 
            p.friendlyName?.toUpperCase().includes('USB-SERIAL')
        );

        if (!target) {
            setTimeout(connect, 3000);
            return;
        }

        console.log(`✅ Conectado a Báscula SAT en ${target.path}`);
        
        const port = new SerialPort({ path: target.path, baudRate: 9600 });

        port.on('data', (raw) => {
            const text = raw.toString('utf8');
            // Extraemos solo el número (ej: de "S  0.805KG" sacamos "0.805")
            const match = text.match(/(\d+\.\d+)/);
            
            if (match) {
                const cleanWeight = match[1];
                // Enviamos el número limpio al POS
                wss.clients.forEach(c => c.readyState === 1 && c.send(cleanWeight));
            }
        });

        port.on('open', () => {
            // Comando para despertar a la SAT CS30 si está en modo manual
            port.write('W\r\n');
        });

        port.on('close', () => {
            console.log('🔌 Conexión perdida. Reintentando en 3s...');
            setTimeout(connect, 3000);
        });

        port.on('error', (err) => {
            console.log('❌ Error de hardware:', err.message);
        });

    } catch (e) {
        setTimeout(connect, 5000);
    }
}

connect();
