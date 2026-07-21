import { useState } from "react";
const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://photo-download-system.onrender.com";

function AdminPanel({ onBack }) {
  const [excelFile, setExcelFile] = useState(null);
  const [excelMessage, setExcelMessage] = useState("");
  const [isUploadingExcel, setIsUploadingExcel] =
    useState(false);

  const [certificateFiles, setCertificateFiles] =
    useState([]);
  const [
    certificateMessage,
    setCertificateMessage,
  ] = useState("");
  const [
    isUploadingCertificates,
    setIsUploadingCertificates,
  ] = useState(false);

  const [checkMessage, setCheckMessage] =
    useState("");
  const [checkResult, setCheckResult] =
    useState(null);
  const [isChecking, setIsChecking] =
    useState(false);

  async function handleExcelUpload() {
    if (!excelFile) {
      setExcelMessage("請先選擇 Excel 檔案");
      return;
    }

    const formData = new FormData();
    formData.append("excel", excelFile);

    try {
      setIsUploadingExcel(true);
      setExcelMessage("正在上傳 Excel...");

      const response = await fetch(
        `${API_URL}/api/upload/excel`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setExcelMessage(
          data.message || "Excel 上傳失敗"
        );
        return;
      }

      setExcelMessage(
        `Excel 上傳成功，共讀取 ${data.total} 筆有效資料。`
      );

      setCheckResult(null);
      setCheckMessage("");
    } catch (error) {
      console.error("Excel 上傳失敗：", error);

      setExcelMessage(
        "無法連線到 Backend，請確認後端是否已啟動。"
      );
    } finally {
      setIsUploadingExcel(false);
    }
  }

  async function handleCertificateUpload() {
    if (certificateFiles.length === 0) {
      setCertificateMessage(
        "請先選擇至少一個證書檔案"
      );
      return;
    }

    const formData = new FormData();

    certificateFiles.forEach((file) => {
      formData.append("certificates", file);
    });

    try {
      setIsUploadingCertificates(true);
      setCertificateMessage(
        "正在上傳證書..."
      );

      const response = await fetch(
        `${API_URL}/api/upload/certificates`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setCertificateMessage(
          data.message || "證書上傳失敗"
        );
        return;
      }

      setCertificateMessage(
        `證書上傳成功，共上傳 ${data.total} 個檔案。`
      );

      setCheckResult(null);
      setCheckMessage("");
    } catch (error) {
      console.error("證書上傳失敗：", error);

      setCertificateMessage(
        "無法連線到 Backend，請確認後端是否已啟動。"
      );
    } finally {
      setIsUploadingCertificates(false);
    }
  }

  async function handleCheck() {
    try {
      setIsChecking(true);
      setCheckMessage("正在檢查名單與證書...");
      setCheckResult(null);

      const response = await fetch(
        `${API_URL}/api/check`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setCheckMessage(
          data.message || "名單檢查失敗"
        );
        return;
      }

      setCheckResult(data);
      setCheckMessage("名單檢查完成");
    } catch (error) {
      console.error("名單檢查失敗：", error);

      setCheckMessage(
        "無法連線到 Backend，請確認後端是否已啟動。"
      );
    } finally {
      setIsChecking(false);
    }
  }

  const sectionStyle = {
    marginTop: "24px",
    padding: "24px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    textAlign: "left",
  };

  const resultBoxStyle = {
    marginTop: "16px",
    padding: "16px",
    border: "1px solid #e5e5e5",
    borderRadius: "10px",
    background: "#fafafa",
  };

  return (
    <main
      style={{
        width: "min(760px, 92%)",
        margin: "50px auto",
        textAlign: "center",
        paddingBottom: "50px",
      }}
    >
      <h1>管理後台</h1>

      <p
        style={{
          marginTop: "12px",
          color: "#666",
          lineHeight: "1.8",
        }}
      >
        管理者可以在這裡上傳名單、上傳證書，
        並檢查名單與證書是否一致。
      </p>

      <section
        style={{
          ...sectionStyle,
          marginTop: "32px",
        }}
      >
        <h2 style={{ fontSize: "22px" }}>
          Excel 名單
        </h2>

        <p
          style={{
            color: "#666",
            lineHeight: "1.8",
          }}
        >
          上傳包含「姓名」與「ID」欄位的 Excel
          檔案。上傳後會自動儲存為「名單.xlsx」。
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => {
            const selectedFile =
              event.target.files?.[0] || null;

            setExcelFile(selectedFile);
            setExcelMessage("");
          }}
        />

        {excelFile && (
          <p style={{ marginTop: "12px" }}>
            已選擇：{excelFile.name}
          </p>
        )}

        <button
          type="button"
          onClick={handleExcelUpload}
          disabled={
            !excelFile || isUploadingExcel
          }
          style={{ marginTop: "14px" }}
        >
          {isUploadingExcel
            ? "上傳中..."
            : "上傳 Excel"}
        </button>

        {excelMessage && (
          <p style={{ marginTop: "14px" }}>
            {excelMessage}
          </p>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "22px" }}>
          證書檔案
        </h2>

        <p
          style={{
            color: "#666",
            lineHeight: "1.8",
          }}
        >
          可一次選擇多個 JPG、JPEG、PNG 或 PDF
          證書檔案。
        </p>

        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          multiple
          onChange={(event) => {
            const selectedFiles = Array.from(
              event.target.files || []
            );

            setCertificateFiles(
              selectedFiles
            );
            setCertificateMessage("");
          }}
        />

        {certificateFiles.length > 0 && (
          <div style={{ marginTop: "14px" }}>
            <p>
              已選擇 {certificateFiles.length} 個檔案
            </p>

            <div
              style={{
                maxHeight: "180px",
                overflowY: "auto",
                padding: "10px",
                border: "1px solid #eee",
                borderRadius: "8px",
                background: "#fafafa",
              }}
            >
              {certificateFiles.map(
                (file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    style={{
                      padding: "4px 0",
                      fontSize: "14px",
                    }}
                  >
                    {index + 1}. {file.name}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleCertificateUpload}
          disabled={
            certificateFiles.length === 0 ||
            isUploadingCertificates
          }
          style={{ marginTop: "14px" }}
        >
          {isUploadingCertificates
            ? "上傳中..."
            : "上傳證書"}
        </button>

        {certificateMessage && (
          <p style={{ marginTop: "14px" }}>
            {certificateMessage}
          </p>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "22px" }}>
          名單檢查
        </h2>

        <p
          style={{
            color: "#666",
            lineHeight: "1.8",
          }}
        >
          比對 Excel 名單與證書資料夾，
          顯示已配對、缺少、多餘及重複資料。
        </p>

        <button
          type="button"
          onClick={handleCheck}
          disabled={
            isChecking ||
            isUploadingExcel ||
            isUploadingCertificates
          }
        >
          {isChecking
            ? "檢查中..."
            : "開始檢查"}
        </button>

        {checkMessage && (
          <p style={{ marginTop: "14px" }}>
            {checkMessage}
          </p>
        )}

        {checkResult && (
          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "12px",
              }}
            >
              <div style={resultBoxStyle}>
                <strong>Excel 人數</strong>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "24px",
                  }}
                >
                  {checkResult.totalPeople}
                </div>
              </div>

              <div style={resultBoxStyle}>
                <strong>證書數量</strong>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "24px",
                  }}
                >
                  {checkResult.totalPhotos}
                </div>
              </div>

              <div style={resultBoxStyle}>
                <strong>已配對</strong>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "24px",
                  }}
                >
                  {checkResult.matchedCount}
                </div>
              </div>

              <div style={resultBoxStyle}>
                <strong>缺少證書</strong>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "24px",
                  }}
                >
                  {checkResult.missingCount}
                </div>
              </div>

              <div style={resultBoxStyle}>
                <strong>多餘檔案</strong>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "24px",
                  }}
                >
                  {checkResult.extraCount}
                </div>
              </div>

              <div style={resultBoxStyle}>
                <strong>重複姓名</strong>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "24px",
                  }}
                >
                  {checkResult.duplicateCount}
                </div>
              </div>
            </div>

            {checkResult.missing.length > 0 && (
              <div style={resultBoxStyle}>
                <h3
                  style={{
                    marginTop: 0,
                    fontSize: "18px",
                  }}
                >
                  缺少證書
                </h3>

                {checkResult.missing.map(
                  (name, index) => (
                    <div
                      key={`${name}-${index}`}
                      style={{ padding: "4px 0" }}
                    >
                      {index + 1}. {name}
                    </div>
                  )
                )}
              </div>
            )}

            {checkResult.extra.length > 0 && (
              <div style={resultBoxStyle}>
                <h3
                  style={{
                    marginTop: 0,
                    fontSize: "18px",
                  }}
                >
                  多餘檔案
                </h3>

                {checkResult.extra.map(
                  (file, index) => (
                    <div
                      key={`${file}-${index}`}
                      style={{ padding: "4px 0" }}
                    >
                      {index + 1}. {file}
                    </div>
                  )
                )}
              </div>
            )}

            {checkResult.duplicateNames.length >
              0 && (
              <div style={resultBoxStyle}>
                <h3
                  style={{
                    marginTop: 0,
                    fontSize: "18px",
                  }}
                >
                  Excel 重複姓名
                </h3>

                {checkResult.duplicateNames.map(
                  (name, index) => (
                    <div
                      key={`${name}-${index}`}
                      style={{ padding: "4px 0" }}
                    >
                      {index + 1}. {name}
                    </div>
                  )
                )}
              </div>
            )}

            {checkResult.missingCount === 0 &&
              checkResult.extraCount === 0 &&
              checkResult.duplicateCount === 0 && (
                <div style={resultBoxStyle}>
                  所有名單與證書皆已正確配對。
                </div>
              )}
          </div>
        )}
      </section>

      <div style={{ marginTop: "30px" }}>
        <button
          type="button"
          onClick={onBack}
          disabled={
            isUploadingExcel ||
            isUploadingCertificates ||
            isChecking
          }
        >
          返回下載頁
        </button>
      </div>
    </main>
  );
}

export default AdminPanel;