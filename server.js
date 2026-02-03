const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const ExcelJS = require("exceljs");
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
  db.all("SELECT * FROM Axiologiseis ORDER BY imnia DESC", [], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

// Get records with due_date and days_left (ΥΨΗΛΟ: +12 months, ΜΕΣΑΙΟ: +36 months; fallback lvl2; exclude ΧΑΜΗΛΟ)
app.get("/api/axiologiseis/due", (req, res) => {
  const sql = `
    WITH base AS (
      SELECT
        *,
        CASE
          WHEN trim(COALESCE(axiologisi_lvl3,'')) = 'ΥΨΗΛΟ' THEN date(imnia, '+12 months')
          WHEN trim(COALESCE(axiologisi_lvl3,'')) = 'ΜΕΣΑΙΟ' THEN date(imnia, '+36 months')
          WHEN trim(COALESCE(axiologisi_lvl2,'')) = 'ΥΨΗΛΟ' THEN date(imnia, '+12 months')
          WHEN trim(COALESCE(axiologisi_lvl2,'')) = 'ΜΕΣΑΙΟ' THEN date(imnia, '+36 months')
          ELSE NULL
        END AS due_date
      FROM Axiologiseis
      WHERE
        trim(COALESCE(axiologisi_lvl3,'')) <> 'ΧΑΜΗΛΟ'
        AND trim(COALESCE(axiologisi_lvl2,'')) <> 'ΧΑΜΗΛΟ'
    )
    SELECT
      *,
      CAST(julianday(due_date) - julianday(date('now','localtime')) AS INTEGER) AS days_left
    FROM base
    WHERE due_date IS NOT NULL
    ORDER BY due_date ASC
  `;

  db.all(sql, [], (err, rows) => {
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

// Export excel
app.get("/api/axiologiseis/:id/excel", (req, res) => {
  const id = req.params.id;

  db.get("SELECT * FROM Axiologiseis WHERE id = ?", [id], async (err, record) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Σφάλμα ανάκτησης δεδομένων");
    }

    if (!record) {
      return res.status(404).send("Η εγγραφή δεν βρέθηκε");
    }

    try {
      const templatePath = path.join(__dirname, "template.xlsx");

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);
      const sheet = workbook.worksheets[0];

      // --- Fill your cells with database values ---
      sheet.getCell("E4").value = record.id;
      sheet.getCell("G4").value = record.imnia;
      sheet.getCell("D6").value = record.aa_aitisis;

      sheet.getCell("E9").value = record.eponimia;
      sheet.getCell("E11").value = record.eidos_drast;
      sheet.getCell("E12").value = record.perifereia;
      sheet.getCell("E13").value = record.perioxi;
      sheet.getCell("E14").value = record.odos;
      sheet.getCell("E15").value = record.tk;
      sheet.getCell("E16").value = record.tilefono;
      sheet.getCell("E17").value = record.email;

      const fileName = `${record.id}.${record.eponimia}.${record.eidos_drast}.xlsx`;
      // --- Send the file ---
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).send("Σφάλμα κατά τη δημιουργία του Excel αρχείου");
    }
  });
});


// Start server
app.listen(PORT, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1); // optional
  }
  console.log(`Server running on http://localhost:${PORT}`);
});