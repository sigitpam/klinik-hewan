const express = require("express");
const PDFDocument = require("pdfkit");
const { Pool } = require("pg"); // Gunakan pg bukan mysql
const path = require("path");
const fs = require("fs");

const router = express.Router();
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

router.get("/pdf/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const query = `
      SELECT 
        k.nomor_rekam,
        TO_CHAR(k.tanggal, 'DD-MM-YYYY') AS tanggal,
        s.nama_satwa, s.jenis, s.ras,
        DATE_PART('year', AGE(s.tanggal_lahir)) AS umur,
        s.jenis_kelamin, s.nama_pemilik,
        d.nama AS dokter, d.nomor_strv,
        k.gejala_klinis, k.diagnosa, k.pengobatan
      FROM kesehatan k
      JOIN satwa s ON k.satwa_id = s.id
      JOIN dokter d ON k.dokter_id = d.id
      WHERE k.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).send("Data tidak ditemukan");
    }

    const r = result.rows[0];
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${r.nomor_rekam}.pdf`);
    doc.pipe(res);

    // --- HEADER (KOP SURAT) ---
    // Jika tidak ada logo, teks akan tetap rapi
    doc.font('Helvetica-Bold').fontSize(12).text("KEPOLISIAN DAERAH D.I. YOGYAKARTA", 110, 40);
    doc.text("DITSAMAPTA – UNIT POLSATWA", 110, 55);
    doc.fontSize(10).font('Helvetica').text("Jalan Ringroad Utara, Condongcatur, Sleman, DIY", 110, 70);
    
    doc.moveTo(40, 95).lineTo(550, 95).lineWidth(2).stroke();
    doc.moveDown(3);

    doc.font('Helvetica-Bold').fontSize(14).text("REKAM MEDIS KESEHATAN SATWA", { align: "center" });
    doc.moveDown(1.5);

    // --- DATA IDENTITAS ---
    const renderRow = (label, value) => {
      const y = doc.y;
      doc.font('Helvetica-Bold').text(label, 50, y);
      doc.font('Helvetica').text(`:  ${value || "-"}`, 180, y);
      doc.moveDown(1);
    };

    renderRow("Nomor Rekam", r.nomor_rekam);
    renderRow("Nama Satwa", r.nama_satwa);
    renderRow("Dokter", r.dokter);
    doc.moveDown(1);

    // --- KOTAK PEMERIKSAAN ---
    const drawSection = (title, content) => {
      doc.font('Helvetica-Bold').fontSize(11).text(title);
      doc.moveDown(0.3);
      const startY = doc.y;
      doc.rect(50, startY, 500, 60).stroke();
      doc.font('Helvetica').fontSize(10).text(content || "-", 55, startY + 8, { width: 490 });
      doc.moveDown(4.5);
    };

    drawSection("GEJALA KLINIS", r.gejala_klinis);
    drawSection("DIAGNOSA", r.diagnosa);
    drawSection("PENGOBATAN", r.pengobatan);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
