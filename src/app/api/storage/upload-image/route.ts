import { v4 as uuidv4 } from 'uuid';

import { respData, respErr } from '@/shared/lib/resp';
import { getStorageService } from '@/shared/services/storage';
import { getUserInfo } from '@/shared/models/user';

// 允许的扩展名
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

// 最大文件大小 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Magic bytes 签名检查
function validateMagicBytes(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return true;
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return true;
  }

  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return true;
  }

  // WEBP: 52 49 46 46 ... 57 45 42 50
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }

  return false;
}

export async function POST(req: Request) {
  try {
    // 校验登录态
    const user = await getUserInfo();
    if (!user || !user.email) {
      return respErr('Please sign in to upload images');
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return respErr('No files provided');
    }

    if (files.length > 10) {
      return respErr('Too many files (max 10)');
    }

    const uploadResults = [];

    for (const file of files) {
      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        return respErr(`File ${file.name} exceeds 10MB limit`);
      }

      // 验证 MIME 类型
      if (!file.type.startsWith('image/')) {
        return respErr(`File ${file.name} is not an image`);
      }

      // 验证扩展名
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        return respErr(`File extension .${ext} is not allowed`);
      }

      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer();

      // 验证 magic bytes
      if (!validateMagicBytes(arrayBuffer)) {
        return respErr(`File ${file.name} has invalid format`);
      }

      const buffer = Buffer.from(arrayBuffer);

      // 生成唯一 key
      const key = `uploads/${Date.now()}-${uuidv4()}.${ext}`;

      const storageService = await getStorageService();

      // 上传到存储
      const result = await storageService.uploadFile({
        body: buffer,
        key: key,
        contentType: file.type,
        disposition: 'inline',
      });

      if (!result.success) {
        console.error('Upload failed:', result.error);
        return respErr('Upload failed');
      }

      uploadResults.push({
        url: result.url,
        key: result.key,
        filename: file.name,
      });
    }

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e) {
    console.error('upload image failed:', e);
    return respErr('Upload failed');
  }
}
