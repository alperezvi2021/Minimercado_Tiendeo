'use client';
import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Barcode, Download, Upload, FileSpreadsheet, CloudSync, Wifi, WifiOff, Scale } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useOfflineStore } from '@/store/useOfflineStore';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  cost: number | null;
  profitMargin: number | null;
  stock: number;
  lowStockThreshold: number;
  categoryId: string | null;
  category?: Category;
  isActive: boolean;
  isWeightBased: boolean;
}

export default function InventoryPage() {
  const { 
    isOnline, 
    products: cachedProducts, 
    categories: cachedCategories,
    setCache,
    addPendingProduct,
    addPendingCategory,
    pendingProducts,
    pendingCategories
  } = useOfflineStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | 'category'; direction: 'asc' | 'desc' } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  // Estado para el modal de productos
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [cost, setCost] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [isWeightBased, setIsWeightBased] = useState(false);

  // Estado para el modal de categorías
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  // Estado para gestión de productos dentro de categoría
  const [isManagingProducts, setIsManagingProducts] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Referencia para input de archivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cachedProducts.length > 0) setProducts(cachedProducts);
    if (cachedCategories.length > 0) setCategories(cachedCategories);

    const { lastSyncTime } = useOfflineStore.getState();
    const lastSync = lastSyncTime || 0;
    const oneHour = 60 * 60 * 1000;
    const shouldSync = Date.now() - lastSync > oneHour;

    if (isOnline) {
      if (shouldSync || cachedProducts.length === 0) {
        fetchAllData();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    if (cachedProducts.length > 0) {
      setLoading(false);
    }

    const handleForceSync = () => fetchAllData();
    window.addEventListener('force-sync', handleForceSync);

    return () => window.removeEventListener('force-sync', handleForceSync);
  }, [isOnline]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProducts(),
      fetchCategories()
    ]);
    useOfflineStore.getState().setLastSyncTime(Date.now());
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        setCache({ categories: data });
      }
    } catch (error) {
      console.error("Error fetching categories", error);
      setCategories(cachedCategories);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        setCache({ products: data });
      }
    } catch (error) {
      console.error("Error fetching products", error);
      setProducts(cachedProducts);
    } finally {
      setLoading(false);
    }
  };

  const handleCostChange = (newCost: string) => {
    setCost(newCost);
    const c = parseFloat(newCost);
    if (!isNaN(c) && c >= 0) {
      const calculatedPrice = c / 0.8;
      setPrice(Math.round(calculatedPrice).toString());
      const calculatedMargin = ((calculatedPrice - c) / c) * 100;
      setProfitMargin(Math.round(calculatedMargin).toString());
    }
  };

  const handleMarginChange = (newMargin: string) => {
    setProfitMargin(newMargin);
    const c = parseFloat(cost);
    const m = parseFloat(newMargin);
    if (!isNaN(c) && !isNaN(m)) {
      const calculatedPrice = c * (1 + (m / 100));
      setPrice(Math.round(calculatedPrice).toString());
    }
  };

  const handlePriceChange = (newPrice: string) => {
    setPrice(newPrice);
    const p = parseFloat(newPrice);
    const c = parseFloat(cost);
    if (!isNaN(p) && !isNaN(c) && c > 0) {
      const calculatedMargin = ((p - c) / c) * 100;
      setProfitMargin(Math.round(calculatedMargin).toString());
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        name,
        barcode: barcode || null,
        price: parseFloat(price),
        cost: cost ? parseFloat(cost) : null,
        profitMargin: profitMargin ? parseFloat(profitMargin) : null,
        stock: parseFloat(stock),
        lowStockThreshold: parseInt(lowStockThreshold),
        categoryId: categoryId || null,
        isWeightBased,
      };

      const url = editingId ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products/${editingId}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products`;
      const method = editingId ? 'PATCH' : 'POST';

      if (!isOnline && !editingId) {
        const uuid = crypto.randomUUID();
        const localId = `temp-prod-${uuid}`;
        const newProduct = {
          ...payload,
          id: localId,
          localId,
          category: categories.find(c => c.id === categoryId),
          isActive: true,
          isWeightBased
        };
        addPendingProduct(newProduct);
        setIsModalOpen(false);
        setEditingId(null); setName(''); setBarcode(''); setCost(''); setProfitMargin(''); setPrice(''); setStock('0');
        setCategoryId(''); setLowStockThreshold('5'); setIsWeightBased(false);
        return;
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null); setName(''); setBarcode(''); setCost(''); setProfitMargin(''); setPrice(''); setStock('0');
        setCategoryId(''); setLowStockThreshold('5'); setIsWeightBased(false);
        fetchProducts();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setBarcode(product.barcode || '');
    setCost(product.cost !== null ? product.cost.toString() : '');
    setProfitMargin(product.profitMargin !== null ? product.profitMargin.toString() : '');
    setPrice(Math.round(product.price).toString());
    setStock(product.stock.toString());
    setCategoryId(product.categoryId || '');
    setLowStockThreshold(product.lowStockThreshold?.toString() || '5');
    setIsWeightBased(product.isWeightBased || false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, productName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${productName}"?`)) {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          fetchProducts();
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setName(''); setBarcode(''); setCost(''); setProfitMargin(''); setPrice(''); setStock('0');
    setCategoryId(''); setLowStockThreshold('5'); setIsWeightBased(false);
    setIsModalOpen(true);
  };

  const handleScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('Escaneado:', searchTerm);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const payload = { name: newCategoryName, description: categoryDescription };
      const url = editingCategory ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/categories/${editingCategory.id}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/categories`;
      const method = editingCategory ? 'PATCH' : 'POST';

      if (!isOnline && !editingCategory) {
        const uuid = crypto.randomUUID();
        const localId = `temp-cat-${uuid}`;
        const newCat = { id: localId, name: newCategoryName, localId };
        addPendingCategory(newCat);
        setNewCategoryName('');
        setCategoryDescription('');
        return;
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewCategoryName('');
        setCategoryDescription('');
        setEditingCategory(null);
        fetchCategories();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
  };

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (window.confirm(`¿Seguro que quieres borrar la categoría "${catName}"?`)) {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/categories/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          fetchCategories();
          fetchProducts();
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const openManageCategoryProducts = (category: Category) => {
    setActiveCategory(category);
    setIsManagingProducts(true);
    setProductSearchTerm('');
  };

  const closeManageCategoryProducts = () => {
    setIsManagingProducts(false);
    setActiveCategory(null);
  };

  const assignProductToCategory = async (productId: string, catId: string | null) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products/${productId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ categoryId: catId })
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openCreateModalWithCategory = (catId: string) => {
    openCreateModal();
    setCategoryId(catId);
    setIsCategoryModalOpen(false);
    closeManageCategoryProducts();
  };

  const handleExport = () => {
    const dataToExport = sortedProducts.map((p: Product) => ({
      'Código de Barras': p.barcode || 'Manual',
      'Nombre': p.name,
      'Categoría': p.category?.name || 'Sin Categoría',
      'Precio Compra': p.cost || 0,
      'Utilidad (%)': p.profitMargin || 0,
      'Precio Venta': p.price,
      'Stock Actual': p.stock,
      'Mínimo Stock': p.lowStockThreshold
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `Inventario_Tiendeo_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const productsToImport = data.map((row: any) => {
          const catName = row['Categoría'];
          const category = categories.find((c: Category) => c.name.toLowerCase() === (catName || '').toString().toLowerCase());
          return {
            name: row['Nombre'],
            barcode: row['Código de Barras'] === 'Manual' ? null : row['Código de Barras']?.toString(),
            cost: row['Precio Compra'] ? parseFloat(row['Precio Compra']) : null,
            profitMargin: row['Utilidad (%)'] ? parseFloat(row['Utilidad (%)']) : null,
            price: row['Precio Venta'] ? parseFloat(row['Precio Venta']) : 0,
            stock: row['Stock Actual'] ? parseFloat(row['Stock Actual']) : 0,
            lowStockThreshold: row['Mínimo Stock'] ? parseInt(row['Mínimo Stock']) : 5,
            categoryId: category?.id || null,
          };
        }).filter(p => p.name);

        if (productsToImport.length > 0) {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(productsToImport)
          });
          if (res.ok) {
            alert(`¡Éxito! Se importaron ${productsToImport.length} productos.`);
            fetchProducts();
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const requestSort = (key: keyof Product | 'category') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = [...products].filter((p: Product) => {
    const term = searchTerm.toLowerCase().trim();
    return p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.toLowerCase().includes(term));
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    let aValue: any = sortConfig.key === 'category' ? (a.category?.name || '') : a[sortConfig.key as keyof Product];
    let bValue: any = sortConfig.key === 'category' ? (b.category?.name || '') : b[sortConfig.key as keyof Product];
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredProducts = sortedProducts;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">Inventario</h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} title="Exportar inventario" className="inline-flex items-center rounded-xl bg-white dark:bg-slate-800 border border-gray-200 px-4 py-2.5 text-sm font-semibold text-emerald-600 shadow-sm hover:bg-emerald-50"><Download className="mr-2 h-4 w-4" />Exportar</button>
          <button onClick={handleImportClick} title="Importar productos" className="inline-flex items-center rounded-xl bg-white dark:bg-slate-800 border border-gray-200 px-4 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50"><Upload className="mr-2 h-4 w-4" />Importar</button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileImport} />
          <button onClick={() => setIsCategoryModalOpen(true)} title="Categorías" className="inline-flex items-center rounded-xl bg-white dark:bg-slate-800 border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">Categorías</button>
          <button onClick={openCreateModal} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"><Plus className="-ml-1 mr-2 h-5 w-5" />Añadir Producto</button>
        </div>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Barcode className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input ref={searchInputRef} type="text" className="block w-full rounded-lg border-0 py-2.5 pl-10 ring-1 ring-inset ring-gray-300 dark:bg-slate-800 dark:text-white" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleScannerInput} autoFocus />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-800/50">
            <tr>
              <th onClick={() => requestSort('barcode')} className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer">Código</th>
              <th onClick={() => requestSort('name')} className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer">Producto</th>
              <th onClick={() => requestSort('category')} className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer">Categoría</th>
              <th onClick={() => requestSort('price')} className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer">Venta</th>
              <th onClick={() => requestSort('stock')} className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer">Stock</th>
              <th className="px-6 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
            {filteredProducts.map((product: Product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{product.barcode || <span className="text-gray-400 italic">Manual</span>}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-900 dark:text-white">{product.name}</span>
                    {product.isWeightBased && <Scale className="ml-2 h-3.5 w-3.5 text-blue-500" />}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">{product.category?.name || 'Sin Categoría'}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">${Math.round(product.price).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 py-1 rounded-full font-bold ${product.stock <= product.lowStockThreshold ? 'bg-red-100 text-red-700 animate-pulse' : 'text-gray-900 dark:text-gray-300'}`}>{product.stock}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(product)} title="Editar" className="text-blue-600 mr-4"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(product.id, product.name)} title="Eliminar" className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-4">{editingId ? 'Editar Producto' : 'Crear Producto'}</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <input required title="Nombre" placeholder="Nombre" type="text" className="w-full rounded-xl border-0 py-2.5 px-3 ring-1 ring-inset ring-gray-300 dark:bg-slate-800 dark:text-white" value={name} onChange={e => setName(e.target.value)} />
              <input title="Código" type="text" placeholder="Código de barras" className="w-full rounded-xl border-0 py-2.5 px-3 ring-1 ring-inset ring-gray-300 dark:bg-slate-800 dark:text-white" value={barcode} onChange={e => setBarcode(e.target.value)} />
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center"><Scale className="h-5 w-5 text-blue-500 mr-2" /><span>Venta por Peso</span></div>
                <button type="button" title="Activar venta por peso" onClick={() => setIsWeightBased(!isWeightBased)} className={`h-6 w-11 rounded-full transition-colors ${isWeightBased ? 'bg-blue-600' : 'bg-gray-200'}`}><div className={`h-4 w-4 bg-white rounded-full transition-transform ${isWeightBased ? 'translate-x-6' : 'translate-x-1'}`} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-blue-50 dark:bg-slate-800 p-4 rounded-xl">
                <input title="Costo" type="number" placeholder="Costo" className="rounded-lg border-0 p-2 dark:bg-slate-900 dark:text-white" value={cost} onChange={e => handleCostChange(e.target.value)} />
                <input title="Margen" type="number" placeholder="Utilidad %" className="rounded-lg border-0 p-2 dark:bg-slate-900 dark:text-white" value={profitMargin} onChange={e => handleMarginChange(e.target.value)} />
                <div className="col-span-2">
                  <input title="Precio venta" required type="number" placeholder="Precio final" className="w-full rounded-lg border-2 border-blue-500 p-3 text-xl font-bold dark:bg-slate-950 dark:text-white" value={price} onChange={e => handlePriceChange(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select title="Categoría" className="rounded-xl border-0 p-2.5 dark:bg-slate-800 dark:text-white" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                  <option value="">Sin Categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input title="Stock" type="number" placeholder="Stock" className="rounded-xl border-0 p-2.5 dark:bg-slate-800 dark:text-white" value={stock} onChange={e => setStock(e.target.value)} />
              </div>

              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500">Cancelar</button><button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Guardar</button></div>
            </form>
          </div>
        </div>
      )}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-4">Gestionar Categorías</h3>
            <form onSubmit={handleCreateCategory} className="flex gap-2 mb-4">
              <input required title="Nueva categoría" placeholder="Nombre..." className="flex-1 rounded-xl border-0 p-2 dark:bg-slate-800 dark:text-white" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
              <button type="submit" className="bg-blue-600 text-white rounded-xl px-4 font-bold">OK</button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="dark:text-white">{c.name}</span>
                  <div className="flex gap-1">
                    <button title="Editar" onClick={() => handleEditCategory(c)} className="text-blue-500 p-1"><Edit2 className="h-4 w-4" /></button>
                    <button title="Eliminar" onClick={() => handleDeleteCategory(c.id, c.name)} className="text-red-400 p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end"><button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-500">Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
