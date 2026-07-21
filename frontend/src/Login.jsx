import { useState } from "react";
const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://photo-download-system.onrender.com";
function Login({ onLoginSuccess, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setMessage("請輸入管理員帳號與密碼");
      return;
    }

    try {
      setIsLoggingIn(true);
      setMessage("正在登入...");

      const response = await fetch(
        `${API_URL}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.message || "登入失敗");
        return;
      }

      setMessage("");
      onLoginSuccess();
    } catch (error) {
      console.error("登入失敗：", error);

      setMessage(
        "無法連線到 Backend，請確認後端是否已啟動。"
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main
      style={{
        width: "min(420px, 92%)",
        margin: "80px auto",
        textAlign: "center",
      }}
    >
      <section
        style={{
          padding: "30px",
          border: "1px solid #ddd",
          borderRadius: "14px",
          textAlign: "left",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            textAlign: "center",
          }}
        >
          管理員登入
        </h1>

        <p
          style={{
            color: "#666",
            lineHeight: "1.8",
            textAlign: "center",
          }}
        >
          請輸入管理員帳號與密碼。
        </p>

        <form onSubmit={handleLogin}>
          <label
            htmlFor="admin-username"
            style={{
              display: "block",
              marginTop: "22px",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            管理員帳號
          </label>

          <input
            id="admin-username"
            type="text"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            autoComplete="username"
            disabled={isLoggingIn}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              fontSize: "16px",
            }}
          />

          <label
            htmlFor="admin-password"
            style={{
              display: "block",
              marginTop: "18px",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            密碼
          </label>

          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="current-password"
            disabled={isLoggingIn}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              fontSize: "16px",
            }}
          />

          <button
            type="submit"
            disabled={isLoggingIn}
            style={{
              width: "100%",
              marginTop: "24px",
              padding: "12px",
              fontSize: "16px",
            }}
          >
            {isLoggingIn ? "登入中..." : "登入"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: "16px",
              lineHeight: "1.7",
              textAlign: "center",
            }}
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={onBack}
          disabled={isLoggingIn}
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "10px",
          }}
        >
          返回下載頁
        </button>
      </section>
    </main>
  );
}

export default Login;