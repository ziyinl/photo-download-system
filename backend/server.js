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

// 從 Supabase 查詢活動參與者
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

    // 確認活動存在並且已開放下載
    const {
      data: activity,
      error: activityError,
    } = await supabase
      .from("activities")
      .select(
        "id, name, status, download_deadline"
      )
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

    if (activity.download_deadline) {
      const deadline = new Date(
        activity.download_deadline
      );

      if (
        !Number.isNaN(deadline.getTime()) &&
        deadline.getTime() < Date.now()
      ) {
        return res.status(403).json({
          success: false,
          message: "此活動的下載期限已截止",
        });
      }
    }

    // 使用活動、姓名及 ID 查詢參與者
    const {
      data: participant,
      error: participantError,
    } = await supabase
      .from("participants")
      .select(
        "id, name, verification_code, photo_key, original_filename"
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
          "身分驗證成功，但此證書尚未上傳。",
      });
    }

    return res.json({
      success: true,
      message: `您好，${participant.name}！身分驗證成功，可以下載證書。`,
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
    });
  }
});