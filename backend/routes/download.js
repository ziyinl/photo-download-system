const express = require("express");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const router = express.Router();

// 驗證姓名與 ID 後下載照片
router.post("/", (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const id = String(req.body.id || "").trim();

    if (!name || !id) {
      return res.status(400).json({
        success: false,
        message: "請完整輸入姓名與 ID",
      });
    }

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
        message: "找不到 Excel 名單",
      });
    }

    if (!fs.existsSync(photoFolder)) {
      return res.status(400).json({
        success: false,
        message: "找不到照片資料夾",
      });
    }

    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const person = data.find((row) => {
      const excelName = String(row["姓名"] || "").trim();
      const excelId = String(row["ID"] || "").trim();

      return excelName === name && excelId === id;
    });

    if (!person) {
      return res.status(401).json({
        success: false,
        message: "姓名或 ID 不正確，無法下載照片。",
      });
    }

    const photos = fs.readdirSync(photoFolder);

    const photo = photos.find((file) =>
      file.startsWith(name)
    );

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: "找不到對應照片。",
      });
    }

    const photoPath = path.join(photoFolder, photo);

    return res.download(photoPath, photo);
  } catch (error) {
    console.error("下載照片發生錯誤：", error);

    return res.status(500).json({
      success: false,
      message: "下載失敗，請稍後再試。",
    });
  }
});

module.exports = router;