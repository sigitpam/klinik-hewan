require('dotenv').config(); // Pindahkan ke paling atas
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// Konfigurasi Environment - Jangan hardcode SECRET di dalam kode
const SECRET = process.env.JWT_SECRET || "klinik_rahasia_default";
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// =========================
// DATABASE CONNECTION
// =========================
const db = new Pool({
  connectionString: "postgresql://postgres:Pamungkas99@db.gboztwuknuyyrduhcjmz.supabase.co:5432/postgres",
  ssl: {
    rejectUnauthorized: false,
  },
});

// Cek koneksi saat startup
db.connect((err, client, release) => {
  if (err) {
    return console.error("Gagal koneksi ke Database:", err.stack);
  }
  console.log("Database terhubung dengan sukses.");
  release();
});

// =========================
// AUTH MIDDLEWARE (Opsional untuk proteksi route)
// =========================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ msg: "Token diperlukan" });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ msg: "Token tidak valid" });
    req.user = user;
    next();
  });
};

// =========================
// LOGIN
// =========================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ msg: "Email tidak terdaftar" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ msg: "Password salah" });
    }

    const token = jwt.sign(
      { id: user.id, nama: user.nama },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, nama: user.nama });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});

// =========================
// CRUD SATWA
// =========================
app.get("/api/satwa", async (req, res) => {
  try {
    const sql = `
      SELECT id, nama_satwa, jenis, ras, jenis_kelamin, 
      TO_CHAR(tanggal_lahir,'DD-MM-YYYY') AS tanggal_lahir,
      klasifikasi, nama_pemilik, alamat_pemilik,
      DATE_PART('year', AGE(tanggal_lahir)) AS umur
      FROM satwa ORDER BY id DESC
    `;
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data" });
  }
});

app.post("/api/satwa", async (req, res) => {
  const { nama_satwa, jenis, ras, jenis_kelamin, tanggal_lahir, klasifikasi, nama_pemilik, alamat_pemilik } = req.body;
  try {
    const sql = `
      INSERT INTO satwa (nama_satwa, jenis, ras, jenis_kelamin, tanggal_lahir, klasifikasi, nama_pemilik, alamat_pemilik)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
    `;
    const result = await db.query(sql, [nama_satwa, jenis, ras, jenis_kelamin, tanggal_lahir, klasifikasi, nama_pemilik, alamat_pemilik]);
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menyimpan data" });
  }
});

app.put("/api/satwa/:id", async (req, res) => {
  const { id } = req.params;
  const { nama_satwa, jenis, ras, jenis_kelamin, tanggal_lahir, klasifikasi, nama_pemilik, alamat_pemilik } = req.body;
  try {
    const sql = `
      UPDATE satwa SET
      nama_satwa=$1, jenis=$2, ras=$3, jenis_kelamin=$4, tanggal_lahir=$5, 
      klasifikasi=$6, nama_pemilik=$7, alamat_pemilik=$8
      WHERE id=$9
    `;
    const result = await db.query(sql, [nama_satwa, jenis, ras, jenis_kelamin, tanggal_lahir, klasifikasi, nama_pemilik, alamat_pemilik, id]);
    
    if (result.rowCount === 0) return res.status(404).json({ msg: "Data tidak ditemukan" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memperbarui data" });
  }
});

app.delete("/api/satwa/:id", async (req, res) => {
  try {
    const result = await db.query("DELETE FROM satwa WHERE id=$1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ msg: "Data tidak ditemukan" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menghapus data" });
  }
});

// =========================
// STATISTIK & DOKTER
// =========================
app.get("/api/dokter", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM dokter ORDER BY nama");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/stat/all", async (req, res) => {
  try {
    // Menjalankan dua query sekaligus untuk efisiensi
    const dokterResult = await db.query("SELECT COUNT(*) AS total FROM dokter");
    const kesehatanResult = await db.query("SELECT COUNT(*) AS total FROM kesehatan");
    
    res.json({
      dokter: dokterResult.rows[0].total,
      kesehatan: kesehatanResult.rows[0].total
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil statistik" });
  }
});

app.listen(PORT, () => {
  console.log(`Server aktif di port ${PORT}`);
});
