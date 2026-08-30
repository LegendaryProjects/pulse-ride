const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });


const pool = new Pool({
    connectionString:process.env.DATABASE_URL,
    ssl: {
    rejectUnauthorized: false // Required for managed cloud databases
    }
});

module.exports={
    query:(text,params)=>pool.query(text,params),
};