// ===================================================
// 硬件相机与图像数据处理辅助模块 (Camera & Media Helper)
// ===================================================

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 调用硬件摄像头拍照，并带 3 次自动重试与超时保护
 * @param {object} wx - AIUI wx 上下文
 * @returns {Promise<string>} Base64 DataURL 格式图片
 */
export async function captureCameraPhoto(wx) {
  const media = wx && wx.media;
  const camera = media && media.createCameraContext();
  if (!camera) {
    throw new Error('无法访问摄像头，请检查设备权限');
  }

  let photo = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      photo = await withTimeout(camera.takePhoto({ quality: 'high' }), 10000, '拍摄超时');
      break;
    } catch (e) {
      if (attempt < 2) {
        await sleep(700);
      } else {
        throw new Error('拍摄失败，请重试');
      }
    }
  }

  try {
    const mime = (photo && photo.mimeType) || 'image/jpeg';
    let rawData = photo.data;
    let buffer = rawData;
    if (rawData && rawData.buffer instanceof ArrayBuffer) {
      if (rawData.byteOffset !== 0 || rawData.byteLength !== rawData.buffer.byteLength) {
        buffer = rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength);
      } else {
        buffer = rawData.buffer;
      }
    }
    const base64 = wx.arrayBufferToBase64(buffer);
    return 'data:' + mime + ';base64,' + base64;
  } catch (e) {
    throw new Error('拍摄数据处理失败，请重试');
  }
}
