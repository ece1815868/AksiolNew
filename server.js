const express = require("express");
const Database = require("better-sqlite3");
const bodyParser = require("body-parser");
const XlsxPopulate = require("xlsx-populate");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Database setup
const db = new Database("./database.db");
db.pragma("foreign_keys = ON");
console.log("Connected to SQLite database.");

// Create tables if not exists
db.exec(`
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
);

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
);
`);

// -------------------- Axiologiseis --------------------

// Get all records
app.get("/api/axiologiseis", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM Axiologiseis ORDER BY imnia DESC")
      .all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get records with due_date and days_left
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
          WHEN le.id IS NOT NULL AND COALESCE(le.symmorfosi, 0) = 0 THEN
            date(le.imnia_elegxou, '+' || COALESCE(le.prothesmia, 0) || ' days')
          WHEN le.id IS NOT NULL AND COALESCE(le.symmorfosi, 0) = 1 THEN
            CASE
              WHEN trim(COALESCE(le.apotelesma_lvl3, '')) = 'ΥΨΗΛΟ' THEN date(le.imnia_elegxou, '+12 months')
              WHEN trim(COALESCE(le.apotelesma_lvl3, '')) = 'ΜΕΣΑΙΟ' THEN date(le.imnia_elegxou, '+36 months')
              ELSE NULL
            END
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

  try {
    const rows = db.prepare(sql).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single record by id
app.get("/api/axiologiseis/:id", (req, res) => {
  try {
    const row = db
      .prepare("SELECT * FROM Axiologiseis WHERE id = ?")
      .get(req.params.id);

    if (!row) {
      return res.status(404).json({ error: "Η εγγραφή δεν βρέθηκε" });
    }

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new record
app.post("/api/axiologiseis", (req, res) => {
  try {
    const data = req.body;
    const aa = (data.aa_aitisis || "").trim();

    const existing = db
      .prepare("SELECT id FROM Axiologiseis WHERE aa_aitisis = ?")
      .get(aa);

    if (existing) {
      return res.status(400).json({
        error: "Υπάρχει ήδη δραστηριότητα με αυτό το aa_aitisis"
      });
    }

    const stmt = db.prepare(`
      INSERT INTO Axiologiseis (
        aa_aitisis, imnia, imnia_praxis, eponimia, eidos_drast,
        perifereia, perioxi, odos, tk, tilefono, email,
        axiologisi_lvl1, axiologisi_lvl2, axiologisi_lvl3
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      aa,
      data.imnia,
      data.imnia_praxis,
      data.eponimia,
      data.eidos_drast,
      data.perifereia,
      data.perioxi,
      data.odos,
      data.tk,
      data.tilefono,
      data.email,
      data.axiologisi_lvl1,
      data.axiologisi_lvl2,
      data.axiologisi_lvl3
    );

    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update record
app.put("/api/axiologiseis/:id", (req, res) => {
  try {
    const data = req.body;

    const stmt = db.prepare(`
      UPDATE Axiologiseis SET
        aa_aitisis=?, imnia=?, imnia_praxis=?, eponimia=?, eidos_drast=?,
        perifereia=?, perioxi=?, odos=?, tk=?, tilefono=?, email=?,
        axiologisi_lvl1=?, axiologisi_lvl2=?, axiologisi_lvl3=?
      WHERE id=?
    `);

    const info = stmt.run(
      data.aa_aitisis,
      data.imnia,
      data.imnia_praxis,
      data.eponimia,
      data.eidos_drast,
      data.perifereia,
      data.perioxi,
      data.odos,
      data.tk,
      data.tilefono,
      data.email,
      data.axiologisi_lvl1,
      data.axiologisi_lvl2,
      data.axiologisi_lvl3,
      req.params.id
    );

    res.json({ updated: info.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete record
app.delete("/api/axiologiseis/:id", (req, res) => {
  try {
    const info = db
      .prepare("DELETE FROM Axiologiseis WHERE id=?")
      .run(req.params.id);

    res.json({ deleted: info.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- ELEGXOI --------------------

// Get all elegxoi for a specific axiologisi_id
app.get("/api/elegxoi", (req, res) => {
  try {
    const axiologisiId = Number(req.query.axiologisi_id);

    if (!axiologisiId) {
      return res.status(400).json({ error: "axiologisi_id is required" });
    }

    const rows = db.prepare(`
      SELECT * FROM Elegxoi
      WHERE axiologisi_id = ?
      ORDER BY date(imnia_elegxou) DESC, id DESC
    `).all(axiologisiId);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new elegxos
app.post("/api/elegxoi", (req, res) => {
  try {
    const d = req.body;
    const axiologisiId = Number(d.axiologisi_id);

    if (!axiologisiId) {
      return res.status(400).json({ error: "Το axiologisi_id είναι υποχρεωτικό." });
    }

    if (!d.imnia_elegxou || !d.apotelesma_lvl3) {
      return res.status(400).json({ error: "Συμπλήρωσε τα υποχρεωτικά πεδία." });
    }

    const stmt = db.prepare(`
      INSERT INTO Elegxoi (
        axiologisi_id, imnia_elegxou, apotelesma_lvl3,
        symmorfosi, prostimo, axiomatikoi, prothesmia, paratiriseis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      axiologisiId,
      d.imnia_elegxou,
      d.apotelesma_lvl3,
      Number(d.symmorfosi) ? 1 : 0,
      Number(d.prostimo) ? 1 : 0,
      d.axiomatikoi || null,
      d.prothesmia === null || d.prothesmia === undefined || d.prothesmia === ""
        ? null
        : Number(d.prothesmia),
      d.paratiriseis || null
    );

    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single elegxos by id
app.get("/api/elegxoi/:id", (req, res) => {
  try {
    const row = db
      .prepare("SELECT * FROM Elegxoi WHERE id = ?")
      .get(req.params.id);

    if (!row) {
      return res.status(404).json({ error: "Δεν βρέθηκε ο έλεγχος." });
    }

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete elegxos
app.delete("/api/elegxoi/:id", (req, res) => {
  try {
    const info = db
      .prepare("DELETE FROM Elegxoi WHERE id = ?")
      .run(req.params.id);

    res.json({ deleted: info.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update elegxos
app.put("/api/elegxoi/:id", (req, res) => {
  try {
    const d = req.body;

    if (!d.imnia_elegxou || !d.apotelesma_lvl3) {
      return res.status(400).json({ error: "Συμπλήρωσε τα υποχρεωτικά πεδία." });
    }

    if (
      Number(d.symmorfosi) === 0 &&
      (d.prothesmia === null || d.prothesmia === undefined || d.prothesmia === "")
    ) {
      return res.status(400).json({
        error: "Όταν η συμμόρφωση είναι ΟΧΙ, η προθεσμία είναι υποχρεωτική."
      });
    }

    const stmt = db.prepare(`
      UPDATE Elegxoi
      SET
        imnia_elegxou = ?,
        apotelesma_lvl3 = ?,
        symmorfosi = ?,
        prostimo = ?,
        axiomatikoi = ?,
        prothesmia = ?,
        paratiriseis = ?
      WHERE id = ?
    `);

    const info = stmt.run(
      d.imnia_elegxou,
      d.apotelesma_lvl3,
      Number(d.symmorfosi) ? 1 : 0,
      Number(d.prostimo) ? 1 : 0,
      d.axiomatikoi || null,
      d.prothesmia === "" || d.prothesmia === null || d.prothesmia === undefined
        ? null
        : Number(d.prothesmia),
      d.paratiriseis || null,
      req.params.id
    );

    res.json({ updated: info.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export excel
app.get("/api/axiologiseis/:id/excel", async (req, res) => {
  try {
    const id = req.params.id;

    const record = db
      .prepare("SELECT * FROM Axiologiseis WHERE id = ?")
      .get(id);

    if (!record) {
      return res.status(404).send("Η εγγραφή δεν βρέθηκε");
    }

    const templatePath = path.join(__dirname, "template.xlsx");
    const workbook = await XlsxPopulate.fromFileAsync(templatePath);
    const sheet = workbook.sheet(0);

    sheet.cell("E4").value(record.id != null ? Number(record.id) : null);
    sheet.cell("G4").value(record.imnia);
    sheet.cell("D6").value(record.aa_aitisis);

    sheet.cell("E9").value(record.eponimia);
    sheet.cell("E11").value(record.eidos_drast);
    sheet.cell("E12").value(record.perifereia);
    sheet.cell("E13").value(record.perioxi);
    sheet.cell("E14").value(record.odos);
    sheet.cell("E15").value(record.tk);
    sheet.cell("E16").value(record.tilefono);
    sheet.cell("E17").value(record.email);

    const safeEponimia = (record.eponimia || "").replace(/[\\/:*?"<>|]/g, "_");
    const safeEidos = (record.eidos_drast || "").replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `${record.id}.${safeEponimia}.${safeEidos}.xlsx`;

    const buffer = await workbook.outputAsync();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );

    res.send(buffer);
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).send("Σφάλμα κατά τη δημιουργία του Excel αρχείου");
  }
});

// Start server
app.listen(PORT, (err) => {
  if (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});