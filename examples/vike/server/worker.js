console.log("hello from child process");
import { two } from "./shared.js";
console.log("worker.js", two());
