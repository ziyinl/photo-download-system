const express = require("express");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const router = express.Router();

router.get("/", (req, res) => {
  console.log("=== NEW CHECK API ===");

  try {
    const excelPath = path.join(
      __dirname,
      "../uploads/excel/名單.xlsx"
    );

    const photoFolder = path.join(
      __dirname,
      "../uploads/photos"
    );

    if (!fs.existsSync(excelPath)) {
      return res.status(400).json({
        success: false,
        message: "找不到 Excel，請先上傳名單。",
      });
    }

    if (!fs.existsSync(photoFolder)) {
      return res.status(400).json({
        success: false,
        message: "找不到照片資料夾。",
      });
    }

    const workbook = xlsx.readFile(excelPath);
    const sheet =
      workbook.Sheets[workbook.SheetNames[0]];

    const data = xlsx.utils.sheet_to_json(sheet, {
      defval: "",
    });

    const photos = fs
  .readdirSync(photoFolder)
  .filter((file) => {
    // 忽略 macOS 隱藏檔
    if (file.startsWith(".")) {
      return false;
    }

    const filePath = path.join(photoFolder, file);

    return fs.statSync(filePath).isFile();
  });

    const matched = [];
    const missing = [];
    const duplicateNames = [];

    const usedPhotos = new Set();
    const usedNames = new Set();

    for (const row of data) {
      const name = String(
        row["姓名"] || ""
      ).trim();

      if (!name) {
        continue;
      }

      if (usedNames.has(name)) {
        duplicateNames.push(name);
        continue;
      }

      usedNames.add(name);

      const photo = photos.find(
        (file) =>
          file.startsWith(name) &&
          !usedPhotos.has(file)
      );

      if (photo) {
        matched.push({
          name,
          photo,
        });

        usedPhotos.add(photo);
      } else {
        missing.push(name);
      }
    }

    const extra = photos.filter(
      (file) => !usedPhotos.has(file)
    );

    console.log("=== CHECK RESULTS ===");
    console.log(`Total People: ${data.length}`);
    console.log(`Total Photos: ${photos.length}`);
    console.log(`Matched: ${matched.length}`);
    console.log(`Missing: ${missing.length}`);
    console.log(`Extra: ${extra.length}`);
    console.log(
      `Duplicate Names: ${duplicateNames.length}`
    );

    return res.json({
      success: true,
      totalPeople: data.length,
      totalPhotos: photos.length,

      matchedCount: matched.length,
      missingCount: missing.length,
      extraCount: extra.length,
      duplicateCount: duplicateNames.length,

      matched,
      missing,
      extra,
      duplicateNames,
    });
  } catch (error) {
    console.error("名單檢查失敗：", error);

    return res.status(500).json({
      success: false,
      message: error.message || "名單檢查失敗",
    });
  }
});
router.get("/export-missing", (req, res) => {
  try {
    const excelPath = path.join(
      __dirname,
      "../uploads/excel/名單.xlsx"
    );

    const photoFolder = path.join(
      __dirname,
      "../uploads/photos"
    );

    if (!fs.existsSync(excelPath)) {
      return res.status(400).json({
        success: false,
        message: "找不到 Excel",
      });
    }

    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const photos = fs.readdirSync(photoFolder);

    const missing = [];

    for (const row of data) {
      const name = String(row["姓名"] || "").trim();

      if (!name) continue;

      const found = photos.some((file) =>
        file.startsWith(name)
      );

      if (!found) {
        missing.push({
          姓名: name,
        });
      }
    }

    const newWorkbook = xlsx.utils.book_new();

    const newSheet =
      xlsx.utils.json_to_sheet(missing);

    xlsx.utils.book_append_sheet(
      newWorkbook,
      newSheet,
      "缺少證書"
    );

    const exportPath = path.join(
      __dirname,
      "../uploads/missing.xlsx"
    );

    xlsx.writeFile(newWorkbook, exportPath);

    res.download(exportPath, "缺少證書名單.xlsx");
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
module.exports = router;