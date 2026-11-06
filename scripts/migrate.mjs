import {openDatabase} from '../src/database.mjs';
const db=openDatabase(process.env.DATABASE_PATH||'data/masar.sqlite');db.close();
console.log('Database migrations applied.');
