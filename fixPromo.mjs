import dotenv from 'dotenv'; dotenv.config();
import mongoose from 'mongoose';
import Promotion from './models/Promotion.js';

await mongoose.connect(process.env.MONGO_DB_URI);

// Fix HOOKA15 to cover both "Hookah" and "Hookahs" category values
const r1 = await Promotion.findOneAndUpdate(
  { code: 'HOOKA15' },
  { eligibleCategoryIds: ['Hookah', 'Hookahs'] },
  { new: true }
);
console.log('HOOKA15 categories:', r1.eligibleCategoryIds);

// Fix FLAVOR20 to also cover "Tobacco" + "tobacco"
const r2 = await Promotion.findOneAndUpdate(
  { code: 'FLAVOR20' },
  { eligibleCategoryIds: ['Tobacco', 'tobacco'] },
  { new: true }
);
console.log('FLAVOR20 categories:', r2.eligibleCategoryIds);

await mongoose.disconnect();
console.log('Done.');
