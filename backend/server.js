```js
require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");

const app = express();

// =====================================
// CONFIG
// =====================================

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "simakes_secret";

// =====================================
// MIDDLEWARE
// =====================================

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// =====================================
// DATABASE
// =====================================

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// =====================================
// ROOT
// =====================================

app.get("/", (req, res) => {
  res.send("✅ Backend SIMAKES Running");
});

// =====================================
// LOGIN
// =====================================

app.post("/api/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email dan password wajib diisi"
      });
    }

    const result = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Email tidak ditemukan"
      });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if (!valid) {
      return res.status(401).json({
        error: "Password salah"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        nama: user.nama
      },
      SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.json({
      token,
      nama: user.nama
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// =====================================
// SATWA
// =====================================

app.get("/api/satwa", async (req, res) => {

  try {

    const result = await db.query(`
      SELECT
        id,
        nama_satwa,
        jenis,
        ras,
        jenis_kelamin,
        TO_CHAR(tanggal_lahir,'YYYY-MM-DD') AS tanggal_lahir,
        klasifikasi,
        nama_pemilik,
        alamat_pemilik,
        DATE_PART('year', AGE(tanggal_lahir)) AS umur
      FROM satwa
      ORDER BY id DESC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.post("/api/satwa", async (req, res) => {

  try {

    const {
      nama_satwa,
      jenis,
      ras,
      jenis_kelamin,
      tanggal_lahir,
      klasifikasi,
      nama_pemilik,
      alamat_pemilik
    } = req.body;

    const result = await db.query(`
      INSERT INTO satwa
      (
        nama_satwa,
        jenis,
        ras,
        jenis_kelamin,
        tanggal_lahir,
        klasifikasi,
        nama_pemilik,
        alamat_pemilik
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [
      nama_satwa,
      jenis,
      ras,
      jenis_kelamin,
      tanggal_lahir,
      klasifikasi,
      nama_pemilik,
      alamat_pemilik
    ]);

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.put("/api/satwa/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const {
      nama_satwa,
      jenis,
      ras,
      jenis_kelamin,
      tanggal_lahir,
      klasifikasi,
      nama_pemilik,
      alamat_pemilik
    } = req.body;

    await db.query(`
      UPDATE satwa
      SET
        nama_satwa=$1,
        jenis=$2,
        ras=$3,
        jenis_kelamin=$4,
        tanggal_lahir=$5,
        klasifikasi=$6,
        nama_pemilik=$7,
        alamat_pemilik=$8
      WHERE id=$9
    `, [
      nama_satwa,
      jenis,
      ras,
      jenis_kelamin,
      tanggal_lahir,
      klasifikasi,
      nama_pemilik,
      alamat_pemilik,
      id
    ]);

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.delete("/api/satwa/:id", async (req, res) => {

  try {

    await db.query(
      "DELETE FROM satwa WHERE id=$1",
      [req.params.id]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// =====================================
// DOKTER
// =====================================

app.get("/api/dokter", async (req, res) => {

  try {

    const result = await db.query(
      "SELECT * FROM dokter ORDER BY id DESC"
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.post("/api/dokter", async (req, res) => {

  try {

    const {
      nama,
      alamat,
      telepon,
      jenis_kelamin,
      nomor_strv
    } = req.body;

    const result = await db.query(`
      INSERT INTO dokter
      (
        nama,
        alamat,
        telepon,
        jenis_kelamin,
        nomor_strv
      )
      VALUES($1,$2,$3,$4,$5)
      RETURNING *
    `, [
      nama,
      alamat,
      telepon,
      jenis_kelamin,
      nomor_strv
    ]);

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.put("/api/dokter/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const {
      nama,
      alamat,
      telepon,
      jenis_kelamin,
      nomor_strv
    } = req.body;

    await db.query(`
      UPDATE dokter
      SET
        nama=$1,
        alamat=$2,
        telepon=$3,
        jenis_kelamin=$4,
        nomor_strv=$5
      WHERE id=$6
    `, [
      nama,
      alamat,
      telepon,
      jenis_kelamin,
      nomor_strv,
      id
    ]);

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.delete("/api/dokter/:id", async (req, res) => {

  try {

    await db.query(
      "DELETE FROM dokter WHERE id=$1",
      [req.params.id]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// =====================================
// KESEHATAN
// =====================================

app.get("/api/kesehatan", async (req, res) => {

  try {

    const result = await db.query(`
      SELECT
        k.id,
        k.nomor_rekam,
        TO_CHAR(k.tanggal,'DD-MM-YYYY') AS tanggal,
        s.nama_satwa,
        d.nama AS dokter,
        o.nama_obat,
        k.jumlah_obat,
        k.gejala_klinis,
        k.diagnosa,
        k.pengobatan
      FROM kesehatan k
      LEFT JOIN satwa s ON s.id=k.satwa_id
      LEFT JOIN dokter d ON d.id=k.dokter_id
      LEFT JOIN stok_obat o ON o.id=k.obat_id
      ORDER BY k.id DESC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.post("/api/kesehatan", async (req, res) => {

  const client = await db.connect();

  try {

    await client.query("BEGIN");

    const {
      tanggal,
      satwa_id,
      dokter_id,
      gejala_klinis,
      diagnosa,
      pengobatan,
      obat_id,
      jumlah_obat
    } = req.body;

    const nomor = "RM-" + Date.now();

    if (obat_id && jumlah_obat) {

      const cekObat = await client.query(
        "SELECT * FROM stok_obat WHERE id=$1",
        [obat_id]
      );

      if (cekObat.rows.length === 0) {

        await client.query("ROLLBACK");

        return res.status(404).json({
          error: "Obat tidak ditemukan"
        });
      }

      const obat = cekObat.rows[0];

      if (Number(jumlah_obat) > Number(obat.sisa)) {

        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "Stok obat tidak cukup"
        });
      }

      await client.query(`
        UPDATE stok_obat
        SET
          digunakan = digunakan + $1,
          sisa = sisa - $1
        WHERE id=$2
      `, [
        jumlah_obat,
        obat_id
      ]);
    }

    const result = await client.query(`
      INSERT INTO kesehatan
      (
        nomor_rekam,
        tanggal,
        satwa_id,
        dokter_id,
        gejala_klinis,
        diagnosa,
        pengobatan,
        obat_id,
        jumlah_obat
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      nomor,
      tanggal,
      satwa_id,
      dokter_id,
      gejala_klinis,
      diagnosa,
      pengobatan || "-",
      obat_id || null,
      jumlah_obat || 0
    ]);

    await client.query("COMMIT");

    res.json(result.rows[0]);

  } catch (err) {

    await client.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  } finally {

    client.release();
  }
});

// =====================================
// PDF REKAM MEDIS
// =====================================

app.get("/api/rekam/pdf/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const result = await db.query(`
      SELECT
        k.nomor_rekam,
        TO_CHAR(k.tanggal,'DD-MM-YYYY') AS tanggal,
        s.nama_satwa,
        d.nama AS dokter,
        o.nama_obat,
        k.jumlah_obat,
        k.gejala_klinis,
        k.diagnosa,
        k.pengobatan
      FROM kesehatan k
      LEFT JOIN satwa s ON s.id=k.satwa_id
      LEFT JOIN dokter d ON d.id=k.dokter_id
      LEFT JOIN stok_obat o ON o.id=k.obat_id
      WHERE k.id=$1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).send("Data tidak ditemukan");
    }

    const data = result.rows[0];

    const doc = new PDFDocument();

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename=rekam_medis_${id}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(18)
      .text("REKAM MEDIS SATWA", {
        align: "center"
      });

    doc.moveDown();

    doc.fontSize(12);

    doc.text(`Nomor RM : ${data.nomor_rekam}`);
    doc.text(`Tanggal  : ${data.tanggal}`);
    doc.text(`Satwa    : ${data.nama_satwa}`);
    doc.text(`Dokter   : ${data.dokter}`);
    doc.text(`Obat     : ${data.nama_obat || "-"}`);
    doc.text(`Jumlah   : ${data.jumlah_obat || 0}`);

    doc.moveDown();

    doc.text("Gejala Klinis:");
    doc.text(data.gejala_klinis || "-");

    doc.moveDown();

    doc.text("Diagnosa:");
    doc.text(data.diagnosa || "-");

    doc.moveDown();

    doc.text("Pengobatan:");
    doc.text(data.pengobatan || "-");

    doc.end();

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// =====================================
// OBAT
// =====================================

app.get("/api/obat", async (req, res) => {

  try {

    const result = await db.query(`
      SELECT *
      FROM stok_obat
      ORDER BY id DESC
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.post("/api/obat", async (req, res) => {

  try {

    const {
      bentuk,
      nama_obat,
      bahan,
      jenis_obat,
      stok_awal
    } = req.body;

    const result = await db.query(`
      INSERT INTO stok_obat
      (
        bentuk,
        nama_obat,
        bahan,
        jenis_obat,
        stok_awal,
        digunakan,
        sisa
      )
      VALUES($1,$2,$3,$4,$5,0,$5)
      RETURNING *
    `, [
      bentuk,
      nama_obat,
      bahan,
      jenis_obat,
      stok_awal
    ]);

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.delete("/api/obat/:id", async (req, res) => {

  try {

    await db.query(
      "DELETE FROM stok_obat WHERE id=$1",
      [req.params.id]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// =====================================
// STATISTIK
// =====================================

app.get("/api/stat/dokter", async (req, res) => {

  try {

    const result = await db.query(
      "SELECT COUNT(*) AS total FROM dokter"
    );

    res.json({
      total: result.rows[0].total
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

app.get("/api/stat/kesehatan", async (req, res) => {

  try {

    const result = await db.query(
      "SELECT COUNT(*) AS total FROM kesehatan"
    );

    res.json({
      total: result.rows[0].total
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// =====================================
// TEST DATABASE
// =====================================

app.get("/api/test-db", async (req, res) => {

  try {

    const result = await db.query(
      "SELECT NOW()"
    );

    res.json({
      success: true,
      time: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// =====================================
// ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {

  console.error(err.stack);

  res.status(500).json({
    error: "Internal Server Error"
  });
});

// =====================================
// START SERVER
// =====================================

async function startServer() {

  try {

    const client = await db.connect();

    console.log("✅ Database Connected");

    client.release();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {

    console.error("❌ Failed start:", err.message);

    process.exit(1);
  }
}

startServer();
```
