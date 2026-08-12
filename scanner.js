"use strict";

/*
 * スマホde選書
 * バーコード読み取り実証版2
 *
 * 実証版1の基本動作を維持しながら、
 * iPhoneでのEAN-13読み取り改善を検証する。
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

  /*
   * EAN-13として読み取ったが、
   * ISBNではなかった場合。
   *
   * 192から始まる2段目などは
   * カメラを止めず、そのまま読み取りを続ける。
   */
  if (!isBookIsbn(code)) {

    if (code.startsWith("192")) {

      setMessage(
        "2段目のバーコードを読み取りました。1段目のバーコードを読み直してください。",
        "error"
      );

    } else {

      setMessage(
        "ISBN（978または979で始まる13桁）ではありません。",
        "error"
      );
    }

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
  // 読み取り途中のエラーは表示しない
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

    /*
     * 実証版1：10fps
     * 実証版2：15fps
     *
     * iPhoneでも解析する画像数を少し増やして検証する。
     */
    fps: 15,


    /*
     * EAN-13は横長の一次元バーコードなので、
     * 読み取り領域を明確な横長にする。
     *
     * 実証版1より高さを抑え、
     * バーコード全体を横方向に収めやすくする。
     */
    qrbox: function(viewfinderWidth, viewfinderHeight) {

      const width = Math.floor(viewfinderWidth * 0.92);

      const height = Math.max(
        100,
        Math.min(
          140,
          Math.floor(viewfinderHeight * 0.25)
        )
      );

      return {
        width: width,
        height: height
      };
    },


    /*
     * 今回の実証ではEAN-13だけを解析する。
     */
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13
    ],


    /*
     * カメラ映像のアスペクト比。
     * 横長バーコードを読み取るため、
     * 極端に縦長の映像にならないようにする。
     */
    aspectRatio: 1.777778,


    /*
     * 端末側で利用できる場合の設定。
     */
    rememberLastUsedCamera: true,

    showTorchButtonIfSupported: true,

    showZoomSliderIfSupported: true
  };


  try {

    /*
     * 背面カメラを優先。
     */
    await scanner.start(

      {
        facingMode: {
          ideal: "environment"
        }
      },

      config,

      onScanSuccess,

      onScanFailure

    );


    setMessage(
      "本のバーコードを横長の枠の中に入れてください。"
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
