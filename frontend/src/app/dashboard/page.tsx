'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Tag, Wifi, WifiOff, CloudSync, ArrowRightLeft, AlertCircle, Scale } from 'lucide-react';
import { useOfflineStore } from '@/store/useOfflineStore';
import { useUSBScale } from '@/hooks/useUSBScale';

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  stock: number;
  isWeightBased: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function PosPage() {
  const router = useRouter();
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
  const [userName, setUserName] = useState('Usuario');
  const [userRole, setUserRole] = useState('CASHIER');
  const [hasOpenClosure, setHasOpenClosure] = useState<boolean | null>(null);
  
  const offlineStore = useOfflineStore();
  const [cashReceived, setCashReceived] = useState<string>('');
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [selectedCartIndex, setSelectedCartIndex] = useState(0);
  
  // Estados para productos pesables
  const [weightedProductToAdd, setWeightedProductToAdd] = useState<Product | null>(null);
  const [manualWeight, setManualWeight] = useState('');
  const { weight: scaleWeight, isReading: isReadingScale, error: scaleError, connectAndRead: captureScaleWeight, setWeight: setScaleWeight } = useUSBScale();

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
    // 1. Carga inmediata desde el caché (Instantánea)
    if (offlineStore.products.length > 0) setAllProducts(offlineStore.products);
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

    searchInputRef.current?.focus();

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
        updateQuantity(currentIndex, item.quantity + (item.product.isWeightBased ? 0.1 : 1));
      } else if (e.key === '-' || e.key === 'Subtract') {
        e.preventDefault();
        updateQuantity(currentIndex, item.quantity - (item.product.isWeightBased ? 0.1 : 1));
      }

      // Teclado Numérico Directo (0-9)
      if (/^[0-9]$/.test(e.key) && !item.product.isWeightBased) {
        e.preventDefault();
        const digit = parseInt(e.key);
        const newQty = item.quantity === 1 ? digit : parseInt(`${item.quantity}${digit}`);
        if (!isNaN(newQty) && newQty > 0) updateQuantity(currentIndex, newQty);
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
      if (e.key === 'Enter' && cart.length > 0 && posState === 'billing' && !weightedProductToAdd) {
        e.preventDefault();
        setPosState('payment');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, selectedCartIndex, posState, weightedProductToAdd]);

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
      setAllProducts(offlineStore.products);
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
        setAllProducts(offlineStore.products);
      }
    } catch (error) {
      console.error("Error fetching products", error);
      setAllProducts(offlineStore.products);
    }
  };

  const fetchCustomers = async () => {
    if (!offlineStore.isOnline) {
      setCustomers(offlineStore.customers);
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
        setCustomers(offlineStore.customers);
      }
    } catch (error) {
      console.error("Error fetching customers", error);
      setCustomers(offlineStore.customers);
    }
  };

  const addToCart = (product: Product) => {
    if (product.isWeightBased) {
      setWeightedProductToAdd(product);
      setManualWeight('');
      setScaleWeight(0);
      return;
    }

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
    setSelectedCartIndex(0);
    setSearchTerm(''); 
    searchInputRef.current?.focus();
  };

  const addWeightedProductToCart = () => {
    if (!weightedProductToAdd) return;
    const finalWeight = scaleWeight > 0 ? scaleWeight : parseFloat(manualWeight);
    if (isNaN(finalWeight) || finalWeight <= 0) {
      alert('Por favor ingrese un peso válido.');
      return;
    }
    setCart(prev => [{ product: weightedProductToAdd, quantity: finalWeight }, ...prev]);
    setWeightedProductToAdd(null);
    setManualWeight('');
    setScaleWeight(0);
    setSelectedCartIndex(0);
    setSearchTerm('');
    setTimeout(() => searchInputRef.current?.focus(), 100);
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
        const term = searchTerm.toLowerCase().trim();
        const found = allProducts.find(p => (p.barcode && p.barcode.toLowerCase() === term));
        if (found) {
          addToCart(found);
        }
      } else if (cart.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        handleCheckout();
      }
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart(prev => prev.map((item, i) => i === index ? { ...item, quantity: newQty } : item));
  };

  const updatePrice = (productId: string, newPrice: string) => {
    if (newPrice === '') {
      setCart(prev => prev.map(item => {
        if (item.product.id === productId) {
          return { ...item, product: { ...item.product, price: 0 } };
        }
        return item;
      }));
      return;
    }
    const price = parseFloat(newPrice);
    if (isNaN(price)) return;
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, product: { ...item.product, price } };
      }
      return item;
    }));
  };

  const removeFromCart = (index: number) => {
    setCart(prev => {
      const newCart = prev.filter((_, i) => i !== index);
      if (selectedCartIndex >= newCart.length && newCart.length > 0) {
        setSelectedCartIndex(newCart.length - 1);
      }
      return newCart;
    });
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
    setLastCheckoutTime(Date.now()); 
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
      if (paymentMethod === 'credito' && isNewCustomer && customerName) {
        if (offlineStore.isOnline) {
          const custRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/customers`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ name: customerName, phone: newCustomerPhone, isCreditActive: true })
          });
          if (custRes.ok) {
            const newCust = await custRes.json();
            payload.customerId = newCust.id;
            payload.customerName = newCust.name;
          }
        } else {
          const uuid = crypto.randomUUID();
          const tempCustId = `temp-cust-${uuid}`;
          const newTempCust = { id: tempCustId, localId: tempCustId, name: customerName, phone: newCustomerPhone, totalDebt: calculateTotal(), pendingInvoices: 1 };
          offlineStore.addPendingCustomer(newTempCust);
          payload.customerId = tempCustId;
          payload.customerName = customerName;
        }
      }

      if (offlineStore.isOnline) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
        }
      } else {
        queueOfflineSale(payload);
      }
    } catch (e) { 
      queueOfflineSale(payload);
    } finally {
      setIsProcessing(false);
    }
  };

  const queueOfflineSale = (payload: any) => {
    const uuid = crypto.randomUUID();
    const offlineId = 'off-' + uuid;
    const saleToStore = { 
      ...payload, 
      id: offlineId, 
      localId: offlineId,
      timestamp: Date.now(),
      isCredit: payload.paymentMethod === 'credito',
      createdAt: new Date().toISOString(), 
      offline: true,
      receivedAmount: paymentMethod === 'efectivo' ? Number(cashReceived) : 0,
      changeAmount: paymentMethod === 'efectivo' ? Math.max(0, Number(cashReceived) - calculateTotal()) : 0
    };
    offlineStore.addPendingSale(saleToStore);
    const saleWithItems = { ...saleToStore, items: [...cart] };
    setCompletedSale(saleWithItems);
    setCart([]);
    setPosState('billing');
  };

  const handlePrintAndReset = () => {
    window.print();
    setCompletedSale(null);
    setShowChangeModal(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handlePrintWithChangeModal = () => {
    const change = Math.round(Number(completedSale?.changeAmount || 0));
    if (completedSale?.paymentMethod?.toLowerCase() === 'efectivo' && change > 0) {
      setShowChangeModal(true);
      setTimeout(() => handlePrintAndReset(), 1500);
    } else {
      handlePrintAndReset();
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' && 
          document.activeElement !== searchInputRef.current && 
          !(posState === 'payment' && paymentMethod === 'credito') &&
          document.activeElement?.id !== 'cash-received-input') return;

      if (e.key === 'Enter') {
        if (completedSale) {
          e.preventDefault();
          handlePrintWithChangeModal();
        } else if (posState === 'payment' && !isProcessing) {
          if (Date.now() - lastCheckoutTime < 800) return; 
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
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [completedSale, posState, isProcessing, cart, lastCheckoutTime]);

  useEffect(() => {
    if (completedSale && tenantData.ticketAutoPrint && !showChangeModal) {
      const timer = setTimeout(() => handlePrintWithChangeModal(), 600);
      return () => clearTimeout(timer);
    }
  }, [completedSale, tenantData.ticketAutoPrint]);

  const filteredSuggestions = searchTerm.length > 1 
    ? allProducts.filter(p => {
        const term = searchTerm.toLowerCase().trim();
        return p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.toLowerCase().includes(term));
      })
    : [];

  if (hasOpenClosure === false && offlineStore.isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-slate-950 p-8 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl max-w-lg space-y-8 animate-in zoom-in-95 duration-500">
          <div className="bg-amber-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-12 h-12 text-amber-500" />
          </div>
          <div><h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">Caja Cerrada</h2><p className="text-slate-400 font-medium">No puede realizar ventas sin antes haber realizado la apertura de caja.</p></div>
          <button onClick={() => router.push('/dashboard/closure')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-blue-900/30 transition-all">Ir a Apertura de Caja</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:flex-row overflow-hidden bg-gray-50 dark:bg-[#0f172a] transition-colors rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
      <div className="md:hidden flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
        <button onClick={() => setActiveTab('products')} className={`flex-1 py-4 text-sm font-black ${activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>PRODUCTOS</button>
        <button onClick={() => setActiveTab('cart')} className={`flex-1 py-4 text-sm font-black relative ${activeTab === 'cart' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>CARRITO{cart.length > 0 && <span className="absolute top-3 right-8 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{cart.length}</span>}</button>
      </div>

      <div className={`flex-1 flex flex-col p-4 md:p-6 overflow-hidden ${activeTab !== 'products' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex justify-between items-center mb-4">
          <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Caja Registradora</h2><p className="text-sm font-semibold text-gray-500">{tenantData.name}</p></div>
        </div>
        <div className="relative mb-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"><Search className="h-5 w-5 text-gray-400" /></div>
          <input ref={searchInputRef} type="text" className="block w-full rounded-2xl border-0 py-4 pl-12 pr-4 shadow-sm ring-1 ring-inset ring-gray-200 dark:bg-slate-900 dark:text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleScannerInput} placeholder="Busca un producto..." />
        </div>
        {!searchTerm && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Tag className="h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">¡Bienvenido, {userName}!</h3>
              <p className="text-sm text-gray-500 mt-2">Usa el buscador o escanea para empezar.</p>
            </div>
        )}
        {searchTerm.length > 1 && (
          <div className="flex-1 overflow-y-auto mb-4 bg-white dark:bg-slate-900 rounded-2xl p-2 border border-gray-200">
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredSuggestions.map((product, index) => (
                <li key={product.id} onClick={() => addToCart(product)} className={`flex justify-between items-center p-3 rounded-xl cursor-pointer border transition-all ${selectedSuggestionIndex === index ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}>
                  <div><p className="text-sm font-bold truncate">{product.name}</p></div>
                  <p className="text-sm font-semibold">${Math.round(product.price).toLocaleString('es-CO')}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={`w-full md:w-[400px] lg:w-[450px] bg-white dark:bg-slate-900 border-l border-gray-200 flex flex-col shadow-xl z-10 ${activeTab !== 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className={`p-5 border-b ${posState === 'payment' ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-slate-800'}`}>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center"><ShoppingCart className="w-5 h-5 mr-2" />{posState === 'billing' ? 'Carrito' : 'Pago'}</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">{cart.length} Items</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#0f172a]">
          {posState === 'billing' ? (
            cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400"><ShoppingCart className="w-12 h-12 mb-2" /><p>El carrito está vacío</p></div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div key={item.product.id} onClick={() => setSelectedCartIndex(idx)} className={`p-3 rounded-xl border flex justify-between items-center ${selectedCartIndex === idx ? 'bg-white shadow-lg border-blue-500' : 'bg-white dark:bg-slate-800 border-gray-100'}`}>
                    <div className="flex-1 min-w-0 pr-2">
                       <h4 className="text-sm font-bold truncate">{item.product.name}</h4>
                       <p className="text-xs text-green-600 font-black">${Math.round(item.product.price).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-gray-100 dark:bg-slate-900 rounded-lg p-0.5">
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(idx, item.quantity - (item.product.isWeightBased ? 0.1 : 1)); }} className="p-1"><Minus className="w-3 h-3" /></button>
                        <span className="min-w-[40px] text-center text-sm font-bold">
                          {item.product.isWeightBased ? item.quantity.toFixed(3) : item.quantity}
                          {item.product.isWeightBased && <span className="text-[10px] ml-0.5 opacity-50">kg</span>}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(idx, item.quantity + (item.product.isWeightBased ? 0.1 : 1)); }} className="p-1"><Plus className="w-3 h-3" /></button>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeFromCart(idx); }} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-start py-8">
              <Banknote className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-black mb-8">Seleccione Pago</h3>
              <div className="grid grid-cols-1 gap-4 w-full px-4">
                <button onClick={() => { setPaymentMethod('efectivo'); setTimeout(() => document.getElementById('cash-received-input')?.focus(), 100); }} className={`p-5 border-2 rounded-3xl font-black transition-all ${paymentMethod === 'efectivo' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>EFECTIVO</button>
                <button onClick={() => setPaymentMethod('credito')} className={`p-5 border-2 rounded-3xl font-black transition-all ${paymentMethod === 'credito' ? 'border-orange-600 bg-orange-50' : 'border-gray-200'}`}>CRÉDITO</button>
              </div>
              {paymentMethod === 'efectivo' && (
                <div className="w-full px-4 mt-6">
                  <input id="cash-received-input" type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} placeholder="Efectivo recibido" className="w-full bg-white border-2 border-blue-500/30 rounded-2xl px-6 py-4 text-2xl font-black transition-all" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t bg-white dark:bg-slate-900">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-bold">Total</span>
            <span className="text-3xl font-black text-blue-600">${Math.round(calculateTotal()).toLocaleString('es-CO')}</span>
          </div>
          <button disabled={cart.length === 0 || isProcessing} onClick={posState === 'billing' ? handleCheckout : processSale} className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black text-lg shadow-lg active:scale-95 transition-all flex justify-center items-center">
            {isProcessing ? 'Procesando...' : (posState === 'billing' ? 'Cobrar Total' : 'Confirmar Venta')}
          </button>
        </div>
      </div>

      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in duration-200">
             <div className="bg-green-600 text-white p-4 rounded-xl mb-4"><h3 className="font-black uppercase">¡Venta Exitosa!</h3></div>
             <p className="text-2xl font-black mb-6">${Math.round(completedSale.totalAmount).toLocaleString()}</p>
             <button onClick={() => setCompletedSale(null)} className="w-full bg-gray-200 py-3 rounded-xl font-bold">Cerrar</button>
          </div>
        </div>
      )}

      {weightedProductToAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3"><Scale className="w-10 h-10 text-white" /></div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Capturar Peso</h3>
              <p className="text-blue-600 dark:text-blue-400 font-bold mt-1 uppercase tracking-widest text-xs">{weightedProductToAdd.name}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-900 dark:bg-black rounded-3xl p-6 border-4 border-slate-800 shadow-inner relative group text-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Peso Digital</span>
                <div className="flex items-baseline justify-center gap-2">
                  <span className={`text-6xl font-black ${scaleWeight > 0 ? 'text-green-500' : 'text-slate-700'}`}>{scaleWeight.toFixed(3)}</span>
                  <span className="text-2xl font-black text-slate-500 italic">kg</span>
                </div>
                {scaleError && <p className="text-[10px] text-red-500 font-bold mt-2">{scaleError}</p>}
              </div>
              <div className="relative">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Ingreso Manual</label>
                <input type="number" step="0.001" autoFocus placeholder="0.000" className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-2xl font-black" value={manualWeight} onChange={(e) => { setManualWeight(e.target.value); if (scaleWeight > 0) setScaleWeight(0); }} onKeyDown={(e) => { if (e.key === 'Enter') addWeightedProductToCart(); if (e.key === 'Escape') setWeightedProductToAdd(null); }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={captureScaleWeight} disabled={isReadingScale} className="py-4 bg-white dark:bg-slate-800 border-2 border-blue-600 text-blue-600 rounded-3xl font-black text-sm uppercase tracking-tighter transition-all active:scale-95">{isReadingScale ? 'Leyendo...' : '🔌 Escala USB'}</button>
                <button onClick={addWeightedProductToCart} className="py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-sm uppercase tracking-tighter shadow-lg shadow-blue-600/20 transition-all active:scale-95">✅ Confirmar</button>
              </div>
              <button onClick={() => setWeightedProductToAdd(null)} className="w-full py-2 text-gray-400 hover:text-gray-600 text-xs font-bold uppercase tracking-widest">Cancelar (Esc)</button>
            </div>
          </div>
        </div>
      )}

      {showChangeModal && completedSale && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-blue-600 text-center p-10 rounded-[40px] shadow-2xl border-4 border-white/20 max-w-lg w-full mx-4">
            <Banknote className="w-12 h-12 text-white mx-auto mb-6" />
            <h2 className="text-3xl font-black text-white mb-4 uppercase">ENTREGAR CAMBIO</h2>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border-2 border-white/20 shadow-inner">
              <p className="text-6xl font-black text-white">${Math.round(completedSale.changeAmount).toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
