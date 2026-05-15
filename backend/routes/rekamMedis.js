const express = require("express");
const PDFDocument = require("pdfkit");
const { Pool } = require("pg");
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
        TO_CHAR(k.tanggal, 'DD-MM-YYYY') AS tanggal_format,
        s.nama_satwa, s.jenis, s.ras, s.jenis_kelamin,
        DATE_PART('year', AGE(s.tanggal_lahir)) AS umur,
        s.nama_pemilik,
        d.nama AS dokter, d.nomor_strv,
        k.gejala_klinis, k.diagnosa, k.pengobatan
      FROM kesehatan k
      JOIN satwa s ON k.satwa_id = s.id
      JOIN dokter d ON k.dokter_id = d.id
      WHERE k.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) return res.status(404).send("Data tidak ditemukan");
    const r = result.rows[0];

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${r.nomor_rekam}.pdf`);
    doc.pipe(res);

    // ================= HEADER (KOP SURAT) =================
    // CARA FIX LOGO: Letakkan file logo.png di dalam folder 'routes'
    const logoPath = path.join(__dirname, "logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 35, { width: 65 });
    }

    doc.font('Helvetica-Bold').fontSize(12).text("KEPOLISIAN DAERAH D.I. YOGYAKARTA", 130, 40);
    doc.text("DITSAMAPTA – UNIT POLSATWA", 130, 55);
    doc.text("SISTEM INFORMASI MANAJEMEN KESEHATAN SATWA", 130, 70);
    doc.text("(SIMAKES)", 130, 85, { align: 'left' });
    
    doc.moveTo(40, 105).lineTo(550, 105).lineWidth(1.5).stroke(); 
    doc.moveDown(2);

    doc.font('Helvetica-Bold').fontSize(13).text("REKAM MEDIS KESEHATAN SATWA", { align: "center" });
    doc.moveDown(1.5);

    // ================= DATA IDENTITAS =================
    doc.font('Helvetica').fontSize(10);
    const renderRow = (label, value, yPos) => {
      doc.font('Helvetica').text(label, 60, yPos);
      doc.text(`:   ${value || "-"}`, 180, yPos);
    };

    let currentY = 150;
    renderRow("Nomor Rekam Medis", r.nomor_rekam, currentY); currentY += 18;
    renderRow("Tanggal", r.tanggal_format, currentY); currentY += 18;
    renderRow("Nama Satwa", r.nama_satwa, currentY); currentY += 18;
    renderRow("Jenis / Ras", `${r.jenis} / ${r.ras}`, currentY); currentY += 18;
    renderRow("Jenis Kelamin", r.jenis_kelamin, currentY); currentY += 18;
    renderRow("Umur", `${r.umur} Tahun`, currentY); currentY += 18;
    renderRow("Pemilik", r.nama_pemilik, currentY); currentY += 18;
    renderRow("Dokter Pemeriksa", r.dokter, currentY); currentY += 18;
    renderRow("Nomor STRV", r.nomor_strv, currentY); currentY += 25;

    // ================= HASIL PEMERIKSAAN =================
    doc.font('Helvetica-Bold').fontSize(11).text("HASIL PEMERIKSAAN", 60, currentY, { underline: true });
    currentY += 20;

    const drawBox = (title, content, y) => {
      doc.font('Helvetica').fontSize(10).text(title, 60, y);
      doc.rect(60, y + 15, 480, 60).stroke();
      doc.text(content || "-", 70, y + 25, { width: 460 });
      return y + 85;
    };

    currentY = drawBox("Diagnosa", r.diagnosa, currentY);
    currentY = drawBox("Pengobatan / Tindakan", r.pengobatan, currentY);

    // ================= TANDA TANGAN =================
    currentY += 10;
    doc.text(`Yogyakarta, ${r.tanggal_format}`, 380, currentY);
    currentY += 50;
    doc.font('Helvetica-Bold').text(r.dokter, 380, currentY);
    doc.font('Helvetica').text(`STRV: ${r.nomor_strv}`, 380, currentY + 15);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal generate PDF");
  }
});

module.exports = router;
