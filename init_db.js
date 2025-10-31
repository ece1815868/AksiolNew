const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS Axiologiseis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aa_aitisis TEXT,
      imnia TEXT,
      imnia_praxis TEXT,
      eponimia TEXT,
      eidos_drast TEXT,
      perifereia TEXT,
      perioxi TEXT,
      odos TEXT,
      tk TEXT,
      tilefono TEXT,
      email TEXT,
      axiologisi_lvl1 TEXT,
      axiologisi_lvl2 TEXT,
      axiologisi_lvl3 TEXT
    )
  `);
});

db.close();
console.log("✅ SQLite DB initialized");
