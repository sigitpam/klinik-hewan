require('dotenv').config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// =========================
// CONFIG & PORT (SANGAT PENTING)
// =========================
const SECRET = process.env.JWT_SECRET || "klinik_rahasia_pamungkas_99";
// Railway mengisi process.env.PORT secara dinamis. 
const PORT = process.env.PORT || 3000; 

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// DATABASE CONNECTION
// =========================
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

db.connect()
  .then(() => console.log("✅ Database Supabase Terhubung!"))
  .catch((err) => console.error("❌ Koneksi Database Gagal:", err.message));

// =========================
// 1. HEALTH CHECK ROUTE (WAJIB PALING ATAS)
// Agar Railway tahu server sudah siap menerima trafik
// =========================
app.get("/", (req, res) => {
  console.log("🔔 Health check dipanggil oleh Railway");
  res.status(200).send("Backend Klinik Hewan Ready!");
});

// =========================
// 2. AUTH & LOGIN
// =========================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);
    if (result.rows.length === 0) return res.status(401).json({ msg: "Email tidak terdaftar" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ msg: "Password salah" });

    const token = jwt.sign({ id: user.id, nama: user.nama }, SECRET, { expiresIn: "1d" });
    res.json({ token, nama: user.nama });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

// =========================
// 3. CRUD SATWA
// =========================
app.get("/api/satwa", async (req, res) => {
  try {
    const sql = `
      SELECT id, nama_satwa, jenis, ras, jenis_kelamin,
      TO_CHAR(tanggal_lahir, 'DD-MM-YYYY') AS tanggal_lahir,
      klasifikasi, nama_pemilik, alamat_pemilik,
      DATE_PART('year', AGE(tanggal_lahir::DATE)) AS umur
      FROM satwa ORDER BY id DESC
    `;
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal ambil data" });
  }
});

app.post("/api/satwa", async (req, res) => {
  const { nama_satwa, jenis, ras, jenis_kelamin, tanggal_lahir, klasifikasi, nama_pemilik, alamat_pemilik } = req.body;
  try {
    const sql = `
      INSERT INTO satwa (nama_satwa, jenis, ras, jenis_kelamin, tanggal_lahir, klasifikasi, nama_pemilik, alamat_pemilik)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;
    const result = await db.query(sql, [nama_satwa, jenis, ras, jenis_kelamin, tanggal_lahir, klasifikasi, nama_pemilik, alamat_pemilik]);
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal simpan data" });
  }
});

// ... (Put & Delete tetap sama) ...

// =========================
// 4. STATISTIK
// =========================
app.get("/api/stat/dashboard", async (req, res) => {
  try {
    const d = await db.query("SELECT COUNT(*) AS total FROM dokter");
    const k = await db.query("SELECT COUNT(*) AS total FROM kesehatan");
    res.json({ dokter: d.rows[0].total, kesehatan: k.rows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal statistik" });
  }
});

// =========================
// 5. START SERVER
// Gunakan '0.0.0.0' agar bisa diakses dari luar container
// =========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server jalan di port ${PORT}`);
});
