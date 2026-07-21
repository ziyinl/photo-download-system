const express = require("express");

const router = express.Router();

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "THUmath2026!";

router.post("/", (req, res) => {
  try {
    const username = String(
      req.body.username || ""
    ).trim();

    const password = String(
      req.body.password || ""
    );

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "請輸入管理員帳號與密碼",
      });
    }

    if (
      username === ADMIN_USERNAME &&
      password === ADMIN_PASSWORD
    ) {
      return res.json({
        success: true,
        message: "登入成功",
      });
    }

    return res.status(401).json({
      success: false,
      message: "帳號或密碼錯誤",
    });
  } catch (error) {
    console.error("登入發生錯誤：", error);

    return res.status(500).json({
      success: false,
      message: "登入失敗，請稍後再試",
    });
  }
});

module.exports = router;