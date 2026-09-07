本项目继承自<https://github.com/justan/lrc>

主要尝试支持audio标签控制LRC，以及多行歌词的支持(见example)

而且删除了一些东西,因为不懂node

尝试将核心功能和参数分开, 移除了jquery。理论上只要在页面中指定 $lrcInput(歌词字符串),$out（输出歌词的标签）,$audio（audio标签）, 调用 `loadLrc($lrcInput, $out, $audio)` 即可:

```js
loadLrc(document.querySelector('pre[name="lrc"]').textContent, document.querySelector('.out'), document.querySelector('audio'));
```

完整示例见 `example/example.html`

## 时间戳格式说明

支持 `[mm:ss.xx]`(两位毫秒,按厘秒换算) 和 `[mm:ss.xxx]`(三位毫秒) 两种时间戳格式,**不支持无毫秒时间戳**(如 `[00:12]`)。

解析时遇到无毫秒时间戳: 错误信息(含行号和该时间戳)会直接打印到歌词输出区域($out), 并立即停止解析整首歌词 —— 已解析内容被清空, 歌词不再渲染和播放。

------

a javascript lrc parser

lrc 是个 [lrc 歌词]解析程序, 并且有 lrc 播放功能.
