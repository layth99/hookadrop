import 'dotenv/config';
import mongoose from 'mongoose';
const Cat = mongoose.model('Category', new mongoose.Schema({name:String,description:String},{timestamps:true}));
await mongoose.connect(process.env.MONGO_DB_URI);
const cats = await Cat.find({});
console.log('Total categories in MongoDB:', cats.length);
cats.forEach(c => console.log(' -', c._id.toString(), '|', c.name));
await mongoose.disconnect();
