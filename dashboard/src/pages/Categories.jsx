import { useEffect, useState } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Loader from '../components/Loader'
import Modal from '../components/Modal'
import { formatDate } from '../utils/formatters'
import { Plus, Edit, Trash2, Layers, AlertTriangle } from 'lucide-react'

const Categories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [formModal, setFormModal] = useState({ isOpen: false, category: null })
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, category: null })
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => { fetchCategories() }, [])

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories')
      // API returns { success: true, data: [...] }
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      setCategories(list)
    } catch (error) {
      toast.error('Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const openFormModal = (category = null) => {
    setFormData(category ? { name: category.name, description: category.description || '' } : { name: '', description: '' })
    setFormModal({ isOpen: true, category })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (formModal.category) {
        await api.put(`/categories/${formModal.category._id}`, formData)
        toast.success('Category updated')
      } else {
        await api.post('/categories', formData)
        toast.success('Category created')
      }
      fetchCategories()
      setFormModal({ isOpen: false, category: null })
    } catch (error) {
      toast.error('Failed to save category')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleteModal.category._id}`)
      toast.success('Category deleted')
      fetchCategories()
      setDeleteModal({ isOpen: false, category: null })
    } catch (error) {
      toast.error('Failed to delete category')
    }
  }

  if (loading) return <Loader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize your products into categories</p>
        </div>
        <button onClick={() => openFormModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            All Categories ({categories.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                {['Name', 'Description', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-neon-gold/80 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Layers className="w-12 h-12 text-gray-600" />
                      <p className="text-gray-400">No categories yet</p>
                      <button onClick={() => openFormModal()} className="btn-primary text-sm">
                        Create first category
                      </button>
                    </div>
                  </td>
                </tr>
              ) : categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neon-gold/10 border border-neon-gold/30 rounded-lg flex items-center justify-center">
                        <Layers className="w-4 h-4 text-neon-gold" />
                      </div>
                      <span className="font-medium text-gray-100">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {cat.description || <span className="text-gray-600 italic">No description</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {formatDate(cat.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openFormModal(cat)}
                        className="p-2 text-gray-400 hover:text-neon-blue hover:bg-blue-900/30 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, category: cat })}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, category: null })}
        title={formModal.category ? 'Edit Category' : 'Add Category'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-dark">Category Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="input"
              placeholder="e.g., Hookah Accessories"
            />
          </div>
          <div>
            <label className="label-dark">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="input resize-none"
              placeholder="Optional description..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setFormModal({ isOpen: false, category: null })} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {formModal.category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, category: null })}
        title="Delete Category"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 bg-red-900/20 border border-red-700/40 rounded-xl">
            <AlertTriangle className="w-7 h-7 text-red-400 flex-shrink-0" />
            <p className="text-gray-300 text-sm">
              Delete <span className="font-semibold text-gray-100">{deleteModal.category?.name}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteModal({ isOpen: false, category: null })} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Categories
