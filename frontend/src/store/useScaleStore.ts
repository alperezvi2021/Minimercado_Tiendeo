import { create } from 'zustand';

interface ScaleState {
  isScaleConnected: boolean;
  scaleWeight: number;
  port: any | null;
  reader: any | null;
  reconnectInterval: NodeJS.Timeout | null;
  setScaleWeight: (weight: number) => void;
  setIsScaleConnected: (connected: boolean) => void;
  connectScale: () => Promise<void>;
  disconnectScale: () => Promise<void>;
  autoReconnect: () => Promise<void>;
  readScaleLoop: (reader: any) => Promise<void>;
  initGlobalListeners: () => void;
  setupPort: (port: any) => Promise<void>;
}

let globalPort: any = null;
let globalReader: any = null;

export const useScaleStore = create<ScaleState>((set, get) => ({
  isScaleConnected: false,
  scaleWeight: 0,
  port: null,
  reader: null,
  reconnectInterval: null,

  setScaleWeight: (weight) => set({ scaleWeight: weight }),
  setIsScaleConnected: (connected) => set({ isScaleConnected: connected }),

  connectScale: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      alert('Tu navegador no soporta la conexión con básculas. Usa Google Chrome o Microsoft Edge.');
      return;
    }
    try {
      const port = await (navigator as any).serial.requestPort();
      await get().setupPort(port);
    } catch (error) {
      console.error('Error solicitando puerto:', error);
    }
  },

  setupPort: async (port: any) => {
    try {
      // 1. Limpieza preventiva
      if (globalReader) {
        try { await globalReader.cancel(); globalReader.releaseLock(); } catch(e) {}
        globalReader = null;
      }

      // 2. Intentar abrir el puerto
      // Si ya está abierto (raro pero posible), no intentamos abrir de nuevo
      if (!port.opened) {
        await port.open({ baudRate: 9600 });
      }
      
      globalPort = port;
      set({ port, isScaleConnected: true });

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      globalReader = reader;
      set({ reader });

      get().readScaleLoop(reader);
    } catch (e: any) {
      console.warn('Error configurando puerto:', e.message);
      
      // Si el error es "already open", significa que ya lo tenemos
      if (e.message.includes('already open') || e.message.includes('Access denied')) {
        console.log('El puerto está ocupado o ya abierto. Reintentando en el próximo ciclo...');
      }
      set({ isScaleConnected: false });
    }
  },

  autoReconnect: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;
    
    // Si ya hay algo fluyendo, no tocamos nada
    if (get().isScaleConnected && globalPort?.readable) return;

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        // Intentar conectar con una pequeña pausa para evitar colisiones de hilos
        await get().setupPort(ports[0]);
      }
    } catch (e) {
      console.warn('Auto-reconexión fallida:', e);
    }
  },

  initGlobalListeners: () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;

    if ((window as any).__scaleListenersInitialized) return;
    (window as any).__scaleListenersInitialized = true;

    (navigator as any).serial.addEventListener('connect', () => {
      // Cuando se conecta físicamente, esperamos 2 segundos a que el driver de Windows se asiente
      setTimeout(() => get().autoReconnect(), 2000);
    });

    (navigator as any).serial.addEventListener('disconnect', () => {
      set({ isScaleConnected: false, port: null, reader: null, scaleWeight: 0 });
      globalPort = null;
      globalReader = null;
    });

    if (!get().reconnectInterval) {
      const interval = setInterval(() => {
        if (!get().isScaleConnected) {
          get().autoReconnect();
        }
      }, 4000); // Polling cada 4 segundos
      set({ reconnectInterval: interval });
    }
    
    // El primer intento al cargar la página será después de 3 segundos de "cortesía"
    setTimeout(() => get().autoReconnect(), 3000);
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
    } catch (error) {
      console.error('Cierre de bucle:', error);
    } finally {
      set({ isScaleConnected: false });
    }
  },
}));
