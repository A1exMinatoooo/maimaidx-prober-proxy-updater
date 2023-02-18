import { delValue, getValue, setValue } from "./db.js";
import {
  getAuthUrl,
  updateMaimaiScore,
  verifyProberAccount,
} from "./crawler.js";

import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import url from "url";

const app = express();
app.use(cors());

const jsonParser = bodyParser.json({ extended: false });

async function serve(serverReq, serverRes, data, redirect) {
  let { username, password, successPageUrl, type } = data
  console.log(username, password, successPageUrl, type)

  if (!username || !password) {
    serverRes.status(400).send("用户名或密码不能为空！");
    return;
  }

  // Update maimai dx by default
  if (!type) {
    type="maimai-dx";
  }

  if (!["maimai-dx", "chunithm"].includes(type)) {
    serverRes.status(400).send("不支持的查分类型！");
    return;
  }

  if (
    username !== "bakapiano666" && // 用于 Android app 的保留用户名；无需检查密码，仅用于生成 auth url
    !(await verifyProberAccount(username, password))
  ) {
    serverRes.status(400).send("查分器用户名或密码错误！");
    return;
  }

  if (successPageUrl === undefined) {
    successPageUrl = "https://maimai.bakapiano.com/#Success"
  }

  const href = await getAuthUrl(type);

  const resultUrl = url.parse(href, true);
  const { redirect_uri } = resultUrl.query;
  const key = url.parse(redirect_uri, true).query.r;
  
  await setValue(key, {username, password, successPageUrl})
  
  setTimeout(() => delValue(key), 1000 * 60 * 5);

  redirect === true ? 
    serverRes.redirect(href) : 
    serverRes.status(200).send(href);
}

app.post("/auth", jsonParser, async (serverReq, serverRes) => {
  return await serve(
    serverReq,
    serverRes,
    serverReq.body,
    false,
  );
});

app.get("/shortcut", async (serverReq, serverRes) => {
  return await serve(
    serverReq,
    serverRes,
    serverReq.query,
    true,
  );
});

app.use(express.static("static"));

export { app as server };
