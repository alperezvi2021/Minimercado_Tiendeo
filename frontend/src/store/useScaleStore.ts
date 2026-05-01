import { create } from 'zustand';

interface ScaleState {
  isScaleConnected: boolean;
  isConnecting: boolean; // Semáforo para evitar lentitud
  scaleWeight: number;
  port: any | null;
  reader: any | null;
  reconnectInterval: NodeJS.Timeout | null;
  needsRevincular: boolean;
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

  setScaleWeight: (weight) => set({ scaleWeight: weight }),
  setIsScaleConnected: (connected) => set({ isScaleConnected: connected }),

  connectScale: async () => {
    if (get().isConnecting) return;
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      alert('Tu navegador no soporta la conexión con básculas. Usa Google Chrome o Microsoft Edge.');
      return;
    }
    try {
      const port = await (navigator as any).serial.requestPort();
      localStorage.setItem('has_authorized_scale', 'true');
      set({ needsRevincular: false });
      await get().setupPort(port, false);
    } catch (error) {
      if ((error as any).name !== 'NotFoundError') {
         alert('Error al seleccionar la báscula: ' + (error as any).message);
      }
    }
  },

  setupPort: async (port: any, isAuto = false) => {
    if (get().isConnecting) return;
    set({ isConnecting: true });

    try {
      // 1. Limpieza de seguridad
      if (globalReader) {
        try { await globalReader.cancel(); globalReader.releaseLock(); } catch(e) {}
        globalReader = null;
      }
      
      // 2. Intentar abrir. 
      await port.open({ baudRate: 9600 });
      globalPort = port;
      
      // Pausa técnica breve y ligera
      await new Promise(resolve => setTimeout(resolve, 300));

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      globalReader = reader;
      set({ reader, port, isScaleConnected: true, needsRevincular: false });

      get().readScaleLoop(reader);
    } catch (e: any) {
      console.warn('Fallo al abrir puerto:', e.message);
      set({ isScaleConnected: false });
      
      // Si es manual y falla, avisar una sola vez sin reintentos pesados
      if (!isAuto) {
        alert('Windows no permite abrir el puerto de la báscula.\n\nPor favor, desconecta el cable USB de la computadora, espera 3 segundos y vuelve a conectarlo.');
      }
    } finally {
      set({ isConnecting: false });
    }
  },

  autoReconnect: async () => {
    if (get().isConnecting || typeof window === 'undefined' || !('serial' in navigator)) return;
    if (get().isScaleConnected && globalPort?.readable) return;

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        await get().setupPort(ports[0], true);
      } else if (localStorage.getItem('has_authorized_scale') === 'true') {
        set({ needsRevincular: true });
      }
    } catch (e) {
      // Silencioso
    }
  },

  initGlobalListeners: () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;
    if ((window as any).__scaleListenersInitialized) return;
    (window as any).__scaleListenersInitialized = true;

    (navigator as any).serial.addEventListener('connect', () => {
      // Retardo largo al conectar físicamente para no bloquear el sistema
      setTimeout(() => get().autoReconnect(), 5000);
    });

    (navigator as any).serial.addEventListener('disconnect', () => {
      set({ isScaleConnected: false, port: null, reader: null, scaleWeight: 0 });
      globalPort = null;
      globalReader = null;
    });

    if (!get().reconnectInterval) {
      // Latido muy relajado (cada 12 segundos) para no afectar el rendimiento
      const interval = setInterval(() => {
        if (!get().isScaleConnected && !get().isConnecting) {
          get().autoReconnect();
        }
      }, 12000);
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
    } catch (e) {
      console.error('Error desconectando:', e);
    } finally {
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
    } catch (error: any) {
      // Silencioso
    } finally {
      set({ isScaleConnected: false });
    }
  },
}));
