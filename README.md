# Area Title Maker

ゲーム・TRPG動画・PV・ノベルゲーム向けの、エリア名や章タイトルをすばやく作るブラウザ完結型ツールです。文字を入力し、プリセットを選び、PNGとして保存できます。背景画像を含む編集処理はブラウザ内で行われ、タイトル本文や画像をアプリのデータとして外部へアップロードしません。Google Fontsを選択した場合だけ、必要な書体データをGoogleから取得します。

## 起動

`.node-version`で固定したNode.js 22.23.2と、`package.json`で固定したpnpm 11.25.0を使用してください。依存パッケージへpnpm固有のセキュリティパッチを適用するため、`npm install`は使用しません。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

本番ビルドは`pnpm build`です。pnpmが未導入の場合は、先に`npm install --global pnpm@11.25.0`などで同じバージョンを用意してください。

## GitHub Pagesで公開

このプロジェクトには、`main`ブランチへのpush時に静的サイトをビルドしてGitHub Pagesへ公開するワークフローが含まれています。

1. GitHubでリポジトリを作成し、ソースをpushします。
2. リポジトリの「Settings」→「Pages」を開き、「Build and deployment」の「Source」に「GitHub Actions」を選びます。
3. 初回pushのワークフローが先に失敗していた場合は、「Actions」から「Deploy to GitHub Pages」を再実行します。
4. ワークフローが完了すると、公開URLが表示されます。

ユーザー／組織サイト（`<account>.github.io`）とプロジェクトサイト（`<account>.github.io/<repository>`）のどちらでも、公開先のパスを自動で反映します。

`main`へのpushは公開サイトへ自動反映されます。公開前に変更内容を確認し、必要に応じてブランチ保護や`github-pages`環境の承認ルールを設定してください。タイトル、サブタイトル、編集設定、お気に入りはブラウザの`localStorage`へ保存され、背景画像は保存・送信されません。

## Google Fontsと外部通信

既定状態と端末内フォントの使用中は、Google Fontsへの通信は発生しません。保存済み設定を含め、Google Fontsの厳選8書体が選択されている場合だけ、選択中のファミリー、太さ、斜体に必要なCSSと書体データを`fonts.googleapis.com`および`fonts.gstatic.com`から取得します。

入力したタイトルをGoogle Fonts CSS APIの`text`パラメーターへ入れないため、タイトル本文はリクエストURLに含まれません。ブラウザはPNG保存の直前にも選択中の書体を確認し、読み込みを確認できない場合は代替書体のまま保存せずエラーを表示します。Google Fonts利用時の通信と書体ライセンスについては、画面内の「書体について」および`public/FONT_NOTICES.txt`を参照してください。

## 利用条件

このリポジトリにはオープンソースライセンスを付与していません。GitHubおよびGitHub Pagesでの公開は、ソースコードやリポジトリ固有画像の複製・改変・再配布・商用利用を許諾するものではありません。画像の来歴は`ASSET_PROVENANCE.md`に記録しています。

依存パッケージには、それぞれの権利者が定めたライセンスが適用されます。依存パッケージのライセンス表示は、ビルド前に`public/THIRD_PARTY_LICENSES.txt`へ自動生成されます。

Google Fontsの8書体にはSIL Open Font License 1.1が適用されます。これらの書体ライセンスは、本リポジトリのソースコードへライセンスを付与するものではありません。詳細は`public/FONT_NOTICES.txt`に分離して記録しています。

依存関係の既知問題とローカル修正は`SECURITY.md`に記録しています。`image-size@2.0.2`には未修正版しかない脆弱性があるため、上流修正を`patches/`へ固定しています。依存更新時もこのパッチが適用されることを確認してください。

## 実装済み

- メイン／サブタイトルのリアルタイムCanvas描画
- メイン／サブ個別のフォント、サイズ、色、字間、太さ、斜体、透明度
- Google Fonts厳選8書体のオンデマンド読み込みとPNG保存前確認
- A〜Gの7レイアウト
- 10種類の装飾線と16種類の中央記号
- 線の長さ、太さ、色、透明度、余白、中央距離
- 影、縁取り、グロー、文字ぼかし
- 位置スライダー、上／中央／下のクイック配置、マウス／タッチドラッグ、矢印キー移動
- PNG／JPEG／WEBP背景のローカル読み込み、暗転、ぼかし、cover表示
- フル画面透過PNG、タイトル部分PNG、背景込みPNG
- alpha境界を使った自動トリミングと32／64／128px余白
- 50種のオリジナルプリセット、カテゴリ、検索、サムネイル、お気に入り
- 見栄えが破綻しないプリセットベースのランダム生成
- 6種の定型サイズ、自由サイズ、50／70%セーフエリア、自動縮小
- 設定のlocalStorage保存（背景画像は保存しない）
- PC 2カラム／スマートフォン縦並びのレスポンシブUI
- 主要操作のキーボード対応とアクセシブルな操作名

## 構成

```text
app/                         ページ、全体テーマ、メタデータ
components/area-title-studio.tsx
components/studio/          編集UI、プリセット、Canvasプレビュー
src/data/                   50プリセット、フォント、中央記号
src/editor/                 Canvas描画、ドラッグ座標、PNG出力
src/state/                  初期状態、localStorage
src/types/                  TitleCard向けの共通型
```

Canvas描画はUIイベントから分離し、プレビューとPNG出力が同じ `renderTitleCard` を使用します。内部状態はエリア名専用ではなくTitleCardとして拡張できるため、Chapter、Boss、Quest、Date/Time、人物名初登場などの演出へ展開できます。

## MVP後の候補

- SVG出力
- WebM／APNG／GIFアニメーション出力
- Undo／Redo履歴
- 剣、翼、王冠、魔法陣などの追加SVGシンボル
- 複数タイトルカードの一括書き出し
