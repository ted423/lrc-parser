(function () {
	'use strict';

	const TIME_EXP = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;
	const TAG_NAMES = {
		title: 'ti'
		, artist: 'ar'
		, album: 'al'
		, offset: 'offset'
		, by: 'by'
	};

	// 解析为纯数据: { tags, lines: [{time, txt}], error }
	// error: { lineNum, timestamp } 表示无毫秒时间戳, 解析立即停止
	function parseLrc(text) {
		const tags = {};
		for (const [name, tag] of Object.entries(TAG_NAMES)) {
			const m = text.match(new RegExp('\\[' + tag + ':([^\\]]*)\\]', 'i'));
			tags[name] = m ? m[1] : '';
		}

		const lines = [];
		const sourceLines = text.split(/\r?\n/);
		for (let i = 0; i < sourceLines.length; i++) {
			const times = [...sourceLines[i].matchAll(TIME_EXP)];
			if (times.length === 0) continue;
			const txt = sourceLines[i].replace(TIME_EXP, '').trim();
			for (const m of times) {
				if (m[3] === undefined) {
					return { tags, lines: [], error: { lineNum: i + 1, timestamp: m[0] } };
				}
				const ms = m[3].length === 2 ? m[3] * 10 : m[3] * 1;
				lines.push({ time: m[1] * 60000 + m[2] * 1000 + ms, txt });
			}
		}

		lines.sort((a, b) => a.time - b.time);

		// 相同时间戳的行合并为一行(多行歌词)
		const merged = [];
		for (const line of lines) {
			const prev = merged[merged.length - 1];
			if (prev && prev.time === line.time) prev.txt += '\n' + line.txt;
			else merged.push(line);
		}
		return { tags, lines: merged, error: null };
	}

	// 进度条定位依赖页面 CSS: .out pre 提供行容器, .progressBar 提供绝对定位样式
	class LrcPlayer {
		tick = () => {
			this.render();
			this.raf = requestAnimationFrame(this.tick);
		};

		constructor(lrcText, out, audio) {
			const parsed = parseLrc(lrcText);
			if (parsed.error) {
				out.replaceChildren(createErrorPre(parsed.error));
				return;
			}
			if (parsed.lines.length === 0) return;

			this.out = out;
			this.audio = audio;
			this.lines = parsed.lines;
			this.pre = null;
			this.bar = null;
			this.shownLine = -1;
			this.raf = null;

			audio.addEventListener('playing', () => this.start());
			audio.addEventListener('pause', () => this.stop());
			audio.addEventListener('waiting', () => this.stop());
			audio.addEventListener('ended', () => this.stop());
			audio.addEventListener('seeked', () => this.render());
		}

		start() {
			this.render();
			if (this.raf === null) this.raf = requestAnimationFrame(this.tick);
		}

		stop() {
			this.render();
			if (this.raf !== null) {
				cancelAnimationFrame(this.raf);
				this.raf = null;
			}
		}

		// 每帧以 audio.currentTime 为唯一时间源, 同步行显示与进度条
		render() {
			const t = this.audio.currentTime * 1000;
			const lines = this.lines;

			let i = lines.length - 1;
			while (i >= 0 && lines[i].time > t) i--;
			if (i < 0) {
				if (this.shownLine !== -1) {
					this.shownLine = -1;
					this.pre = this.bar = null;
					this.out.replaceChildren();
				}
				return;
			}

			if (i !== this.shownLine) {
				this.shownLine = i;
				this.showLine(lines[i]);
			}

			const bar = this.bar;
			if (!bar) return;
			const cur = lines[i];
			const next = lines[i + 1];
			const fraction = next ? Math.min((t - cur.time) / (next.time - cur.time), 1) : 1;
			bar.style.top = this.pre.offsetTop + 1 + 'px';
			bar.style.left = this.pre.offsetLeft + 1 + 'px';
			bar.style.height = this.pre.scrollHeight + 'px';
			bar.style.width = this.pre.scrollWidth * fraction + 'px';
		}

		showLine(line) {
			const pre = document.createElement('pre');
			pre.textContent = line.txt;
			if (line.txt) {
				const bar = document.createElement('div');
				bar.className = 'progressBar';
				pre.append(bar);
				this.bar = bar;
			} else {
				pre.style.border = 'none';
				this.bar = null;
			}
			this.pre = pre;
			this.out.replaceChildren(pre);
		}
	}

	function createErrorPre(error) {
		const pre = document.createElement('pre');
		pre.textContent = `LRC 解析错误: 第 ${error.lineNum} 行 ${error.timestamp} 缺少毫秒, 不支持无毫秒时间戳, 已停止解析`;
		return pre;
	}

	// 三个参数均为元素选择器字符串: lrc 取匹配元素的 textContent
	function loadLrc(lrc, out, audio) {
		return new LrcPlayer(
			document.querySelector(lrc).textContent,
			document.querySelector(out),
			document.querySelector(audio)
		);
	}

	window.loadLrc = loadLrc;
})();
