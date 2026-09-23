// controllers/productController.js
import Product from "../models/Product.js";
import cloudinary from "../storage/cloudinaryConfig.js";

// GET all products with filters and pagination

export const uploadProductImage = async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "products", // specify the folder name in Cloudinary
      fetch_format: "AVIF",
      quality: "auto",
      crop: "auto",
      gravity: "auto",
      width: 500,
      height: 500,
    });

    res.status(200).json({
      success: true,
      imageUrl: result.secure_url,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ success: false, error: "Image upload failed" });
  }
};
export const searchProducts = async (req, res) => {
  const name = req.query.name;

  if (!name) {
    return res.status(400).json({ error: "Name parameter is required" });
  }

  const filter = {};
  if (name) {
    filter.name = { $regex: name, $options: "i" };
  }

  try {
    const products = await Product.find(filter)
      .limit(8)
      .select("name price image stock");

    return res.status(200).json({
      data: products,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Failed to fetch products" });
  }
};
export const getAllProducts = async (req, res) => {
  const {
    minPrice,
    maxPrice,
    limit,
    category,
    discount,
    name,
    stock,
    page,
    mark,
    sortField,
    sortOrder,
  } = req.query;

  if (page < 1 || limit < 1) {
    return res.status(400).json({ error: "Invalid pagination parameters" });
  }
  let sortOptions = { createdAt: -1 };
  const filter = {};
  if (category) filter.category = category;
  if (discount === "true") filter.discount = { $ne: 0 };
  if (name) filter.name = { $regex: name, $options: "i" };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Customize sorting based on query parameters
  if (sortField === "price") {
    sortOptions = { price: sortOrder === "asc" ? 1 : -1 };
  }

  if (stock) {
    stock > 0 ? (filter.stock = { $gte: Number(stock) }) : (filter.stock = 0);
  }
  if (mark) {
    filter.mark = mark;
  }
  try {
    const products = await Product.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(filter);
    return res.status(200).json({
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(total / limit),
      data: products,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch products" });
  }
};

// POST a new product
// Accepts either:
//   - multipart/form-data with files  → uploads to Cloudinary
//   - application/json with image URLs already in body → saves directly
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, discount, category, stock, mark,
            image: bodyImage, image1: bodyImage1, image2: bodyImage2, image3: bodyImage3 } = req.body;

    let imageUrls = [bodyImage || null, bodyImage1 || null, bodyImage2 || null, bodyImage3 || null];

    // If files were uploaded (multipart), upload them to Cloudinary and override URLs
    if (req.files && req.files.length > 0) {
      const uploadResults = await Promise.all(
        req.files.map((file) =>
          cloudinary.uploader.upload(file.path, { folder: "products" })
        )
      );
      imageUrls = uploadResults.map((r) => r.secure_url);
    }

    const product = new Product({
      name,
      mark,
      description,
      price,
      discount,
      category,
      stock,
      image:  imageUrls[0] || null,
      image1: imageUrls[1] || null,
      image2: imageUrls[2] || null,
      image3: imageUrls[3] || imageUrls[0] || null,
    });

    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ success: false, error: "Product creation failed" });
  }
};

// GET product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false });
    }
    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// PUT update product by ID
// Accepts either multipart files OR JSON body with image URLs
export const updateProduct = async (req, res) => {
  const { name, description, price, discount, category, stock, mark,
          image: bodyImage, image1: bodyImage1, image2: bodyImage2, image3: bodyImage3 } = req.body;

  const updateFields = {};

  // If files uploaded → upload to Cloudinary
  if (req.files && req.files.length > 0) {
    const uploadResults = await Promise.all(
      req.files.map((file) =>
        cloudinary.uploader.upload(file.path, { folder: "products" })
      )
    );
    const imageUrls = uploadResults.map((r) => r.secure_url);
    if (imageUrls[0]) updateFields.image  = imageUrls[0];
    if (imageUrls[1]) updateFields.image1 = imageUrls[1];
    if (imageUrls[2]) updateFields.image2 = imageUrls[2];
    if (imageUrls[3]) updateFields.image3 = imageUrls[3];
  } else {
    // Otherwise use URLs from body if provided
    if (bodyImage  !== undefined) updateFields.image  = bodyImage;
    if (bodyImage1 !== undefined) updateFields.image1 = bodyImage1;
    if (bodyImage2 !== undefined) updateFields.image2 = bodyImage2;
    if (bodyImage3 !== undefined) updateFields.image3 = bodyImage3;
  }

  if (name)        updateFields.name        = name;
  if (description) updateFields.description = description;
  if (price)       updateFields.price       = price;
  if (discount !== undefined) updateFields.discount = discount;
  if (category)    updateFields.category    = category;
  if (stock !== undefined)    updateFields.stock    = stock;
  if (mark)        updateFields.mark        = mark;

  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ success: false });
    }
    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// DELETE product by ID
export const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.deleteOne({ _id: req.params.id });
    if (!deletedProduct) {
      return res.status(404).json({ success: false });
    }
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// Search products
