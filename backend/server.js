require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

// HANDLE PREFLIGHT
app.options("*", cors());

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
app.get("/", (req,res)=>{
  res.status(200).send("✅ Backend SIMAKES Running");
});

// =====================================
// LOGIN
// =====================================
app.post("/api/login", async (req,res)=>{
  const { email, password } = req.body;

  try{

    const result = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if(result.rows.length === 0){
      return res.status(401).json({
        msg:"Email tidak ditemukan"
      });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if(!valid){
      return res.status(401).json({
        msg:"Password salah"
      });
    }

    const token = jwt.sign(
      {
        id:user.id,
        nama:user.nama
      },
      SECRET,
      {
        expiresIn:"1d"
      }
    );

    res.json({
      token,
      nama:user.nama
    });

  }catch(err){
    console.error(err);
    res.status(500).json({
      error:err.message
    });
  }
});

// =====================================
// SATWA
// =====================================

// GET
app.get("/api/satwa", async(req,res)=>{
  try{

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

  }catch(err){
    console.error(err);
    res.status(500).json({
      error:err.message
    });
  }
});

// POST
app.post("/api/satwa", async(req,res)=>{

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

  try{

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
    `,[
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

  }catch(err){
    console.error(err);
    res.status(500).json({
      error:err.message
    });
  }
});

// PUT
app.put("/api/satwa/:id", async(req,res)=>{

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

  try{

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
    `,[
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
      success:true
    });

  }catch(err){
    console.error(err);
    res.status(500).json({
      error:err.message
    });
  }
});

// DELETE
app.delete("/api/satwa/:id", async(req,res)=>{

  try{

    await db.query(
      "DELETE FROM satwa WHERE id=$1",
      [req.params.id]
    );

    res.json({
      success:true
    });

  }catch(err){
    console.error(err);
    res.status(500).json({
      error:err.message
    });
  }
});

// =====================================
// DOKTER
// =====================================

// GET
app.get("/api/dokter", async(req,res)=>{
  try{

    const result = await db.query(
      "SELECT * FROM dokter ORDER BY id DESC"
    );

    res.json(result.rows);

  }catch(err){
    console.error(err);
    res.status(500).json({
      error:err.message
    });
  }
});

// POST
app.post("/api/dokter", async(req,res)=>{

  const {
    nama,
    alamat,
    telepon,
    jenis_kelamin,
    nomor_strv
  } = req.body;

  try{

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
    `,[
      nama,
      alamat,
      telepon,
      jenis_kelamin,
      nomor_strv
    ]);

    res.json(result.rows[0]);

  }catch(err){
    console.error(err);
    res.status(500).json({
      error:err.message
    });
  }
});

// PUT
app.put("/api/dokter/:id", async(req,res)=>{

  const { id } = req.params;

  const {
    nama,
    alamat,
    telepon,
    jenis_kelamin,
    nomor_strv
  } = req.body;

  try{

    await db.query(`
      UPDATE dokter
      SET
      nama=$1,
      alamat=$2,
      telepon=$3,
      jenis_kelamin=$4,
      nomor_strv=$5
      WHERE id=$6
    `,[
      nama,
      alamat,
      telepon,
      jenis_kelamin,
      nomor_strv,
      id
    ]);

    res.json({
      success:true
    });

  }catch(err){
    console.error(err);
    res.status(500).json({
      error:err.message
    });
  }
});

// DELETE
app.delete("/api/dokter/:id", async(req,res)=>{

  try{

    await db.query(
      "DELETE FROM dokter WHERE id=$1",
      [req.params.id]
    );

    res.json({
      success:true
    });

  }catch(err){
    console.error(err);
    res.status(500).json({
      error:err.message
    });
  }
});

// =====================================
// KESEHATAN
// =====================================

// GET
app.get("/api/kesehatan", async(req,res)=>{

  try{

    const result = await db.query(`
      SELECT
      k.id,
      k.nomor_rekam,
      TO_CHAR(k.tanggal,'DD-MM-YYYY') AS tanggal,
      s.nama_satwa,
      d.nama AS dokter,
      k.gejala_klinis,
      k.diagnosa,
      k.pengobatan
      FROM kesehatan k
      LEFT JOIN satwa s ON s.id=k.satwa_id
      LEFT JOIN dokter d ON d.id=k.dokter_id
      ORDER BY k.id DESC
    `);

    res.json(result.rows);

  }catch(err){
    console.error(err);
    res.status(500).json({
      error:err.message
    });
  }
});

// POST
app.post("/api/kesehatan", async(req,res)=>{

  const {
    tanggal,
    satwa_id,
    dokter_id,
    gejala_klinis,
    diagnosa,
    pengobatan
  } = req.body;

  try{

    const nomor = "RM-" + Date.now();

    const result = await db.query(`
      INSERT INTO kesehatan
      (
        nomor_rekam,
        tanggal,
        satwa_id,
        dokter_id,
        gejala_klinis,
        diagnosa,
        pengobatan
      )
      VALUES($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `,[
      nomor,
      tanggal,
      satwa_id,
      dokter_id,
      gejala_klinis,
      diagnosa,
      pengobatan
    ]);

    res.json(result.rows[0]);

  }catch(err){
    console.error("ERROR SAVE KESEHATAN:", err);

    res.status(500).json({
      error:err.message
    });
  }
});

// =====================================
// STATISTIK
// =====================================

app.get("/api/stat/dokter", async(req,res)=>{
  try{

    const result = await db.query(
      "SELECT COUNT(*) AS total FROM dokter"
    );

    res.json({
      total: result.rows[0].total
    });

  }catch(err){
    res.status(500).json({
      error:err.message
    });
  }
});

app.get("/api/stat/kesehatan", async(req,res)=>{
  try{

    const result = await db.query(
      "SELECT COUNT(*) AS total FROM kesehatan"
    );

    res.json({
      total: result.rows[0].total
    });

  }catch(err){
    res.status(500).json({
      error:err.message
    });
  }
});
// =====================================
// TEST DB
// =====================================
app.get("/api/test-db", async(req,res)=>{

  try{

    const result = await db.query("SELECT NOW()");

    res.json({
      success:true,
      time:result.rows[0]
    });

  }catch(err){

    console.error(err);

    res.status(500).json({
      error:err.message
    });
  }
});
// =====================================
// START SERVER
// =====================================
async function startServer(){

  try{

    const client = await db.connect();

    console.log("✅ Database Connected");

    client.release();

    app.listen(PORT, "0.0.0.0", ()=>{
      console.log(`🚀 Server running on port ${PORT}`);
    });

  }catch(err){

    console.error("❌ Failed start:", err.message);

    process.exit(1);
  }
}

startServer();
