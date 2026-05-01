import { create } from 'zustand';

interface ScaleState {
  isScaleConnected: boolean;
  isConnecting: boolean;
  bridgeActive: boolean; // Indica si estamos usando el Agente Premium
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
  initBridge: () => void; // Inicializa la conexión con el Agente local
}

let globalPort: any = null;
let globalReader: any = null;
let bridgeSocket: WebSocket | null = null;

export const useScaleStore = create<ScaleState>((set, get) => ({
  isScaleConnected: false,
  isConnecting: false,
  bridgeActive: false,
  scaleWeight: 0,
  port: null,
  reader: null,
  reconnectInterval: null,
  needsRevincular: false,

  setScaleWeight: (weight) => set({ scaleWeight: weight }),
  setIsScaleConnected: (connected) => set({ isScaleConnected: connected }),

  initBridge: () => {
    if (typeof window === 'undefined') return;
    
    // Intentar conectar con el Tiendeo Bridge (Agente Local)
    if (bridgeSocket) bridgeSocket.close();

    try {
      bridgeSocket = new WebSocket('ws://localhost:8081');
      
      bridgeSocket.onopen = () => {
        console.log('✅ Conectado al Agente de Hardware Tiendeo');
        set({ bridgeActive: true, isScaleConnected: true, needsRevincular: false });
      };

      bridgeSocket.onmessage = (event) => {
        const data = event.data.toString();
        // Procesar el peso que envía el agente
        const match = data.match(/(\d+\.\d+)/);
        if (match) {
          const weight = parseFloat(match[1]);
          if (!isNaN(weight)) {
            set({ scaleWeight: weight, isScaleConnected: true });
          }
        }
      };

      bridgeSocket.onclose = () => {
        set({ bridgeActive: false });
        // Si perdemos el agente, volvemos al modo normal después de 5 seg
        setTimeout(() => get().initBridge(), 5000);
      };

    } catch (e) {
      set({ bridgeActive: false });
    }
  },

  connectScale: async () => {
    if (get().bridgeActive) return; // Si el agente está activo, no hace falta manual
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
    if (get().bridgeActive || get().isConnecting) return;
    set({ isConnecting: true });

    try {
      if (globalReader) {
        try { await globalReader.cancel(); globalReader.releaseLock(); } catch(e) {}
        globalReader = null;
      }
      
      await port.open({ baudRate: 9600 });
      globalPort = port;
      
      await new Promise(resolve => setTimeout(resolve, 800));

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      globalReader = reader;
      set({ reader, port, isScaleConnected: true, needsRevincular: false });

      get().readScaleLoop(reader);
    } catch (e: any) {
      set({ isScaleConnected: false });
      try { if (port.forget) await port.forget(); } catch (err) {}
      if (!isAuto) {
        alert('Windows no permite liberar la báscula.\n\nPrueba desconectar y conectar el cable USB o instala el Agente Tiendeo.');
      }
      set({ needsRevincular: true });
    } finally {
      set({ isConnecting: false });
    }
  },

  autoReconnect: async () => {
    if (get().bridgeActive) return; // Prioridad al agente
    if (get().isConnecting || typeof window === 'undefined' || !('serial' in navigator)) return;

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
    if (typeof window === 'undefined') return;
    
    // 1. Iniciar conexión con el agente
    get().initBridge();

    if ((window as any).__scaleListenersInitialized) return;
    (window as any).__scaleListenersInitialized = true;

    if ('serial' in navigator) {
      (navigator as any).serial.addEventListener('connect', () => {
        setTimeout(() => get().autoReconnect(), 4000);
      });

      (navigator as any).serial.addEventListener('disconnect', () => {
        set({ isScaleConnected: false, port: null, reader: null, scaleWeight: 0 });
        globalPort = null;
        globalReader = null;
      });

      if (!get().reconnectInterval) {
        const interval = setInterval(() => {
          if (!get().isScaleConnected && !get().isConnecting && !get().bridgeActive) {
            get().autoReconnect();
          }
        }, 15000);
        set({ reconnectInterval: interval });
      }
      
      setTimeout(() => get().autoReconnect(), 5000);
    }
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
                if (!isNaN(weight)) {
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
