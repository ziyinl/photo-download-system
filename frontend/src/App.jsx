import { useState } from "react";
import "./App.css";
import AdminPanel from "./AdminPanel";
import Login from "./Login";
const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://photo-download-system.onrender.com";

function App() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [message, setMessage] = useState("");
  const [canDownload, setCanDownload] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const [captchaA] = useState(
    () => Math.floor(Math.random() * 9) + 1
  );

  const [captchaB] = useState(
    () => Math.floor(Math.random() * 9) + 1
  );

  async function handleSearch() {
    const trimmedName = name.trim();
    const trimmedId = id.trim();

    setMessage("");
    setCanDownload(false);

    if (!trimmedName || !trimmedId) {
      setMessage("請完整輸入姓名與 ID");
      return;
    }

    if (Number(captchaAnswer) !== captchaA + captchaB) {
      setMessage("驗證碼錯誤");
      return;
    }

    try {
      setIsSearching(true);

      const response = await fetch(
        `${API_URL}/api/search?name=${encodeURIComponent(
  trimmedName
)}&id=${encodeURIComponent(trimmedId)}`
      );

      const data = await response.json();

      setMessage(data.message || "查詢完成");

      if (data.success) {
        setCanDownload(true);
      }
    } catch (error) {
      console.error("查詢失敗：", error);
      setMessage("無法連線到 Backend");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleDownload() {
    const trimmedName = name.trim();
    const trimmedId = id.trim();

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
            name: trimmedName,
            id: trimmedId,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();

        setMessage(
          data.message || "下載失敗，請稍後再試。"
        );

        setCanDownload(false);
        return;
      }

      const certificateBlob = await response.blob();
      const temporaryUrl =
        URL.createObjectURL(certificateBlob);

      const contentDisposition = response.headers.get(
        "Content-Disposition"
      );

      let fileName = `${trimmedName}-證書`;

      if (contentDisposition) {
        const utf8Match = contentDisposition.match(
          /filename\*=UTF-8''([^;]+)/
        );

        const normalMatch = contentDisposition.match(
          /filename="?([^"]+)"?/
        );

        if (utf8Match) {
          fileName = decodeURIComponent(utf8Match[1]);
        } else if (normalMatch) {
          fileName = normalMatch[1];
        }
      }

      const link = document.createElement("a");

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
        "下載失敗，請確認 Backend 是否正常啟動。"
      );
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
        onBack={() => setShowAdmin(false)}
      />
    );
  }

  return (
    <main
       style={{
      textAlign: "center",
      marginTop: "70px",
      padding: "0 20px 50px",
      position: "relative",
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
      color: "#777",
      cursor: "pointer",
      fontSize: "13px",
    }}
  >
    管理員登入
  </button>
</div>
      <h1>
        iPAS 初級AI應用規劃師
        重點培訓班證書下載
      </h1>

      <p>請輸入姓名</p>

      <input
        type="text"
        value={name}
        placeholder="例如：王小明"
        onChange={(event) => {
          setName(event.target.value);
          setCanDownload(false);
          setMessage("");
        }}
        style={{
          width: "280px",
          padding: "12px",
          fontSize: "16px",
          boxSizing: "border-box",
        }}
      />

      <p style={{ marginTop: "20px" }}>
        請輸入 ID
      </p>

      <input
        type="text"
        value={id}
        placeholder="員工編號、學號或 Email"
        onChange={(event) => {
          setId(event.target.value);
          setCanDownload(false);
          setMessage("");
        }}
        style={{
          width: "280px",
          padding: "12px",
          fontSize: "16px",
          boxSizing: "border-box",
        }}
      />

      <div
        style={{
          marginTop: "12px",
          fontSize: "14px",
          lineHeight: "1.8",
          color: "#666",
        }}
      >
        <div>
          校內教職員：請輸入員工編號
        </div>

        <div>
          學生：請輸入學號
        </div>

        <div>
          校外人士：請輸入報名時填寫的電子郵件（Email）
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
        onChange={(event) => {
          setCaptchaAnswer(event.target.value);
          setCanDownload(false);
          setMessage("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleSearch();
          }
        }}
        style={{
          width: "160px",
          padding: "12px",
          fontSize: "18px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      />

  

      {message && (
        <p style={{ marginTop: "24px" }}>
          {message}
        </p>
      )}

      {canDownload && (
        <div style={{ marginTop: "16px" }}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading
              ? "下載中..."
              : "下載證書"}
          </button>
        </div>
      )}

    </main>
  );
}

export default App;