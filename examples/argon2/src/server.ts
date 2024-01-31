/// <reference types="vite/client" />

import express from "express";
import { hash } from "@node-rs/argon2";
import { fork } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);

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
  fork(join(__dirname, "./worker.js"));
});

export default app;
