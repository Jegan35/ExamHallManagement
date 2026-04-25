const mysql = require('mysql2');


// Create a connection pool to handle multiple requests efficiently
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',         // Default XAMPP/MySQL user
    password: '2175', // REPLACE THIS with your MySQL password
    database: 'examhall_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convert pool to use promises so we can use async/await
const db = pool.promise();

// Test the connection
db.getConnection()
    .then(() => console.log('Database connected successfully!'))
    .catch(err => console.error('Database connection failed:', err.message));
    
module.exports = db;
