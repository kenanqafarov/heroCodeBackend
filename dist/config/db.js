import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
export const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI tapilmadi. .env faylini yoxlayin.');
        }
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        console.log('MongoDB Atlas ilə əlaqə quruldu');
    }
    catch (error) {
        console.error('MongoDB bağlantı xətası:', error?.message || error);
        console.error('Atlas yoxlama: Network Access-da IP icazesi verin (ya 0.0.0.0/0), Database Access-da istifadeci/parol duzgun olsun, URI-de DB adi olsun.');
        process.exit(1);
    }
};
//# sourceMappingURL=db.js.map