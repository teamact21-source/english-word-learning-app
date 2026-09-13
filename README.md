# Write & Remember

中学3年生の高校受験対策を想定した、英単語の書き取り学習アプリです。

英単語を見るだけでなく、意味を見て自分で書く流れを繰り返し、記憶の定着を目指します。

## 公開版

[Write & Rememberを開く](https://write-and-remember-english.team-act21.chatgpt.site/)

![共有用QRコード](./share-qr.png)

## 主な機能

- 「中学総復習」1,800語と「高校入試頻出」500語の2コース
- コース内から毎回ランダムに出題
- 英単語を覚えてから、日本語訳を見て書き取り
- 大文字・小文字を区別しない正誤判定
- 入力と正解の違いを文字単位で表示
- スマートフォンとPCのブラウザに対応

## ローカルでの起動

Node.js 22.13.0以上が必要です。

```bash
npm install
npm run dev
```

起動後、ターミナルに表示されたローカルURLをブラウザで開いてください。

## その他のコマンド

```bash
npm run build
npm run lint
npm run format
```

## 単語データ

収録語は次の公開データを基に、このアプリ向けに選定・調整しています。

- CEFR-J Wordlist Version 1.6（東京外国語大学・投野由紀夫編）
- EJDict-hand（kujirahand、CC0 1.0 / Public Domain）

詳しい出典と利用条件は [`data/SOURCES.md`](./data/SOURCES.md) をご覧ください。収録内容は本アプリ独自の構成であり、公式の高校入試用語集ではありません。

## 技術構成

- React 19
- TypeScript
- Tailwind CSS
- Vinext / Vite
- Cloudflare Workers

## ライセンス

アプリ本体のソースコードは [MIT License](./LICENSE) で公開しています。作者は優太です。

収録単語データ（`data/words.json`）の第三者由来の内容には、MITライセンスを一括適用しません。CEFR-J由来の内容は出典表示を条件とする原典の利用条件、EJDict由来の内容はCC0 1.0に従います。再利用・再配布時にも [`data/SOURCES.md`](./data/SOURCES.md) の出典・利用条件を引き継いでください。依存パッケージにはそれぞれのライセンスが適用されます。
