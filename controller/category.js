import Category from "../models/Category.js";
import Product  from "../models/Product.js";

// GET all categories — includes real productCount from DB
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    const nameToId = {
      'chichas': 'hookahs', 'hookah': 'hookahs', 'chicha': 'hookahs', 'shisha': 'hookahs',
      'tabacs': 'tobacco', 'tobacco': 'tobacco', 'tabac': 'tobacco',
      'charbons': 'coals', 'coal': 'coals', 'charbon': 'coals',
      'foyers': 'foyers', 'foyer': 'foyers', 'bowl': 'foyers',
      'packs': 'fullpacks', 'pack': 'fullpacks', 'full': 'fullpacks', 'complets': 'fullpacks',
      'accessoires': 'cleaning', 'cleaning': 'cleaning', 'clean': 'cleaning'
    };

    // Count products for each category (case-insensitive match on category name)
    const data = await Promise.all(
      categories.map(async (cat) => {
        const obj = cat.toJSON ? cat.toJSON() : { ...cat._doc };
        const firstWord = (obj.name || '').split(' ')[0].toLowerCase();
        const semanticId = obj.id || nameToId[firstWord] || (obj.name || '').toLowerCase().replace(/\s+/g, '_');

        // Count products whose category matches this category's name
        // Uses case-insensitive regex + also checks common singular/plural variants
        const catName = obj.name || '';
        const variants = [catName];
        // Add common variants: Hookahs ↔ Hookah, Coals ↔ Coal, etc.
        if (catName.endsWith('s')) variants.push(catName.slice(0, -1));   // Hookahs → Hookah
        else                        variants.push(catName + 's');          // Hookah → Hookahs
        if (catName === 'Full packs') variants.push('Fullpacks', 'Full pack');
        if (catName === 'Cleaning')   variants.push('Accessory', 'Accessories');

        const productCount = await Product.countDocuments({
          category: { $in: variants.map(v => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) }
        });

        return { ...obj, id: semanticId, productCount };
      })
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getAllCategories error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
};

// POST create category
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name is required" });
    const category = await Category.create({ name, description });
    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create category" });
  }
};

// PUT update category
export const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update category" });
  }
};

// DELETE category
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete category" });
  }
};
