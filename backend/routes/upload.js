const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

const router = express.Router();

const excelUploadFolder = path.join(
  __dirname,
  "../uploads/excel"
);

const certificateUploadFolder = path.join(
  __dirname,
  "../uploads/photos"
);

if (!fs.existsSync(excelUploadFolder)) {
  fs.mkdirSync(excelUploadFolder, {
    recursive: true,
  });
}

if (!fs.existsSync(certificateUploadFolder)) {
  fs.mkdirSync(certificateUploadFolder, {
    recursive: true,
  });
}

// Excel 儲存設定
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, excelUploadFolder);
  },
  filename: (req, file, cb) => {
    cb(null, "名單.xlsx");
  },
});

const excelUpload = multer({
  storage: excelStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".xlsx", ".xls"];
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(
        new Error("只能上傳 Excel 檔案")
      );
    }

    cb(null, true);
  },
});

// 證書儲存設定
const certificateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, certificateUploadFolder);
  },

  filename: (req, file, cb) => {
    try {
      // 修正中文檔名在 Multer 中可能出現的亂碼
      const decodedName = Buffer.from(
        file.originalname,
        "latin1"
      ).toString("utf8");

      // 只保留檔名，避免路徑字元造成問題
      const safeName = path
        .basename(decodedName)
        .replace(/[\/\\:*?"<>|]/g, "_");

      cb(null, safeName);
    } catch (error) {
      console.error("檔名轉碼失敗：", error);
      cb(null, path.basename(file.originalname));
    }
  },
});

const certificateUpload = multer({
  storage: certificateStorage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 300,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".pdf",
    ];

    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(
        new Error(
          "證書只能上傳 JPG、JPEG、PNG 或 PDF 檔案"
        )
      );
    }

    cb(null, true);
  },
});

// 上傳 Excel
router.post(
  "/excel",
  excelUpload.single("excel"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "請選擇 Excel 檔案",
        });
      }

      const workbook = XLSX.readFile(
        req.file.path
      );

      const firstSheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json(
        worksheet,
        {
          defval: "",
        }
      );

      const members = rows
        .map((row) => {
          const name = String(
            row["姓名"] || ""
          ).trim();

          const id = String(
            row["ID"] ||
              row["Id"] ||
              row["id"] ||
              ""
          ).trim();

          return {
            name,
            id,
          };
        })
        .filter(
          (member) =>
            member.name && member.id
        );

      if (members.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Excel 中找不到有效的「姓名」與「ID」資料",
        });
      }

      return res.json({
        success: true,
        message: "Excel 上傳並讀取成功",
        total: members.length,
        members,
      });
    } catch (error) {
      console.error(
        "讀取 Excel 失敗：",
        error
      );

      return res.status(500).json({
        success: false,
        message: "讀取 Excel 失敗",
      });
    }
  }
);

// 上傳多個證書
router.post(
  "/certificates",
  certificateUpload.array(
    "certificates",
    300
  ),
  (req, res) => {
    try {
      if (
        !req.files ||
        req.files.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "請選擇證書檔案",
        });
      }

      const uploadedFiles =
        req.files.map((file) => ({
          originalName: file.originalname,
          savedName: file.filename,
          size: file.size,
        }));

      return res.json({
        success: true,
        message: "證書上傳成功",
        total: uploadedFiles.length,
        files: uploadedFiles,
      });
    } catch (error) {
      console.error(
        "證書上傳失敗：",
        error
      );

      return res.status(500).json({
        success: false,
        message: "證書上傳失敗",
      });
    }
  }
);

// Multer 與上傳錯誤處理
router.use((error, req, res, next) => {
  console.error("上傳錯誤：", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "檔案大小超過限制",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message:
          "一次最多只能上傳 300 個檔案",
      });
    }
  }

  return res.status(400).json({
    success: false,
    message:
      error.message || "檔案上傳失敗",
  });
});

module.exports = router;