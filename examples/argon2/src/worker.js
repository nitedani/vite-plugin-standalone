console.log("hello from child process");
import { hash } from "@node-rs/argon2";
import express from "express";

const argon2Opts = {
  memory: 3145728,
  iterations: 2,
  parallelism: 64,
  salt_length: 16,
  key_length: 32,
};

(async () => {
  const hashed = await hash("password", argon2Opts);
  console.log("worker.js", { hashed });
})();

console.log("worker.js", express);
