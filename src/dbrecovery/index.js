const sqlite3 = require('sqlite3').verbose();

// Conexión a la base de datos SQLite
const db = new sqlite3.Database('./SDAuth.sqlite', (err) => {
  if (err) {
    console.error(err.message);
    throw err;
  }
});

module.exports = db;