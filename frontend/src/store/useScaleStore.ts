import { create } from 'zustand';

interface ScaleState {
  isScaleConnected: boolean;
  isConnecting: boolean;
  scaleWeight: number;
  port: any | null;
  reader: any | null;
  reconnectInterval: NodeJS.Timeout | null;
  needsRevincular: boolean;
  lastErrorTime: number;
  setScaleWeight: (weight: number) => void;
  setIsScaleConnected: (connected: boolean) => void;
  connectScale: () => Promise<void>;
  disconnectScale: () => Promise<void>;
  autoReconnect: () => Promise<void>;
  readScaleLoop: (reader: any) => Promise<void>;
  initGlobalListeners: () => void;
  setupPort: (port: any, isAuto?: boolean) => Promise<void>;
}

let globalPort: any = null;
let globalReader: any = null;

export const useScaleStore = create<ScaleState>((set, get) => ({
  isScaleConnected: false,
  isConnecting: false,
  scaleWeight: 0,
  port: null,
  reader: null,
  reconnectInterval: null,
  needsRevincular: false,
  lastErrorTime: 0,

  setScaleWeight: (weight) => set({ scaleWeight: weight }),
  setIsScaleConnected: (connected) => set({ isScaleConnected: connected }),

  connectScale: async () => {
    if (get().isConnecting) return;
    try {
      const port = await (navigator as any).serial.requestPort();
      localStorage.setItem('has_authorized_scale', 'true');
      set({ needsRevincular: false });
      await get().setupPort(port, false);
    } catch (error) {
      if ((error as any).name !== 'NotFoundError') {
         alert('Error: ' + (error as any).message);
      }
    }
  },

  setupPort: async (port: any, isAuto = false) => {
    if (get().isConnecting) return;
    set({ isConnecting: true });

    try {
      // Limpieza atómica antes de abrir
      if (globalReader) {
        await globalReader.cancel();
        globalReader.releaseLock();
        globalReader = null;
      }
      
      await port.open({ baudRate: 9600 });
      globalPort = port;
      
      // Espera de estabilización para el chip USB
      await new Promise(resolve => setTimeout(resolve, 800));

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      globalReader = reader;
      set({ reader, port, isScaleConnected: true, needsRevincular: false });

      get().readScaleLoop(reader);
    } catch (e: any) {
      console.warn('Error de puerto:', e.message);
      set({ isScaleConnected: false, lastErrorTime: Date.now() });
      
      // Intentar forzar liberación si falla
      try {
        if (port.forget) await port.forget();
      } catch (err) {}

      if (!isAuto) {
        alert('¡BLOQUEO DE HARDWARE!\n\nWindows no permite liberar la báscula por software.\n\nPrueba desconectar y conectar el cable USB.');
      }
      set({ needsRevincular: true });
    } finally {
      set({ isConnecting: false });
    }
  },

  autoReconnect: async () => {
    if (get().isConnecting || typeof window === 'undefined' || !('serial' in navigator)) return;
    if (Date.now() - get().lastErrorTime < 15000) return;
    if (get().isScaleConnected && globalPort?.readable) return;

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        await get().setupPort(ports[0], true);
      } else if (localStorage.getItem('has_authorized_scale') === 'true') {
        set({ needsRevincular: true });
      }
    } catch (e) {}
  },

  initGlobalListeners: () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;
    if ((window as any).__scaleListenersInitialized) return;
    (window as any).__scaleListenersInitialized = true;

    (navigator as any).serial.addEventListener('connect', () => {
      setTimeout(() => get().autoReconnect(), 5000);
    });

    (navigator as any).serial.addEventListener('disconnect', () => {
      set({ isScaleConnected: false, port: null, reader: null, scaleWeight: 0 });
      globalPort = null;
      globalReader = null;
    });

    if (!get().reconnectInterval) {
      const interval = setInterval(() => {
        if (!get().isScaleConnected && !get().isConnecting) {
          get().autoReconnect();
        }
      }, 15000);
      set({ reconnectInterval: interval });
    }
    
    setTimeout(() => get().autoReconnect(), 4000);
  },

  disconnectScale: async () => {
    try {
      if (globalReader) {
        await globalReader.cancel();
        globalReader.releaseLock();
        globalReader = null;
      }
      if (globalPort) {
        await globalPort.close();
        globalPort = null;
      }
    } catch (e) {} finally {
      set({ port: null, reader: null, isScaleConnected: false, scaleWeight: 0 });
    }
  },

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
                  set({ scaleWeight: weight, isScaleConnected: true });
                }
              }
            }
          }
        }
      }
    } catch (error: any) {} finally {
      set({ isScaleConnected: false });
    }
  },
}));
