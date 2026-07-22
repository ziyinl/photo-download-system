import { useEffect, useState } from "react";

const API_URL = "https://photo-download-system.onrender.com";

const statusLabels = {
  draft: "草稿",
  open: "開放下載",
  closed: "已關閉",
};

function AdminPanel({ onBack }) {
  const [activities, setActivities] = useState([]);
  const [
    isLoadingActivities,
    setIsLoadingActivities,
  ] = useState(false);
  const [activityMessage, setActivityMessage] =
    useState("");

  const [newActivityName, setNewActivityName] =
    useState("");
  const [
    newDownloadDeadline,
    setNewDownloadDeadline,
  ] = useState("");
  const [
    isCreatingActivity,
    setIsCreatingActivity,
  ] = useState(false);

  const [
    selectedActivityId,
    setSelectedActivityId,
  ] = useState("");

  const [excelFile, setExcelFile] =
    useState(null);
  const [excelMessage, setExcelMessage] =
    useState("");
  const [
    isUploadingExcel,
    setIsUploadingExcel,
  ] = useState(false);
const [certificateFiles, setCertificateFiles] =
  useState([]);

const [certificateMessage, setCertificateMessage] =
  useState("");

const [isUploadingCertificates, setIsUploadingCertificates] =
  useState(false);
  const [participants, setParticipants] =
    useState([]);
  const [
    participantActivity,
    setParticipantActivity,
  ] = useState(null);
  const [
    participantMessage,
    setParticipantMessage,
  ] = useState("");
  const [
    isLoadingParticipants,
    setIsLoadingParticipants,
  ] = useState(false);
  const [
    showParticipants,
    setShowParticipants,
  ] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    try {
      setIsLoadingActivities(true);

      const response = await fetch(
        `${API_URL}/api/activities`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "取得活動列表失敗"
        );
      }

      const activityList =
        data.activities || [];

      setActivities(activityList);

      setSelectedActivityId(
        (currentActivityId) => {
          if (
            currentActivityId &&
            !activityList.some(
              (activity) =>
                activity.id === currentActivityId
            )
          ) {
            return "";
          }

          return currentActivityId;
        }
      );
    } catch (error) {
      console.error(
        "取得活動列表失敗：",
        error
      );

      setActivityMessage(
        error.message ||
          "無法連線到 Backend，請確認後端是否已啟動。"
      );
    } finally {
      setIsLoadingActivities(false);
    }
  }

  async function handleCreateActivity(event) {
    event.preventDefault();

    const name = newActivityName.trim();

    if (!name) {
      setActivityMessage("請輸入活動名稱");
      return;
    }

    try {
      setIsCreatingActivity(true);
      setActivityMessage("正在建立活動...");

      const response = await fetch(
        `${API_URL}/api/activities`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            downloadDeadline:
              newDownloadDeadline || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "活動建立失敗"
        );
      }

      setNewActivityName("");
      setNewDownloadDeadline("");
      setSelectedActivityId(
        data.activity.id
      );

      setActivityMessage(
        `活動「${data.activity.name}」建立成功。`
      );

      await loadActivities();
    } catch (error) {
      console.error("建立活動失敗：", error);

      setActivityMessage(
        error.message || "活動建立失敗"
      );
    } finally {
      setIsCreatingActivity(false);
    }
  }

  async function handleStatusChange(
    activityId,
    status
  ) {
    try {
      setActivityMessage(
        "正在更新活動狀態..."
      );

      const response = await fetch(
        `${API_URL}/api/activities/${activityId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "活動狀態更新失敗"
        );
      }

      setActivityMessage(
        "活動狀態更新成功。"
      );

      await loadActivities();
    } catch (error) {
      console.error(
        "更新活動狀態失敗：",
        error
      );

      setActivityMessage(
        error.message ||
          "活動狀態更新失敗"
      );
    }
  }

  async function handleDeleteActivity(
    activity
  ) {
    const confirmed = window.confirm(
      `確定要刪除「${activity.name}」嗎？\n\n這會一併刪除該活動的所有名單資料。`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActivityMessage("正在刪除活動...");

      const response = await fetch(
        `${API_URL}/api/activities/${activity.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "刪除活動失敗"
        );
      }

      if (
        selectedActivityId === activity.id
      ) {
        setSelectedActivityId("");
        setExcelFile(null);
        setExcelMessage("");
      }

      if (
        participantActivity?.id ===
        activity.id
      ) {
        closeParticipantList();
      }

      setActivityMessage(
        `活動「${activity.name}」已刪除。`
      );

      await loadActivities();
    } catch (error) {
      console.error("刪除活動失敗：", error);

      setActivityMessage(
        error.message || "刪除活動失敗"
      );
    }
  }

  async function handleViewParticipants(
    activity
  ) {
    if (!activity?.id) {
      setParticipantMessage(
        "無法取得活動資料"
      );
      return;
    }

    try {
      setIsLoadingParticipants(true);
      setShowParticipants(true);
      setParticipantActivity(activity);
      setParticipantMessage(
        "正在讀取活動名單..."
      );
      setParticipants([]);

      const response = await fetch(
        `${API_URL}/api/activities/${activity.id}/participants`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "取得活動名單失敗"
        );
      }

      setParticipantActivity(
        data.activity
      );
      setParticipants(
        data.participants || []
      );

      setParticipantMessage(
        `共讀取 ${data.total || 0} 筆名單。`
      );
    } catch (error) {
      console.error(
        "取得活動名單失敗：",
        error
      );

      setParticipants([]);

      setParticipantMessage(
        error.message ||
          "取得活動名單失敗"
      );
    } finally {
      setIsLoadingParticipants(false);
    }
  }

  function closeParticipantList() {
    setShowParticipants(false);
    setParticipants([]);
    setParticipantActivity(null);
    setParticipantMessage("");
  }

  async function handleExcelUpload() {
    if (!selectedActivityId) {
      setExcelMessage("請先選擇一個活動");
      return;
    }

    if (!excelFile) {
      setExcelMessage("請先選擇 Excel 檔案");
      return;
    }

    const currentActivity = activities.find(
      (activity) => activity.id === selectedActivityId
    );

    const formData = new FormData();
    formData.append("excel", excelFile);
    formData.append("activityId", selectedActivityId);

    try {
      setIsUploadingExcel(true);
      setExcelMessage("正在上傳並匯入 Excel 名單...");

      const response = await fetch(
        `${API_URL}/api/upload/excel`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Excel 上傳失敗");
      }

      if (!data.imported) {
        throw new Error(
          data.message || "Excel 已讀取，但尚未匯入資料庫"
        );
      }

      setExcelMessage(`匯入成功，共寫入 ${data.total} 筆名單。`);

      if (
        showParticipants &&
        participantActivity?.id === selectedActivityId &&
        currentActivity
      ) {
        await handleViewParticipants(currentActivity);
      }

      setExcelFile(null);

      const fileInput = document.getElementById(
        "activity-excel-input"
      );

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Excel 匯入失敗：", error);
      setExcelMessage(error.message || "Excel 上傳失敗");
    } finally {
      setIsUploadingExcel(false);
    }
  }

  async function handleCertificateUpload() {
    if (!selectedActivityId) {
      setCertificateMessage("請先選擇活動");
      return;
    }

    if (certificateFiles.length === 0) {
      setCertificateMessage("請先選擇證書");
      return;
    }

    const formData = new FormData();
    formData.append("activityId", selectedActivityId);

    certificateFiles.forEach((file) => {
      formData.append("certificates", file);
    });

    try {
      setIsUploadingCertificates(true);
      setCertificateMessage("正在上傳證書...");

      const response = await fetch(
        `${API_URL}/api/upload/certificates`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok && response.status !== 207) {
        throw new Error(data.message || "證書上傳失敗");
      }

      const summary = data.summary || {};

      setCertificateMessage(
        `完成！\n成功 ${summary.uploaded || 0} 張，\n未配對 ${summary.unmatched || 0} 張，\n重複姓名 ${summary.ambiguous || 0} 張，\n失敗 ${summary.failed || 0} 張。`
      );

      if (
        showParticipants &&
        participantActivity?.id === selectedActivityId
      ) {
        await handleViewParticipants(participantActivity);
      }

      setCertificateFiles([]);

      const input = document.getElementById("certificate-input");
      if (input) {
        input.value = "";
      }
    } catch (error) {
      console.error("證書上傳失敗：", error);
      setCertificateMessage(error.message || "證書上傳失敗");
    } finally {
      setIsUploadingCertificates(false);
    }
  }

  function formatDate(dateValue) {
    if (!dateValue) {
      return "未設定";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const selectedActivity =
    activities.find(
      (activity) =>
        activity.id ===
        selectedActivityId
    );

  const sectionStyle = {
    marginTop: "24px",
    padding: "24px",
    border: "1px solid #dddddd",
    borderRadius: "14px",
    textAlign: "left",
    background: "#ffffff",
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #cccccc",
    borderRadius: "8px",
    fontSize: "16px",
  };

  const buttonStyle = {
    padding: "10px 16px",
    border: "1px solid #bbbbbb",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
  };

  const tableHeaderStyle = {
    padding: "12px",
    borderBottom:
      "1px solid #dddddd",
    whiteSpace: "nowrap",
  };

  const tableCellStyle = {
    padding: "12px",
    borderBottom:
      "1px solid #eeeeee",
    verticalAlign: "middle",
  };

  return (
    <main
      style={{
        width: "min(900px, 92%)",
        margin: "40px auto",
        paddingBottom: "50px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: "30px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "32px",
          }}
        >
          活動管理後台
        </h1>

        <p
          style={{
            marginTop: "12px",
            color: "#666666",
            fontSize: "16px",
            lineHeight: "1.8",
          }}
        >
          建立活動、匯入參與者名單並管理下載狀態。
        </p>
      </div>

      <section style={sectionStyle}>
        <h2
          style={{
            marginTop: 0,
            fontSize: "22px",
          }}
        >
          建立新活動
        </h2>

        <form
          onSubmit={handleCreateActivity}
        >
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            活動名稱
          </label>

          <input
            type="text"
            value={newActivityName}
            onChange={(event) =>
              setNewActivityName(
                event.target.value
              )
            }
            placeholder="例如：2026 國際聯合數學競賽"
            disabled={isCreatingActivity}
            style={inputStyle}
          />

          <label
            style={{
              display: "block",
              marginTop: "18px",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            下載截止時間（可不填）
          </label>

          <input
            type="datetime-local"
            value={newDownloadDeadline}
            onChange={(event) =>
              setNewDownloadDeadline(
                event.target.value
              )
            }
            disabled={isCreatingActivity}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={isCreatingActivity}
            style={{
              ...buttonStyle,
              marginTop: "18px",
            }}
          >
            {isCreatingActivity
              ? "建立中..."
              : "建立活動"}
          </button>
        </form>
      </section>

      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
            }}
          >
            活動列表
          </h2>

          <button
            type="button"
            onClick={loadActivities}
            disabled={
              isLoadingActivities
            }
            style={buttonStyle}
          >
            {isLoadingActivities
              ? "讀取中..."
              : "重新整理"}
          </button>
        </div>

        {activityMessage && (
          <p
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "8px",
              background: "#f5f5f5",
              lineHeight: "1.6",
            }}
          >
            {activityMessage}
          </p>
        )}

        {!isLoadingActivities &&
          activities.length === 0 && (
            <p
              style={{
                marginTop: "20px",
                color: "#666666",
              }}
            >
              目前尚未建立任何活動。
            </p>
          )}

        <div
          style={{
            display: "grid",
            gap: "16px",
            marginTop: "20px",
          }}
        >
          {activities.map(
            (activity) => {
              const isSelected =
                activity.id ===
                selectedActivityId;

              return (
                <article
                  key={activity.id}
                  style={{
                    padding: "20px",
                    border: isSelected
                      ? "2px solid #555555"
                      : "1px solid #dddddd",
                    borderRadius: "12px",
                    background: isSelected
                      ? "#fafafa"
                      : "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "20px",
                        }}
                      >
                        {activity.name}
                      </h3>

                      <p
                        style={{
                          margin:
                            "10px 0 0",
                          color: "#666666",
                          lineHeight: "1.7",
                        }}
                      >
                        狀態：
                        {statusLabels[
                          activity.status
                        ] ||
                          activity.status}
                        <br />
                        下載期限：
                        {formatDate(
                          activity.download_deadline
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedActivityId(
                          activity.id
                        );
                        setExcelMessage("");
                      }}
                      style={buttonStyle}
                    >
                      {isSelected
                        ? "已選擇"
                        : "選擇活動"}
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginTop: "18px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleViewParticipants(
                          activity
                        )
                      }
                      disabled={
                        isLoadingParticipants
                      }
                      style={buttonStyle}
                    >
                      查看名單
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          activity.id,
                          "draft"
                        )
                      }
                      disabled={
                        activity.status ===
                        "draft"
                      }
                      style={buttonStyle}
                    >
                      設為草稿
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          activity.id,
                          "open"
                        )
                      }
                      disabled={
                        activity.status ===
                        "open"
                      }
                      style={buttonStyle}
                    >
                      開放下載
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          activity.id,
                          "closed"
                        )
                      }
                      disabled={
                        activity.status ===
                        "closed"
                      }
                      style={buttonStyle}
                    >
                      關閉下載
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteActivity(
                          activity
                        )
                      }
                      style={{
                        ...buttonStyle,
                        marginLeft: "auto",
                      }}
                    >
                      刪除活動
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2
          style={{
            marginTop: 0,
            fontSize: "22px",
          }}
        >
          匯入活動名單
        </h2>

        {!selectedActivity ? (
          <p
            style={{
              color: "#666666",
              lineHeight: "1.8",
            }}
          >
            請先在活動列表中選擇一個活動。
          </p>
        ) : (
          <>
            <p
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "#f5f5f5",
                lineHeight: "1.7",
              }}
            >
              目前選擇：
              <strong>
                {selectedActivity.name}
              </strong>
            </p>

            <p
              style={{
                color: "#666666",
                lineHeight: "1.8",
              }}
            >
              Excel 必須包含「姓名」與「ID」欄位。
              重複上傳會以新名單取代此活動原有名單。
            </p>

            <input
              id="activity-excel-input"
              type="file"
              accept=".xlsx,.xls"
              disabled={isUploadingExcel}
              onChange={(event) => {
                const selectedFile =
                  event.target.files?.[0] ||
                  null;

                setExcelFile(
                  selectedFile
                );
                setExcelMessage("");
              }}
            />

            {excelFile && (
              <p
                style={{
                  marginTop: "12px",
                }}
              >
                已選擇：
                {excelFile.name}
              </p>
            )}

            <button
              type="button"
              onClick={handleExcelUpload}
              disabled={
                !excelFile ||
                !selectedActivityId ||
                isUploadingExcel
              }
              style={{
                ...buttonStyle,
                display: "block",
                marginTop: "16px",
              }}
            >
              {isUploadingExcel
                ? "匯入中..."
                : "上傳並匯入名單"}
            </button>
<hr style={{ margin: "30px 0" }} />

<h3>上傳證書</h3>

<input
  id="certificate-input"
  type="file"
  multiple
  accept=".png,.jpg,.jpeg,.pdf"
  onChange={(e) => {
    setCertificateFiles(
      Array.from(e.target.files || [])
    );
  }}
/>

<div style={{ marginTop: 10 }}>
  已選擇 {certificateFiles.length} 個檔案
</div>

<button
  onClick={handleCertificateUpload}
  disabled={isUploadingCertificates}
  style={{
    marginTop: 10,
  }}
>
  {isUploadingCertificates
    ? "上傳中..."
    : "開始上傳證書"}
</button>

{certificateMessage && (
  <div
    style={{
      marginTop: 10,
      whiteSpace: "pre-line",
    }}
  >
    {certificateMessage}
  </div>
)}
            {excelMessage && (
              <p
                style={{
                  marginTop: "14px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#f5f5f5",
                  lineHeight: "1.7",
                }}
              >
                {excelMessage}
              </p>
            )}
          </>
        )}
      </section>

      {showParticipants && (
        <section style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                }}
              >
                活動名單
              </h2>

              {participantActivity && (
                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#666666",
                    lineHeight: "1.7",
                  }}
                >
                  {
                    participantActivity.name
                  }
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={closeParticipantList}
              style={buttonStyle}
            >
              關閉名單
            </button>
          </div>

          {participantMessage && (
            <p
              style={{
                marginTop: "16px",
                padding: "12px",
                borderRadius: "8px",
                background: "#f5f5f5",
                lineHeight: "1.7",
              }}
            >
              {participantMessage}
            </p>
          )}

          {isLoadingParticipants && (
            <p
              style={{
                marginTop: "18px",
                color: "#666666",
              }}
            >
              名單讀取中，請稍候……
            </p>
          )}

          {!isLoadingParticipants &&
            participants.length === 0 && (
              <p
                style={{
                  marginTop: "18px",
                  color: "#666666",
                }}
              >
                此活動目前沒有名單資料。
              </p>
            )}

          {!isLoadingParticipants &&
            participants.length > 0 && (
              <div
                style={{
                  marginTop: "18px",
                  overflowX: "auto",
                  border:
                    "1px solid #dddddd",
                  borderRadius: "10px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    minWidth: "650px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background:
                          "#f5f5f5",
                        textAlign: "left",
                      }}
                    >
                      <th
                        style={{
                          ...tableHeaderStyle,
                          width: "70px",
                        }}
                      >
                        編號
                      </th>

                      <th
                        style={
                          tableHeaderStyle
                        }
                      >
                        姓名
                      </th>

                      <th
                        style={
                          tableHeaderStyle
                        }
                      >
                        ID
                      </th>

                      <th
                        style={
                          tableHeaderStyle
                        }
                      >
                        證書狀態
                      </th>

                      <th
                        style={
                          tableHeaderStyle
                        }
                      >
                        原始檔名
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {participants.map(
                      (
                        participant,
                        index
                      ) => (
                        <tr
                          key={
                            participant.id
                          }
                        >
                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {index + 1}
                          </td>

                          <td
                            style={{
                              ...tableCellStyle,
                              fontWeight:
                                "bold",
                            }}
                          >
                            {
                              participant.name
                            }
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {
                              participant.verification_code
                            }
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {participant.photo_key
                              ? "已上傳"
                              : "尚未上傳"}
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {participant.original_filename ||
                              "—"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      )}

      <div
        style={{
          marginTop: "30px",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={
            isCreatingActivity ||
            isUploadingExcel
          }
          style={buttonStyle}
        >
          返回下載頁
        </button>
      </div>
    </main>
  );
}

export default AdminPanel;