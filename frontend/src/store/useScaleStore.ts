import { create } from 'zustand';

interface ScaleState {
  isScaleConnected: boolean;
  scaleWeight: number;
  port: any | null;
  reader: any | null;
  setScaleWeight: (weight: number) => void;
  setIsScaleConnected: (connected: boolean) => void;
  connectScale: () => Promise<void>;
  disconnectScale: () => Promise<void>;
  autoReconnect: () => Promise<void>;
}

export const useScaleStore = create<ScaleState>((set, get) => ({
  isScaleConnected: false,
  scaleWeight: 0,
  port: null,
  reader: null,

  setScaleWeight: (weight) => set({ scaleWeight: weight }),
  setIsScaleConnected: (connected) => set({ isScaleConnected: connected }),

  connectScale: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      alert('Tu navegador no soporta la conexión con básculas. Usa Google Chrome o Microsoft Edge.');
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      
      set({ port, isScaleConnected: true });

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      set({ reader });

      // Iniciar el loop de lectura
      get().readScaleLoop(reader);
    } catch (error) {
      console.error('Error conectando a la báscula:', error);
      alert('Error conectando a la báscula: ' + (error as any).message);
    }
  },

  autoReconnect: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator) || get().isScaleConnected) return;

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        const port = ports[0];
        // Intentamos abrirlo, si ya está abierto o falla, lo manejamos silenciosamente
        try {
          await port.open({ baudRate: 9600 });
          set({ port, isScaleConnected: true });

          const textDecoder = new TextDecoderStream();
          port.readable.pipeTo(textDecoder.writable);
          const reader = textDecoder.readable.getReader();
          set({ reader });

          get().readScaleLoop(reader);
        } catch (e) {
          // Si falla porque ya está abierto o similar, simplemente ignoramos
          console.warn('Auto-reconexión fallida:', e);
        }
      }
    } catch (e) {
      console.error('Error en autoReconnect:', e);
    }
  },

  disconnectScale: async () => {
    const { port, reader } = get();
    try {
      if (reader) {
        await reader.cancel();
        reader.releaseLock();
      }
      if (port) {
        await port.close();
      }
    } catch (e) {
      console.error('Error desconectando:', e);
    } finally {
      set({ port: null, reader: null, isScaleConnected: false, scaleWeight: 0 });
    }
  },

  // Helper interno para el loop
  readScaleLoop: async (reader: any) => {
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/[\r\n\x02\x03]+/);
          if (lines.length > 1) {
            buffer = lines.pop() || ''; 
            for (const line of lines) {
              const match = line.match(/(\d+\.\d+)/);
              if (match) {
                const weight = parseFloat(match[1]);
                if (!isNaN(weight) && weight >= 0 && weight < 500) {
                  set({ scaleWeight: weight });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading scale loop:', error);
    } finally {
      set({ isScaleConnected: false });
    }
  },
}));
