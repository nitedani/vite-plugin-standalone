/// <reference types="vite/client" />

import express from "express";
import { hash } from "@node-rs/argon2";
const app = express();
const argon2Opts = {
  memory: 3145728,
  iterations: 2,
  parallelism: 64,
  salt_length: 16,
  key_length: 32,
};
app.get("/", async (req, res) => {
  const hashed = await hash("password", argon2Opts);
  res.send(hashed);
});

export default app;
