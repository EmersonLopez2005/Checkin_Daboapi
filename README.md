# 🤖 Dabo API 自动签到 Worker 脚本

这是一个部署在 Cloudflare Workers 上的自动签到脚本，专为适配 **Dabo API**。

本脚本会自动完成登录、提取专属 User ID、携带校验头发送签到请求，并将真实的签到结果（含赠送额度等详情）推送到 Telegram。

## ✨ 核心特性

* **零成本部署**：基于 Cloudflare Workers，完全免费，无需服务器。
* **深度适配 New API**：完美解决 `New-Api-User` 请求头校验问题，精准解析签到成功/失败/已签到状态。
* **隐私安全**：账号、密码、通知 Token 全部通过环境变量配置，代码中零硬编码，杜绝泄露风险。
* **双重触发机制**：
  * 🕒 **定时触发**：通过 Cron Trigger 每天自动执行。
  * 🔗 **手动触发**：通过访问特定链接（带有密码保护）随时手动测试。

---

## 🚀 部署教程

### 1. 创建 Cloudflare Worker
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 在左侧菜单找到 **Workers & Pages** -> **Overview**，点击 **Create Application** -> **Create Worker**。
3. 随便起个名字（例如 `new-api-checkin`），点击 Deploy。
4. 点击 **Edit Code**，将本仓库的 `worker.js` 代码全部复制并覆盖进去，点击右上角的 **Deploy** 保存。

### 2. 配置环境变量 (Variables and Secrets)
为了保护你的隐私，请不要在代码中填写账号密码！请在 Worker 的配置页面设置环境变量。

退出代码编辑器，进入该 Worker 的主页，点击 **Settings (设置)** -> **Variables and Secrets (变量和机密)**，点击 **Add** 添加以下变量：

| 变量名 | 说明 | 示例值 |
| :--- | :--- | :--- |
| `DOMAIN` | **(必填)** 目标网站地址 | `https://api.dabo.im` |
| `USER` | **(必填)** 你的登录邮箱或用户名 | `your_email@example.com` |
| `PASS` | **(必填)** 你的登录密码 | `your_password123` |
| `TGTOKEN` | (选填) Telegram 机器人的 Token | `1234567890:AAH...` |
| `TGID` | (选填) 接收推送的 Telegram Chat ID | `123456789` |

> *注：为了兼容旧版代码，环境变量名也可以使用 `JC` (代替 DOMAIN)、`ZH` (代替 USER)、`MM` (代替 PASS)。*

### 3. 配置定时触发器 (Cron Trigger)
1. 在 Worker 设置页面，找到 **Triggers (触发器)** 选项卡。
2. 找到 **Cron Triggers**，点击 **Add Cron Trigger**。
3. 设定每天自动执行的时间。
   * ⚠️ **注意**：Cloudflare 使用的是 UTC 时间，比北京时间晚 8 小时。
   * *例如：想在北京时间每天早上 08:00 签到，这里应设置为 UTC 时间的 `00:00`。*

---

## 🛠️ 如何手动测试与排错

部署完成后，你不需要干等定时任务。你可以直接在浏览器地址栏输入以下链接来手动触发一次签到：

```text
https://你的worker分配的域名.workers.dev/你的密码
