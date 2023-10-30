import { RequestHandler } from "express";
import viteDevServer from "vavite/vite-dev-server";
import nav from "./nav";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const homeRoute: RequestHandler = async (req, res, next) => {
  const users = await prisma.user.findMany();

  console.log(users);

  let html = "<h1>Hello from home page</h1>" + nav;

  if (viteDevServer) {
    html = await viteDevServer.transformIndexHtml(req.url, html);
  }

  res.send(html);
};

export default homeRoute;
