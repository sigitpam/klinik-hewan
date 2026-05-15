const express = require("express");
const PDFDocument = require("pdfkit");
const db = require("../db");
const path = require("path");
const fs = require("fs");

const router = express.Router();

router.get("/pdf/:id", (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT 
      k.nomor_rekam,
      DATE_FORMAT(k.tanggal,'%d-%m-%Y') AS tanggal,
      s.nama_satwa, s.jenis, s.ras,
      TIMESTAMPDIFF(YEAR, s.tanggal_lahir, CURDATE()) AS umur,
      s.jenis_kelamin, s.nama_pemilik,
      d.nama AS dokter, d.nomor_strv,
      k.gejala_klinis, k.diagnosa, k.pengobatan
    FROM kesehatan k
    JOIN satwa s ON k.satwa_id = s.id
    JOIN dokter d ON k.dokter_id = d.id
    WHERE k.id = ?
  `;

  db.query(sql, [id], (err, data) => {
    if (err || data.length === 0) {
      return res.status(404).send("Data tidak ditemukan");
    }

    const r = data[0];
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${r.nomor_rekam}.pdf`);
    doc.pipe(res);

    // --- HEADER ---
    const logoPath = path.join(__dirname, "logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 35, { width: 60 });
    }

    doc.fontSize(12).text("KEPOLISIAN DAERAH D.I. YOGYAKARTA", { align: "center" });
    doc.text("DITSAMAPTA – UNIT POLSATWA", { align: "center" });
    doc.fontSize(14).text("SIMAKES (MANAJEMEN KESEHATAN SATWA)", { align: "center", style: 'bold' });
    doc.moveDown(0.5);
    doc.moveTo(40, 105).lineTo(550, 105).stroke();
    doc.moveDown(1.5);

    doc.fontSize(12).text("REKAM MEDIS KESEHATAN SATWA", { align: "center", underline: true });
    doc.moveDown(1);

    // --- IDENTITAS (Fungsi Row) ---
    doc.fontSize(10);
    const renderRow = (label, value) => {
      const currentY = doc.y;
      doc.text(label, 40, currentY);
      doc.text(":", 150, currentY);
      doc.text(value || "-", 170, currentY);
      doc.moveDown(0.7);
    };

    renderRow("No. Rekam Medis", r.nomor_rekam);
    renderRow("Tanggal Periksa", r.tanggal);
    renderRow("Nama Satwa", r.nama_satwa);
    renderRow("Jenis / Ras", `${r.jenis} / ${r.ras}`);
    renderRow("Umur / Kelamin", `${r.umur} Th / ${r.jenis_kelamin}`);
    renderRow("Nama Pemilik", r.nama_pemilik);
    renderRow("Dokter", r.dokter);

    doc.moveDown(1);

    // --- PEMERIKSAAN (Kotak Dinamis) ---
    const drawBox = (title, content) => {
      doc.fontSize(11).text(title, { style: 'bold' });
      doc.moveDown(0.3);
      const startY = doc.y;
      doc.rect(40, startY, 510, 50).stroke(); // Tinggi kotak 50 agar hemat ruang
      doc.fontSize(10).text(content || "-", 45, startY + 5, { width: 500 });
      doc.moveDown(4); 
    };

    drawBox("Gejala Klinis", r.gejala_klinis);
    drawBox("Diagnosa", r.diagnosa);
    drawBox("Pengobatan / Tindakan", r.pengobatan);

    // --- TANDA TANGAN ---
    doc.moveDown(2);
    const signX = 380;
    doc.fontSize(10).text(`Yogyakarta, ${r.tanggal}`, signX);
    doc.moveDown(3);
    doc.text(r.dokter, signX, { underline: true });
    doc.text(`STRV: ${r.nomor_strv}`, signX);

    doc.end();
  });
});

module.exports = router;
