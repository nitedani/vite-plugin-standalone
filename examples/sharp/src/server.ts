/// <reference types="vite/client" />

import express from "express";
import sharp from "sharp";
const app = express();

app.get("/", async (req, res) => {
  const imageData = await sharp({
    create: {
      width: 300,
      height: 200,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .raw()
    .toBuffer();

  res.send(imageData);
});

export default app;
