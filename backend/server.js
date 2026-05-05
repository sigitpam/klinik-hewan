const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET = "klinik_rahasia";

const app = express();
app.use(cors());
app.use(express.json());

const rekamMedis = require("./routes/rekamMedis");
app.use("/api/rekam", rekamMedis);

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use('/api/rekam', require('./routes/rekamMedis'));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  port: "3306",
  database: "klinik_hewan"
});

db.connect(err => {
  if (err) {
    console.error("DB error:", err);
    return;
  }
  console.log("MySQL connected");
});
// LOGIN //


app.post('/api/login', (req,res)=>{
  const {email,password} = req.body;

  db.query(
    "SELECT * FROM users WHERE email=?",
    [email],
    async (err,rows)=>{
      if(err) return res.status(500).json(err);
      if(rows.length===0) return res.status(401).json({msg:"Email tidak terdaftar"});

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password);

      if(!valid) return res.status(401).json({msg:"Password salah"});

      const token = jwt.sign(
        {id:user.id,nama:user.nama},
        SECRET,
        {expiresIn:"1d"}
      );

      res.json({
        token,
        nama:user.nama
      });
    }
  );
});

// ====================
// SATWA (Rekam Medis)
 // ====================
app.get("/api/satwa", (req, res) => {
  const sql = `
    SELECT 
      id,
      nama_satwa,
      jenis,
      ras,
      jenis_kelamin,
      DATE_FORMAT(tanggal_lahir,'%d-%m-%Y') AS tanggal_lahir,
      klasifikasi,
      nama_pemilik,
      alamat_pemilik,
      TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) AS umur
    FROM satwa
    ORDER BY id DESC
  `;

  // TOTAL DOKTER
app.get("/api/stat/dokter", (req,res)=>{
  db.query("SELECT COUNT(*) AS total FROM dokter",(err,rows)=>{
    if(err) return res.status(500).json(err);
    res.json(rows[0]);
  });
});

// TOTAL REKAM KESEHATAN
app.get("/api/stat/kesehatan", (req,res)=>{
  db.query("SELECT COUNT(*) AS total FROM kesehatan",(err,rows)=>{
    if(err) return res.status(500).json(err);
    res.json(rows[0]);
  });
});

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("SATWA GET ERROR:", err);
      return res.status(500).json(err);
    }
    res.json(rows);
  });
});

app.post("/api/satwa", (req, res) => {
  console.log("DATA MASUK:", req.body); // ← penting

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

  const sql = `
    INSERT INTO satwa 
    (nama_satwa, jenis, ras, jenis_kelamin, tanggal_lahir, klasifikasi, nama_pemilik, alamat_pemilik)
    VALUES (?,?,?,?,?,?,?,?)
  `;

  db.query(
    sql,
    [
      nama_satwa,
      jenis,
      ras,
      jenis_kelamin,
      tanggal_lahir,
      klasifikasi,
      nama_pemilik,
      alamat_pemilik
    ],
    (err, result) => {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json(err);
      }
      res.json({ success: true, id: result.insertId });
    }
  );
});

app.put("/api/satwa/:id", (req, res) => {
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

  const sql = `
    UPDATE satwa SET
      nama_satwa=?,
      jenis=?,
      ras=?,
      jenis_kelamin=?,
      tanggal_lahir=?,
      klasifikasi=?,
      nama_pemilik=?,
      alamat_pemilik=?
    WHERE id=?
  `;

  db.query(sql, [
    nama_satwa,
    jenis,
    ras,
    jenis_kelamin,
    tanggal_lahir,
    klasifikasi,
    nama_pemilik,
    alamat_pemilik,
    req.params.id
  ], (err, result) => {
    if (err) {
      console.error("UPDATE SATWA ERROR:", err);
      return res.status(500).json(err);
    }
    res.json({ success: true });
  });
});


// OBAT
app.get("/api/obat", (req, res) => {
  db.query("SELECT * FROM obat", (e, r) => res.json(r));
});

app.post("/api/obat", (req, res) => {
  db.query(
    "INSERT INTO obat (nama, stok) VALUES (?,?)",
    [req.body.nama, req.body.stok]
  );
  res.json({ success: true });
});
app.put("/api/obat/:id", (req, res) => {
  const { nama, stok } = req.body;
  db.query(
    "UPDATE obat SET nama=?, stok=? WHERE id=?",
    [nama, stok, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

app.delete("/api/obat/:id", (req, res) => {
  db.query(
    "DELETE FROM obat WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});


// ALAT
app.get("/api/alat", (req, res) => {
  db.query("SELECT * FROM alat", (e, r) => res.json(r));
});

app.post("/api/alat", (req, res) => {
  db.query(
    "INSERT INTO alat (nama, jumlah) VALUES (?,?)",
    [req.body.nama, req.body.jumlah]
  );
  res.json({ success: true });
});
app.put("/api/alat/:id", (req, res) => {
  const { nama, jumlah } = req.body;
  db.query(
    "UPDATE alat SET nama=?, jumlah=? WHERE id=?",
    [nama, jumlah, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

app.delete("/api/alat/:id", (req, res) => {
  db.query(
    "DELETE FROM alat WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});


// REKAM
app.get("/api/rekam", (req, res) => {
  db.query("SELECT * FROM rekam", (e, r) => res.json(r));
});

app.post("/api/rekam", (req, res) => {
  db.query(
    "INSERT INTO rekam (pasien, diagnosa) VALUES (?,?)",
    [req.body.pasien, req.body.diagnosa]
  );
  res.json({ success: true });
});
app.put("/api/rekam/:id", (req, res) => {
  const { nama_satwa, diagnosa } = req.body;
  db.query(
    "UPDATE rekam SET pasien=?, diagnosa=? WHERE id=?",
    [pasien, diagnosa, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

app.delete("/api/rekam/:id", (req, res) => {
  db.query(
    "DELETE FROM rekam WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// app.post("/api/satwa", (req, res) => {
//   console.log("DATA DITERIMA:", req.body);
// });
// const path = require('path');

// DOKTER HEWAN //
app.get("/api/dokter", (req, res) => {
  db.query("SELECT * FROM dokter ORDER BY nama", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post("/api/dokter", (req, res) => {
  const { nama, alamat, telepon, jenis_kelamin, nomor_strv } = req.body;

  db.query(
    "INSERT INTO dokter (nama, alamat, telepon, jenis_kelamin, nomor_strv) VALUES (?,?,?,?,?)",
    [nama, alamat, telepon, jenis_kelamin, nomor_strv],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

app.put("/api/dokter/:id", (req, res) => {
  const { nama, alamat, telepon, jenis_kelamin, nomor_strv } = req.body;

  db.query(
    "UPDATE dokter SET nama=?, alamat=?, telepon=?, jenis_kelamin=?, nomor_strv=? WHERE id=?",
    [nama, alamat, telepon, jenis_kelamin, nomor_strv, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

app.delete("/api/dokter/:id", (req, res) => {
  db.query("DELETE FROM dokter WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

app.post("/api/kesehatan", (req, res) => {
  const { tanggal, satwa_id, dokter_id, diagnosa, pengobatan } = req.body;

  const sql = `
    INSERT INTO kesehatan (nomor_rekam, tanggal, satwa_id, dokter_id, diagnosa, pengobatan)
    VALUES (CONCAT('RM-',LPAD(NULLIF(LAST_INSERT_ID(),0),5,'0')),?,?,?,?,?)
  `;

  db.query(sql,[tanggal,satwa_id,dokter_id,diagnosa,pengobatan],(err)=>{
    if(err){
      console.error(err);
      return res.status(500).json(err);
    }
    res.json({success:true});
  });
});

// ===============================
// MANAJEMEN KESEHATAN SATWA
// ===============================
app.get("/api/kesehatan", (req, res) => {
  const sql = `
    SELECT 
      k.id,
      CONCAT('RM-', LPAD(k.id,5,'0')) AS nomor_rekam,
      DATE_FORMAT(k.tanggal,'%d-%m-%Y') AS tanggal,
      s.nama_satwa,
      d.nama AS dokter,
      k.diagnosa,
      k.pengobatan
    FROM kesehatan k
    JOIN satwa s ON k.satwa_id = s.id
    JOIN dokter d ON k.dokter_id = d.id
    ORDER BY k.tanggal DESC
  `;
  db.query(sql,(err,rows)=>{
    if(err) return res.status(500).json(err);
    res.json(rows);
  });
});

const PDFDocument = require("pdfkit");

app.get("/api/rekam/pdf/:id", (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT 
      k.id,
      CONCAT('RM-', LPAD(k.id,5,'0')) AS nomor_rekam,
      DATE_FORMAT(k.tanggal,'%d-%m-%Y') AS tanggal,
      s.nama_satwa,
      s.jenis,
      s.ras,
      d.nama AS dokter,
      k.diagnosa,
      k.pengobatan
    FROM kesehatan k
    JOIN satwa s ON k.satwa_id = s.id
    JOIN dokter d ON k.dokter_id = d.id
    WHERE k.id=?
  `;

  db.query(sql,[id],(err,rows)=>{
    if(err || rows.length===0){
      return res.status(404).send("Data tidak ditemukan");
    }

    const r = rows[0];

    const doc = new PDFDocument({margin:40});
    res.setHeader("Content-Type","application/pdf");
    res.setHeader("Content-Disposition",`inline; filename=RM-${r.nomor_rekam}.pdf`);
    doc.pipe(res);

    // === KOP ===
    doc.fontSize(16).text("SISTEM INFORMASI MANAJEMEN KESEHATAN SATWA (SIMAKES)",{align:"center"});
    doc.fontSize(12).text("UNIT POLSATWA DITSAMAPTA POLDA DIY",{align:"center"});
    doc.moveDown();
    doc.moveTo(40,120).lineTo(550,120).stroke();
    doc.moveDown(2);

    // === ISI ===
    doc.fontSize(12);
    doc.text(`Nomor Rekam Medis : ${r.nomor_rekam}`);
    doc.text(`Tanggal          : ${r.tanggal}`);
    doc.text(`Nama Satwa       : ${r.nama_satwa}`);
    doc.text(`Jenis / Ras      : ${r.jenis} / ${r.ras}`);
    doc.text(`Dokter Hewan     : ${r.dokter}`);
    doc.moveDown();

    doc.text("Diagnosa:");
    doc.text(r.diagnosa,{indent:20});
    doc.moveDown();

    doc.text("Pengobatan:");
    doc.text(r.pengobatan,{indent:20});
    doc.moveDown(3);

    doc.text("Dokter Hewan",400);
    doc.moveDown(4);
    doc.text(r.dokter,400);

    doc.end();
  });
});

app.listen(3000, () => console.log("Server jalan http://localhost:3000"));
