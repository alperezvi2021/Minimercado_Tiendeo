'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Tag, Wifi, WifiOff, CloudSync, ArrowRightLeft } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  stock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function PosPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posState, setPosState] = useState<'billing' | 'payment'>('billing');
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'credito'>('efectivo');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCheckoutTime, setLastCheckoutTime] = useState(0); 
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [userName, setUserName] = useState('Usuario');
  const [userRole, setUserRole] = useState('CASHIER');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [showChangeModal, setShowChangeModal] = useState(false);
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
  
  // Reference for scanner focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    fetchProducts();
    fetchTenantData();
    fetchCustomers();
    loadPendingSales();
    // Auto-focus on mount for rapid scanning
    searchInputRef.current?.focus();

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingSales();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Identity update
    const savedName = localStorage.getItem('user_name');
    const savedRole = localStorage.getItem('user_role');
    if (savedName) setUserName(savedName);
    if (savedRole) setUserRole(savedRole);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const loadPendingSales = () => {
    const saved = localStorage.getItem('pending_sales');
    if (saved) setPendingSales(JSON.parse(saved));
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllProducts(data);
        localStorage.setItem('cached_products', JSON.stringify(data));
      } else {
        loadCachedProducts();
      }
    } catch (error) {
      console.error("Error fetching products", error);
      loadCachedProducts();
    }
  };

  const loadCachedProducts = () => {
    const cached = localStorage.getItem('cached_products');
    if (cached) {
      setAllProducts(JSON.parse(cached));
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Error fetching customers", error);
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
    setSearchTerm(''); // Clear scanner input
    searchInputRef.current?.focus(); // Regain focus
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
    } else if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        e.preventDefault();
        e.stopPropagation();
        addToCart(filteredSuggestions[selectedSuggestionIndex]);
        setSelectedSuggestionIndex(-1);
      } else if (searchTerm.trim() !== '') {
        e.preventDefault();
        e.stopPropagation();
        const found = allProducts.find(p => p.barcode === searchTerm || p.name.toLowerCase() === searchTerm.toLowerCase());
        if (found) addToCart(found);
      } else if (cart.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        handleCheckout();
      }
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + change;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
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
    let finalCustomerId = selectedCustomerId;
    let finalCustomerName = customerName || (selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : undefined);

    const payload = {
      totalAmount: calculateTotal(),
      paymentMethod: paymentMethod,
      customerName: paymentMethod === 'credito' ? finalCustomerName : undefined,
      customerId: (paymentMethod === 'credito' && finalCustomerId) ? finalCustomerId : undefined,
      items: cart.map(i => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.product.price,
        subtotal: i.product.price * i.quantity
      }))
    };

    try {
      const token = localStorage.getItem('access_token');
      
      // Si es un cliente nuevo, lo creamos primero
      if (paymentMethod === 'credito' && isNewCustomer && customerName) {
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
          // Update payload with real customer info if created
          payload.customerId = newCust.id;
          payload.customerName = newCust.name;
        }
      }

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
          items: [...cart],
          customerName: paymentMethod === 'credito' ? finalCustomerName : undefined,
          receivedAmount: paymentMethod === 'efectivo' ? Number(cashReceived) : 0,
          changeAmount: paymentMethod === 'efectivo' ? Math.max(0, Number(cashReceived) - calculateTotal()) : 0
        };
        setCompletedSale(saleWithItems);
        setCart([]);
        setPosState('billing');
        fetchProducts();

        // Auto-print logic
        if (tenantData.ticketAutoPrint) {
          setTimeout(() => {
            window.print();
            setCompletedSale(null);
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }, 500);
        }
      } else {
        const err = await res.json();
        alert('Error al procesar la venta: ' + (err.message || 'Error desconocido'));
      }
    } catch (e) { 
      console.error(e);
      queueOfflineSale(payload);
    } finally {
      setIsProcessing(false);
    }
  };

  const queueOfflineSale = (payload: any) => {
    const offlineId = 'off-' + Date.now();
    const saleToStore = { 
      ...payload, 
      id: offlineId, 
      createdAt: new Date().toISOString(), 
      offline: true,
      receivedAmount: paymentMethod === 'efectivo' ? Number(cashReceived) : 0,
      changeAmount: paymentMethod === 'efectivo' ? Math.max(0, Number(cashReceived) - calculateTotal()) : 0
    };
    const newPending = [...pendingSales, saleToStore];
    setPendingSales(newPending);
    localStorage.setItem('pending_sales', JSON.stringify(newPending));
    
    // UI Feedback
    const saleWithItems = { ...saleToStore, items: [...cart] };
    setCompletedSale(saleWithItems);
    setCart([]);
    setPosState('billing');
    setIsProcessing(false);

    // Auto-print logic for offline
    if (tenantData.ticketAutoPrint) {
      setTimeout(() => {
        window.print();
        setCompletedSale(null);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }, 500);
    }
  };

  const syncPendingSales = async () => {
    const saved = localStorage.getItem('pending_sales');
    if (!saved) return;
    const items = JSON.parse(saved);
    if (items.length === 0) return;

    const token = localStorage.getItem('access_token');
    const remaining: any[] = [];

    for (const sale of items) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(sale)
        });
        if (!res.ok) {
          remaining.push(sale);
        }
      } catch (err) {
        remaining.push(sale);
      }
    }

    setPendingSales(remaining);
    localStorage.setItem('pending_sales', JSON.stringify(remaining));
    if (remaining.length === 0) {
      console.log("Ventas offline sincronizadas con éxito.");
      fetchProducts();
    }
  };

  const handlePrintAndReset = () => {
    window.print();
    setCompletedSale(null);
    setShowChangeModal(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handlePrintWithChangeModal = () => {
    if (completedSale?.paymentMethod === 'efectivo' && completedSale?.changeAmount > 0) {
      setShowChangeModal(true);
      // Esperar 4 segundos antes de imprimir automáticamente
      setTimeout(() => {
        handlePrintAndReset();
      }, 4000);
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
        if (e.key === '2' || e.key === 'ArrowRight' || e.key === 'ArrowDown') setPaymentMethod('credito');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [completedSale, posState, isProcessing, cart, paymentMethod, cashReceived, lastCheckoutTime, customerName, selectedCustomerId, isNewCustomer]);


  // Sugerencias visuales si tipean en vez de escanear
  const filteredSuggestions = searchTerm.length > 1 
    ? allProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.barcode && p.barcode.includes(searchTerm))
      )
    : [];

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
            {pendingSales.length > 0 && (
              <div className="flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full animate-pulse">
                <CloudSync className="w-4 h-4 mr-1.5" />
                {pendingSales.length} {pendingSales.length === 1 ? 'venta pendiente' : 'ventas pendientes'}
              </div>
            )}
            <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              isOnline 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-bounce'
            }`}>
              {isOnline ? <Wifi className="w-4 h-4 mr-1.5" /> : <WifiOff className="w-4 h-4 mr-1.5" />}
              {isOnline ? 'Online' : 'Trabajando Offline'}
            </div>
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
                      ${Math.round(product.price).toLocaleString('es-CO')}
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
                {cart.map((item) => (
                  <div key={item.product.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center transition-colors">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate" title={item.product.name}>
                        {item.product.name}
                      </h4>
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-0.5">
                        ${Math.round(item.product.price).toLocaleString('es-CO')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-gray-100 dark:bg-slate-900 rounded-lg p-0.5 border border-gray-200 dark:border-slate-700">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                          type="number"
                          id="cash-received-input"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="0"
                          className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl pl-10 pr-4 py-3 text-2xl font-black text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                          onFocus={(e) => e.target.select()}
                        />
                      </div>

                      {Number(cashReceived) > 0 && (
                        <div className={`mt-1 p-3 rounded-2xl flex justify-between items-center ${Number(cashReceived) >= calculateTotal() ? 'bg-green-600 text-white' : 'bg-rose-600 text-white'}`}>
                          <span className="text-[10px] font-black uppercase tracking-wider">
                            {Number(cashReceived) >= calculateTotal() ? 'CAMBIO A DEVOLVER' : 'FALTA DINERO'}
                          </span>
                          <span className="text-xl font-black">
                            ${Math.abs(Number(cashReceived) - calculateTotal()).toLocaleString('es-CO')}
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
                          <option key={c.id} value={c.id}>{c.name} {c.totalDebt > 0 ? `($${Math.round(c.totalDebt).toLocaleString()})` : ''}</option>
                        ))}
                      </select>

                      <div className="relative flex items-center gap-2">
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase font-mono">O escribe uno rápido</span>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                      </div>

                      <input
                        type="text"
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
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
            <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
              ${Math.round(calculateTotal()).toLocaleString('es-CO')}
            </span>
          </div>
          
          <div className="flex gap-2">
            <button 
              disabled={
                cart.length === 0 || 
                isProcessing || 
                (posState === 'payment' && paymentMethod === 'efectivo' && Number(cashReceived) < Math.round(calculateTotal())) ||
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
            <p className="text-xl font-black">${Math.round(calculateTotal()).toLocaleString('es-CO')}</p>
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
  lines.push(formatLine('Fecha:', new Date(completedSale.createdAt).toLocaleDateString('es-CO')));
  lines.push(formatLine('Hora:', new Date(completedSale.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })));
  lines.push('');

  completedSale.items.forEach((item: any) => {
    const name = item.productName || item.product.name;
    const priceRound = Math.round((item.unitPrice || item.product.price) * item.quantity).toLocaleString('es-CO');
    const leftInfo = `${name.substring(0, is80mm ? 16 : 11)} x${item.quantity}`;
    lines.push(formatLine(leftInfo, priceRound));
  });

  lines.push('');
  lines.push(divider);
  lines.push(formatLine('Subtotal', Math.round(completedSale.totalAmount).toLocaleString('es-CO')));
  lines.push(formatLine('IVA (0%)', '0'));
  lines.push(formatLine('TOTAL', Math.round(completedSale.totalAmount).toLocaleString('es-CO')));
  lines.push(divider);
  lines.push('');
  lines.push(`Pago: ${completedSale.paymentMethod.toUpperCase()}`);
  if (completedSale.paymentMethod === 'efectivo') {
    lines.push(formatLine('Recibido:', Math.round(completedSale.receivedAmount || 0).toLocaleString('es-CO')));
    lines.push(formatLine('Cambio:', Math.round(completedSale.changeAmount || 0).toLocaleString('es-CO')));
  }
  if (completedSale.paymentMethod === 'credito' && completedSale.customerName) {
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

      {/* Modal de Cambio Llamativo */}
      {showChangeModal && completedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-600 dark:bg-blue-700 animate-in fade-in duration-300">
          <div className="text-center p-8 animate-in zoom-in-95 duration-500">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-white rounded-full mb-8 shadow-2xl animate-bounce">
              <Banknote className="w-16 h-16 text-blue-600" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase">
              ENTREGAR CAMBIO
            </h2>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border-4 border-white/20 shadow-inner">
              <p className="text-7xl md:text-9xl font-black text-white drop-shadow-2xl">
                ${Math.round(completedSale.changeAmount).toLocaleString('es-CO')}
              </p>
            </div>
            <p className="mt-12 text-blue-100 text-xl font-bold animate-pulse flex items-center justify-center gap-3">
              <div className="w-3 h-3 bg-blue-200 rounded-full animate-ping" />
              Imprimiendo ticket automáticamente...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
