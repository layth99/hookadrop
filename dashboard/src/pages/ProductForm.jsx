import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import { ArrowLeft, Upload, X, ImageIcon, Loader2 } from 'lucide-react'

const IMAGE_FIELDS = ['image', 'image1', 'image2', 'image3']

// ── Image slot ────────────────────────────────────────────────────────────────
const ImageSlot = ({ label, required, value, onChange, onFileChange, uploading }) => (
  <div className="space-y-2">
    <label className="label-dark">
      {label} {required && <span className="text-red-400">*</span>}
    </label>

    {/* Preview */}
    <div className="relative w-full h-36 rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/50 overflow-hidden hover:border-neon-gold/40 transition-colors">
      {value ? (
        <>
          <img src={value} alt="preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-red-900/80 rounded-full text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
          <ImageIcon className="w-8 h-8" />
          <span className="text-xs">No image</span>
        </div>
      )}
      {uploading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-neon-gold animate-spin" />
        </div>
      )}
    </div>

    {/* URL paste */}
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input text-xs"
      placeholder="Paste image URL here..."
    />

    {/* File pick */}
    <label className="btn-secondary cursor-pointer flex items-center justify-center gap-2 w-full select-none">
      {uploading
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
        : <><Upload className="w-4 h-4" /> Upload from device</>}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={onFileChange}
      />
    </label>
  </div>
)

// ── Main component ────────────────────────────────────────────────────────────
const ProductForm = () => {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isEdit   = Boolean(id)

  const [pageLoading, setPageLoading]     = useState(isEdit)
  const [submitting, setSubmitting]       = useState(false)
  const [categories, setCategories]       = useState([])
  const [uploadingField, setUploadingField] = useState(null)

  const [form, setForm] = useState({
    name: '', description: '', price: '', discount: '0',
    mark: '', category: '', stock: '',
    image: '', image1: '', image2: '', image3: '',
  })

  useEffect(() => {
    loadCategories()
    if (isEdit) loadProduct()
  }, [id]) // eslint-disable-line

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/categories')
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      setCategories(list)
    } catch {
      // non-blocking — user can still type category manually
    }
  }

  const loadProduct = async () => {
    try {
      const { data } = await api.get('/products/' + id)
      const p = data?.data ?? data
      setForm({
        name:        p.name        || '',
        description: p.description || '',
        price:       String(p.price    || ''),
        discount:    String(p.discount || '0'),
        mark:        p.mark        || '',
        category:    p.category    || '',
        stock:       String(p.stock    || ''),
        image:       p.image       || '',
        image1:      p.image1      || '',
        image2:      p.image2      || '',
        image3:      p.image3      || '',
      })
    } catch {
      toast.error('Failed to load product')
    } finally {
      setPageLoading(false)
    }
  }

  const setField = (name, value) =>
    setForm(prev => ({ ...prev, [name]: value }))

  const handleChange = (e) => setField(e.target.name, e.target.value)

  // Upload one image file to /api/upload → get back a URL
  const handleFileChange = async (e, field) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large — max 10 MB')
      return
    }

    setUploadingField(field)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setField(field, data.url)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Upload failed')
    } finally {
      setUploadingField(null)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.image.trim()) {
      toast.error('Main image is required')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        price:    Number(form.price),
        discount: Number(form.discount),
        stock:    Number(form.stock),
      }
      if (isEdit) {
        await api.put('/products/' + id, payload)
        toast.success('Product updated')
      } else {
        await api.post('/products', payload)
        toast.success('Product created')
      }
      navigate('/products')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save product')
    } finally {
      setSubmitting(false)
    }
  }

  if (pageLoading) return <Loader />

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
          <p className="page-subtitle">
            {isEdit ? 'Update product information' : 'Fill in the details to create a product'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic info */}
        <div className="card space-y-5">
          <h3 className="text-base font-semibold text-gray-100 pb-3 border-b border-gray-800">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="md:col-span-2">
              <label className="label-dark">Product Name <span className="text-red-400">*</span></label>
              <input
                type="text" name="name" value={form.name}
                onChange={handleChange} required
                className="input" placeholder="e.g. Khalil Mamoon Classic"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label-dark">Description <span className="text-red-400">*</span></label>
              <textarea
                name="description" value={form.description}
                onChange={handleChange} required rows={4}
                className="input resize-none"
                placeholder="Describe the product..."
              />
            </div>

            <div>
              <label className="label-dark">Brand / Mark <span className="text-red-400">*</span></label>
              <input
                type="text" name="mark" value={form.mark}
                onChange={handleChange} required
                className="input" placeholder="e.g. Khalil Mamoon"
              />
            </div>

            <div>
              <label className="label-dark">Category <span className="text-red-400">*</span></label>
              <select
                name="category" value={form.category}
                onChange={handleChange} required className="input"
              >
                <option value="">— Select a category —</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Pricing & stock */}
        <div className="card space-y-5">
          <h3 className="text-base font-semibold text-gray-100 pb-3 border-b border-gray-800">
            Pricing & Stock
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label-dark">Price (DA) <span className="text-red-400">*</span></label>
              <input
                type="number" name="price" value={form.price}
                onChange={handleChange} required min="0" step="0.01"
                className="input" placeholder="0.00"
              />
            </div>
            <div>
              <label className="label-dark">Discount (%)</label>
              <input
                type="number" name="discount" value={form.discount}
                onChange={handleChange} min="0" max="100"
                className="input" placeholder="0"
              />
            </div>
            <div>
              <label className="label-dark">Stock <span className="text-red-400">*</span></label>
              <input
                type="number" name="stock" value={form.stock}
                onChange={handleChange} required min="0"
                className="input" placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="card space-y-5">
          <div className="pb-3 border-b border-gray-800">
            <h3 className="text-base font-semibold text-gray-100">Product Images</h3>
            <p className="text-xs text-gray-500 mt-1">
              Upload a file or paste a URL. The first image (Main) is required.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {IMAGE_FIELDS.map((field, i) => (
              <ImageSlot
                key={field}
                label={'Image ' + (i + 1) + (i === 0 ? ' — Main' : '')}
                required={i === 0}
                value={form[field]}
                onChange={(val) => setField(field, val)}
                onFileChange={(e) => handleFileChange(e, field)}
                uploading={uploadingField === field}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>

      </form>
    </div>
  )
}

export default ProductForm
