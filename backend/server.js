const express = require("express");
const cors = require("cors");

const supabase = require("./supabase");

const uploadRoutes = require("./routes/upload");
const checkRoutes = require("./routes/check");
const downloadRoutes = require("./routes/download");
const loginRoutes = require("./routes/login");
const activitiesRoutes = require("./routes/activities");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://photo-download-system.vercel.app",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // 允許瀏覽器以外的請求，例如 Render 健康檢查
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS 阻擋來源：", origin);

      return callback(
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
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json());

// 首頁測試
app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Backend 啟動成功！",
  });
});

// API 測試
app.get("/api/hello", (req, res) => {
  return res.json({
    success: true,
    message: "Hello React！",
  });
});

// Supabase 連線測試
app.get("/api/test-supabase", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("activities")
      .select("id, name, status")
      .limit(5);

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
      code: error.code || null,
    });
  }
});

// 查詢參與者
// 不再讀取 Render 本機 Excel
app.get("/api/search", async (req, res) => {
  try {
    const activityId = String(
      req.query.activityId || ""
    ).trim();

    const name = String(
      req.query.name || ""
    ).trim();

    const id = String(
      req.query.id || ""
    ).trim();

    if (!activityId) {
      return res.status(400).json({
        success: false,
        message: "請先選擇活動",
      });
    }

    if (!name || !id) {
      return res.status(400).json({
        success: false,
        message: "請完整輸入姓名與 ID",
      });
    }

    // 確認活動存在
    const {
      data: activity,
      error: activityError,
    } = await supabase
      .from("activities")
      .select("id, name, status")
      .eq("id", activityId)
      .maybeSingle();

    if (activityError) {
      throw activityError;
    }

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "找不到指定的活動",
      });
    }

    if (activity.status !== "open") {
      return res.status(403).json({
        success: false,
        message: "此活動目前尚未開放下載",
      });
    }

    // 查詢活動名單
    const {
      data: participant,
      error: participantError,
    } = await supabase
      .from("participants")
      .select(
        "id, activity_id, name, verification_code, photo_key"
      )
      .eq("activity_id", activityId)
      .eq("name", name)
      .eq("verification_code", id)
      .maybeSingle();

    if (participantError) {
      throw participantError;
    }

    if (!participant) {
      return res.status(404).json({
        success: false,
        message:
          "姓名或 ID 不正確，請確認後再試。",
      });
    }

    if (!participant.photo_key) {
      return res.status(404).json({
        success: false,
        message:
          "身分驗證成功，但目前找不到對應證書。",
      });
    }

    return res.json({
      success: true,
      message: `您好，${participant.name}！身分驗證成功。`,
      activity: {
        id: activity.id,
        name: activity.name,
      },
    });
  } catch (error) {
    console.error("查詢失敗：", error);

    return res.status(500).json({
      success: false,
      message: "查詢失敗，請稍後再試。",
      error: error.message,
      code: error.code || null,
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