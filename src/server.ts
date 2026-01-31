import express, { Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { recognizeLicensePlate } from './index';
import * as cv from '@u4/opencv4nodejs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, bmp) are allowed!'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.get('/api/status', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'License Plate Recognition API is running' });
});

app.post('/api/recognize', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imagePath = req.file.path;
    console.log(`Processing image: ${imagePath}`);

    const [plateImage, recognizedText] = await recognizeLicensePlate(imagePath);

    let result: any = {
      success: plateImage !== null,
      recognizedText: recognizedText,
      originalImage: `/uploads/${req.file.filename}`
    };

    if (plateImage) {
      const currentDate = new Date().toISOString().split('T')[0];
      const outputFolder = path.join(__dirname, '../output', currentDate);
      
      const files = fs.readdirSync(outputFolder);
      const plateFiles = files.filter(f => f.startsWith('plate_')).sort().reverse();
      
      if (plateFiles.length > 0) {
        const latestPlate = plateFiles[0];
        result.plateImage = `/output/${currentDate}/${latestPlate}`;
      }

      const originalFiles = files.filter(f => f.startsWith('original_')).sort().reverse();
      if (originalFiles.length > 0) {
        const latestOriginal = originalFiles[0];
        result.originalImagePath = `/output/${currentDate}/${latestOriginal}`;
      }
    }

    res.json(result);

  } catch (error: any) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      error: 'Failed to process image', 
      message: error.message 
    });
  }
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/output', express.static(path.join(__dirname, '../output')));

app.listen(PORT, () => {
  console.log(`License Plate Recognition Web Interface running on http://localhost:${PORT}`);
});
