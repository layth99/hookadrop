import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import Modal from '../components/Modal'
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters'
import { usePermissions } from '../utils/permissions'
import {
  Plus, Edit, Trash2, Search, Package2, AlertTriangle,
  TrendingUp, X, Tag, Layers, Calendar, RefreshCw, ImageIcon
} from 'lucide-react'

// ── Product Detail Modal ───────────────────────────────────────────────────────
const ProductDetailModal = ({ product, onClose, onEdit, onDelete, canEdit, canDelete }) => {
  const [activeImg, setActiveImg] = useState(0)
  if (!product) return null

  const images = [product.image, product.image1, product.image2, product.image3].filter(Boolean)

  const discountedPrice = product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : null

  return (
    <Modal isOpen={!!product} onClose={onClose} title="Product Details" size="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Images */}
          <div className="space-y-3">
            <div className="w-full aspect-square rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
              {images.length > 0 ? (
                <img
                  src={images[activeImg]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-gray-700" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      activeImg === i ? 'border-neon-gold' : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-100">{product.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{product.mark}</p>
            </div>

            {/* Price */}
            <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">Price</p>
              <div className="flex items-baseline gap-3">
                {discountedPrice ? (
                  <>
                    <span className="text-2xl font-bold text-neon-gold">
                      {formatCurrency(discountedPrice)}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      {formatCurrency(product.price)}
                    </span>
                    <span className="text-xs font-semibold text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full border border-green-700/40">
                      -{product.discount}%
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-gray-100">
                    {formatCurrency(product.price)}
                  </span>
                )}
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  <Layers className="w-3 h-3" /> Category
                </p>
                <p className="text-sm font-medium text-gray-200">{product.category}</p>
              </div>
              <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Stock</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">{product.stock} units</span>
                  {product.stock === 0 && (
                    <span className="badge-danger text-xs">Out</span>
                  )}
                  {product.stock > 0 && product.stock <= 10 && (
                    <span className="badge-warning text-xs">Low</span>
                  )}
                  {product.stock > 10 && (
                    <span className="badge-success text-xs">OK</span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3" /> Created
                </p>
                <p className="text-xs font-medium text-gray-300">
                  {product.createdAt ? formatDate(product.createdAt) : '—'}
                </p>
              </div>
              <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  <RefreshCw className="w-3 h-3" /> Updated
                </p>
                <p className="text-xs font-medium text-gray-300">
                  {product.updatedAt ? formatDate(product.updatedAt) : '—'}
                </p>
              </div>
            </div>

            {/* ID */}
            <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">Product ID</p>
              <p className="text-xs font-mono text-gray-400 break-all">{product._id}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
            <p className="text-xs text-gray-500 mb-2">Description</p>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-800">
          <button onClick={onClose} className="btn-secondary">Close</button>
          {canDelete && (
            <button
              onClick={() => { onClose(); onDelete(product) }}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => { onClose(); onEdit(product._id) }}
              className="btn-primary flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit Product
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
const Products = () => {
  const navigate = useNavigate()
  const { can } = usePermissions()

  const [products, setProducts]           = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading]             = useState(true)
  const [searchTerm, setSearchTerm]       = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // modals
  const [detailProduct, setDetailProduct] = useState(null)
  const [deleteModal, setDeleteModal]     = useState({ isOpen: false, product: null })

  useEffect(() => { fetchProducts() }, [])

  useEffect(() => {
    let filtered = products
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mark?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter)
    }
    setFilteredProducts(filtered)
  }, [searchTerm, categoryFilter, products])

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products', { params: { page: 1, limit: 1000 } })
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      setProducts(list)
      setFilteredProducts(list)
    } catch {
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${deleteModal.product._id}`)
      toast.success('Product deleted')
      setProducts(p => p.filter(x => x._id !== deleteModal.product._id))
      setDeleteModal({ isOpen: false, product: null })
    } catch {
      toast.error('Failed to delete product')
    }
  }

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))]
  const totalStock  = products.reduce((a, p) => a + (p.stock || 0), 0)
  const lowStock    = products.filter(p => p.stock <= 10 && p.stock > 0).length
  const outOfStock  = products.filter(p => p.stock === 0).length

  if (loading) return <Loader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        {can('products.create') && (
          <button
            onClick={() => navigate('/products/new')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-neon-gold/10 rounded-xl border border-neon-gold/30">
            <Package2 className="w-6 h-6 text-neon-gold" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-100">{products.length}</p>
            <p className="text-xs text-gray-400">Total Products</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-neon-blue/10 rounded-xl border border-neon-blue/30">
            <TrendingUp className="w-6 h-6 text-neon-blue" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-100">{totalStock}</p>
            <p className="text-xs text-gray-400">Total Stock</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-yellow-900/30 rounded-xl border border-yellow-700/40">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-300">{lowStock}</p>
            <p className="text-xs text-gray-400">Low Stock</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-red-900/30 rounded-xl border border-red-700/40">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{outOfStock}</p>
            <p className="text-xs text-gray-400">Out of Stock</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, category, brand..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="select-dark"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
          <div className="text-sm text-gray-400 whitespace-nowrap">
            <span className="text-neon-gold font-semibold">{filteredProducts.length}</span> products
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 mt-0.5">Click a row to view product details</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-neon-gold/80 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neon-gold/80 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neon-gold/80 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neon-gold/80 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neon-gold/80 uppercase tracking-wider">Status</th>
                {(can('products.edit') || can('products.delete')) && (
                  <th className="px-6 py-3 text-right text-xs font-semibold text-neon-gold/80 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Package2 className="w-12 h-12 text-gray-600" />
                      <p className="text-gray-400">No products found</p>
                      {can('products.create') && (
                        <button
                          onClick={() => navigate('/products/new')}
                          className="btn-primary text-sm"
                        >
                          Add your first product
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.map(product => (
                <tr
                  key={product._id}
                  onClick={() => setDetailProduct(product)}
                  className="hover:bg-gray-800/40 transition-colors group cursor-pointer"
                >
                  {/* Product */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-700 bg-gray-800 flex-shrink-0">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package2 className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-100 group-hover:text-neon-gold transition-colors">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">{product.mark}</p>
                      </div>
                    </div>
                  </td>
                  {/* Category */}
                  <td className="px-6 py-4">
                    <span className="badge-info">{product.category}</span>
                  </td>
                  {/* Price */}
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-100">{formatCurrency(product.price)}</p>
                    {product.discount > 0 && (
                      <p className="text-xs text-green-400">-{product.discount}% off</p>
                    )}
                  </td>
                  {/* Stock count */}
                  <td className="px-6 py-4">
                    <p className="text-gray-200 font-medium">{product.stock ?? 0}</p>
                  </td>
                  {/* Stock badge */}
                  <td className="px-6 py-4">
                    {product.stock === 0 ? (
                      <span className="badge-danger">Out of stock</span>
                    ) : product.stock <= 10 ? (
                      <span className="badge-warning">Low stock</span>
                    ) : (
                      <span className="badge-success">In stock</span>
                    )}
                  </td>
                  {/* Actions — stop propagation so clicking buttons doesn't open detail */}
                  {(can('products.edit') || can('products.delete')) && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {can('products.edit') && (
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/products/edit/${product._id}`) }}
                            className="p-2 text-gray-400 hover:text-neon-blue hover:bg-blue-900/30 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {can('products.delete') && (
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteModal({ isOpen: true, product }) }}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Product Detail Modal ─────────────────────────────────────────────── */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onEdit={id => navigate(`/products/edit/${id}`)}
        onDelete={p => setDeleteModal({ isOpen: true, product: p })}
        canEdit={can('products.edit')}
        canDelete={can('products.delete')}
      />

      {/* ── Delete Confirmation ──────────────────────────────────────────────── */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, product: null })}
        title="Delete Product"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 bg-red-900/20 border border-red-700/40 rounded-xl">
            <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
            <p className="text-gray-300 text-sm">
              Delete{' '}
              <span className="font-semibold text-gray-100">{deleteModal.product?.name}</span>?
              This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setDeleteModal({ isOpen: false, product: null })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleDelete} className="btn-danger">
              Delete Product
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Products
