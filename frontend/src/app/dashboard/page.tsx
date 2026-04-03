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
    name: 'MINIMERCADO TIENDEO',
    phone: '',
    location: '',
    rutNit: '',
    ticketPaperSize: '58mm',
    ticketAutoPrint: false,
    ticketHeaderMessage: '',
    ticketFooterMessage: ''
  });
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (offlineStore.products.length > 0) setAllProducts(offlineStore.products);
    if (offlineStore.customers.length > 0) setCustomers(offlineStore.customers);

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
    
    const handleForceSync = () => fetchAllData();
    window.addEventListener('force-sync', handleForceSync);
    searchInputRef.current?.focus();

    const savedName = localStorage.getItem('user_name');
    const savedRole = localStorage.getItem('user_role');
    if (savedName) setUserName(savedName);
    if (savedRole) setUserRole(savedRole);

    return () => window.removeEventListener('force-sync', handleForceSync);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') searchInputRef.current?.focus();
        return;
      }
      if (cart.length === 0) return;
      const currentIndex = selectedCartIndex;
      const item = cart[currentIndex];
      if (!item) return;

      if (e.key === '+' || e.key === 'Add') {
        e.preventDefault();
        updateQuantity(currentIndex, item.quantity + (item.product.isWeightBased ? 0.1 : 1));
      } else if (e.key === '-' || e.key === 'Subtract') {
        e.preventDefault();
        updateQuantity(currentIndex, item.quantity - (item.product.isWeightBased ? 0.1 : 1));
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeFromCart(currentIndex);
      }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedCartIndex(Math.max(0, currentIndex - 1)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCartIndex(Math.min(cart.length - 1, currentIndex + 1)); }
      if (e.key === 'Enter' && cart.length > 0 && posState === 'billing' && !weightedProductToAdd) {
        e.preventDefault();
        handleCheckout();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, selectedCartIndex, posState, weightedProductToAdd]);

  const fetchAllData = async () => {
    await Promise.all([fetchProducts(), fetchCustomers()]);
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
          phone: data.phone || '',
          location: data.location || '',
          rutNit: data.rutNit || '',
          ticketPaperSize: data.ticketPaperSize || '58mm',
          ticketAutoPrint: data.ticketAutoPrint || false,
          ticketHeaderMessage: data.ticketHeaderMessage || '',
          ticketFooterMessage: data.ticketFooterMessage || '',
        });
      }
    } catch (e) { console.error(e); }
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
      } else { setHasOpenClosure(false); }
    } catch (e) { setHasOpenClosure(true); }
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
        offlineStore.setCache({ products: data });
      }
    } catch (e) { setAllProducts(offlineStore.products); }
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
        offlineStore.setCache({ customers: data });
      }
    } catch (e) { setCustomers(offlineStore.customers); }
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
      if (existing) return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [{ product, quantity: 1 }, ...prev];
    });
    setSelectedCartIndex(0);
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const addWeightedProductToCart = () => {
    if (!weightedProductToAdd) return;
    const finalWeight = scaleWeight > 0 ? scaleWeight : parseFloat(manualWeight);
    if (isNaN(finalWeight) || finalWeight <= 0) { alert('Peso inválido'); return; }
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
      setSelectedSuggestionIndex(prev => prev < filteredSuggestions.length - 1 ? prev + 1 : prev);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        e.preventDefault();
        addToCart(filteredSuggestions[selectedSuggestionIndex]);
        setSelectedSuggestionIndex(-1);
      } else if (searchTerm.trim() !== '') {
        e.preventDefault();
        const term = searchTerm.toLowerCase().trim();
        const found = allProducts.find(p => p.barcode === term);
        if (found) addToCart(found);
      } else if (cart.length > 0) {
        e.preventDefault();
        handleCheckout();
      }
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) { removeFromCart(index); return; }
    setCart(prev => prev.map((item, i) => i === index ? { ...item, quantity: newQty } : item));
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
    if (selectedCartIndex >= cart.length - 1) setSelectedCartIndex(Math.max(0, cart.length - 2));
  };

  const calculateTotal = () => cart.reduce((t, i) => t + (i.product.price * i.quantity), 0);

  const handleCheckout = () => {
    setPosState('payment');
    setCashReceived('');
    setLastCheckoutTime(Date.now());
    setTimeout(() => document.getElementById('cash-received-input')?.focus(), 200);
  };

  const processSale = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    const payload = {
      totalAmount: calculateTotal(),
      paymentMethod: paymentMethod,
      customerId: (paymentMethod === 'credito' && selectedCustomerId) ? selectedCustomerId : undefined,
      items: cart.map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.product.price,
        subtotal: i.product.price * i.quantity
      }))
    };

    try {
      const token = localStorage.getItem('access_token');
      if (offlineStore.isOnline) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sales`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const savedSale = await res.json();
          setCompletedSale({ ...savedSale, items: [...cart], receivedAmount: Number(cashReceived), changeAmount: Math.max(0, Number(cashReceived) - calculateTotal()) });
          setCart([]);
          setPosState('billing');
          fetchProducts();
        }
      } else { queueOfflineSale(payload); }
    } catch (e) { queueOfflineSale(payload); } finally { setIsProcessing(false); }
  };

  const queueOfflineSale = (payload: any) => {
    const offlineId = 'off-' + crypto.randomUUID();
    const sale = { ...payload, id: offlineId, timestamp: Date.now(), offline: true };
    offlineStore.addPendingSale(sale);
    setCompletedSale({ ...sale, items: [...cart], receivedAmount: Number(cashReceived), changeAmount: Math.max(0, Number(cashReceived) - calculateTotal()) });
    setCart([]);
    setPosState('billing');
  };

  const handlePrint = () => { window.print(); setCompletedSale(null); setShowChangeModal(false); setTimeout(() => searchInputRef.current?.focus(), 100); };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (completedSale) handlePrint();
        else if (posState === 'payment' && !isProcessing) processSale();
      } else if (e.key === 'Escape') {
        if (completedSale) setCompletedSale(null);
        else if (posState === 'payment') setPosState('billing');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completedSale, posState, isProcessing]);

  const filteredSuggestions = searchTerm.length > 1 ? allProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode?.includes(searchTerm)) : [];

  if (hasOpenClosure === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-950 p-8 text-center text-white">
        <AlertCircle className="w-20 h-20 text-amber-500 mb-6" />
        <h2 className="text-3xl font-black mb-4">CAJA CERRADA</h2>
        <button onClick={() => router.push('/dashboard/closure')} className="bg-blue-600 px-8 py-4 rounded-3xl font-black">Ir a Apertura</button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col md:flex-row overflow-hidden bg-gray-50 dark:bg-[#0f172a] rounded-3xl border border-gray-200 shadow-sm print:hidden">
      <div className={`flex-1 flex flex-col p-4 md:p-6 overflow-hidden ${activeTab !== 'products' && 'hidden md:flex'}`}>
        <div className="relative mb-6">
          <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
          <input ref={searchInputRef} type="text" className="w-full rounded-2xl border-0 py-4 pl-12 pr-4 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={handleScannerInput} placeholder="Buscar producto..." />
          {filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              {filteredSuggestions.map((p, idx) => (
                <div key={p.id} onClick={() => addToCart(p)} className={`p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 ${selectedSuggestionIndex === idx && 'bg-blue-600 text-white'}`}>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs opacity-70">${p.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-center">
            <div><ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" /><h3 className="text-xl font-bold">POS MiniMercado</h3><p>Listo para facturar</p></div>
        </div>
      </div>

      <div className={`w-full md:w-[450px] bg-white dark:bg-slate-900 border-l border-gray-200 flex flex-col ${activeTab !== 'cart' && 'hidden md:flex'}`}>
        <div className="p-5 border-b bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
          <h2 className="font-black flex items-center"><ShoppingCart className="mr-2" />{posState === 'billing' ? 'CARRITO' : 'PAGO'}</h2>
          <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full">{cart.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {posState === 'billing' ? cart.map((item, idx) => (
            <div key={item.product.id} onClick={() => setSelectedCartIndex(idx)} className={`p-4 rounded-2xl border flex justify-between items-center ${selectedCartIndex === idx ? 'border-blue-500 bg-blue-50/20 shadow-md' : 'border-gray-100 dark:border-slate-800'}`}>
              <div className="flex-1">
                <h4 className="text-sm font-bold">{item.product.name}</h4>
                <p className="text-xs text-green-600 font-bold">${item.product.price.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
                  <button title="Restar cantidad" onClick={(e) => { e.stopPropagation(); updateQuantity(idx, item.quantity - (item.product.isWeightBased ? 0.1 : 1)); }}><Minus className="w-4 h-4" /></button>
                  <span className="w-12 text-center text-sm font-bold">{item.product.isWeightBased ? item.quantity.toFixed(3) : item.quantity}</span>
                  <button title="Sumar cantidad" onClick={(e) => { e.stopPropagation(); updateQuantity(idx, item.quantity + (item.product.isWeightBased ? 0.1 : 1)); }}><Plus className="w-4 h-4" /></button>
                </div>
                <button title="Eliminar del carrito" onClick={(e) => { e.stopPropagation(); removeFromCart(idx); }} className="text-red-500"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
          )) : (
            <div className="space-y-6 pt-10">
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setPaymentMethod('efectivo')} className={`p-6 border-2 rounded-3xl font-black ${paymentMethod === 'efectivo' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>EFECTIVO</button>
                <button onClick={() => setPaymentMethod('credito')} className={`p-6 border-2 rounded-3xl font-black ${paymentMethod === 'credito' ? 'border-orange-600 bg-orange-50' : 'border-gray-200'}`}>CRÉDITO</button>
              </div>
              {paymentMethod === 'efectivo' && (
                <input id="cash-received-input" type="number" placeholder="Monto recibido..." className="w-full text-center text-4xl font-black p-6 rounded-3xl border-2 border-blue-200" value={cashReceived} onChange={e => setCashReceived(e.target.value)} />
              )}
            </div>
          )}
        </div>
        <div className="p-6 border-t bg-gray-50 dark:bg-slate-900">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-500 font-bold uppercase">Total</span>
            <span className="text-4xl font-black text-blue-600">${calculateTotal().toLocaleString()}</span>
          </div>
          <button disabled={cart.length === 0 || isProcessing} onClick={posState === 'billing' ? handleCheckout : processSale} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-blue-900/30">
            {isProcessing ? 'PROCESANDO...' : (posState === 'billing' ? 'COBRAR' : 'TERMINAR')}
          </button>
        </div>
      </div>

      {weightedProductToAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-md shadow-2xl p-8 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Scale className="w-10 h-10 text-white" /></div>
            <h3 className="text-2xl font-black uppercase mb-1">Capturar Peso</h3>
            <p className="text-blue-600 font-bold mb-8">{weightedProductToAdd.name}</p>
            <div className="bg-slate-900 text-green-500 p-8 rounded-3xl border-4 border-slate-800 mb-6">
              <span className="text-6xl font-black">{scaleWeight.toFixed(3)}</span><span className="text-2xl font-bold ml-2">kg</span>
            </div>
            <input type="number" step="0.001" placeholder="Manual: 0.000" className="w-full p-5 bg-gray-100 rounded-2xl text-2xl font-black mb-6 text-center" value={manualWeight} onChange={e => setManualWeight(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
                <button onClick={captureScaleWeight} disabled={isReadingScale} className="bg-blue-100 text-blue-600 p-5 rounded-3xl font-black">{isReadingScale ? 'Leyendo...' : '🔌 ESCALA'}</button>
                <button onClick={addWeightedProductToCart} className="bg-blue-600 text-white p-5 rounded-3xl font-black">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      {showChangeModal && completedSale && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-blue-600 text-white p-10 text-center animate-in fade-in">
           <div><Banknote className="w-24 h-24 mx-auto mb-8" /><h2 className="text-4xl font-black mb-4">ENTREGAR CAMBIO</h2><p className="text-8xl font-black">${Math.round(completedSale.changeAmount).toLocaleString()}</p></div>
        </div>
      )}

      {/* COMPONENTE DE TICKET (SOLO PARA IMPRIMIR) */}
      {completedSale && (
        <div className="hidden print:block p-2 text-black bg-white w-full" style={{ width: tenantData.ticketPaperSize === '58mm' ? '58mm' : '80mm', fontFamily: 'monospace', fontSize: '12px' }}>
          <div className="text-center mb-4 border-b-2 border-black pb-2">
            <h1 className="text-lg font-black uppercase">{tenantData.name}</h1>
            <p className="text-[10px]">{tenantData.location}</p>
            <p className="text-[10px]">{tenantData.phone}</p>
            {tenantData.rutNit && <p className="text-[10px]">NIT: {tenantData.rutNit}</p>}
          </div>
          <p className="mb-2 text-center text-[10px]">Factura #{completedSale.id.slice(-6).toUpperCase()}</p>
          <p className="mb-2 text-center text-[10px] border-b border-black pb-1">{new Date(completedSale.createdAt || Date.now()).toLocaleString()}</p>
          <div className="space-y-1 mb-4 border-b border-black pb-2">
            {completedSale.items.map((item: any, idx: number) => (
              <div key={idx} className="flex flex-col">
                <div className="flex justify-between font-bold">
                  <span>{item.product.name.slice(0, 20)}</span>
                  <span>${(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
                <div className="text-[10px] flex justify-between">
                  <span>Cant: {item.product.isWeightBased ? item.quantity.toFixed(3) + ' kg' : item.quantity}</span>
                  <span>v.u: ${item.product.price.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-sm font-black border-b-2 border-black pb-2">
            <div className="flex justify-between"><span>TOTAL</span><span>${calculateTotal().toLocaleString()}</span></div>
            <div className="flex justify-between text-[10px]"><span>PAGO ({completedSale.paymentMethod})</span><span>${Number(completedSale.receivedAmount || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-[10px]"><span>CAMBIO</span><span>${Math.round(completedSale.changeAmount || 0).toLocaleString()}</span></div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-[10px] font-bold">{tenantData.ticketHeaderMessage}</p>
            <p className="text-[10px] mt-2 italic">{tenantData.ticketFooterMessage || '¡Gracias por su compra!'}</p>
            <div className="mt-4 pt-4 border-t border-black"><p className="text-[8px]">Software por TIENDEO</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
