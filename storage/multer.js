import multer from "multer";

// Set up storage engine
const storage = multer.diskStorage({});

// Initialize multer
const upload = multer({ storage });

export default upload;
