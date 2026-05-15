require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// =====================================
// 1. CONFIG
// =====================================
const PORT = process.env.PORT || 8080;
const SECRET = process.env.JWT_SECRET || "simakes_secret";

// =====================================
// 2. TOTAL CORS FIX (MANUAL)
// =====================================
// PENTING: Jangan gunakan app.use(cors()) jika menggunakan ini
app.use((req, res, next) => {
  // Izinkan origin Netlify Anda
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  // Tangani Preflight Request (OPTIONS) secara eksplisit
  if (req.method === "OPTIONS") {
    return res.status(200).send("OK");
  }
  next();
});

// Middleware standard
app.use(express.json());

// =====================================
// 3. DATABASE CONNECTION
// =====================================
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect()
  .then(client => {
    console.log("✅ Database Connected");
    client.release();
  })
  .catch(err => {
    console.error("❌ Database Error:", err.message);
  });

// =====================================
// ROOT
// =====================================

app.get("/", (req, res) => {
  res.send("✅ Backend SIMAKES Running");
});

// =====================================
// CHECK USERS
// =====================================

app.get("/api/check-users", async (req, res) => {

  try {

    const result = await db.query(
      "SELECT id, nama, email FROM users"
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// =====================================
// LOGIN
// =====================================

app.post("/api/login", async (req, res) => {

  try {

    console.log("📥 LOGIN BODY:", req.body);

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

    console.log("✅ USER FOUND:", user.email);

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
      success: true,
      token,
      nama: user.nama
    });

  } catch (err) {

    console.error("❌ LOGIN ERROR:", err);

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

  console.error("❌ SERVER ERROR:", err.stack);

  res.status(500).json({
    error: "Internal Server Error"
  });
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, "0.0.0.0", () => {

  console.log(`🚀 Server running on port ${PORT}`);
});
