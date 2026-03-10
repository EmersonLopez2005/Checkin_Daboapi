let domain = "https://api.dabo.im";
let user = "";
let pass = ""; 
let 签到结果;
let BotToken ='';
let ChatID =''; 

export default {
	async fetch(request, env, ctx) {
		await initializeVariables(env);
		const url = new URL(request.url);
		
		const path = decodeURIComponent(url.pathname);
		
		if(path == "/tg") {
			await sendMessage();
		} else if (path == `/${pass}`){
			await checkin();
		}
		
		return new Response(签到结果, {
			status: 200,
			headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
		});
	},

	async scheduled(controller, env, ctx) {
		console.log('Cron job started');
		try {
			await initializeVariables(env);
			await checkin();
			console.log('Cron job completed successfully');
		} catch (error) {
			console.error('Cron job failed:', error);
			签到结果 = `定时任务执行失败: ${error.message}`;
			await sendMessage(签到结果);
		}
	},
};

async function initializeVariables(env) {
	domain = env.JC || env.DOMAIN || domain;
	user = env.ZH || env.USER || user;
	pass = env.MM || env.PASS || pass;
	if(!domain.includes("//")) domain = `https://${domain}`;
	BotToken = env.TGTOKEN || BotToken;
	ChatID = env.TGID || ChatID;
	签到结果 = `地址: ${domain.substring(0, 9)}****${domain.substring(domain.length - 5)}\n账号: ${user.substring(0, 1)}****${user.substring(user.length - 5)}\n密码: ${pass.substring(0, 1)}****${pass.substring(pass.length - 1)}\n\nTG推送: ${ChatID ? `${ChatID.substring(0, 1)}****${ChatID.substring(ChatID.length - 3)}` : "未启用"}`;
}

async function sendMessage(msg = "") {
	const 账号信息 = `地址: ${domain}\n账号: ${user}\n密码: <tg-spoiler>${pass}</tg-spoiler>`;
	const now = new Date();
	const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
	const formattedTime = beijingTime.toISOString().slice(0, 19).replace('T', ' ');
	console.log(msg);
	
	if (BotToken !== '' && ChatID !== '') {
		const url = `https://api.telegram.org/bot${BotToken}/sendMessage?chat_id=${ChatID}&parse_mode=HTML&text=${encodeURIComponent("执行时间: " + formattedTime + "\n" + 账号信息 + "\n\n" + msg)}`;
		return fetch(url, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 Chrome/145.0.0.0 Safari/537.36'
			}
		});
	}
}

async function checkin() {
	try {
		if (!domain || !user || !pass) {
			throw new Error('必需的配置参数缺失');
		}

		// 1. 登录请求
		const loginResponse = await fetch(`${domain}/api/user/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
				'Accept': 'application/json, text/plain, */*',
				'Origin': domain,
				'Referer': `${domain}/login`,
			},
			body: JSON.stringify({
				username: user,
				password: pass
			}),
		});

		if (!loginResponse.ok) {
			const errorText = await loginResponse.text();
			throw new Error(`登录请求失败 (HTTP ${loginResponse.status}): ${errorText}`);
		}

		const loginJson = await loginResponse.json();
		console.log('Login Response:', loginJson);

		if (!loginJson.success) {
			throw new Error(`登录失败: ${loginJson.message || '未知错误'}`);
		}

		// 关键修复：从登录信息中提取你的专属 User ID
		const userId = loginJson.data ? loginJson.data.id : '';
		console.log('Extracted User ID:', userId);

		// 获取 Cookie
		const cookieHeader = loginResponse.headers.get('set-cookie');
		if (!cookieHeader) {
			throw new Error('登录成功但未收到响应的Cookie');
		}

		const cookies = cookieHeader.split(',').map(cookie => cookie.split(';')[0]).join('; ');

		await new Promise(resolve => setTimeout(resolve, 1000));

		// 2. 签到请求
		const checkinResponse = await fetch(`${domain}/api/user/checkin`, {
			method: 'POST',
			headers: {
				'Cookie': cookies,
				'New-Api-User': String(userId), // 关键修复：塞入刚抓到的 User ID
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json',
				'Origin': domain,
				'Referer': `${domain}/console/personal`,
			},
		});

		const responseText = await checkinResponse.text();
		console.log('Checkin Raw Response:', responseText);

		try {
			const checkinResult = JSON.parse(responseText);
			console.log('Checkin Result:', checkinResult);
			
			// 3. 提取和解析 New API 结果
			let msgStr = checkinResult.message || '';
			let dataStr = '';
			
			// 把生硬的 JSON 转换成人类友好的格式
			if (checkinResult.data) {
				if (typeof checkinResult.data === 'object') {
					let date = checkinResult.data.checkin_date || '未知';
					let quota = checkinResult.data.quota_awarded || 0;
					// NewAPI 默认换算比例是 500000 = $1，帮你算好显示出来
					let quotaDollar = (quota / 500000).toFixed(3); 
					dataStr = `\n📅 日期: ${date}\n💰 额度: ${quota} (约 $${quotaDollar})`;
				} else {
					dataStr = `\n详情: ${checkinResult.data}`;
				}
			}

			if (checkinResult.success) {
				签到结果 = `🎉 签到成功 🎉\n提示: ${msgStr || '操作成功'}${dataStr}`;
			} else {
				if (msgStr.includes('已签到') || msgStr.includes('签过')) {
					签到结果 = `☕ 签到提示 ☕\n状态: ${msgStr}`;
				} else {
					签到结果 = `⚠️ 签到失败 ⚠️\n原因: ${msgStr || '未知错误'}${dataStr}`;
				}
			}
		} catch (e) {
			if (responseText.includes('登录') || responseText.includes('login')) {
				throw new Error('登录状态无效，Cookie已过期或未获取到');
			}
			throw new Error(`解析签到响应失败: ${e.message}\n\n网站原始响应: ${responseText}`);
		}

		await sendMessage(签到结果);
		return 签到结果;

	} catch (error) {
		console.error('Checkin Error:', error);
		签到结果 = `❌ 签到过程发生错误:\n${error.message}`;
		await sendMessage(签到结果);
		return 签到结果;
	}
}
