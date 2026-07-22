const express = require("express");
const path = require("path");

const supabase = require("../supabase");

const router = express.Router();

// 必須和 upload.js 使用的 Supabase Storage bucket 名稱相同
const CERTIFICATE_BUCKET = "CERTIFICATE_BUCKET";

function getContentType(filename) {
  const extension = path
    .extname(filename || "")
    .toLowerCase();

  const contentTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
  };

  return (
    contentTypes[extension] ||
    "application/octet-stream"
  );
}

// 驗證活動、姓名與 ID 後，從 Supabase Storage 下載證書
router.post("/", async (req, res) => {
  try {
    const activityId = String(
      req.body.activityId || ""
    ).trim();

    const name = String(
      req.body.name || ""
    ).trim();

    const id = String(
      req.body.id || ""
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

    // 確認活動存在及是否開放
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

    // 查詢正確活動中的參與者
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
      return res.status(401).json({
        success: false,
        message:
          "姓名或 ID 不正確，無法下載證書。",
      });
    }

    if (!participant.photo_key) {
      return res.status(404).json({
        success: false,
        message: "此證書尚未上傳。",
      });
    }

    // 從 Supabase Storage 下載檔案
    const {
      data: certificateBlob,
      error: downloadError,
    } = await supabase.storage
      .from(CERTIFICATE_BUCKET)
      .download(participant.photo_key);

    if (downloadError) {
      throw downloadError;
    }

    if (!certificateBlob) {
      return res.status(404).json({
        success: false,
        message: "找不到證書檔案。",
      });
    }

    const arrayBuffer =
      await certificateBlob.arrayBuffer();

    const fileBuffer =
      Buffer.from(arrayBuffer);

    const extension =
      path.extname(participant.photo_key) ||
      ".png";

    const filename =
      participant.original_filename ||
      `${participant.name}_證書${extension}`;

    res.setHeader(
      "Content-Type",
      getContentType(filename)
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(
        filename
      )}`
    );

    res.setHeader(
      "Content-Length",
      fileBuffer.length
    );

    return res.send(fileBuffer);
  } catch (error) {
    console.error(
      "下載證書發生錯誤：",
      error
    );

    return res.status(500).json({
      success: false,
      message: "下載失敗，請稍後再試。",
      error: error.message,
    });
  }
});

module.exports = router;