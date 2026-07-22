const express = require("express");
const supabase = require("../supabase");

const router = express.Router();

// 取得全部活動
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("activities")
      .select(
        "id, name, status, download_deadline, created_at, updated_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      activities: data || [],
    });
  } catch (error) {
    console.error("取得活動失敗：", error);

    return res.status(500).json({
      success: false,
      message: "取得活動失敗",
      error: error.message,
    });
  }
});

// 建立新活動
router.post("/", async (req, res) => {
  try {
    const name = String(
      req.body.name || ""
    ).trim();

    const downloadDeadline =
      req.body.downloadDeadline ||
      req.body.download_deadline ||
      null;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "請輸入活動名稱",
      });
    }

    const newActivity = {
      name,
      status: "draft",
      download_deadline:
        downloadDeadline || null,
    };

    const { data, error } = await supabase
      .from("activities")
      .insert(newActivity)
      .select(
        "id, name, status, download_deadline, created_at, updated_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "活動建立成功",
      activity: data,
    });
  } catch (error) {
    console.error("建立活動失敗：", error);

    return res.status(500).json({
      success: false,
      message: "建立活動失敗",
      error: error.message,
    });
  }
});
// 取得指定活動的參與者名單
router.get(
  "/:activityId/participants",
  async (req, res) => {
    try {
      const activityId = String(
        req.params.activityId || ""
      ).trim();

      if (!activityId) {
        return res.status(400).json({
          success: false,
          message: "缺少活動 ID",
        });
      }

      // 先確認活動是否存在
      const {
        data: activity,
        error: activityError,
      } = await supabase
        .from("activities")
        .select("id, name")
        .eq("id", activityId)
        .maybeSingle();

      if (activityError) {
        throw activityError;
      }

      if (!activity) {
        return res.status(404).json({
          success: false,
          message: "找不到活動",
        });
      }

      // 取得該活動的名單
      const {
        data: participants,
        error: participantsError,
      } = await supabase
        .from("participants")
        .select(
          `
            id,
            name,
            verification_code,
            photo_key,
            original_filename,
            created_at
          `
        )
        .eq("activity_id", activityId)
        .order("created_at", {
          ascending: true,
        });

      if (participantsError) {
        throw participantsError;
      }

      return res.json({
        success: true,
        activity,
        total: participants?.length || 0,
        participants: participants || [],
      });
    } catch (error) {
      console.error(
        "取得活動名單失敗：",
        error
      );

      return res.status(500).json({
        success: false,
        message: "取得活動名單失敗",
        error: error.message,
      });
    }
  }
);
// 取得單一活動
router.get("/:activityId", async (req, res) => {
  try {
    const activityId = String(
      req.params.activityId || ""
    ).trim();

    const { data, error } = await supabase
      .from("activities")
      .select(
        "id, name, status, download_deadline, created_at, updated_at"
      )
      .eq("id", activityId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "找不到活動",
      });
    }

    const {
      count: participantCount,
      error: countError,
    } = await supabase
      .from("participants")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("activity_id", activityId);

    if (countError) {
      throw countError;
    }

    return res.json({
      success: true,
      activity: {
        ...data,
        participant_count:
          participantCount || 0,
      },
    });
  } catch (error) {
    console.error("取得活動資料失敗：", error);

    return res.status(500).json({
      success: false,
      message: "取得活動資料失敗",
      error: error.message,
    });
  }
});

// 修改活動
router.patch("/:activityId", async (req, res) => {
  try {
    const activityId = String(
      req.params.activityId || ""
    ).trim();

    const updates = {};

    if (req.body.name !== undefined) {
      const name = String(
        req.body.name || ""
      ).trim();

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "活動名稱不可為空白",
        });
      }

      updates.name = name;
    }

    if (req.body.status !== undefined) {
      const allowedStatuses = [
        "draft",
        "open",
        "closed",
      ];

      const status = String(
        req.body.status || ""
      ).trim();

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "活動狀態只能是 draft、open 或 closed",
        });
      }

      updates.status = status;
    }

    if (
      req.body.downloadDeadline !==
        undefined ||
      req.body.download_deadline !==
        undefined
    ) {
      updates.download_deadline =
        req.body.downloadDeadline ??
        req.body.download_deadline ??
        null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "沒有可更新的資料",
      });
    }

    updates.updated_at =
      new Date().toISOString();

    const { data, error } = await supabase
      .from("activities")
      .update(updates)
      .eq("id", activityId)
      .select(
        "id, name, status, download_deadline, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "找不到活動",
      });
    }

    return res.json({
      success: true,
      message: "活動更新成功",
      activity: data,
    });
  } catch (error) {
    console.error("更新活動失敗：", error);

    return res.status(500).json({
      success: false,
      message: "更新活動失敗",
      error: error.message,
    });
  }
});

// 刪除活動及其參與者資料
router.delete(
  "/:activityId",
  async (req, res) => {
    try {
      const activityId = String(
        req.params.activityId || ""
      ).trim();

      const {
        error: participantsDeleteError,
      } = await supabase
        .from("participants")
        .delete()
        .eq("activity_id", activityId);

      if (participantsDeleteError) {
        throw participantsDeleteError;
      }

      const { data, error } = await supabase
        .from("activities")
        .delete()
        .eq("id", activityId)
        .select("id, name")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "找不到活動",
        });
      }

      return res.json({
        success: true,
        message: "活動及名單已刪除",
        activity: data,
      });
    } catch (error) {
      console.error("刪除活動失敗：", error);

      return res.status(500).json({
        success: false,
        message: "刪除活動失敗",
        error: error.message,
      });
    }
  }
);

module.exports = router;