import { IUploadProvider } from './upload.interface';
import { mkdirSync, unlink, writeFileSync, readFileSync, unlinkSync } from 'fs';
// @ts-ignore
import mime from 'mime';
import { extname } from 'path';
import axios from 'axios';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';

function isHeic(originalname: string, mimetype?: string): boolean {
  const ext = extname(originalname || '').toLowerCase();
  const mt = (mimetype || '').toLowerCase();
  return ext === '.heic' || ext === '.heif' || mt === 'image/heic' || mt === 'image/heif';
}

// Converts a HEIC/HEIF image buffer to JPEG using the `heif-convert` CLI
// (from libheif-tools). Falls back to returning the original buffer if the
// tool is unavailable or conversion fails, so uploads never hard-fail.
function convertHeicBufferToJpeg(buffer: Buffer): Buffer {
  const dir = tmpdir();
  const rand = Array(16)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  const inPath = `${dir}/${rand}.heic`;
  const outPath = `${dir}/${rand}.jpg`;
  writeFileSync(inPath, buffer);
  try {
    execFileSync('heif-convert', ['-q', '90', inPath, outPath], {
      stdio: 'pipe',
    });
    return readFileSync(outPath);
  } finally {
    try {
      unlinkSync(inPath);
    } catch (e) {
      /* ignore */
    }
    try {
      unlinkSync(outPath);
    } catch (e) {
      /* ignore */
    }
  }
}

export class LocalStorage implements IUploadProvider {
  constructor(private uploadDirectory: string) {}

  async uploadSimple(path: string) {
    const loadImage = await axios.get(path, { responseType: 'arraybuffer' });
    const contentType =
      loadImage?.headers?.['content-type'] ||
      loadImage?.headers?.['Content-Type'];
    let findExtension = mime.getExtension(contentType)!;
    let imageData = loadImage.data;

    if (isHeic(`file.${findExtension || ''}`, contentType)) {
      try {
        imageData = convertHeicBufferToJpeg(Buffer.from(imageData));
        findExtension = 'jpg';
      } catch (err: any) {
        console.error('HEIC conversion failed (uploadSimple):', err.message);
      }
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const innerPath = `/${year}/${month}/${day}`;
    const dir = `${this.uploadDirectory}${innerPath}`;
    mkdirSync(dir, { recursive: true });

    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');

    const filePath = `${dir}/${randomName}.${findExtension}`;
    const publicPath = `${innerPath}/${randomName}.${findExtension}`;
    // Logic to save the file to the filesystem goes here
    writeFileSync(filePath, imageData);

    return process.env.FRONTEND_URL + '/uploads' + publicPath;
  }

  async uploadFile(file: Express.Multer.File): Promise<any> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const innerPath = `/${year}/${month}/${day}`;
      const dir = `${this.uploadDirectory}${innerPath}`;
      mkdirSync(dir, { recursive: true });

      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');

      let buffer = file.buffer;
      let originalname = file.originalname;
      let mimetype = file.mimetype;
      let ext = extname(originalname);

      if (isHeic(originalname, mimetype)) {
        try {
          buffer = convertHeicBufferToJpeg(buffer);
          ext = '.jpg';
          originalname = originalname.replace(/\.(heic|heif)$/i, '.jpg');
          mimetype = 'image/jpeg';
        } catch (err: any) {
          console.error('HEIC conversion failed (uploadFile):', err.message);
        }
      }

      const filePath = `${dir}/${randomName}${ext}`;
      const publicPath = `${innerPath}/${randomName}${ext}`;

      // Logic to save the file to the filesystem goes here
      writeFileSync(filePath, buffer);

      return {
        filename: `${randomName}${ext}`,
        path: process.env.FRONTEND_URL + '/uploads' + publicPath,
        mimetype: mimetype,
        originalname: originalname,
      };
    } catch (err) {
      console.error('Error uploading file to Local Storage:', err);
      throw err;
    }
  }

  async removeFile(filePath: string): Promise<void> {
    // Logic to remove the file from the filesystem goes here
    return new Promise((resolve, reject) => {
      unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
