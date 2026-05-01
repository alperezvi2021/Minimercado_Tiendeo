import { create } from 'zustand';

interface ScaleState {
  isScaleConnected: boolean;
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
  setupPort: (port: any, isAuto?: boolean, retryCount?: number) => Promise<void>;
}

let globalPort: any = null;
let globalReader: any = null;

export const useScaleStore = create<ScaleState>((set, get) => ({
  isScaleConnected: false,
  scaleWeight: 0,
  port: null,
  reader: null,
  reconnectInterval: null,
  needsRevincular: false,

  setScaleWeight: (weight) => set({ scaleWeight: weight }),
  setIsScaleConnected: (connected) => set({ isScaleConnected: connected }),

  connectScale: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      alert('Tu navegador no soporta la conexión con básculas. Usa Google Chrome o Microsoft Edge.');
      return;
    }
    try {
      const port = await (navigator as any).serial.requestPort();
      localStorage.setItem('has_authorized_scale', 'true');
      set({ needsRevincular: false });
      await get().setupPort(port, false); // No es auto-conectar, mostrar errores
    } catch (error) {
      if ((error as any).name !== 'NotFoundError') {
         alert('Error al seleccionar la báscula: ' + (error as any).message);
      }
    }
  },

  setupPort: async (port: any, isAuto = false, retryCount = 0) => {
    try {
      // 1. Limpieza de seguridad
      if (globalReader) {
        try { await globalReader.cancel(); globalReader.releaseLock(); } catch(e) {}
        globalReader = null;
      }
      
      // 2. Intentar abrir. Si falla, entrará al catch para reintentar
      await port.open({ baudRate: 9600 });
      globalPort = port;
      
      // Pausa técnica tras apertura
      await new Promise(resolve => setTimeout(resolve, 500));

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      globalReader = reader;
      set({ reader, port, isScaleConnected: true, needsRevincular: false });

      get().readScaleLoop(reader);
    } catch (e: any) {
      console.warn(`Intento ${retryCount + 1} fallido: ${e.message}`);
      
      // Lógica de reintento progresivo (máximo 3 veces con 2 segundos entre cada uno)
      if (retryCount < 3) {
        setTimeout(() => get().setupPort(port, isAuto, retryCount + 1), 2000);
        return;
      }

      // Si después de 3 intentos falla y NO es auto-conectar, avisar al usuario
      set({ isScaleConnected: false });
      if (!isAuto) {
        alert('Windows no permite abrir el puerto. Posibles causas:\n1. El driver aún se está instalando.\n2. Otra pestaña tiene la báscula abierta.\n3. El cable USB está fallando.\n\nPrueba desconectar y volver a conectar el cable.');
      }
    }
  },

  autoReconnect: async () => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return;
    if (get().isScaleConnected && globalPort?.readable) return;

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        // En auto-reconexión pasamos true para que no salgan alertas intrusivas
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
      // Cuando conectas el cable, esperamos 4 segundos (más tiempo para el driver)
      setTimeout(() => get().autoReconnect(), 4000);
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
      }, 8000); // Polling más relajado para evitar saturar el puerto
      set({ reconnectInterval: interval });
    }
    
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
    } catch (error: any) {
      if (error.message.includes('disconnected')) {
         set({ isScaleConnected: false, port: null, reader: null });
      }
    } finally {
      set({ isScaleConnected: false });
    }
  },
}));
