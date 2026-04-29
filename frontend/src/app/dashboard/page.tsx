'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Tag, Wifi, WifiOff, CloudSync, ArrowRightLeft, AlertCircle, Utensils, Scale } from 'lucide-react';
import { useOfflineStore, OfflineSale, OfflineCustomer, OfflineSaleItem } from '@/store/useOfflineStore';
import { formatCurrency, parseCurrency } from '@/utils/formatters';

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  stock: number;
  sellByWeight?: boolean;
  unit?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  productId?: string | number;
  productName?: string;
  unitPrice?: number;
  subtotal?: number;
  [key: string]: unknown;
}

interface CompletedSale {
  localId?: string;
  id?: string | number;
  paymentMethod?: string;
  total?: number;
  totalAmount?: number;
  changeAmount?: number;
  receivedAmount?: number;
  isCredit?: boolean;
  invoiceNumber?: string;
  createdAt?: string | number | Date;
  customerName?: string;
  items?: CartItem[];
  [key: string]: unknown;
}

export default function PosPage() {
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posState, setPosState] = useState<'billing' | 'payment'>('billing');
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'credito'>('efectivo');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [customers, setCustomers] = useState<OfflineCustomer[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCheckoutTime, setLastCheckoutTime] = useState(0); 
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [userName, setUserName] = useState('Usuario');
  const [userRole, setUserRole] = useState('CASHIER');
  const [hasOpenClosure, setHasOpenClosure] = useState<boolean | null>(null);
  const [tenantModules, setTenantModules] = useState<string[]>([]);
  
  const offlineStore = useOfflineStore();
  const [cashReceived, setCashReceived] = useState<string>('');
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [selectedCartIndex, setSelectedCartIndex] = useState(0);
  // Store info state (Dynamic from DB)
  const [tenantData, setTenantData] = useState({
    name: 'TIENDA LAS MARGARITAS',
    phone: '+573207095554',
    location: 'Don Matías - Antioquia',
    rutNit: '',
    ticketPaperSize: '58mm',
    ticketAutoPrint: false,
    ticketHeaderMessage: '',
    ticketFooterMessage: ''
  });
  
  // Scale Connection State
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [scaleWeight, setScaleWeight] = useState<number>(0);
  // Referencias para limpiar la conexión al salir del módulo
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpieza y Auto-conexión automática
  useEffect(() => {
    // 1. Intentar auto-conectar si ya hay permisos previos
    const autoConnect = async () => {
      if ('serial' in navigator) {
        try {
          const ports = await (navigator as any).serial.getPorts();
          if (ports.length > 0) {
            const port = ports[0];
            await port.open({ baudRate: 9600 });
            portRef.current = port;
            setIsScaleConnected(true);

            const textDecoder = new TextDecoderStream();
            port.readable.pipeTo(textDecoder.writable);
            const reader = textDecoder.readable.getReader();
            readerRef.current = reader;

            readScaleLoop(reader);
          }
        } catch (e) {
          console.warn('Auto-reconexión fallida (posiblemente puerto ocupado):', e);
        }
      }
    };

    autoConnect();

    return () => {
      const disconnect = async () => {
        if (readerRef.current) {
          try {
            await readerRef.current.cancel();
            readerRef.current.releaseLock();
          } catch (e) {}
        }
        if (portRef.current) {
          try {
            await portRef.current.close();
          } catch (e) {}
        }
      };
      disconnect();
      if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
    };
  }, []);

  const connectScale = async () => {
    if (!('serial' in navigator)) {
      alert('Tu navegador no soporta la conexión con básculas. Usa Google Chrome o Microsoft Edge.');
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setIsScaleConnected(true);

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      readScaleLoop(reader);
    } catch (error) {
      console.error('Error conectando a la báscula:', error);
      alert('Error conectando a la báscula: ' + (error as any).message);
    }
  };

  const readScaleLoop = async (reader: any) => {
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          // Las básculas pueden usar Newline, Carriage Return o caracteres STX/ETX (0x02, 0x03)
          const lines = buffer.split(/[\r\n\x02\x03]+/);
          
          if (lines.length > 1) {
            buffer = lines.pop() || ''; 
            
            for (const line of lines) {
              // Buscamos un patrón numérico (ej: 0.145 o 0.00) que represente el peso
              // Algunos protocolos envían: "WW,0.145kg" o "+  0.145"
              const match = line.match(/(\d+\.\d+)/);
              if (match) {
                const weight = parseFloat(match[1]);
                if (!isNaN(weight) && weight >= 0 && weight < 500) { // Validar rango razonable
                  setScaleWeight(weight);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading scale:', error);
    } finally {
      setIsScaleConnected(false);
    }
  };

  const disconnectScale = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
      }
      if (portRef.current) {
        await portRef.current.close();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScaleConnected(false);
      readerRef.current = null;
      portRef.current = null;
    }
  };

  useEffect(() => {
    // Sincronización inteligente con Auto-Bloqueo por estabilidad
    if (scaleWeight > 0.010 && cart.length > 0 && posState === 'billing') {
      const activeElement = document.activeElement;
      const currentItem = cart[selectedCartIndex];
      
      if (activeElement?.id === `cart-item-input-${selectedCartIndex}` && currentItem?.product.sellByWeight) {
        // 1. Actualizar el peso en tiempo real mientras cambia
        updateQuantity(selectedCartIndex, scaleWeight);

        // 2. Lógica de Estabilidad: Si el peso se mantiene quieto 800ms, bloqueamos
        if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
        
        stabilityTimerRef.current = setTimeout(() => {
          // Si llegamos aquí, el peso es estable. Movemos el foco al buscador.
          // Esto "congela" el peso del item actual automáticamente.
          searchInputRef.current?.focus();
        }, 800);
      }
    }
  }, [scaleWeight]);

  // Reference for scanner focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Carga inmediata desde el caché (Instantánea)
    if (offlineStore.products.length > 0) setAllProducts(offlineStore.products as unknown as Product[]);
    if (offlineStore.customers.length > 0) setCustomers(offlineStore.customers);

    // 2. Lógica de Sincronización Inteligente
    const lastSync = offlineStore.lastSyncTime || 0;
    const oneHour = 60 * 60 * 1000;
    const shouldSync = Date.now() - lastSync > oneHour;

    if (offlineStore.isOnline) {
      fetchTenantData();
      checkClosureStatus();
      if (shouldSync || offlineStore.products.length === 0) {
        fetchAllData();
      }
    }
    
    // Listener para refresco manual desde el Header
    const handleForceSync = () => fetchAllData();
    window.addEventListener('force-sync', handleForceSync);

    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    // Identity update
    const savedName = localStorage.getItem('user_name');
    const savedRole = localStorage.getItem('user_role');
    if (savedName) setUserName(savedName);
    if (savedRole) setUserRole(savedRole);

    return () => window.removeEventListener('force-sync', handleForceSync);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Evitar atajos si se está escribiendo en un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') searchInputRef.current?.focus();
        return;
      }

      if (cart.length === 0) return;

      const currentIndex = selectedCartIndex;
      const item = cart[currentIndex];

      if (!item) {
        if (cart.length > 0) setSelectedCartIndex(0);
        return;
      }

      // Atajos de Cantidad (+ / -)
      if (e.key === '+' || e.key === 'Add') {
        e.preventDefault();
        const increment = item.product.sellByWeight ? 0.1 : 1;
        updateQuantity(currentIndex, item.quantity + increment);
      } else if (e.key === '-' || e.key === 'Subtract') {
        e.preventDefault();
        const decrement = item.product.sellByWeight ? 0.1 : 1;
        updateQuantity(currentIndex, item.quantity - decrement);
      }

      // Eliminar Item (Suprimir)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeFromCart(currentIndex);
      }

      // Navegar entre items (Flechas)
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCartIndex(Math.max(0, currentIndex - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCartIndex(Math.min(cart.length - 1, currentIndex + 1));
      }
      
      // Ir a Pago (Enter)
      if (e.key === 'Enter' && cart.length > 0 && posState === 'billing') {
        const target = e.target as HTMLElement;
        // Solo ir a pago si NO está en el buscador con texto (para no interferir con añadir productos)
        if (target === searchInputRef.current && searchTerm.trim() !== '') return;
        
        e.preventDefault();
        setPosState('payment');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, selectedCartIndex, posState]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchProducts(),
      fetchCustomers()
    ]);
    offlineStore.setLastSyncTime(Date.now());
  };

  const fetchTenantData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tenants/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTenantData({
          name: data.name,
          phone: data.phone || '+573207095554',
          location: data.location || 'Don Matías - Antioquia',
          rutNit: data.rutNit || '',
          ticketPaperSize: data.ticketPaperSize || '58mm',
          ticketAutoPrint: data.ticketAutoPrint || false,
          ticketHeaderMessage: data.ticketHeaderMessage || '',
          ticketFooterMessage: data.ticketFooterMessage || '',
        });
      }
    } catch (error) {
      console.error("Error fetching tenant data", error);
    }
  };

  const checkClosureStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales/closure/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHasOpenClosure(!!data?.closure);
      } else {
        setHasOpenClosure(false);
      }
    } catch (error) {
      console.error("Error checking closure status", error);
      setHasOpenClosure(true); // Permitir acceso en caso de error de red
    }
  };

  const fetchProducts = async () => {
    if (!offlineStore.isOnline) {
      setAllProducts(offlineStore.products as unknown as Product[]);
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllProducts(data);
        offlineStore.setCache({ products: data });
      } else {
        setAllProducts(offlineStore.products as unknown as Product[]);
      }
    } catch (error) {
      console.error("Error fetching products", error);
      setAllProducts(offlineStore.products as unknown as Product[]);
    }
  };

  const fetchCustomers = async () => {
    if (!offlineStore.isOnline) {
      setCustomers(offlineStore.customers as OfflineCustomer[]);
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        offlineStore.setCache({ customers: data });
      } else {
        setCustomers(offlineStore.customers as OfflineCustomer[]);
      }
    } catch (error) {
      console.error("Error fetching customers", error);
      setCustomers(offlineStore.customers as OfflineCustomer[]);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [{ product, quantity: 1 }, ...prev];
    });
    setSelectedCartIndex(0); // Enfocar el nuevo item o el actualizado
    setSearchTerm(''); // Clear scanner input
    
    // Foco Inteligente: Si es fruver, saltar al cuadro de peso
    if (product.sellByWeight) {
      setTimeout(() => {
        const input = document.getElementById(`cart-item-input-0`) as HTMLInputElement;
        input?.focus();
        input?.select();
      }, 50);
    } else {
      searchInputRef.current?.focus();
    }
  };

  const handleScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Tab') {
      if (filteredSuggestions.length > 0) {
        e.preventDefault();
        setSelectedSuggestionIndex(0);
      }
    } else if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        e.preventDefault();
        e.stopPropagation();
        addToCart(filteredSuggestions[selectedSuggestionIndex]);
        setSelectedSuggestionIndex(-1);
      } else if (searchTerm.trim() !== '') {
        e.preventDefault();
        e.stopPropagation();
        
        const term = searchTerm.toLowerCase().trim();
        // Solo auto-agregar si el código de barras coincide exactamente al 100%
        const found = allProducts.find(p => 
          (p.barcode && p.barcode.toLowerCase() === term)
        );
        
        if (found) {
          addToCart(found);
        } else {
          // Si no es un código exacto, no agregamos "basura". 
          // El usuario puede elegir de la lista de sugerencias que se muestra abajo.
          console.log('No barcode match for:', term);
        }
      } else if (cart.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        handleCheckout();
      }
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    // Ya no borramos automáticamente al llegar a <= 0 para evitar errores de teclado
    setCart(prev => prev.map((item, i) => i === index ? { ...item, quantity: newQty } : item));
  };

  const updatePrice = (productId: string, newPrice: string) => {
    // Permitir borrar completamente el campo (valor vacío)
    if (newPrice === '') {
      setCart(prev => prev.map(item => {
        if (item.product.id === productId) {
          return { ...item, product: { ...item.product, price: 0 } };
        }
        return item;
      }));
      return;
    }
    const price = parseCurrency(newPrice);
    
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { 
          ...item, 
          product: { ...item.product, price } 
        };
      }
      return item;
    }));
  };

  const removeFromCart = (index: number) => {
    setCart(prev => {
      const newCart = prev.filter((_, i) => i !== index);
      if (newCart.length === 0) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (selectedCartIndex >= newCart.length) {
        setSelectedCartIndex(newCart.length - 1);
      }
      return newCart;
    });
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const calculateRoundedTotal = () => {
    const rawTotal = calculateTotal();
    // Redondear al múltiplo de 50 más cercano (más justo)
    return Math.round(rawTotal / 50) * 50;
  };

  const calculateRoundingAdjustment = () => {
    return calculateRoundedTotal() - calculateTotal();
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMethod('efectivo'); 
    setCustomerName('');
    setNewCustomerPhone('');
    setIsNewCustomer(false);
    setSelectedCustomerId('');
    setPosState('payment');
    setCashReceived('');
    setLastCheckoutTime(Date.now()); // Cooldown start
    searchInputRef.current?.blur();
    setTimeout(() => document.getElementById('cash-received-input')?.focus(), 200);
  };

  const processSale = async () => {
    if (cart.length === 0 || isProcessing) return;

    const roundedTotal = calculateRoundedTotal();
    
    // VALIDACIÓN: Efectivo insuficiente
    if (paymentMethod === 'efectivo') {
      const received = parseCurrency(cashReceived);
      if (received < roundedTotal) {
        alert(`Falta dinero: El total es $${formatCurrency(roundedTotal)} y se recibió $${formatCurrency(received)}`);
        return;
      }
    }

    // VALIDACIÓN: Crédito sin cliente
    if (paymentMethod === 'credito' && !selectedCustomerId && !customerName) {
      alert('Debes seleccionar o escribir un nombre de cliente para ventas a crédito.');
      return;
    }

    setIsProcessing(true);
    const finalCustomerId = selectedCustomerId;
    const finalCustomerName = customerName || (selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : undefined);

    const rawTotal = calculateTotal();
    const adjustment = calculateRoundingAdjustment();

    const saleItems = cart.map(i => ({
      productId: i.product.id,
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: i.product.price,
      subtotal: i.product.price * i.quantity
    }));

    // Si hay ajuste, inyectarlo como un item virtual para que cuadre la contabilidad
    if (adjustment > 0) {
      saleItems.push({
        productId: 'rounding-adjustment',
        productName: 'Ajuste por Redondeo',
        quantity: 1,
        unitPrice: adjustment,
        subtotal: adjustment
      } as unknown as typeof saleItems[0]);
    }

    const payload = {
      totalAmount: roundedTotal,
      paymentMethod: paymentMethod,
      customerName: paymentMethod === 'credito' ? finalCustomerName : undefined,
      customerId: (paymentMethod === 'credito' && finalCustomerId) ? finalCustomerId : undefined,
      items: saleItems
    };

    try {
      const token = localStorage.getItem('access_token');
      
      // Si es un cliente nuevo, lo creamos primero
      if (paymentMethod === 'credito' && isNewCustomer && customerName) {
        if (offlineStore.isOnline) {
          const custRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({
              name: customerName,
              phone: newCustomerPhone,
              isCreditActive: true
            })
          });
          if (custRes.ok) {
            const newCust = await custRes.json();
            payload.customerId = newCust.id;
            payload.customerName = newCust.name;
          }
        } else {
          // OFFLINE - Creación de cliente temporal
          const uuid = crypto.randomUUID();
          const tempCustId = `temp-cust-${uuid}`;
          const newTempCust = {
            id: tempCustId,
            localId: tempCustId,
            name: customerName,
            phone: newCustomerPhone,
            totalDebt: calculateTotal(),
            pendingInvoices: 1
          };
          offlineStore.addPendingCustomer(newTempCust);
          payload.customerId = tempCustId;
          payload.customerName = customerName;
        }
      }

      if (offlineStore.isOnline) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales`, {
          method: 'POST',
          headers: { 
             'Content-Type': 'application/json',
             Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(payload)
        });
        if(res.ok) {
          const savedSale = await res.json();
          const saleWithItems = { 
            ...savedSale, 
            items: saleItems, // Usar saleItems que ya incluye el ajuste
            customerName: paymentMethod === 'credito' ? finalCustomerName : undefined,
            receivedAmount: paymentMethod === 'efectivo' ? Number(cashReceived) : 0,
            changeAmount: paymentMethod === 'efectivo' ? Math.max(0, Number(cashReceived) - roundedTotal) : 0
          };
          setCompletedSale(saleWithItems);
          setCart([]);
          setPosState('billing');
          fetchProducts();

          // Auto-print will be handled by useEffect watching completedSale
        } else {
          const err = await res.json();
          alert('Error al procesar la venta: ' + (err.message || 'Error desconocido'));
        }
      } else {
        queueOfflineSale(payload);
      }
    } catch (e) { 
      console.error(e);
      queueOfflineSale(payload);
    } finally {
      setIsProcessing(false);
    }
  };

  const queueOfflineSale = (payload: Record<string, unknown>) => {
    const uuid = crypto.randomUUID();
    const offlineId = 'off-' + uuid;
    const saleToStore: OfflineSale = { 
      localId: offlineId,
      items: (payload.items as OfflineSaleItem[]) ?? [],
      total: (payload.totalAmount as number) ?? 0,
      paymentMethod: (payload.paymentMethod as string) ?? 'efectivo',
      isCredit: payload.paymentMethod === 'credito',
      timestamp: Date.now(),
      receivedAmount: paymentMethod === 'efectivo' ? Number(cashReceived) : 0,
      changeAmount: paymentMethod === 'efectivo' ? Math.max(0, Number(cashReceived) - calculateTotal()) : 0,
      customerId: (payload.customerId as string | null | undefined) ?? undefined,
      customerName: (payload.customerName as string | null | undefined) ?? undefined,
    };
    offlineStore.addPendingSale(saleToStore);
    
    // UI Feedback
    const saleWithItems = { ...saleToStore, items: [...cart] };
    setCompletedSale(saleWithItems);
    setCart([]);
    setPosState('billing');
    setIsProcessing(false);
  };

  const syncPendingSales = async () => {
    const items = offlineStore.pendingSales;
    if (items.length === 0) return;

    const token = localStorage.getItem('access_token');

    for (const sale of [...items]) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(sale)
        });
        if (res.ok) {
           offlineStore.removePendingSale(sale.localId);
        }
      } catch (err) {
         console.error("Error syncing sale", sale.localId, err);
      }
    }
    fetchProducts();
  };

  // Auto-sync effect - DELEGADO AL SyncManager
  /* useEffect(() => {
    if (offlineStore.isOnline && offlineStore.pendingSales.length > 0) {
      syncPendingSales();
    }
  }, [offlineStore.isOnline]); */

  const handlePrintAndReset = () => {
    window.print();
    setCompletedSale(null);
    setShowChangeModal(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handlePrintWithChangeModal = () => {
    // Convertir a número por seguridad y redondear para evitar problemas de coma flotante
    const change = Math.round(Number(completedSale?.changeAmount || 0));

    if (completedSale?.paymentMethod?.toLowerCase() === 'efectivo' && change > 0) {
      setShowChangeModal(true);
      // Esperar 4 segundos antes de imprimir automáticamente
      setTimeout(() => {
        handlePrintAndReset();
      }, 1500);
    } else {
      handlePrintAndReset();
    }
  };

  // Autocaptura global para usar TODO con 'ENTER'
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Evitar conflictos si el usuario está en un input pero NO es el de búsqueda o el de nombre de cliente
      if (document.activeElement?.tagName === 'INPUT' && 
          document.activeElement !== searchInputRef.current && 
          !(posState === 'payment' && paymentMethod === 'credito') &&
          document.activeElement?.id !== 'cash-received-input') {
        return;
      }

      if (e.key === 'Enter') {
        if (completedSale) {
          e.preventDefault();
          handlePrintWithChangeModal();
        } else if (posState === 'payment' && !isProcessing) {
          // No procesar si acaba de entrar en modo pago (cooldown 800ms para evitar doble enter)
          if (Date.now() - lastCheckoutTime < 800) return; 
          
          // Si estamos en el input de efectivo, el primer Enter solo muestra el cambio (ya se muestra en tiempo real)
          // Pero si queremos ser extra seguros, podemos pedir un segundo Enter.
          // Por ahora, permitimos Enter pero aseguramos que el usuario sepa que CONFIRMA.
          
          e.preventDefault();
          processSale();
        }
      } else if (e.key === 'Escape') {
        if (completedSale) {
          setCompletedSale(null);
          setTimeout(() => searchInputRef.current?.focus(), 100);
        } else if (posState === 'payment') {
          setPosState('billing');
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
      } else if (posState === 'payment') {
        // Atajos en modo de pago: Solo si NO estamos escribiendo en un input
        if (document.activeElement?.tagName === 'INPUT') return;

        if (e.key === '1' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          setPaymentMethod('efectivo');
          setTimeout(() => document.getElementById('cash-received-input')?.focus(), 100);
        }
        if (e.key === '2' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          setPaymentMethod('credito');
          setTimeout(() => document.getElementById('credit-customer-name')?.focus(), 100);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [completedSale, posState, isProcessing, cart, paymentMethod, cashReceived, lastCheckoutTime, customerName, selectedCustomerId, isNewCustomer]);


  // Efecto para auto-impresión supervisada por el modal de cambio
  useEffect(() => {
    if (completedSale && tenantData.ticketAutoPrint && !showChangeModal) {
      // Pequeño delay para que el modal de ticket (el primero) logre renderizar sus datos
      const timer = setTimeout(() => {
        handlePrintWithChangeModal();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [completedSale, tenantData.ticketAutoPrint]);

  // Sugerencias visuales robustas
  const filteredSuggestions = searchTerm.length > 1 
    ? allProducts.filter(p => {
        const term = searchTerm.toLowerCase().trim();
        const nameMatch = p.name.toLowerCase().includes(term);
        const barcodeMatch = p.barcode && p.barcode.toLowerCase().includes(term);
        return nameMatch || barcodeMatch;
      })
    : [];

  // Bloqueo de Caja Cerrada
  if (hasOpenClosure === false && offlineStore.isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-slate-950 p-8 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl max-w-lg space-y-8 animate-in zoom-in-95 duration-500">
          <div className="bg-amber-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-12 h-12 text-amber-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">Caja Cerrada</h2>
            <p className="text-slate-400 font-medium">No puede realizar ventas sin antes haber realizado la apertura de caja.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/closure')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-blue-900/30 active:scale-95 transition-all"
          >
            Ir a Apertura de Caja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:flex-row overflow-hidden bg-gray-50 dark:bg-[#0f172a] transition-colors rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
      
      {/* Mobile Tabs Switcher */}
      <div className="md:hidden flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-4 text-sm font-black transition-all ${activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500'}`}
        >
          PRODUCTOS
        </button>
        <button 
          onClick={() => setActiveTab('cart')}
          className={`flex-1 py-4 text-sm font-black transition-all relative ${activeTab === 'cart' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500'}`}
        >
          CARRITO
          {cart.length > 0 && (
            <span className="absolute top-3 right-8 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Lado Izquierdo: Productos y Escáner (65%) */}
      <div className={`flex-1 flex flex-col p-4 md:p-6 overflow-hidden ${activeTab !== 'products' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Caja Registradora</h2>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{tenantData.name} • {tenantData.location}</p>
          </div>
          <div className="flex items-center gap-3">
            {isScaleConnected ? (
              <button onClick={disconnectScale} className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 transition-all hover:bg-emerald-100">
                <Scale className="w-4 h-4 mr-1.5" />
                {scaleWeight.toFixed(3)} kg
              </button>
            ) : (
              <button onClick={connectScale} className="flex items-center text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-200 dark:hover:bg-slate-700">
                <Scale className="w-4 h-4 mr-1.5" />
                Conectar Báscula
              </button>
            )}
            {offlineStore.pendingSales.length > 0 && (
              <div className="flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full animate-pulse">
                <CloudSync className="w-4 h-4 mr-1.5" />
                {offlineStore.pendingSales.length} {offlineStore.pendingSales.length === 1 ? 'venta pendiente' : 'ventas pendientes'}
              </div>
            )}
          </div>
        </div>
        
        {/* Barra Búsqueda / Escáner */}
        <div className="relative mb-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            className="block w-full rounded-2xl border-0 py-4 pl-12 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 dark:bg-slate-900 dark:text-white dark:ring-slate-800 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-lg sm:leading-6 transition-all"
            placeholder="Escanea el código de barras o busca por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.replace(/[^a-zA-Z0-9\s]/g, ''))}
            onKeyDown={handleScannerInput}
            autoFocus
          />
          {searchTerm && (
            <div className="absolute right-4 top-4 text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">ENTER para agregar</div>
          )}
        </div>

        {/* Resultados Sugeridos (Solo se muestran si escriben manual y no escaner instantáneo) */}
        {searchTerm.length > 1 && (
          <div className="flex-1 overflow-y-auto mb-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3 pt-2">Resultados de búsqueda</h3>
            {filteredSuggestions.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No se encontraron productos.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredSuggestions.map((product, index) => (
                  <li 
                    key={product.id} 
                    onClick={() => addToCart(product)}
                    className={`flex justify-between items-center p-3 rounded-xl cursor-pointer border transition-colors ${
                      selectedSuggestionIndex === index 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-500/20 scale-[1.02]' 
                        : 'bg-white dark:bg-slate-900 border-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-100 dark:hover:border-blue-800/50'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className={`text-sm font-bold truncate ${selectedSuggestionIndex === index ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{product.name}</p>
                      <p className={`text-xs mt-0.5 truncate ${selectedSuggestionIndex === index ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{product.barcode || 'Sin Código'}</p>
                    </div>
                    <p className={`text-sm font-semibold whitespace-nowrap ml-2 ${selectedSuggestionIndex === index ? 'text-white' : 'text-green-600 dark:text-green-400'}`}>
                      ${Math.round(product.price).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Botones de Categorías Rápidas (Placeholder) */}
        {!searchTerm && (
            <div className="flex-1 overflow-y-auto bg-gray-100/50 dark:bg-slate-800/30 rounded-2xl border border-gray-200 border-dashed dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4">
                <Tag className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">¡Bienvenido, {userName}!</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-1">
                Perfil: {userRole === 'OWNER' ? 'Dueño / Administrador' : 'Vendedor / Cajero'}
              </p>
              <div className="mt-4 px-4 py-2 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700">
                <p className="text-sm font-black text-gray-700 dark:text-gray-300">{tenantData.name}</p>
                <p className="text-xs font-semibold text-gray-500">{tenantData.location}</p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 max-w-sm">
                El teclado es tu mejor amigo. Escanea un producto, o si la barra está vacía, oprime <strong>ENTER</strong> para ir a cobrar directamente.
              </p>
            </div>
         )}
      </div>

      {/* Lado Derecho: Carrito de Compras (35%) */}
      <div className={`w-full md:w-[400px] lg:w-[450px] bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col shadow-xl z-10 transition-all ${activeTab !== 'cart' ? 'hidden md:flex' : 'flex'}`}>
        {/* Cabecera dinámica del Sidebar */}
        <div className={`p-5 border-b border-gray-200 dark:border-slate-800 transition-colors ${posState === 'payment' ? 'bg-blue-600 dark:bg-blue-600' : 'bg-gray-50/50 dark:bg-slate-800/50'}`}>
          <div className="flex justify-between items-center">
            <h2 className={`text-lg font-bold flex items-center ${posState === 'payment' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              <ShoppingCart className="w-5 h-5 mr-2" />
              {posState === 'billing' ? 'Carrito de Compras' : 'PASO 2: SELECCIONE PAGO'}
            </h2>
            <span className={`${posState === 'payment' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'} text-xs font-semibold px-2.5 py-0.5 rounded-full`}>
              {cart.reduce((acc, item) => acc + item.quantity, 0)} Items
            </span>
          </div>
        </div>
        
        {/* Lista de Items O Vista de Pago */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#0f172a]">
          {posState === 'billing' ? (
            cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 space-y-4">
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">El carrito está vacío</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div 
                    key={item.product.id} 
                    onClick={() => setSelectedCartIndex(idx)}
                    className={`p-3 rounded-xl shadow-sm border flex justify-between items-center transition-all cursor-pointer ${
                      selectedCartIndex === idx 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/10' 
                        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className={`text-sm font-bold truncate ${selectedCartIndex === idx ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`} title={item.product.name}>
                        {item.product.name}
                      </h4>
                      <div className="relative mt-1 group">
                        <span className="absolute left-0 top-0 text-[10px] text-gray-400 group-focus-within:text-blue-500 transition-colors font-bold">$</span>
                        <input 
                          type="number"
                          title="Cambiar precio unitario"
                          className="w-full pl-3 bg-transparent text-sm font-black text-green-600 dark:text-green-400 focus:outline-none focus:ring-0 border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={item.product.price === 0 ? '' : Math.round(item.product.price)}
                          onChange={(e) => updatePrice(item.product.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-gray-100 dark:bg-slate-900 rounded-xl p-1 border border-gray-200 dark:border-slate-700">
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(idx, item.quantity - 1); }} className="p-3 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-90">
                          <Minus className="w-5 h-5" />
                        </button>
                        <div className="relative flex items-center">
                          {item.product.sellByWeight && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Peso</span>
                          )}
                          <input 
                            id={`cart-item-input-${idx}`}
                            type="number"
                            step="any"
                            className="w-16 text-center text-base font-black text-gray-900 dark:text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.00"
                            value={item.quantity || ''}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                searchInputRef.current?.focus();
                              }
                              if (e.key === 'Delete' || e.key === 'Backspace') {
                                // No dejamos que el evento llegue al listener global que borra el item
                                e.stopPropagation();
                                if (e.key === 'Delete') updateQuantity(idx, 0);
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              const product = item.product;
                              const parsed = product.sellByWeight ? parseFloat(val) : parseInt(val);
                              updateQuantity(idx, isNaN(parsed) ? 0 : parsed);
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(idx, item.quantity + (item.product.sellByWeight ? 0.1 : 1)); }} className="p-3 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-90">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-col items-center">
                        <button onClick={(e) => { e.stopPropagation(); removeFromCart(idx); }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {item.product.sellByWeight && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              document.getElementById(`cart-item-input-${idx}`)?.focus(); 
                            }}
                            className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-1 rounded transition-colors uppercase"
                            title="Capturar peso actual"
                          >
                            {item.product.unit}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Vista de Selección de Pago */
            <div className="h-full flex flex-col items-center justify-start py-8 p-2 animate-in slide-in-from-right-4 duration-300">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
                <Banknote className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-2">Paso Final</p>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-8 text-center">¿Cómo paga el cliente?</h3>
              
              <div className="grid grid-cols-1 gap-4 w-full px-4 mb-2">
                {/* Opción de Crédito Arriba */}
                <button 
                  onClick={() => setPaymentMethod('credito')}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                      e.preventDefault();
                      setPaymentMethod('efectivo');
                      setTimeout(() => document.getElementById('cash-received-input')?.focus(), 100);
                    }
                  }}
                  className={`flex items-center gap-4 p-5 border-2 rounded-3xl font-black transition-all outline-none focus:ring-4 focus:ring-orange-500/40 ${paymentMethod === 'credito' ? 'border-orange-600 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-400 ring-4 ring-orange-500/10' : 'border-gray-200 text-gray-500 dark:border-slate-800 dark:text-gray-400'}`}
                >
                  <div className={`p-3 rounded-2xl ${paymentMethod === 'credito' ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}`}>
                    <ArrowRightLeft className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm">A CRÉDITO</p>
                    <p className="text-[10px] font-bold opacity-60">TAB PARA NOMBRE</p>
                  </div>
                </button>

                {/* Opción de Efectivo Abajo del Crédito */}
                <button 
                  onClick={() => {
                    setPaymentMethod('efectivo');
                    setTimeout(() => document.getElementById('cash-received-input')?.focus(), 100);
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      setPaymentMethod('credito');
                    }
                  }}
                  className={`flex items-center gap-4 p-5 border-2 rounded-3xl font-black transition-all outline-none focus:ring-4 focus:ring-blue-500/40 ${paymentMethod === 'efectivo' ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400 ring-4 ring-blue-500/10' : 'border-gray-200 text-gray-500 dark:border-slate-800 dark:text-gray-400'}`}
                >
                  <div className={`p-3 rounded-2xl ${paymentMethod === 'efectivo' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}`}>
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm">EFECTIVO</p>
                    <p className="text-[10px] font-bold opacity-60">TAB PARA SIGUIENTE</p>
                  </div>
                </button>
              </div>

              {paymentMethod === 'efectivo' && (
                <div className="w-full px-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-3xl border-2 border-blue-500/30">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">VALOR RECIBIDO</span>
                        {Number(cashReceived) > 0 && (
                          <button 
                            onClick={() => setCashReceived('')}
                            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            LIMPIAR
                          </button>
                        )}
                      </div>
                      
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-blue-300">$</span>
                        <input
                          type="text"
                          id="cash-received-input"
                          value={formatCurrency(cashReceived)}
                          onChange={(e) => setCashReceived(parseCurrency(e.target.value).toString())}
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl pl-10 pr-4 py-3 text-2xl font-black text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                          onFocus={(e) => e.target.select()}
                        />
                      </div>

                      {parseCurrency(cashReceived) > 0 && (
                        <div className={`mt-1 p-3 rounded-2xl flex justify-between items-center ${parseCurrency(cashReceived) >= calculateRoundedTotal() ? 'bg-green-600 text-white' : 'bg-rose-600 text-white'}`}>
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {parseCurrency(cashReceived) >= calculateRoundedTotal() ? 'CAMBIO A DEVOLVER' : 'FALTA DINERO'}
                          </span>
                          <span className="text-xl font-black">
                            ${formatCurrency(Math.abs(parseCurrency(cashReceived) - calculateRoundedTotal()))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col items-center gap-1 opacity-50">
                <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <span className="bg-gray-200 dark:bg-slate-800 px-1 py-0.5 rounded">↑ ↓</span> Flechas para elegir
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <span className="bg-gray-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[8px]">ESC</span> para volver al carrito
                </p>
              </div>

              {paymentMethod === 'credito' && (
                <div className="w-full px-4 mt-6 animate-in fade-in zoom-in-95 duration-200 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-2xl border-2 border-orange-500/10 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">¿Es un cliente nuevo?</span>
                    <button 
                      onClick={() => setIsNewCustomer(!isNewCustomer)}
                      className={`w-10 h-5 rounded-full flex items-center transition-all ${isNewCustomer ? 'bg-orange-600 justify-end px-1' : 'bg-gray-300 dark:bg-slate-800 justify-start px-1'}`}
                    >
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </button>
                  </div>

                  {isNewCustomer ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nombre completo del cliente"
                        className="w-full bg-white dark:bg-slate-950 border-2 border-orange-500/50 rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-black focus:ring-4 focus:ring-orange-500/20 transition-all outline-none"
                      />
                      <input
                        type="text"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        placeholder="Teléfono (Opcional)"
                        className="w-full bg-white dark:bg-slate-950 border-2 border-orange-500/30 rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-black focus:ring-4 focus:ring-orange-500/20 transition-all outline-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                      <select
                        className="w-full bg-white dark:bg-slate-950 border-2 border-orange-500/30 rounded-2xl px-4 py-4 text-gray-900 dark:text-white font-black focus:ring-4 focus:ring-orange-500/20 transition-all outline-none"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                      >
                        <option value="">-- Seleccionar de la lista --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {Number(c.totalDebt) > 0 ? `($${formatCurrency(Number(c.totalDebt))})` : ''}</option>
                        ))}
                      </select>

                      <div className="relative flex items-center gap-2">
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase font-mono">O escribe uno rápido</span>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                      </div>

                      <input
                        type="text"
                        id="credit-customer-name"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (e.target.value) setSelectedCustomerId('');
                        }}
                        placeholder="Escribe el nombre aquí..."
                        className="w-full bg-white dark:bg-slate-950 border-2 border-orange-500/30 rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-black focus:ring-4 focus:ring-orange-500/20 transition-all outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp' && customerName === '') {
                             e.preventDefault();
                             setPaymentMethod('efectivo');
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <p className="mt-auto pt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center px-4">
                La venta se registrará en contabilidad al dar confirmar
              </p>
            </div>
          )}
        </div>

        {/* Resumen de Pago */}
        <div className="p-5 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          <div className="space-y-1 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-gray-500">Subtotal</span>
              <span className="font-black text-gray-500">${formatCurrency(calculateTotal())}</span>
            </div>
            {calculateRoundingAdjustment() > 0 && (
              <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400">
                <span className="font-bold italic">Ajuste por Redondeo</span>
                <span className="font-black">+ ${formatCurrency(calculateRoundingAdjustment())}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
              <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                ${formatCurrency(calculateRoundedTotal())}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              disabled={
                cart.length === 0 || 
                isProcessing || 
                (posState === 'payment' && paymentMethod === 'efectivo' && parseCurrency(cashReceived) < calculateRoundedTotal()) ||
                (posState === 'payment' && paymentMethod === 'credito' && !selectedCustomerId && !customerName)
              }
              tabIndex={0}
              onClick={posState === 'billing' ? handleCheckout : processSale}
              className={`flex-1 ${posState === 'payment' ? 'bg-green-600 hover:bg-green-500 outline-none focus:ring-4 focus:ring-green-500/40' : 'bg-blue-600 hover:bg-blue-500'} disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-2xl py-4 font-black text-lg shadow-lg transition-all active:scale-[0.98] flex justify-center items-center`}
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                   Procesando...
                </div>
              ) : (
                <>
                  <Banknote className="w-6 h-6 mr-2" />
                  {posState === 'billing' ? 'Cobrar Total (Enter)' : 'Confirmar Venta (Enter)'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Mobile Bottom Bar for Quick Checkout */}
      {cart.length > 0 && activeTab === 'products' && posState === 'billing' && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 bg-blue-600 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between z-30 animate-in slide-in-from-bottom-4 duration-300">
          <div>
            <p className="text-[10px] font-black opacity-70 uppercase">Total Carrito</p>
            <p className="text-xl font-black">${formatCurrency(calculateRoundedTotal())}</p>
          </div>
          <button 
            onClick={() => setActiveTab('cart')}
            className="bg-white text-blue-600 px-6 py-2 rounded-xl font-black text-sm active:scale-95 transition-transform"
          >
            Pagar Ahora
          </button>
        </div>
      )}

      {/* Modal de Ticket / Recibo */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Cabecera de Estado Explicativa */}
            <div className="bg-green-600 text-white p-4 text-center">
              <h3 className="text-lg font-black uppercase tracking-wider">¡Venta Completada!</h3>
              <p className="text-xs opacity-90 font-bold">Registrada con éxito en contabilidad</p>
            </div>

            {/* Contenido del Ticket - Emulación dinámica POS */}
            <div 
              className="bg-white p-1 overflow-hidden"
              style={{ width: tenantData.ticketPaperSize === '80mm' ? '80mm' : '58mm', margin: '0 auto' }}
            >
              <pre 
                id="printable-receipt" 
                className={`bg-white text-black font-mono font-bold leading-tight whitespace-pre text-left print:p-0 print:m-0`}
                style={{ 
                  fontSize: tenantData.ticketPaperSize === '80mm' ? '12px' : '10px',
                  width: '100%',
                  color: '#000000', 
                  fontWeight: 900, 
                  WebkitPrintColorAdjust: 'exact', 
                  printColorAdjust: 'exact' 
                }}
              >
{(() => {
  const is80mm = tenantData.ticketPaperSize === '80mm';
  const lineLength = is80mm ? 32 : 24;
  const divider = '-'.repeat(lineLength);
  
  const centerText = (text: string) => {
    if (!text) return '';
    if (text.length >= lineLength) return text.substring(0, lineLength);
    const leftPad = Math.floor((lineLength - text.length) / 2);
    return ' '.repeat(leftPad) + text;
  };
  
  const formatLine = (left: string, right: string) => {
    const spaceNeeded = lineLength - left.length - right.length;
    if (spaceNeeded > 0) {
      return left + ' '.repeat(spaceNeeded) + right;
    } else {
      const truncatedLeft = left.substring(0, lineLength - right.length - 1);
      return truncatedLeft + ' ' + right;
    }
  };

  const lines = [
    centerText(tenantData.name.toUpperCase()),
    tenantData.rutNit ? centerText(`NIT: ${tenantData.rutNit}`) : '',
    centerText(`TEL: ${tenantData.phone}`),
    tenantData.location ? centerText(tenantData.location) : '',
    ''
  ];

  if (tenantData.ticketHeaderMessage) {
    const headerMsg = tenantData.ticketHeaderMessage.split('\n');
    headerMsg.forEach(m => lines.push(centerText(m)));
    lines.push('');
  }

  lines.push(divider);
  lines.push(centerText('DOCUMENTO POS'));
  lines.push(centerText(`No: ${completedSale.invoiceNumber || 'POS-' + (completedSale.id ? completedSale.id.toString().substring(0,6).toUpperCase() : '000123')}`));
  lines.push(divider);
  lines.push(formatLine('Fecha:', new Date(completedSale.createdAt ?? Date.now()).toLocaleDateString('es-CO')));
  lines.push(formatLine('Hora:', new Date(completedSale.createdAt ?? Date.now()).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })));
  lines.push('');

  const items = completedSale.items || [];
  const adjustmentItem = items.find((i: CartItem) => i.productId === 'rounding-adjustment');
  const itemsToPrint = items.filter((i: CartItem) => i.productId !== 'rounding-adjustment');
  const rawSubtotal = Number(completedSale.totalAmount || 0) - (adjustmentItem ? Number(adjustmentItem.subtotal as number) : 0);

  itemsToPrint.forEach((item: CartItem) => {
    const name = (item.productName as string) || item.product.name;
    const priceRound = formatCurrency(Math.round(((item.unitPrice as number) || item.product.price) * item.quantity));
    const leftInfo = `${name.substring(0, is80mm ? 16 : 11)} x${item.quantity}`;
    lines.push(formatLine(leftInfo, priceRound));
  });

  lines.push('');
  lines.push(divider);
  lines.push(formatLine('Subtotal', formatCurrency(rawSubtotal)));
  if (adjustmentItem) {
    lines.push(formatLine('Ajuste Redondeo', formatCurrency(adjustmentItem.subtotal)));
  }
  lines.push(formatLine('IVA (0%)', '0'));
  lines.push(formatLine('TOTAL', formatCurrency(completedSale.totalAmount)));
  lines.push(divider);
  lines.push('');
  const pMethod = completedSale.paymentMethod || 'efectivo';
  lines.push(`Pago: ${pMethod.toUpperCase()}`);
  if (pMethod === 'efectivo') {
    lines.push(formatLine('Recibido:', formatCurrency(completedSale.receivedAmount || 0)));
    lines.push(formatLine('Cambio:', formatCurrency(completedSale.changeAmount || 0)));
  }
  if (pMethod === 'credito' && completedSale.customerName) {
    lines.push(centerText(completedSale.customerName.toUpperCase()));
  }
  
  if (tenantData.ticketFooterMessage) {
    lines.push('');
    lines.push(divider);
    const footerMsg = tenantData.ticketFooterMessage.split('\n');
    footerMsg.forEach(m => lines.push(centerText(m)));
  } else {
    lines.push(divider);
    lines.push(centerText('Gracias por su compra'));
  }
  lines.push('');
  
  return lines.filter(l => l !== null).join('\n');
})()}
              </pre>
            </div>
            
            {/* Botones de Acción */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-3 print:hidden">
              <button 
                onClick={() => {
                  setCompletedSale(null);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }} 
                className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors"
              >
                Cerrar (Esc)
              </button>
              <button 
                onClick={handlePrintWithChangeModal} 
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                autoFocus
              >
                🖨️ Imprimir (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cambio Llamativo - Redimensionado */}
      {showChangeModal && completedSale && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-blue-600 dark:bg-blue-700 text-center p-10 rounded-[40px] shadow-2xl border-4 border-white/20 max-w-lg w-full mx-4 animate-in zoom-in-95 duration-500">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-6 shadow-xl animate-bounce">
              <Banknote className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">
              ENTREGAR CAMBIO
            </h2>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border-2 border-white/20 shadow-inner">
              <p className="text-6xl md:text-8xl font-black text-white drop-shadow-lg">
                ${formatCurrency(completedSale.changeAmount)}
              </p>
            </div>
            <p className="mt-8 text-blue-100 text-sm font-bold animate-pulse flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-200 rounded-full animate-ping" />
              Imprimiendo ticket automáticamente...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
