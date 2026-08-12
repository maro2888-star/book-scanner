"use strict";

/*
 * スマホde選書
 * バーコード読み取り実証版1
 *
 * 目的：
 * ・スマートフォンのカメラを起動する
 * ・EAN-13を読み取る
 * ・978 / 979 で始まるISBNだけを受け付ける
 * ・読み取ったISBNを画面に表示する
 *
 * OpenBDやスプレッドシートにはまだ接続しない。
 */

const readerElementId = "reader";

let scanner = null;
let isProcessing = false;

const resultElement = document.getElementById("result");
const messageElement = document.getElementById("message");
const restartButton = document.getElementById("restartButton");


function setMessage(text, className = "") {
  messageElement.textContent = text;
  messageElement.className = className;
}


function isBookIsbn(code) {

  const value = String(code).replace(/\D/g, "");

  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  return value.startsWith("978") || value.startsWith("979");
}


async function stopScanner() {

  if (!scanner) {
    return;
  }

  try {
    await scanner.stop();
  } catch (error) {
    console.warn("カメラ停止時のエラー:", error);
  }

  try {
    scanner.clear();
  } catch (error) {
    console.warn("reader clear時のエラー:", error);
  }

  scanner = null;
}


async function onScanSuccess(decodedText) {

  if (isProcessing) {
    return;
  }

  const code = String(decodedText).replace(/\D/g, "");

  console.log("読み取ったコード:", code);

  if (!isBookIsbn(code)) {

    setMessage(
      "ISBN（978または979で始まる13桁）ではありません。",
      "error"
    );

    return;
  }

  isProcessing = true;

  resultElement.textContent = code;

  setMessage(
    "読み取り成功",
    "success"
  );

  await stopScanner();
}


function onScanFailure(error) {
  // 読み取り途中のエラーは画面に表示しません。
}


async function startScanner() {

  await stopScanner();

  isProcessing = false;

  resultElement.textContent = "まだありません";

  setMessage(
    "カメラを起動しています…"
  );

  scanner = new Html5Qrcode(readerElementId);

  const config = {

    fps: 10,

    qrbox: function(viewfinderWidth, viewfinderHeight) {

      const width = Math.floor(viewfinderWidth * 0.85);

      const height = Math.min(
        180,
        Math.floor(viewfinderHeight * 0.35)
      );

      return {
        width: width,
        height: height
      };
    },

    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13
    ],

    rememberLastUsedCamera: true,

    showTorchButtonIfSupported: true,

    showZoomSliderIfSupported: true
  };


  try {

    await scanner.start(

      {
        facingMode: "environment"
      },

      config,

      onScanSuccess,

      onScanFailure

    );

    setMessage(
      "本のバーコードをかざしてください。"
    );

  } catch (error) {

    console.error("カメラ起動エラー:", error);

    setMessage(
      "カメラを起動できませんでした。ブラウザのカメラ使用許可を確認してください。",
      "error"
    );
  }
}


restartButton.addEventListener(
  "click",
  async function() {
    await startScanner();
  }
);


window.addEventListener(
  "load",
  function() {
    startScanner();
  }
);
