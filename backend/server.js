# server.js PostgreSQL + Supabase + Railway

```js
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = "klinik_rahasia";

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// DATABASE SUPABASE
// =========================
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// =========================
// LOGIN
// =========================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        msg: "Email tidak terdaftar",
      });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if (!valid) {
      return res.status(401).json({
        msg: "Password salah",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        nama: user.nama,
      },
      SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      token,
      nama: user.nama,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// =========================
// GET SATWA
// =========================
app.get("/api/satwa", async (req, res) => {
  try {
    const sql = `
      SELECT
        id,
        nama_satwa,
        jenis,
        ras,
        jenis_kelamin,
        TO_CHAR(tanggal_lahir,'DD-MM-YYYY') AS tanggal_lahir,
        klasifikasi,
        nama_pemilik,
        alamat_pemilik,
        DATE_PART('year', AGE(tanggal_lahir)) AS umur
      FROM satwa
      ORDER BY id DESC
    `;

    const result = await db.query(sql);

    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// =========================
// INSERT SATWA
// =========================
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
      alamat_pemilik,
    } = req.body;

    const sql = `
      INSERT INTO satwa (
        nama_satwa,
        jenis,
        ras,
        jenis_kelamin,
        tanggal_lahir,
        klasifikasi,
        nama_pemilik,
        alamat_pemilik
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
    `;

    const result = await db.query(sql, [
      nama_satwa,
      jenis,
      ras,
      jenis_kelamin,
      tanggal_lahir,
      klasifikasi,
      nama_pemilik,
      alamat_pemilik,
    ]);

    res.json({
      success: true,
      id: result.rows[0].id,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// =========================
// UPDATE SATWA
// =========================
app.put("/api/satwa/:id", async (req, res) => {
  try {
    const {
      nama_satwa,
      jenis,
      ras,
      jenis_kelamin,
      tanggal_lahir,
      klasifikasi,
      nama_pemilik,
      alamat_pemilik,
    } = req.body;

    const sql = `
      UPDATE satwa SET
        nama_satwa=$1,
        jenis=$2,
        ras=$3,
        jenis_kelamin=$4,
        tanggal_lahir=$5,
        klasifikasi=$6,
        nama_pemilik=$7,
        alamat_pemilik=$8
      WHERE id=$9
    `;

    await db.query(sql, [
      nama_satwa,
      jenis,
      ras,
      jenis_kelamin,
      tanggal_lahir,
      klasifikasi,
      nama_pemilik,
      alamat_pemilik,
      req.params.id,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// =========================
// DELETE SATWA
// =========================
app.delete("/api/satwa/:id", async (req, res) => {
  try {
    await db.query(
      "DELETE FROM satwa WHERE id=$1",
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// =========================
// GET DOKTER
// =========================
app.get("/api/dokter", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM dokter ORDER BY nama"
    );

    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// =========================
// TOTAL DOKTER
// =========================
app.get("/api/stat/dokter", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT COUNT(*) AS total FROM dokter"
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// =========================
// TOTAL KESEHATAN
// =========================
app.get("/api/stat/kesehatan", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT COUNT(*) AS total FROM kesehatan"
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// =========================
// SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server jalan di port ${PORT}`);
});
```

# Install package

```bash
npm install express pg cors bcryptjs jsonwebtoken
```

# Railway Variables

```env
DATABASE_URL=postgresql://postgres:[Pamungkas99]@db.gboztwuknuyyrduhcjmz.supabase.co:5432/postgres
```

# Jalankan lokal

```bash
node server.js
```

# Push ke GitHub

```bash
git add .
git commit -m "postgres ready"
git push
```
