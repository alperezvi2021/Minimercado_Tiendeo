'use client';
import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Barcode, Download, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

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
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories", error);
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
      }
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  };

  // Autocalculador: Cuando cambia el Costo o el Porcentaje, calcular el Precio de Venta
  const handleCostOrMarginChange = (newCost: string, newMargin: string) => {
    setCost(newCost);
    setProfitMargin(newMargin);
    
    const c = parseFloat(newCost);
    const m = parseFloat(newMargin);
    
    if (!isNaN(c) && !isNaN(m)) {
      // Precio = Costo + (Costo * (Margen / 100))
      const calculatedPrice = c * (1 + (m / 100));
      setPrice(Math.round(calculatedPrice).toString());
    }
  };

  // Autocalculador inverso: Si cambian el Precio de Venta directamente, ajustar el Margen
  const handlePriceChange = (newPrice: string) => {
    setPrice(newPrice);
    
    const p = parseFloat(newPrice);
    const c = parseFloat(cost);
    
    if (!isNaN(p) && !isNaN(c) && c > 0) {
      // Margen = ((Precio - Costo) / Costo) * 100
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
      };

      const url = editingId ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products/${editingId}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products`;
      const method = editingId ? 'PATCH' : 'POST';

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
        // Reset
        setEditingId(null); setName(''); setBarcode(''); setCost(''); setProfitMargin(''); setPrice(''); setStock('0');
        setCategoryId(''); setLowStockThreshold('5');
        fetchProducts();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message || 'No se pudo guardar el producto'}`);
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
        } else {
          alert('Hubo un error al eliminar el producto.');
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setName(''); setBarcode(''); setCost(''); setProfitMargin(''); setPrice(''); setStock('0');
    setCategoryId(''); setLowStockThreshold('5');
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
    if (window.confirm(`¿Seguro que quieres borrar la categoría "${catName}"? Los productos asociados quedarán "Sin Categoría".`)) {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/categories/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          fetchCategories();
          fetchProducts(); // Para actualizar los nombres de categorías en la tabla
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
        fetchProducts(); // Refrescar lista
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

  // --- Funciones de Import/Export ---
  const handleExport = () => {
    const dataToExport = products.map((p: Product) => ({
      'Nombre': p.name,
      'Código de Barras': p.barcode || 'Manual',
      'Precio Compra': p.cost || 0,
      'Utilidad (%)': p.profitMargin || 0,
      'Precio Venta': p.price,
      'Stock Actual': p.stock,
      'Mínimo Stock': p.lowStockThreshold,
      'Categoría': p.category?.name || 'Sin Categoría'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `Inventario_Tiendeo_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

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

        // Mapear datos a CreateProductDto
        const productsToImport = data.map((row: any) => {
          // Buscar categoría por nombre
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
        }).filter(p => p.name); // Solo productos con nombre

        if (productsToImport.length > 0) {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products/bulk`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify(productsToImport)
          });

          if (res.ok) {
            alert(`¡Éxito! Se importaron ${productsToImport.length} productos.`);
            fetchProducts();
          } else {
            alert('Hubo un error al realizar la importación masiva.');
          }
        }
      } catch (error) {
        console.error("Error parsing excel", error);
        alert('Formato de archivo inválido.');
      }
    };
    reader.readAsBinaryString(file);
    // Limpiar input
    e.target.value = '';
  };

  const filteredProducts = products.filter((p: Product) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
             Inventario de Productos
           </h2>
           <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
             Administra tu catálogo. Escanea códigos o crea productos manuales.
           </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleExport}
            title="Exportar inventario a Excel"
            className="inline-flex items-center rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </button>
          <button 
            onClick={handleImportClick}
            title="Importar productos desde Excel"
            className="inline-flex items-center rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
          >
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            title="Seleccionar archivo para importar"
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileImport}
          />
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            title="Gestionar categorías"
            className="inline-flex items-center rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Categorías
          </button>
          <button 
            onClick={openCreateModal}
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Añadir Producto
          </button>
        </div>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Barcode className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            className="block w-full rounded-lg border-0 py-2.5 pl-10 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-slate-800 sm:text-sm sm:leading-6 transition-colors"
            placeholder="Pistolear código o buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleScannerInput}
            autoFocus
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto pb-4">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">Código</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">Producto</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[150px]">Precio de Venta</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[100px]">Stock</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">Cargando inventario...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">No hay productos. ¡Agrega el primero!</td>
                </tr>
              ) : (
                filteredProducts.map((product: Product) => {
                  const isLowStock = product.stock <= (product.lowStockThreshold || 5);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                        {product.barcode || <span className="text-gray-400 italic">Manual</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 dark:text-white leading-tight">{product.name}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                            {product.category?.name || 'Sin Categoría'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                        ${Math.round(Number(product.price)).toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full font-bold ${
                          isLowStock 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse' 
                            : 'text-gray-900 dark:text-gray-300'
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleEdit(product)} title="Editar producto" className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id, product.name)} title="Eliminar producto" className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? '✏️ Editar Producto' : '💳 Crear Nuevo Producto'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ingresa el código, costos y el sistema calculará tu utilidad.</p>
            </div>
            
            <form onSubmit={handleCreateProduct} className="p-6 space-y-5">
              
              {/* Sección Principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="productName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre del Producto <span className="text-red-500">*</span></label>
                  <input id="productName" required title="Nombre del producto" placeholder="Ej: Coca Cola 600ml" type="text" className="mt-1 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 dark:bg-slate-800 dark:text-white dark:ring-slate-700 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="barcode" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Código de Barras</label>
                  <input id="barcode" title="Código de barras" type="text" placeholder="Pistolea aquí o deja en blanco" className="mt-1 block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 dark:bg-slate-800 dark:text-white dark:ring-slate-700 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all" value={barcode} onChange={e => setBarcode(e.target.value)} />
                </div>
              </div>

              <hr className="border-gray-200 dark:border-slate-800" />

              {/* Sección Financiera Automática */}
              <div className="bg-blue-50/50 dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-slate-700 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Precio Compra</label>
                    <div className="relative mt-1 rounded-lg">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input id="cost" title="Precio de compra" type="number" step="1" placeholder="0" className="block w-full rounded-lg border-0 py-2 pl-7 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 dark:bg-slate-900 dark:text-white dark:ring-slate-700 focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all" value={cost} onChange={e => handleCostOrMarginChange(e.target.value, profitMargin)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Utilidad</label>
                    <div className="relative mt-1 rounded-lg">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-gray-500 sm:text-sm">%</span>
                      </div>
                      <input id="profitMargin" title="Porcentaje de utilidad" type="number" step="1" placeholder="30" className="block w-full rounded-lg border-0 py-2 pl-3 pr-7 text-gray-900 ring-1 ring-inset ring-gray-300 dark:bg-slate-900 dark:text-white dark:ring-slate-700 focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all" value={profitMargin} onChange={e => handleCostOrMarginChange(cost, e.target.value)} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Precio de Venta Sugerido / Final <span className="text-red-500">*</span></label>
                  <div className="relative mt-1 rounded-lg shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 text-lg font-bold">$</span>
                    </div>
                    <input id="price" title="Precio de venta final" required type="number" step="1" placeholder="0" className="block w-full rounded-lg border-0 py-3 pl-8 pr-3 text-xl font-bold text-gray-900 bg-white ring-2 ring-inset ring-blue-500 dark:bg-slate-950 dark:text-white dark:ring-blue-500 focus:ring-2 focus:ring-blue-600 sm:leading-6 transition-all" value={price} onChange={e => handlePriceChange(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Categoría e Inventario */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Categoría</label>
                  <select 
                    title="Seleccionar categoría"
                    className="mt-1 block w-full rounded-xl border-0 py-2.5 px-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-slate-700 focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all font-bold"
                    value={categoryId} 
                    onChange={e => setCategoryId(e.target.value)}
                  >
                    <option value="">Sin Categoría</option>
                    {categories.map((c: Category) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="stock" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Stock Inicial</label>
                  <input id="stock" title="Cantidad en stock inicial" type="number" step="0.01" placeholder="0" className="mt-1 block w-full rounded-xl border-0 py-2.5 px-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-slate-700 focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all font-bold" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Alerta Stock Bajo (Mínimo)</label>
                <input 
                  type="number" 
                  title="Alerta de stock bajo"
                  placeholder="Ej: 5"
                  className="mt-1 block w-full rounded-xl border-0 py-2.5 px-3 bg-gray-50 dark:bg-slate-800 text-red-600 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-slate-700 focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all font-bold" 
                  value={lowStockThreshold} 
                  onChange={e => setLowStockThreshold(e.target.value)} 
                />
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-500 transition-colors focus:ring-4 focus:ring-blue-500/20">
                  {editingId ? 'Guardar Cambios' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Categorías */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isManagingProducts ? `Productos en ${activeCategory?.name}` : 'Gestionar Categorías'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isManagingProducts ? 'Asegúrate de que cada producto esté en su lugar.' : 'Crea etiquetas para organizar tus productos.'}
                </p>
              </div>
              {isManagingProducts && (
                <button 
                  onClick={closeManageCategoryProducts}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Volver a lista
                </button>
              )}
            </div>
            
            <div className="p-6 space-y-4">
              {!isManagingProducts ? (
                <>
                  <form onSubmit={handleCreateCategory} className="flex gap-2 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <input 
                      required 
                      title="Nombre de la nueva categoría"
                      placeholder="Nueva categoría..." 
                      className="flex-1 rounded-xl border-0 py-2 px-3 text-sm ring-1 ring-inset ring-gray-300 dark:bg-slate-800 dark:text-white dark:ring-slate-700 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition-colors">
                      {editingCategory ? 'Actualizar' : 'Crear'}
                    </button>
                    {editingCategory && (
                      <button 
                        type="button" 
                        onClick={() => { setEditingCategory(null); setNewCategoryName(''); }}
                        className="bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 text-xs font-bold transition-all"
                      >
                        Cancelar
                      </button>
                    )}
                  </form>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {categories.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No hay categorías aún.</p>
                      </div>
                    ) : (
                      categories.map((c: Category) => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold dark:text-gray-200">{c.name}</span>
                            {editingCategory?.id === c.id && <span className="text-[10px] text-blue-500 font-bold uppercase">Editando...</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => openManageCategoryProducts(c)}
                              title="Gestionar productos de esta categoría"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleEditCategory(c)}
                              title="Editar nombre de categoría"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCategory(c.id, c.name)} 
                              title="Eliminar categoría"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Buscador de productos para asignar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                      type="text"
                      title="Buscar productos para asignar o desasignar"
                      placeholder="Buscar por nombre o código..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border-none text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={productSearchTerm}
                      onChange={e => setProductSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {/* Sección 1: Productos actuales en esta categoría */}
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Productos en esta categoría</div>
                    {products.filter((p: Product) => p.categoryId === activeCategory?.id && (p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.barcode?.includes(productSearchTerm))).length === 0 ? (
                      <div className="text-[11px] text-gray-500 italic px-2">No se encontraron productos asignados.</div>
                    ) : (
                      products.filter((p: Product) => p.categoryId === activeCategory?.id && (p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.barcode?.includes(productSearchTerm))).map((p: Product) => (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold dark:text-gray-200">{p.name}</span>
                            <span className="text-[10px] text-gray-500">{p.barcode || 'Manual'}</span>
                          </div>
                          <button 
                            onClick={() => assignProductToCategory(p.id, null)}
                            className="text-[10px] font-bold text-red-500 hover:underline"
                          >
                            Quitar
                          </button>
                        </div>
                      ))
                    )}

                    {/* Sección 2: Productos SIN CATEGORÍA o en otras (para asignar) */}
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-1 mt-4">Asignar otros productos</div>
                    {products.filter((p: Product) => p.categoryId !== activeCategory?.id && (p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.barcode?.includes(productSearchTerm))).length === 0 ? (
                      <div className="text-[11px] text-gray-500 italic px-2">No hay otros productos para mostrar.</div>
                    ) : (
                      products.filter((p: Product) => p.categoryId !== activeCategory?.id && (p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.barcode?.includes(productSearchTerm))).map((p: Product) => (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all opacity-70 hover:opacity-100">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold dark:text-gray-200">{p.name}</span>
                            <span className="text-[10px] text-gray-500">
                              {p.barcode || 'Manual'} • <span className={p.category ? 'text-blue-500' : 'text-red-400 italic'}>{p.category?.name || 'SIN CATEGORÍA'}</span>
                            </span>
                          </div>
                          <button 
                            onClick={() => assignProductToCategory(p.id, activeCategory?.id || null)}
                            className="text-[10px] font-bold text-emerald-600 hover:underline"
                          >
                            Asignar
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                    <button 
                      onClick={() => openCreateModalWithCategory(activeCategory?.id || '')}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-3 w-3" /> Crear Nuevo Producto aquí
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => { setIsCategoryModalOpen(false); closeManageCategoryProducts(); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
