import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We dynamically import the script so env vars are set first
import('./src/init-admin.js').catch(console.error);
