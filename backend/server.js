const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

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

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});