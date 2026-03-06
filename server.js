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

db.run(`
CREATE TABLE IF NOT EXISTS Elegxoi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  axiologisi_id INTEGER NOT NULL,
  imnia_elegxou TEXT NOT NULL,
  apotelesma_lvl3 TEXT NOT NULL,
  symmorfosi INTEGER NOT NULL DEFAULT 0,
  prostimo INTEGER NOT NULL DEFAULT 0,
  axiomatikoi TEXT,
  prothesmia INTEGER,
  paratiriseis TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (axiologisi_id) REFERENCES Axiologiseis(id)
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
    WITH latest_elegxos AS (
      SELECT e1.*
      FROM Elegxoi e1
      WHERE e1.id = (
        SELECT e2.id
        FROM Elegxoi e2
        WHERE e2.axiologisi_id = e1.axiologisi_id
        ORDER BY date(e2.imnia_elegxou) DESC, e2.id DESC
        LIMIT 1
      )
    ),
    base AS (
      SELECT
        a.*,
        le.id AS elegxos_id,
        le.imnia_elegxou,
        le.apotelesma_lvl3 AS elegxos_lvl3,
        le.symmorfosi,
        le.prothesmia,

        CASE
          -- 1) Υπάρχει έλεγχος και ΔΕΝ υπάρχει συμμόρφωση
          WHEN le.id IS NOT NULL AND COALESCE(le.symmorfosi, 0) = 0 THEN
            date(le.imnia_elegxou, '+' || COALESCE(le.prothesmia, 0) || ' days')

          -- 2) Υπάρχει έλεγχος και ΥΠΑΡΧΕΙ συμμόρφωση
          WHEN le.id IS NOT NULL AND COALESCE(le.symmorfosi, 0) = 1 THEN
            CASE
              WHEN trim(COALESCE(le.apotelesma_lvl3, '')) = 'ΥΨΗΛΟ' THEN date(le.imnia_elegxou, '+12 months')
              WHEN trim(COALESCE(le.apotelesma_lvl3, '')) = 'ΜΕΣΑΙΟ' THEN date(le.imnia_elegxou, '+36 months')
              ELSE NULL
            END

          -- 3) Δεν υπάρχει έλεγχος -> παλιά λογική από Axiologiseis
          ELSE
            CASE
              WHEN trim(COALESCE(a.axiologisi_lvl3,'')) = 'ΥΨΗΛΟ' THEN date(a.imnia, '+12 months')
              WHEN trim(COALESCE(a.axiologisi_lvl3,'')) = 'ΜΕΣΑΙΟ' THEN date(a.imnia, '+36 months')
              WHEN trim(COALESCE(a.axiologisi_lvl2,'')) = 'ΥΨΗΛΟ' THEN date(a.imnia, '+12 months')
              WHEN trim(COALESCE(a.axiologisi_lvl2,'')) = 'ΜΕΣΑΙΟ' THEN date(a.imnia, '+36 months')
              ELSE NULL
            END
        END AS due_date

      FROM Axiologiseis a
      LEFT JOIN latest_elegxos le
        ON le.axiologisi_id = a.id

      WHERE
        (
          le.id IS NOT NULL
          OR (
            trim(COALESCE(a.axiologisi_lvl3,'')) <> 'ΧΑΜΗΛΟ'
            AND trim(COALESCE(a.axiologisi_lvl2,'')) <> 'ΧΑΜΗΛΟ'
          )
        )
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
  const aa = (data.aa_aitisis || "").trim();

  // 🔎 Έλεγχος αν υπάρχει ήδη
  db.get(
    "SELECT id FROM Axiologiseis WHERE aa_aitisis = ?",
    [aa],
    (err, row) => {

      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (row) {
        return res.status(400).json({
          error: "Υπάρχει ήδη δραστηριότητα με αυτό το aa_aitisis"
        });
      }

      // ✔ Αν δεν υπάρχει κάνουμε INSERT
      const sql = `
        INSERT INTO Axiologiseis (
          aa_aitisis, imnia, imnia_praxis, eponimia, eidos_drast,
          perifereia, perioxi, odos, tk, tilefono, email,
          axiologisi_lvl1, axiologisi_lvl2, axiologisi_lvl3
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        aa, data.imnia, data.imnia_praxis, data.eponimia, data.eidos_drast, data.perifereia, data.perioxi, data.odos,
        data.tk, data.tilefono, data.email, data.axiologisi_lvl1, data.axiologisi_lvl2, data.axiologisi_lvl3
      ];

      db.run(sql, params, function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID });
      });

    }
  );

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

  db.run(sql, params, function (err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ updated: this.changes });
  });
});

// Delete record
app.delete("/api/axiologiseis/:id", (req, res) => {
  db.run("DELETE FROM Axiologiseis WHERE id=?", [req.params.id], function (err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ deleted: this.changes });
  });
});

// -------------------- ELEGXOΙ --------------------

// Get all elegxoi for a specific aa_aitisis
app.get("/api/elegxoi", (req, res) => {
  const axiologisiId = Number(req.query.axiologisi_id);

  if (!axiologisiId) {
    return res.status(400).json({ error: "axiologisi_id is required" });
  }

  db.all(
    "SELECT * FROM Elegxoi WHERE axiologisi_id = ? ORDER BY date(imnia_elegxou) DESC, id DESC",
    [axiologisiId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Create new elegxos
app.post("/api/elegxoi", (req, res) => {
  const d = req.body;

  const axiologisiId = Number(d.axiologisi_id);

  if (!axiologisiId) {
    return res.status(400).json({ error: "Το axiologisi_id είναι υποχρεωτικό." });
  }

  if (!d.imnia_elegxou || !d.apotelesma_lvl3) {
    return res.status(400).json({ error: "Συμπλήρωσε τα υποχρεωτικά πεδία." });
  }

  const sql = `
    INSERT INTO Elegxoi (
      axiologisi_id, imnia_elegxou, apotelesma_lvl3,
      symmorfosi, prostimo, axiomatikoi, prothesmia, paratiriseis
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    axiologisiId,
    d.imnia_elegxou,
    d.apotelesma_lvl3,
    Number(d.symmorfosi) ? 1 : 0,
    Number(d.prostimo) ? 1 : 0,
    d.axiomatikoi || null,
    d.prothesmia === null || d.prothesmia === undefined || d.prothesmia === "" ? null : Number(d.prothesmia),
    d.paratiriseis || null
  ];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// (optional) Get single elegxos by id
app.get("/api/elegxoi/:id", (req, res) => {
  db.get("SELECT * FROM Elegxoi WHERE id = ?", [req.params.id], (err, row) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(row);
  });
});

// (optional) Delete elegxos
app.delete("/api/elegxoi/:id", (req, res) => {
  db.run("DELETE FROM Elegxoi WHERE id = ?", [req.params.id], function (err) {
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