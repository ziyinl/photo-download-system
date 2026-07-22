const express = require("express");
const multer = require("multer");
const path = require("path");
const XLSX = require("xlsx");
const supabase = require("../supabase");

const router = express.Router();

const CERTIFICATE_BUCKET = "certificates";
const MAX_CERTIFICATE_COUNT = 300;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Excel 與證書都先放在記憶體，不存進 Render 本機資料夾
const memoryStorage = multer.memoryStorage();

const excelUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (![".xlsx", ".xls"].includes(extension)) {
      return callback(
        new Error("只能上傳 XLSX 或 XLS 格式的 Excel 檔案")
      );
    }

    return callback(null, true);
  },
});

const certificateUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_CERTIFICATE_COUNT,
  },
  fileFilter: (req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const allowedExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".pdf",
    ];

    if (!allowedExtensions.includes(extension)) {
      return callback(
        new Error(
          `不支援「${file.originalname}」，證書只能使用 PNG、JPG、JPEG 或 PDF`
        )
      );
    }

    return callback(null, true);
  },
});

function normalizeText(value) {
  return String(value || "")
    .normalize("NFC")
    .trim();
}

// 修正部分瀏覽器或 Multer 造成的中文檔名亂碼
function decodeFilename(filename) {
  const originalName = normalizeText(filename);

  // 已經包含正常中日韓文字時，不再轉碼
  if (/[\u3400-\u9fff]/u.test(originalName)) {
    return originalName;
  }

  try {
    const decodedName = Buffer.from(
      originalName,
      "latin1"
    ).toString("utf8");

    if (
      decodedName &&
      !decodedName.includes("\uFFFD")
    ) {
      return normalizeText(decodedName);
    }
  } catch (error) {
    console.error("檔名轉碼失敗：", error);
  }

  return originalName;
}

function getCertificateName(filename) {
  const decodedFilename = decodeFilename(filename);

  const extension = path.extname(decodedFilename);

  const filenameWithoutExtension = path.basename(
    decodedFilename,
    extension
  );

  const suffix = "_參加證明";

  if (!filenameWithoutExtension.endsWith(suffix)) {
    return null;
  }

  const participantName =
    filenameWithoutExtension.slice(
      0,
      -suffix.length
    );

  return normalizeText(participantName);
}

function getStorageExtension(filename) {
  const extension = path
    .extname(filename)
    .toLowerCase()
    .replace(".", "");

  if (extension === "jpeg") {
    return "jpg";
  }

  return extension;
}

function getContentType(extension) {
  const contentTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    pdf: "application/pdf",
  };

  return (
    contentTypes[extension] ||
    "application/octet-stream"
  );
}

// 上傳 Excel 並匯入 Supabase Database
router.post(
  "/excel",
  excelUpload.single("excel"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "請選擇 Excel 檔案",
        });
      }

      const activityId = normalizeText(
        req.body.activityId ||
          req.body.activity_id
      );

      if (!activityId) {
        return res.status(400).json({
          success: false,
          message: "請先選擇要匯入名單的活動",
        });
      }

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

      const workbook = XLSX.read(
        req.file.buffer,
        {
          type: "buffer",
        }
      );

      const firstSheetName =
        workbook.SheetNames[0];

      if (!firstSheetName) {
        return res.status(400).json({
          success: false,
          message: "Excel 中沒有可讀取的工作表",
        });
      }

      const worksheet =
        workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json(
        worksheet,
        {
          defval: "",
          raw: false,
        }
      );

      const participants = rows
        .map((row) => {
          const name = normalizeText(
            row["姓名"]
          );

          const verificationCode =
            normalizeText(
              row["ID"] ||
                row["Id"] ||
                row["id"]
            );

          return {
            activity_id: activityId,
            name,
            verification_code:
              verificationCode,
            photo_key: null,
            original_filename: null,
          };
        })
        .filter(
          (participant) =>
            participant.name &&
            participant.verification_code
        );

      if (participants.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Excel 中找不到有效的「姓名」與「ID」資料",
        });
      }

      // 先取得舊名單的證書路徑
      const {
        data: oldParticipants,
        error: oldParticipantsError,
      } = await supabase
        .from("participants")
        .select("photo_key")
        .eq("activity_id", activityId);

      if (oldParticipantsError) {
        throw oldParticipantsError;
      }

      const oldStoragePaths = (
        oldParticipants || []
      )
        .map(
          (participant) =>
            participant.photo_key
        )
        .filter(Boolean);

      // 重複匯入名單時，刪除舊證書
      if (oldStoragePaths.length > 0) {
        const { error: storageDeleteError } =
          await supabase.storage
            .from(CERTIFICATE_BUCKET)
            .remove(oldStoragePaths);

        if (storageDeleteError) {
          throw storageDeleteError;
        }
      }

      // 刪除該活動原有名單
      const { error: participantsDeleteError } =
        await supabase
          .from("participants")
          .delete()
          .eq("activity_id", activityId);

      if (participantsDeleteError) {
        throw participantsDeleteError;
      }

      const batchSize = 500;
      let importedTotal = 0;

      for (
        let index = 0;
        index < participants.length;
        index += batchSize
      ) {
        const batch = participants.slice(
          index,
          index + batchSize
        );

        const {
          data: insertedParticipants,
          error: insertError,
        } = await supabase
          .from("participants")
          .insert(batch)
          .select("id");

        if (insertError) {
          throw insertError;
        }

        importedTotal +=
          insertedParticipants?.length ||
          batch.length;
      }

      return res.json({
        success: true,
        imported: true,
        message:
          "Excel 名單已匯入 Supabase。",
        activity,
        total: importedTotal,
      });
    } catch (error) {
      console.error(
        "Excel 上傳或匯入失敗：",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Excel 上傳或匯入 Supabase 失敗",
        error: error.message,
      });
    }
  }
);

// 批次上傳證書到 Supabase Storage
router.post(
  "/certificates",
  certificateUpload.array(
    "certificates",
    MAX_CERTIFICATE_COUNT
  ),
  async (req, res) => {
    try {
      const activityId = normalizeText(
        req.body.activityId ||
          req.body.activity_id
      );

      const files = req.files || [];

      if (!activityId) {
        return res.status(400).json({
          success: false,
          message: "請先選擇活動",
        });
      }

      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "請至少選擇一個證書檔案",
        });
      }

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
          message: "找不到指定的活動",
        });
      }

      const {
        data: participants,
        error: participantsError,
      } = await supabase
        .from("participants")
        .select(
          "id, name, photo_key, original_filename"
        )
        .eq("activity_id", activityId);

      if (participantsError) {
        throw participantsError;
      }

      if (!participants?.length) {
        return res.status(400).json({
          success: false,
          message:
            "此活動尚未匯入名單，請先上傳 Excel",
        });
      }

      const participantsByName = new Map();

      for (const participant of participants) {
        const normalizedName =
          normalizeText(participant.name);

        if (
          !participantsByName.has(
            normalizedName
          )
        ) {
          participantsByName.set(
            normalizedName,
            []
          );
        }

        participantsByName
          .get(normalizedName)
          .push(participant);
      }

      const uploaded = [];
      const unmatched = [];
      const ambiguous = [];
      const failed = [];

      for (const file of files) {
        const originalFilename =
          decodeFilename(file.originalname);

        const participantName =
          getCertificateName(
            originalFilename
          );

        if (!participantName) {
          unmatched.push({
            filename: originalFilename,
            reason:
              "檔名格式不符，應為「姓名_參加證明.png」",
          });

          continue;
        }

        const matchedParticipants =
          participantsByName.get(
            participantName
          ) || [];

        if (
          matchedParticipants.length === 0
        ) {
          unmatched.push({
            filename: originalFilename,
            name: participantName,
            reason:
              "活動名單中找不到此姓名",
          });

          continue;
        }

        if (
          matchedParticipants.length > 1
        ) {
          ambiguous.push({
            filename: originalFilename,
            name: participantName,
            reason:
              "活動名單中有多筆相同姓名，無法自動配對",
          });

          continue;
        }

        const participant =
          matchedParticipants[0];

        const extension =
          getStorageExtension(
            originalFilename
          );

        const storagePath =
          `${activityId}/${participant.id}` +
          `.${extension}`;

        try {
          const { error: uploadError } =
            await supabase.storage
              .from(CERTIFICATE_BUCKET)
              .upload(
                storagePath,
                file.buffer,
                {
                  contentType:
                    file.mimetype ||
                    getContentType(extension),
                  cacheControl: "3600",
                  upsert: true,
                }
              );

          if (uploadError) {
            throw uploadError;
          }

          const { error: updateError } =
            await supabase
              .from("participants")
              .update({
                photo_key: storagePath,
                original_filename:
                  originalFilename,
                updated_at:
                  new Date().toISOString(),
              })
              .eq("id", participant.id)
              .eq(
                "activity_id",
                activityId
              );

          if (updateError) {
            await supabase.storage
              .from(CERTIFICATE_BUCKET)
              .remove([storagePath]);

            throw updateError;
          }

          // 若舊檔案副檔名不同，移除舊檔案
          if (
            participant.photo_key &&
            participant.photo_key !==
              storagePath
          ) {
            await supabase.storage
              .from(CERTIFICATE_BUCKET)
              .remove([
                participant.photo_key,
              ]);
          }

          uploaded.push({
            participantId:
              participant.id,
            name: participantName,
            filename: originalFilename,
            storagePath,
          });
        } catch (fileError) {
          console.error(
            `上傳證書失敗：${originalFilename}`,
            fileError
          );

          failed.push({
            filename: originalFilename,
            name: participantName,
            reason:
              fileError.message ||
              "證書上傳失敗",
          });
        }
      }

      const allUploaded =
        uploaded.length === files.length;

      return res.status(
        allUploaded ? 200 : 207
      ).json({
        success: allUploaded,
        message: allUploaded
          ? "全部證書上傳成功"
          : "證書處理完成，但部分檔案未成功配對或上傳",
        activity,
        summary: {
          selected: files.length,
          uploaded: uploaded.length,
          unmatched: unmatched.length,
          ambiguous: ambiguous.length,
          failed: failed.length,
        },
        uploaded,
        unmatched,
        ambiguous,
        failed,
      });
    } catch (error) {
      console.error(
        "批次上傳證書失敗：",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "批次上傳證書失敗",
        error: error.message,
      });
    }
  }
);

// Multer 與檔案上傳錯誤處理
router.use((error, req, res, next) => {
  console.error("上傳錯誤：", error);

  if (
    error instanceof multer.MulterError
  ) {
    if (
      error.code === "LIMIT_FILE_SIZE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "單一檔案不可超過 10 MB",
      });
    }

    if (
      error.code === "LIMIT_FILE_COUNT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          `一次最多上傳 ${MAX_CERTIFICATE_COUNT} 個檔案`,
      });
    }

    if (
      error.code === "LIMIT_UNEXPECTED_FILE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "檔案欄位格式不正確",
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