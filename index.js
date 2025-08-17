// index.js
const express = require('express');
const axios = require('axios');
const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const CONVERTED_IMAGES_DIR = path.join(__dirname, 'converted_images');

const imageCache = {};

// Ensure the converted images directory exists
async function ensureDirExists() {
  try {
    await fs.mkdir(CONVERTED_IMAGES_DIR, { recursive: true });
    console.log(`Ensured directory exists: ${CONVERTED_IMAGES_DIR}`);
  } catch (error) {
    console.error('Failed to create directory:', error);
    process.exit(1);
  }
}

app.use(express.json());
app.use('/converted', express.static(CONVERTED_IMAGES_DIR));

app.post('/convert-image', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res
      .status(400)
      .json({ error: 'Image URL is required in the request body.' });
  }

  console.log(`Received request for URL: ${url}`);

  if (imageCache[url]) {
    console.log(`Cache hit for URL: ${url}. Returning cached URL.`);
    return res.status(200).json({ convertedUrl: imageCache[url] });
  }

  let imageBuffer;
  try {
    console.log(`Downloading image from: ${url}`);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    imageBuffer = Buffer.from(response.data);
    console.log(`Image downloaded successfully from: ${url}`);
  } catch (downloadError) {
    console.error(
      `Error downloading image from ${url}:`,
      downloadError.message
    );
    return res
      .status(500)
      .json({ error: `Failed to download image: ${downloadError.message}` });
  }

  try {
    const outputFilename = `${crypto.randomUUID()}.bmp`;
    const outputPath = path.join(CONVERTED_IMAGES_DIR, outputFilename);
    const publicConvertedUrl = `${req.protocol}://${req.get(
      'host'
    )}/converted/${outputFilename}`;

    console.log(`Processing image to 64x64 BMP: ${outputPath}`);
    const image = await Jimp.read(imageBuffer);
    image.resize({ w: 64, h: 64 });
    await image.write(outputPath);
    console.log(`Image converted and saved to: ${outputPath}`);

    imageCache[url] = publicConvertedUrl;

    res.status(200).json({ convertedUrl: publicConvertedUrl });
  } catch (conversionError) {
    console.error(
      `Error processing or saving image for URL ${url}:`,
      conversionError.message
    );
    return res.status(500).json({
      error: `Failed to process or save image: ${conversionError.message}`,
    });
  }
});

ensureDirExists().then(() => {
  app.listen(PORT, () => {
    console.log(`Microservice running on http://localhost:${PORT}`);
  });
});
