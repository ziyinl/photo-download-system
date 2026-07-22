const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const supabase = require("./supabase");

const uploadRoutes = require("./routes/upload");
const checkRoutes = require("./routes/check");
const downloadRoutes = require("./routes/download");
const loginRoutes = require("./routes/login");
const activitiesRoutes = require("./routes/activities");


const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(`CORS 不允許此來源：${origin}`)
      );
    },
    methods: [
      "GET",
      "POST",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// 首頁測試
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend 啟動成功！",
  });
});

// 測試 API
app.get("/api/hello", (req, res) => {
  res.json({
    success: true,
    message: "Hello React！",
  });
});

// 測試 Supabase 連線
app.get("/api/test-supabase", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("activities")
      .select("id, name, status")
      .limit(1);

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      message: "Supabase 連線成功！",
      data,
    });
  } catch (error) {
    console.error("Supabase 連線錯誤：", error);

    return res.status(500).json({
      success: false,
      message: "Supabase 連線失敗",
      error: error.message,
    });
  }
});

// 舊版查詢功能，目前仍讀取本機 Excel 與照片資料夾
app.get("/api/search", (req, res) => {
  try {
    const name = String(
      req.query.name || ""
    ).trim();

    const id = String(
      req.query.id || ""
    ).trim();

    if (!name || !id) {
      return res.status(400).json({
        success: false,
        message: "請完整輸入姓名與 ID",
      });
    }

    const excelPath = path.join(
      __dirname,
      "uploads",
      "excel",
      "名單.xlsx"
    );

    const photoFolder = path.join(
      __dirname,
      "uploads",
      "photos"
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

    const sheet =
      workbook.Sheets[workbook.SheetNames[0]];

    const data =
      xlsx.utils.sheet_to_json(sheet);

    const person = data.find((row) => {
      const excelName = String(
        row["姓名"] || ""
      ).trim();

      const excelId = String(
        row["ID"] || ""
      ).trim();

      return (
        excelName === name &&
        excelId === id
      );
    });

    if (!person) {
      return res.status(404).json({
        success: false,
        message:
          "姓名或 ID 不正確，請確認後再試。",
      });
    }

    const photos = fs.readdirSync(photoFolder);

    const photo = photos.find((file) =>
      file.startsWith(name)
    );

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "身分驗證成功，但找不到對應照片。",
      });
    }

    return res.json({
      success: true,
      message: `您好，${name}！身分驗證成功。`,
      photo,
    });
  } catch (error) {
    console.error("查詢失敗：", error);

    return res.status(500).json({
      success: false,
      message: "查詢失敗，請稍後再試。",
      error: error.message,
    });
  }
});

// 路由
app.use("/api/upload", uploadRoutes);
app.use("/api/check", checkRoutes);
app.use("/api/download", downloadRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/activities", activitiesRoutes);

// 找不到路由
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "找不到此 API 路徑",
  });
});

// 錯誤處理
app.use((error, req, res, next) => {
  console.error("伺服器錯誤：", error);

  return res.status(500).json({
    success: false,
    message:
      error.message || "伺服器發生錯誤",
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT}`
  );
});