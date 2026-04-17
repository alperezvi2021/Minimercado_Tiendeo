import { useState, useCallback } from 'react';

// Tipos mínimos para Web Serial API
interface SerialPort {
  open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }): Promise<void>;
  readable: any; // Se asume stream, ignoramos tipo exacto interno para evitar conflictos
  close(): Promise<void>;
}
interface Serial {
  requestPort(): Promise<SerialPort>;
}
interface NavigatorWithSerial extends Navigator {
  serial: Serial;
}

export const useUSBScale = () => {
  const [weight, setWeight] = useState<number>(0);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectAndRead = useCallback(async () => {
    if (!('serial' in navigator)) {
      setError('Tu navegador no soporta comunicación USB Serial (Usa Chrome o Edge).');
      return;
    }

    setIsReading(true);
    setError(null);

    let port: SerialPort | null = null;
    let reader: ReadableStreamDefaultReader | null = null;

    try {
      // Solicitar acceso al puerto
      port = await (navigator as NavigatorWithSerial).serial.requestPort();
      
      // Abrir con configuración estándar (BaudRate 9600 es muy común en pesas)
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' });

      // Preparar el lector de texto
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable?.pipeTo(textDecoder.writable);
      reader = textDecoder.readable.getReader();

      let buffer = '';
      
      // Leer durante un breve periodo (ej: 2 segundos de ráfaga) para capturar el peso actual
      const timeout = setTimeout(() => {
        if (reader) reader.cancel();
      }, 3000);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          
          // Intentar extraer el peso si detectamos un cambio de línea o fin de trama
          if (buffer.includes('\n') || buffer.includes('\r')) {
            const lines = buffer.split(/[\r\n]+/);
            // Tomamos la última línea completa (que suele ser la más reciente)
            for (let i = lines.length - 2; i >= 0; i--) {
              const cleaned = lines[i].replace(/[^\d.]/g, ''); // Limpiar todo menos números y punto
              const parsed = parseFloat(cleaned);
              if (!isNaN(parsed) && parsed > 0) {
                setWeight(parsed);
                clearTimeout(timeout);
                await reader.cancel();
                break;
              }
            }
          }
        }
      }

      await readableStreamClosed?.catch(() => { /* Ignore */ });
      await port.close();
      
    } catch (err: unknown) {
      console.error('Error leyendo la pesa:', err);
      if (err instanceof Error) {
        if (err.name === 'NotFoundError') {
          setError('No se seleccionó ninguna pesa.');
        } else if (err.name === 'SecurityError') {
          setError('Permiso denegado para el puerto serial.');
        } else {
          setError('Error al conectar con la pesa. Verifica la conexión.');
        }
      } else {
        setError('Error desconocido al intentar conectar.');
      }
    } finally {
      setIsReading(false);
    }
  }, []);

  return { weight, isReading, error, connectAndRead, setWeight };
};
