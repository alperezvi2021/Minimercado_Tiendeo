const { SerialPort } = require('serialport');
const { WebSocketServer } = require('ws');
const { execSync, exec } = require('child_process');

/**
 * TIENDEO HARDWARE BRIDGE v1.4 - AUTO-HEAL
 * Incluye reset automático de puerto basado en investigación local.
 */

const WS_PORT = 8081;
const wss = new WebSocketServer({ port: WS_PORT });

console.log('🚀 TIENDEO HARDWARE BRIDGE v1.4 - MODO AUTO-HEAL');

// Función para ejecutar el reset de PowerShell (Tu investigación)
function resetPortHardware(pnpId) {
  try {
    console.log(`⚠️ Ejecutando reset de hardware para: ${pnpId}`);
    const cmd = `powershell -Command "Disable-PnpDevice -InstanceId '${pnpId}' -Confirm:$false; Start-Sleep -Seconds 2; Enable-PnpDevice -InstanceId '${pnpId}' -Confirm:$false"`;
    execSync(cmd);
    console.log('✅ Reset de hardware completado.');
    return true;
  } catch (e) {
    console.log('❌ No se pudo resetear (Requiere permisos de Administrador).');
    return false;
  }
}

async function connect() {
  try {
    const ports = await SerialPort.list();
    const target = ports.find(
      (p) =>
        p.friendlyName?.toUpperCase().includes('CH340') ||
        p.friendlyName?.toUpperCase().includes('USB-SERIAL')
    );

    if (!target) {
      setTimeout(connect, 3000);
      return;
    }

    console.log(`✅ Detectada báscula en ${target.path}`);

    const port = new SerialPort({
      path: target.path,
      baudRate: 9600,
      autoOpen: false,
    });

    port.open((err) => {
      if (err) {
        console.log(`❌ Error de apertura: ${err.message}`);

        // Si detectamos el Error 31 o Acceso Denegado, aplicamos el Reset
        if (err.message.includes('31') || err.message.includes('Access denied')) {
          resetPortHardware(target.pnpId);
        }

        setTimeout(connect, 5000);
        return;
      }

      console.log('📡 Transmitiendo datos...');

      port.on('data', (raw) => {
        const text = raw.toString('utf8');
        const match = text.match(/(\d+\.\d+)/);
        if (match) {
          wss.clients.forEach((c) => c.readyState === 1 && c.send(match[1]));
        }
      });

      port.on('close', () => {
        console.log('🔌 Puerto cerrado.');
        setTimeout(connect, 3000);
      });

      // Comando inicial para despertar a la SAT
      port.write('W\r\n');
    });
  } catch (e) {
    setTimeout(connect, 5000);
  }
}

connect();
