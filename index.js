const express = require('express');
const multer = require('multer');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
  res.send('API de conversão de vídeo funcionando! 🎉');
});

app.post('/convert', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum vídeo enviado.' });
  }

  const device = req.query.device || 'android';

  const inputPath = path.join(os.tmpdir(), `input_${Date.now()}.webm`);
  const outputPath = path.join(os.tmpdir(), `output_${Date.now()}.mp4`);

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ]);

      if (device === 'ios') {
        cmd = cmd.outputOptions([
          '-profile:v baseline',
          '-level 3.0'
        ]);
      }

      cmd
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    const mp4Buffer = fs.readFileSync(outputPath);

    res.set({
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'attachment; filename="video.mp4"',
      'Content-Length': mp4Buffer.length
    });

    res.send(mp4Buffer);

  } catch (err) {
    console.error('Erro na conversão:', err);
    res.status(500).json({ error: 'Erro ao converter o vídeo.' });
  } finally {
    try { fs.unlinkSync(inputPath); } catch (e) {}
    try { fs.unlinkSync(outputPath); } catch (e) {}
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
