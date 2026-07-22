import { useEffect, useMemo, useState } from "react";
import "./App.css";
import AdminPanel from "./AdminPanel";
import Login from "./Login";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://photo-download-system.onrender.com";

function App() {
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [message, setMessage] = useState("");
  const [canDownload, setCanDownload] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaA, setCaptchaA] = useState(
    () => Math.floor(Math.random() * 9) + 1
  );
  const [captchaB, setCaptchaB] = useState(
    () => Math.floor(Math.random() * 9) + 1
  );

  const [showAdmin, setShowAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const openActivities = useMemo(
    () =>
      activities.filter(
        (activity) => activity.status === "open"
      ),
    [activities]
  );

  const selectedActivity = useMemo(
    () =>
      openActivities.find(
        (activity) => activity.id === selectedActivityId
      ) || null,
    [openActivities, selectedActivityId]
  );

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    try {
      setIsLoadingActivities(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/activities`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "取得活動列表失敗"
        );
      }

      const activityList = Array.isArray(data.activities)
        ? data.activities
        : [];

      setActivities(activityList);

      const availableActivities = activityList.filter(
        (activity) => activity.status === "open"
      );

      setSelectedActivityId((currentId) => {
        if (
          currentId &&
          availableActivities.some(
            (activity) => activity.id === currentId
          )
        ) {
          return currentId;
        }

        if (availableActivities.length === 1) {
          return availableActivities[0].id;
        }

        return "";
      });
    } catch (error) {
      console.error("取得活動列表失敗：", error);

      setActivities([]);
      setSelectedActivityId("");
      setMessage(
        error.message ||
          "無法連線到 Backend，請稍後再試。"
      );
    } finally {
      setIsLoadingActivities(false);
    }
  }

  function resetSearchResult() {
    setCanDownload(false);
    setMessage("");
  }

  function refreshCaptcha() {
    setCaptchaA(
      Math.floor(Math.random() * 9) + 1
    );
    setCaptchaB(
      Math.floor(Math.random() * 9) + 1
    );
    setCaptchaAnswer("");
  }

  async function handleSearch() {
    const trimmedName = name.trim();
    const trimmedId = id.trim();

    setMessage("");
    setCanDownload(false);

    if (!selectedActivityId) {
      setMessage("請先選擇活動");
      return;
    }

    if (!trimmedName || !trimmedId) {
      setMessage("請完整輸入姓名與 ID");
      return;
    }

    if (
      Number(captchaAnswer) !==
      captchaA + captchaB
    ) {
      setMessage("驗證碼錯誤");
      refreshCaptcha();
      return;
    }

    try {
      setIsSearching(true);
      setMessage("正在查詢...");

      const query = new URLSearchParams({
        activityId: selectedActivityId,
        name: trimmedName,
        id: trimmedId,
      });

      const response = await fetch(
        `${API_URL}/api/search?${query.toString()}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "查詢失敗"
        );
      }

      setMessage(
        data.message || "查詢成功，可以下載證書。"
      );
      setCanDownload(true);
    } catch (error) {
      console.error("查詢失敗：", error);

      setCanDownload(false);
      setMessage(
        error.message ||
          "查詢失敗，請確認輸入資料是否正確。"
      );
      refreshCaptcha();
    } finally {
      setIsSearching(false);
    }
  }

  async function handleDownload() {
    const trimmedName = name.trim();
    const trimmedId = id.trim();

    if (!selectedActivityId) {
      setMessage("請先選擇活動");
      setCanDownload(false);
      return;
    }

    try {
      setIsDownloading(true);
      setMessage("正在準備下載...");

      const response = await fetch(
        `${API_URL}/api/download`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activityId: selectedActivityId,
            name: trimmedName,
            id: trimmedId,
          }),
        }
      );

      if (!response.ok) {
        let errorData = {};

        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }

        throw new Error(
          errorData.error ||
            errorData.message ||
            "下載失敗，請稍後再試。"
        );
      }

      const certificateBlob =
        await response.blob();

      const temporaryUrl =
        URL.createObjectURL(certificateBlob);

      const contentDisposition =
        response.headers.get(
          "Content-Disposition"
        );

      let fileName = `${trimmedName}-證書`;

      if (contentDisposition) {
        const utf8Match =
          contentDisposition.match(
            /filename\*=UTF-8''([^;]+)/
          );

        const normalMatch =
          contentDisposition.match(
            /filename="?([^";]+)"?/
          );

        if (utf8Match) {
          fileName = decodeURIComponent(
            utf8Match[1]
          );
        } else if (normalMatch) {
          fileName = normalMatch[1];
        }
      }

      const link =
        document.createElement("a");

      link.href = temporaryUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(temporaryUrl);

      setMessage("證書下載成功！");
    } catch (error) {
      console.error("下載失敗：", error);

      setMessage(
        error.message ||
          "下載失敗，請稍後再試。"
      );
      setCanDownload(false);
    } finally {
      setIsDownloading(false);
    }
  }

  if (showLogin) {
    return (
      <Login
        onBack={() => setShowLogin(false)}
        onLoginSuccess={() => {
          setIsAdminLoggedIn(true);
          setShowLogin(false);
          setShowAdmin(true);
        }}
      />
    );
  }

  if (showAdmin) {
    return (
      <AdminPanel
        onBack={() => {
          setShowAdmin(false);
          loadActivities();
        }}
      />
    );
  }

  const pageTitle = selectedActivity
    ? `${selectedActivity.name}證書下載`
    : "活動證書下載";

  const inputStyle = {
    width: "280px",
    maxWidth: "100%",
    padding: "12px",
    fontSize: "16px",
    boxSizing: "border-box",
    border: "1px solid #cccccc",
    borderRadius: "8px",
  };

  const buttonStyle = {
    padding: "11px 20px",
    fontSize: "16px",
    cursor: "pointer",
    border: "1px solid #bbbbbb",
    borderRadius: "8px",
  };

  return (
    <main
      style={{
        width: "min(620px, 92%)",
        margin: "70px auto 0",
        padding: "0 20px 50px",
        boxSizing: "border-box",
        position: "relative",
        textAlign: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-45px",
          right: "0",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (isAdminLoggedIn) {
              setShowAdmin(true);
            } else {
              setShowLogin(true);
            }
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#777777",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          管理員登入
        </button>
      </div>

      <h1
        style={{
          marginBottom: "12px",
          fontSize: "32px",
          lineHeight: "1.4",
        }}
      >
        {pageTitle}
      </h1>

      <p
        style={{
          marginBottom: "30px",
          color: "#666666",
          lineHeight: "1.8",
        }}
      >
        請選擇活動，並輸入姓名及身分驗證資料。
      </p>

      <section
        style={{
          padding: "26px",
          border: "1px solid #dddddd",
          borderRadius: "14px",
          background: "#ffffff",
        }}
      >
        <label
          htmlFor="activity-select"
          style={{
            display: "block",
            marginBottom: "10px",
            fontWeight: "bold",
          }}
        >
          選擇活動
        </label>

        <select
          id="activity-select"
          value={selectedActivityId}
          disabled={
            isLoadingActivities ||
            openActivities.length === 0
          }
          onChange={(event) => {
            setSelectedActivityId(
              event.target.value
            );
            resetSearchResult();
          }}
          style={inputStyle}
        >
          <option value="">
            {isLoadingActivities
              ? "活動讀取中..."
              : "請選擇活動"}
          </option>

          {openActivities.map((activity) => (
            <option
              key={activity.id}
              value={activity.id}
            >
              {activity.name}
            </option>
          ))}
        </select>

        {!isLoadingActivities &&
          openActivities.length === 0 && (
            <div
              style={{
                marginTop: "14px",
                padding: "12px",
                borderRadius: "8px",
                background: "#f5f5f5",
                color: "#666666",
                lineHeight: "1.7",
              }}
            >
              目前沒有開放下載的活動。
              請由管理員將活動狀態設定為「開放下載」。
            </div>
          )}

        <p style={{ marginTop: "24px" }}>
          請輸入姓名
        </p>

        <input
          type="text"
          value={name}
          placeholder="例如：王小明"
          disabled={!selectedActivityId}
          onChange={(event) => {
            setName(event.target.value);
            resetSearchResult();
          }}
          style={inputStyle}
        />

        <p style={{ marginTop: "20px" }}>
          請輸入 ID
        </p>

        <input
          type="text"
          value={id}
          placeholder="員工編號、學號或 Email"
          disabled={!selectedActivityId}
          onChange={(event) => {
            setId(event.target.value);
            resetSearchResult();
          }}
          style={inputStyle}
        />

        <div
          style={{
            marginTop: "12px",
            fontSize: "14px",
            lineHeight: "1.8",
            color: "#666666",
          }}
        >
          <div>
            校內教職員：請輸入員工編號
          </div>
          <div>學生：請輸入學號</div>
          <div>
            校外人士：請輸入報名時填寫的電子郵件
          </div>
        </div>

        <p style={{ marginTop: "20px" }}>
          請回答驗證碼
        </p>

        <div
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            marginBottom: "10px",
          }}
        >
          {captchaA} + {captchaB} =
        </div>

        <input
          type="text"
          inputMode="numeric"
          value={captchaAnswer}
          placeholder="請輸入答案"
          disabled={!selectedActivityId}
          onChange={(event) => {
            setCaptchaAnswer(
              event.target.value
            );
            resetSearchResult();
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !isSearching
            ) {
              handleSearch();
            }
          }}
          style={{
            ...inputStyle,
            width: "160px",
            textAlign: "center",
            fontSize: "18px",
          }}
        />

        <div style={{ marginTop: "22px" }}>
          <button
            type="button"
            onClick={handleSearch}
            disabled={
              !selectedActivityId ||
              isSearching ||
              isDownloading
            }
            style={buttonStyle}
          >
            {isSearching
              ? "查詢中..."
              : "查詢證書"}
          </button>
        </div>

        {message && (
          <p
            style={{
              marginTop: "22px",
              padding: "12px",
              borderRadius: "8px",
              background: "#f5f5f5",
              lineHeight: "1.7",
            }}
          >
            {message}
          </p>
        )}

        {canDownload && (
          <div style={{ marginTop: "16px" }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              style={buttonStyle}
            >
              {isDownloading
                ? "下載中..."
                : "下載證書"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;