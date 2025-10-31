const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Database setup
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) console.error("Database connection error:", err);
  else console.log("Connected to SQLite database.");
});

// Create table if not exists
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

// Routes
// Get all records
app.get("/api/axiologiseis", (req, res) => {
  db.all("SELECT * FROM Axiologiseis", [], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

// Get single record by id
app.get("/api/axiologiseis/:id", (req, res) => {
  db.get("SELECT * FROM Axiologiseis WHERE id = ?", [req.params.id], (err, row) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(row);
  });
});

// Create new record
app.post("/api/axiologiseis", (req, res) => {
  const data = req.body;
  const sql = `
    INSERT INTO Axiologiseis (
      aa_aitisis, imnia, imnia_praxis, eponimia, eidos_drast,
      perifereia, perioxi, odos, tk, tilefono, email,
      axiologisi_lvl1, axiologisi_lvl2, axiologisi_lvl3
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    data.aa_aitisis, data.imnia, data.imnia_praxis, data.eponimia, data.eidos_drast,
    data.perifereia, data.perioxi, data.odos, data.tk, data.tilefono, data.email,
    data.axiologisi_lvl1, data.axiologisi_lvl2, data.axiologisi_lvl3
  ];

  db.run(sql, params, function(err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ id: this.lastID });
  });
});

// Update record
app.put("/api/axiologiseis/:id", (req, res) => {
  const data = req.body;
  const sql = `
    UPDATE Axiologiseis SET
      aa_aitisis=?, imnia=?, imnia_praxis=?, eponimia=?, eidos_drast=?,
      perifereia=?, perioxi=?, odos=?, tk=?, tilefono=?, email=?,
      axiologisi_lvl1=?, axiologisi_lvl2=?, axiologisi_lvl3=?
    WHERE id=?
  `;
  const params = [
    data.aa_aitisis, data.imnia, data.imnia_praxis, data.eponimia, data.eidos_drast,
    data.perifereia, data.perioxi, data.odos, data.tk, data.tilefono, data.email,
    data.axiologisi_lvl1, data.axiologisi_lvl2, data.axiologisi_lvl3, req.params.id
  ];

  db.run(sql, params, function(err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ updated: this.changes });
  });
});

// Delete record
app.delete("/api/axiologiseis/:id", (req, res) => {
  db.run("DELETE FROM Axiologiseis WHERE id=?", [req.params.id], function(err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ deleted: this.changes });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
