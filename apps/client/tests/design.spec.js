import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("logo selection updates the interface and survives reload", async({ page }) => {
	await page.goto("/design?view=brand");
	const cards = page.locator("article");
	await expect(cards).toHaveCount(3);
	await page.getByRole("button", { name: "GoVoice", exact: true }).click();
	await cards.nth(1).getByRole("button").click();
	await expect(cards.nth(1).getByRole("button")).toHaveAttribute("aria-pressed", "true");
	await page.getByRole("button", { name: "Главная", exact: true }).click();
	await expect(page.locator(".brand")).toHaveAccessibleName("GoVoice");
	await expect(page.locator(".brand-symbol")).toHaveAttribute("style", /most-mark.svg/);
	await page.reload();
	await expect(page.locator(".brand")).toHaveAccessibleName("GoVoice");
	await expect(page.locator(".brand-symbol")).toHaveAttribute("style", /most-mark.svg/);
});

test("demo call controls, chat and settings work without media access", async({ page }) => {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/design?view=call");
	const microphone = page.getByRole("button", { name: "Микрофон", exact: true });
	await expect(microphone).toHaveAttribute("aria-pressed", "true");
	await microphone.click();
	await expect(microphone).toHaveAttribute("aria-pressed", "false");
	const chat = page.getByRole("button", { name: "Чат", exact: true });
	if (await chat.getAttribute("aria-pressed") !== "true") await chat.click();
	await page.getByRole("textbox", { name: "Введите сообщение..." }).fill("Проверяем новый созвон");
	await page.getByRole("button", { name: "Отправить сообщение" }).click();
	await expect(page.getByText("Проверяем новый созвон", { exact: true })).toBeVisible();
	const settings = page.getByRole("button", { name: "Настройки", exact: true });
	await settings.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await dialog.getByRole("combobox", { name: "Язык" }).click();
	await dialog.getByRole("option", { name: /English/ }).click();
	await expect(dialog).toHaveAccessibleName("Settings");
	await page.keyboard.press("Escape");
	await expect(dialog).not.toBeVisible();
	await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeFocused();
	expect(errors).toEqual([]);
});

test("mobile room keeps the chat and controls inside the viewport", async({ page }) => {
	await page.setViewportSize({ width: 320, height: 740 });
	await page.goto("/design?view=call");
	const chat = page.getByRole("button", { name: "Чат", exact: true });
	await expect(chat).toBeVisible();
	await chat.click();
	await expect(page.getByRole("textbox")).toBeVisible();
	const input = await page.getByRole("textbox").boundingBox();
	expect(input.x).toBeGreaterThanOrEqual(0);
	expect(input.x + input.width).toBeLessThanOrEqual(320);
	await page.getByRole("button", { name: "Закрыть", exact: true }).click();
	await page.locator("summary").click();
	await page.getByRole("button", { name: "Настройки", exact: true }).click();
	await expect(page.getByRole("dialog")).toBeVisible();
	const dialog = await page.getByRole("dialog").locator(":scope > div").boundingBox();
	expect(dialog.width).toBeLessThanOrEqual(320);
	await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
});

test("preview lobby joins the demo without requesting camera permission", async({ page }) => {
	await page.addInitScript(() => {
		if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => {
			throw new Error("Demo must not request media");
		};
	});
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/design?view=lobby");
	await page.getByRole("button", { name: "Камера", exact: true }).last().click();
	await page.getByRole("button", { name: "Войти", exact: true }).click();
	await expect(page.getByRole("button", { name: "Войти", exact: true })).not.toBeVisible();
	await expect(page.getByRole("button", { name: "Чат", exact: true })).toBeVisible();
	expect(errors).toEqual([]);
});

test("home reports a failed create and allows retry", async({ page }) => {
	await page.route("**/room/create", (route) => route.fulfill({ json: {} }));
	await page.goto("/");
	const create = page.getByRole("button", { name: /Create meeting|Создать встречу/ });
	await create.click();
	await expect(page.getByRole("alert")).toContainText(/Could not|Не удалось/);
	await expect(create).toBeEnabled();
});

test("the graphite proposal stays selected across screen changes and reload", async({ page }) => {
	await page.goto("/design?theme=studio");
	await page.getByRole("button", { name: "Комната", exact: true }).click();
	await expect(page.locator("html")).toHaveAttribute("data-palette", "studio");
	await expect(page).toHaveURL(/theme=studio/);
	await page.reload();
	await expect(page.locator("html")).toHaveAttribute("data-palette", "studio");
});

test("lobby controls align with the preview and a changed nickname survives joining", async({ page }) => {
	await page.goto("/design?embed=1&view=lobby");
	const lobby = page.getByRole("region", { name: "Перед входом" });
	const preview = await lobby.getByRole("group", { name: "Превью", exact: true }).boundingBox();
	const controls = await lobby.getByRole("group", { name: "Управление встречей", exact: true }).boundingBox();
	expect(Math.abs(preview.x - controls.x)).toBeLessThan(1);
	expect(Math.abs(preview.width - controls.width)).toBeLessThan(1);
	await lobby.getByRole("button", { name: /изменить имя/ }).click();
	await lobby.getByRole("textbox", { name: "Ваше имя" }).fill("Алексей");
	await lobby.getByRole("textbox", { name: "Ваше имя" }).press("Enter");
	await lobby.getByRole("button", { name: "Войти", exact: true }).click();
	await expect(page.getByRole("button", { name: /изменить имя/ })).toContainText("Алексей");
	await page.reload();
	await expect(page.getByRole("button", { name: /изменить имя/ })).toContainText("Алексей");
});

test("participant expansion, theater and return to grid remain available", async({ page }) => {
	await page.goto("/design?embed=1&view=call");
	await expect(page.getByRole("banner")).toHaveCount(0);
	await page.getByRole("button", { name: "Увеличить участника", exact: true }).first().click();
	const restore = page.getByRole("button", { name: "Вернуться к сетке", exact: true });
	await expect(restore).toBeVisible();
	const thumbnails = page.getByRole("group", { name: "Участники", exact: true });
	await expect(thumbnails).toBeVisible();
	await page.getByRole("button", { name: "Режим просмотра", exact: true }).click();
	await expect(thumbnails).not.toBeVisible();
	await page.getByRole("button", { name: "Режим просмотра", exact: true }).click();
	await expect(thumbnails).toBeVisible();
	await restore.click();
	await expect(page.getByRole("button", { name: "Увеличить участника", exact: true })).toHaveCount(4);
	await page.getByRole("button", { name: "Режим просмотра", exact: true }).first().click();
	await expect(page.getByRole("button", { name: "Вернуться к сетке", exact: true })).toBeVisible();
	await expect(page.getByRole("group", { name: "Участники", exact: true })).not.toBeVisible();
	await page.getByRole("button", { name: "Вернуться к сетке", exact: true }).click();
	await expect(page.getByRole("button", { name: "Увеличить участника", exact: true })).toHaveCount(4);
});

test("phone preview provides nickname editing and the driving mode", async({ page }) => {
	await page.goto("/design?view=mobile");
	const phone = page.frameLocator("iframe[title=\"Мобильный интерфейс\"]");
	await expect(phone.getByRole("banner")).toHaveCount(0);
	await phone.locator("summary").click();
	await phone.getByRole("button", { name: "Безопасное вождение", exact: true }).click();
	const mute = phone.getByRole("button", { name: "Нажмите, чтобы выключить микрофон", exact: true });
	await expect(mute).toHaveAttribute("aria-pressed", "true");
	await mute.click();
	await expect(phone.getByRole("button", { name: "Нажмите, чтобы включить микрофон", exact: true })).toHaveAttribute("aria-pressed", "false");
	await phone.getByRole("button", { name: "Нажмите для выхода из режима вождения", exact: true }).click();
	await expect(phone.getByRole("button", { name: "Чат", exact: true })).toBeVisible();
	await page.getByRole("group", { name: "Экран на телефоне" }).getByRole("button", { name: "Вход", exact: true }).click();
	const lobby = phone.getByRole("region", { name: "Перед входом" });
	await lobby.getByRole("button", { name: /изменить имя/ }).click();
	await lobby.getByRole("textbox", { name: "Ваше имя" }).fill("Мобильный участник");
	await lobby.getByRole("textbox", { name: "Ваше имя" }).press("Enter");
	await expect(lobby.getByRole("button", { name: /изменить имя/ })).toContainText("Мобильный участник");
});

test("four participants keep an even grid on desktop and phone", async({ page }) => {
	await page.goto("/design?embed=1&view=call");
	const chat = page.getByRole("button", { name: "Чат", exact: true });
	if (await chat.getAttribute("aria-pressed") === "true") await chat.click();
	const participants = page.getByRole("group", { name: "Участники", exact: true });
	for (const viewport of [ { width: 1830, height: 1044 }, { width: 1440, height: 900 }, { width: 390, height: 844 } ]) {
		await page.setViewportSize(viewport);
		await expect.poll(async() => participants.locator(":scope > div").evaluateAll((tiles) => {
			const bounds = tiles.map((tile) => tile.getBoundingClientRect());
			return {
				columns: new Set(bounds.map((rect) => Math.round(rect.x))).size,
				rows: new Set(bounds.map((rect) => Math.round(rect.y))).size,
				widths: new Set(bounds.map((rect) => Math.round(rect.width))).size,
				heights: new Set(bounds.map((rect) => Math.round(rect.height))).size,
			};
		})).toEqual({ columns: 2, rows: 2, widths: 1, heights: 1 });
	}
	await expect(participants.locator("img[src*=\"dicebear.com/7.x/bottts\"]")).toHaveCount(4);
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.getByRole("button", { name: "Увеличить участника", exact: true }).first().click();
	const names = page.getByRole("group", { name: "Участники", exact: true });
	for (const name of [ "Анна Морозова", "Миша Волков", "Катя Белова", "Даня Лебедев" ]) {
		const label = names.getByText(name, { exact: true });
		await expect(label).toBeVisible();
		expect(await label.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
	}
});

test("camera-off cards grow to fill the room while keeping their proportions", async({ page }) => {
	for (const people of [ 1, 2, 3 ]) {
		await page.goto(`/design?embed=1&view=call&people=${people}`);
		const chat = page.getByRole("button", { name: "Чат", exact: true });
		if (await chat.getAttribute("aria-pressed") === "true") await chat.click();
		const participants = page.getByRole("group", { name: "Участники", exact: true });
		await expect(participants.locator(":scope > div")).toHaveCount(people);
		for (const viewport of [ { width: 1920, height: 1080 }, { width: 1178, height: 920 }, { width: 390, height: 844 }, { width: 844, height: 390 } ]) {
			await page.setViewportSize(viewport);
			await expect.poll(() => participants.evaluate((group) => {
				const available = group.parentElement.getBoundingClientRect();
				const grid = group.getBoundingClientRect();
				const ratio = window.innerWidth <= 640 ? 3 / 4 : 4 / 3;
				return Math.abs(grid.x + grid.width / 2 - available.x - available.width / 2) < 1 &&
					Math.abs(grid.y + grid.height / 2 - available.y - available.height / 2) < 1 &&
					Math.min(Math.abs(grid.width - available.width), Math.abs(grid.height - available.height)) < 1 &&
					Array.from(group.children).every((tile) => {
						const card = tile.firstElementChild.getBoundingClientRect();
						const robot = tile.querySelector("img").getBoundingClientRect();
						return Math.abs(card.width / card.height - ratio) < 0.01 &&
							card.left >= available.left && card.right <= available.right + 1 &&
							card.top >= available.top && card.bottom <= available.bottom + 1 &&
							Math.abs(robot.x + robot.width / 2 - card.x - card.width / 2) < 1 &&
							Math.abs(robot.y + robot.height / 2 - card.y - card.height / 2) < 1;
					});
			})).toBe(true);
			expect(await page.locator("body").evaluate((body) => body.scrollWidth <= window.innerWidth)).toBe(true);
		}
	}
});

test("editing a nickname keeps its position and size", async({ page }) => {
	await page.goto("/design?embed=1&view=call");
	const name = page.getByRole("button", { name: /изменить имя/ });
	await expect(name).toBeVisible();
	const before = await name.boundingBox();
	await name.click();
	const input = page.getByRole("textbox", { name: "Ваше имя" });
	const after = await input.boundingBox();
	for (const key of [ "x", "y", "width", "height" ]) expect(Math.abs(before[key] - after[key])).toBeLessThan(1);
	await input.fill("Новое имя");
	await input.press("Escape");
	await expect(name).toContainText("Анна Морозова");
});

test("camera and mute changes keep the desktop toolbar in place", async({ page }) => {
	await page.goto("/design?embed=1&view=call");
	const toolbar = page.getByRole("group", { name: "Управление встречей", exact: true });
	const camera = toolbar.getByRole("button", { name: "Камера", exact: true });
	const volume = toolbar.getByRole("button", { name: "Громкость", exact: true });
	await expect(camera).toBeVisible();
	const beforeCamera = await camera.boundingBox(), beforeVolume = await volume.boundingBox();
	await camera.click();
	await expect(camera).toHaveAttribute("aria-pressed", "true");
	await expect(page.getByRole("button", { name: "Сменить камеру", exact: true })).not.toBeVisible();
	expect(await camera.boundingBox()).toEqual(beforeCamera);
	expect(await volume.boundingBox()).toEqual(beforeVolume);
	await volume.click();
	const slider = page.getByRole("slider", { name: "Громкость", exact: true });
	await slider.press("Home");
	await expect(slider).toHaveValue("0");
	expect(await volume.boundingBox()).toEqual(beforeVolume);
	expect(await camera.boundingBox()).toEqual(beforeCamera);
});

for (const clipboard of [ "api", "fallback" ]) {
	test(`invite copies the link and confirms it using ${clipboard}`, async({ page }) => {
		await page.addInitScript((mode) => {
			if (mode === "api") {
				Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async(text) => {
					window.copiedInvite = text;
				} } });
			} else {
				Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
				document.execCommand = (command) => {
					if (command !== "copy") return false;
					window.copiedInvite = document.activeElement.value;
					return true;
				};
			}
		}, clipboard);
		await page.goto("/design?embed=1&view=call");
		await page.getByRole("button", { name: "Пригласить", exact: true }).click();
		await expect(page.getByRole("status")).toHaveText("Ссылка скопирована");
		expect(await page.evaluate(() => window.copiedInvite)).toBe(page.url());
	});
}

test("chat width can be dragged, adjusted with keys and restored after reload", async({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto("/design?embed=1&view=call");
	const resize = page.getByRole("separator", { name: "Ширина чата" });
	await expect(resize).toHaveAttribute("aria-valuenow", "320");
	const handle = await resize.boundingBox();
	await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
	await page.mouse.down();
	await page.mouse.move(handle.x + handle.width / 2 - 160, handle.y + handle.height / 2, { steps: 8 });
	await page.mouse.up();
	await expect(resize).toHaveAttribute("aria-valuenow", "480");
	await page.reload();
	await expect(resize).toHaveAttribute("aria-valuenow", "480");
	await resize.press("ArrowLeft");
	await expect(resize).toHaveAttribute("aria-valuenow", "504");
	await resize.press("End");
	await expect(resize).toHaveAttribute("aria-valuenow", "720");
	await resize.press("Home");
	await expect(resize).toHaveAttribute("aria-valuenow", "280");
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(resize).not.toBeVisible();
	await expect(page.getByRole("textbox", { name: "Введите сообщение..." })).toBeVisible();
	await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
});

test("participant strip stays compact and its size can be changed and saved", async({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto("/design?embed=1&view=call&layout=expanded");
	const resize = page.getByRole("separator", { name: "Размер панели участников" });
	await expect(resize).toHaveAttribute("aria-valuenow", "128");
	const participants = page.getByRole("group", { name: "Участники", exact: true });
	const tile = await participants.locator(":scope > div").first().boundingBox();
	expect(tile.width).toBeLessThan(240);
	expect(await participants.locator("img").first().evaluate((img) => {
		const image = img.getBoundingClientRect(), card = img.parentElement.parentElement.getBoundingClientRect();
		return Math.abs(image.x + image.width / 2 - card.x - card.width / 2) < 1 && Math.abs(image.y + image.height / 2 - card.y - card.height / 2) < 1;
	})).toBe(true);
	const handle = await resize.boundingBox();
	await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
	await page.mouse.down();
	await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 + 48, { steps: 6 });
	await page.mouse.up();
	await expect(resize).toHaveAttribute("aria-valuenow", "176");
	await page.reload();
	await expect(resize).toHaveAttribute("aria-valuenow", "176");
	await resize.press("ArrowUp");
	await expect(resize).toHaveAttribute("aria-valuenow", "160");
	await resize.dblclick();
	await expect(resize).toHaveAttribute("aria-valuenow", "128");
	await page.getByRole("button", { name: "Режим просмотра", exact: true }).click();
	await expect(resize).not.toBeVisible();
});

for (const width of [ 1440, 320 ]) {
	test(`settings dropdowns align with their fields and support the keyboard at ${width}px`, async({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto("/design?embed=1&view=lobby");
		await page.getByRole("region", { name: "Перед входом" }).getByRole("button", { name: "Настройки", exact: true }).click();
		const dialog = page.getByRole("dialog");
		const language = dialog.getByRole("combobox", { name: "Язык", exact: true });
		await language.click();
		const list = dialog.getByRole("listbox");
		await expect(list).toBeVisible();
		const field = await language.boundingBox(), popup = await list.boundingBox();
		expect(Math.abs(popup.x - field.x)).toBeLessThan(1);
		expect(Math.abs(popup.width - field.width)).toBeLessThan(1);
		expect(popup.y).toBeGreaterThanOrEqual(field.y + field.height + 5);
		expect(popup.x + popup.width).toBeLessThanOrEqual(width);
		const arrow = await language.locator("svg").boundingBox();
		expect(field.x + field.width - arrow.x - arrow.width).toBeGreaterThanOrEqual(13);
		await language.press("Escape");
		await expect(list).not.toBeVisible();
		await expect(dialog).toBeVisible();
		await language.press("ArrowDown");
		await language.press("Home");
		await language.press("ArrowDown");
		await language.press("Enter");
		await expect(dialog).toHaveAccessibleName("Settings");
		await expect(dialog.getByRole("combobox", { name: "Language", exact: true })).toBeFocused();
		const microphone = dialog.getByRole("combobox", { name: "Microphone", exact: true });
		await microphone.click();
		const microphoneField = await microphone.boundingBox(), deviceList = await list.boundingBox();
		expect(deviceList.y).toBeGreaterThanOrEqual(microphoneField.y + microphoneField.height + 5);
		expect(deviceList.height).toBeLessThanOrEqual(54);
		await microphone.press("Escape");
		await microphone.press("Escape");
		await expect(dialog).not.toBeVisible();
	});
}

for (const hostname of [ "sozvon.now", "call.sozvon.now", "govoice.now", "www.govoice.now" ]) {
	test(`the domain determines the production brand on ${hostname}`, async({ page, baseURL }) => {
		await page.route(/^https?:\/\/(?:[\w-]+\.)*(?:sozvon|govoice)\.now\//, async(route) => {
			const url = new URL(route.request().url());
			const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).href });
			await route.fulfill({ response });
		});
		await page.addInitScript(() => localStorage.setItem("govoice.identity", location.hostname.includes("govoice") ? "sozvon" : "govoice"));
		await page.goto(`https://${hostname}/`);
		const brand = hostname.includes("govoice") ? "GoVoice" : "Sozvon";
		await expect(page.locator(".brand")).toHaveAccessibleName(brand);
		await expect(page).toHaveTitle(new RegExp(`^${brand}(?: |$)`));
	});
}

test("the return button is available in the review and opens the lobby", async({ page }) => {
	await page.goto("/design?embed=1&view=home&return=1");
	await page.getByRole("button", { name: "Вернуться во встречу", exact: true }).click();
	await expect(page.getByRole("region", { name: "Перед входом" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Войти", exact: true })).toBeVisible();
});

for (const identity of [ "sozvon", "govoice" ]) {
	test(`${identity} wordmark stays fixed while the interface font loads`, async({ page }) => {
		await page.addInitScript((brand) => localStorage.setItem("govoice.identity", brand), identity);
		let release;
		const fontGate = new Promise((resolve) => release = resolve);
		await page.route("**/static/fonts/*.woff2", async(route) => {
			await fontGate;
			await route.continue();
		});
		try {
			await page.goto("/design?embed=1&view=home&return=1", { waitUntil: "domcontentloaded" });
			const brand = page.locator(".brand");
			await expect(brand.locator(".brand-name svg")).toBeVisible();
			const before = await brand.boundingBox();
			release();
			await page.evaluate(() => document.fonts.ready);
			const after = await brand.boundingBox();
			for (const key of [ "x", "y", "width", "height" ]) expect(Math.abs(before[key] - after[key])).toBeLessThan(0.1);
		} finally {
			release();
			await page.unrouteAll({ behavior: "wait" });
		}
	});
}

test("home buttons and labels share one center and size on desktop and phone", async({ page }) => {
	await page.addInitScript(() => localStorage.setItem("lastRoom", JSON.stringify({ id: "/42c3c56c-54ba-4aee-af39-1263228a539b", ts: Date.now() })));
	for (const language of [ "en", "ru" ]) {
		await page.goto("/");
		await page.evaluate((language) => localStorage.setItem("settings", JSON.stringify({ language })), language);
		await page.reload();
		const create = page.getByRole("button", { name: /Create meeting|Создать встречу/, exact: true });
		const back = page.getByRole("button", { name: /Return to meeting|Вернуться во встречу/, exact: true });
		await expect(create).toBeVisible();
		await expect(back).toBeVisible();
		for (const viewport of [ { width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 } ]) {
			await page.setViewportSize(viewport);
			await expect.poll(() => page.evaluate((width) => {
				const buttons = Array.from(document.querySelectorAll("button"));
				const create = buttons.find((button) => (/Create meeting|Создать встречу/).test(button.textContent));
				const back = buttons.find((button) => (/Return to meeting|Вернуться во встречу/).test(button.textContent));
				const labels = [ create, back ].map((button) => button.querySelector("span"));
				const first = create.getBoundingClientRect(), second = back.getBoundingClientRect();
				const centers = [ document.querySelector(".brand"), ...labels ].map((el) => {
					const rect = el.getBoundingClientRect();
					return rect.x + rect.width / 2;
				});
				return {
					equalSize: first.width === second.width && first.height === second.height,
					compact: first.height >= 44 && first.height <= 60,
					centered: centers.every((center) => Math.abs(center - width / 2) < 0.1),
					labelsFit: labels.every((label) => label.scrollWidth <= label.clientWidth),
				};
			}, viewport.width)).toEqual({ equalSize: true, compact: true, centered: true, labelsFit: true });
		}
	}
});

for (const mode of [ "livekit", "p2p" ]) {
	test(`${mode} room never flashes the home screen before its token arrives`, async({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem("user", "c0813260-65d0-412a-867d-0688ca82917d");
			window.sawHomeScreen = false;
			new MutationObserver((records) => {
				for (const record of records) for (const node of record.addedNodes) {
					if (node instanceof Element && Array.from(node.querySelectorAll("button")).some((button) => (/Create meeting|Создать встречу/).test(button.textContent))) window.sawHomeScreen = true;
				}
			}).observe(document, { childList: true, subtree: true });
		});
		let release, requested;
		const tokenGate = new Promise((resolve) => release = resolve);
		const requestReceived = new Promise((resolve) => requested = resolve);
		await page.route(`**/room/token/${mode}/**`, async(route) => {
			requested();
			await tokenGate;
			await route.abort();
		});
		try {
			await page.goto(`${mode === "p2p" ? "/p2p" : ""}/42c3c56c-54ba-4aee-af39-1263228a539b`, { waitUntil: "domcontentloaded" });
			await requestReceived;
			expect(await page.evaluate(() => window.sawHomeScreen)).toBe(false);
			await expect(page.getByRole("button", { name: /Create meeting|Создать встречу/ })).toHaveCount(0);
		} finally {
			release();
			await page.unrouteAll({ behavior: "wait" });
		}
	});
}
