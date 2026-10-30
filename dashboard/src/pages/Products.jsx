import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import Modal from '../components/Modal'
import ProductsPage from '../components/ProductsPage'
import { usePermissions } from '../utils/permissions'
import { AlertTriangle, Edit, Trash2, X, Calendar, RefreshCw, ImageIcon, Layers } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/formatters'

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
                  <ImageIcon className="w-8 h-8 text-gray-700" />
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

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // modals
  const [detailProduct, setDetailProduct] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, product: null })

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products', { params: { page: 1, limit: 1000 } })
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      setProducts(list)
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

  // Map products to ProductsPage format
  const mappedProducts = products.map(p => ({
    id: p._id,
    name: p.name,
    brand: p.mark, // mark → brand
    image: p.image,
    category: p.category,
    price: p.price,
    discount: p.discount || 0,
    stock: p.stock || 0,
    lowStockThreshold: 10
  }))

  if (loading) return <Loader />

  return (
    <>
      <ProductsPage
        products={mappedProducts}
        loading={loading}
        onAdd={() => navigate('/products/new')}
        onEdit={(product) => navigate(`/products/edit/${product.id}`)}
        onDelete={(product) => {
          // Find original product to get full data
          const original = products.find(p => p._id === product.id)
          setDeleteModal({ isOpen: true, product: original })
        }}
        onRowClick={(product) => {
          // Find original product to get full data
          const original = products.find(p => p._id === product.id)
          setDetailProduct(original)
        }}
      />

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
    </>
  )
}

export default Products
