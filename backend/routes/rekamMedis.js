const express = require("express");
const PDFDocument = require("pdfkit");
const db = require("../db");
const path = require("path");

const router = express.Router();

router.get("/pdf/:id", (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT 
      k.nomor_rekam,
      DATE_FORMAT(k.tanggal,'%d-%m-%Y') AS tanggal,
      s.nama_satwa,
      s.jenis,
      s.ras,
      TIMESTAMPDIFF(YEAR, s.tanggal_lahir, CURDATE()) AS umur,
      s.jenis_kelamin,
      s.nama_pemilik,
      d.nama AS dokter,
      d.nomor_strv,
      k.diagnosa,
      k.pengobatan
    FROM kesehatan k
    JOIN satwa s ON k.satwa_id = s.id
    JOIN dokter d ON k.dokter_id = d.id
    WHERE k.id = ?
  `;

  db.query(sql, [id], (err, data) => {
    if (err || data.length === 0) {
      console.error(err);
      return res.status(404).send("Data tidak ditemukan");
    }

    const r = data[0];

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${r.nomor_rekam}.pdf`);
    doc.pipe(res);

    // ================= HEADER =================
    const logoPath = path.join(__dirname, "logo.png");

// Logo kiri
doc.image(logoPath, 40, 35, { width: 65 });
const pageWidth = doc.page.width;

doc
  .fontSize(14)
  .text("KEPOLISIAN DAERAH D.I. YOGYAKARTA", 0, 40, {
    width: pageWidth,
    align: "center"
  })
  .text("DITSAMAPTA – UNIT POLSATWA", {
    width: pageWidth,
    align: "center"
  })
  .text("SISTEM INFORMASI MANAJEMEN KESEHATAN SATWA", {
    width: pageWidth,
    align: "center"
  })
    .text("(SIMAKES)", {
    width: pageWidth,
    align: "center"
  });

doc.moveTo(40, 110).lineTo(550, 110).stroke();

doc.fontSize(14).text("REKAM MEDIS KESEHATAN SATWA", 40, 125, { align: "center" });
doc.moveDown(2);

    // ================= IDENTITAS =================
    doc.fontSize(11);
  function row(label, value){
  const y = doc.y;
  doc.text(label, 40, y);
  doc.text(":", 160, y);
  doc.text(value ??"-", 185, y);
  doc.moveDown(0.8);
}

row("Nomor Rekam Medis", r.nomor_rekam);
row("Tanggal", r.tanggal);
row("Nama Satwa", r.nama_satwa);
row("Jenis / Ras", `${r.jenis} / ${r.ras}`);
row("Jenis Kelamin", r.jenis_kelamin);
row("Umur", r.umur + " Tahun");
row("Pemilik", r.nama_pemilik);
row("Dokter Pemeriksa", r.dokter);
row("Nomor STRV", r.nomor_strv);

    // ================= PEMERIKSAAN =================
doc.fontSize(12).text("HASIL PEMERIKSAAN", { underline: true });
doc.moveDown(0.8);

doc.fontSize(11);

// ===== DIAGNOSA =====
doc.text("Diagnosa", 40, doc.y);
doc.moveDown(0.3);

let yDiag = doc.y;
doc.rect(40, yDiag, 500, 70).stroke();
doc.text(r.diagnosa || "-", 45, yDiag + 5, { width: 490 });

doc.moveDown(5);

// ===== PENGOBATAN =====
doc.text("Pengobatan / Tindakan", 40, doc.y);
doc.moveDown(0.3);

let yObat = doc.y;
doc.rect(40, yObat, 500, 70).stroke();
doc.text(r.pengobatan || "-", 45, yObat + 5, { width: 490 });

doc.moveDown(6);

    // ================= TANDA TANGAN =================
const signX = 380;   // geser ke kiri (atur 360–420 sesuai selera)

doc.text(`Yogyakarta, ${r.tanggal}`, signX, doc.y);
doc.moveDown(5);

doc.fontSize(11).text(r.dokter, signX);
doc.text(`STRV: ${r.nomor_strv}`, signX);

    // ================= FOOTER =================
    // doc.moveDown(4);
    // doc
    //   .fontSize(9)
    //   .text(
    //     "Dokumen ini dihasilkan oleh Sistem Informasi Manajemen Kesehatan Satwa (SIMAKES)",
    //     { align: "center" }
    //   );

    doc.end();
  });
});

module.exports = router;


      // s.umur,