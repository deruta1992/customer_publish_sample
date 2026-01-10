# WEB領収証発行予約システム

## 概要
お客様がWEB上からセルフで領収証発行を予約できる静的Webアプリです。

- TypeScript + Vite構成（静的ファイルをそのままレンタルサーバーへ配置可能）
- 合計のみを入力し、税額/小計はクライアントで自動計算
- 利用場所・宛名・メールアドレス・取引日時の全項目を必須入力
- 電話番号は取得せず、メールアドレスを基軸に受付
- 利用約款は `public/terms.md` のMarkdownをレンダリングして表示
- 店舗IDやAPIキーはViteの環境変数経由で注入し、リポジトリには平文を残さない

## 開発・ビルド方法

```sh
cp .env.example .env.local   # 環境変数を設定（ファイルはgitignore済み）
npm install
npm run dev                  # ローカル確認
npm run build                # 静的ファイルを生成（dist/）
```

`dist/`配下に静的ファイルが出力されます。`npm run preview` で最終確認も可能です。

## 環境変数の設定

`.env.local`（Gitにコミットされません）に以下を設定してください。雛形は `.env.example` を参照します。

```dotenv
VITE_API_ENDPOINT=https://...
VITE_SHOP_ID=your-shop-id # loginのメールアドレス
VITE_API_KEY=your-api-key #管理画面から出力できるAPIキー
VITE_TAX_MODE=inclusive   # inclusive | exclusive | none
VITE_TAX_RATE=10
```

GitHub Pages等で自動ビルドする場合は、同じキーをGitHub Secretsに登録し、Workflow内で `env` として渡すことでリポジトリに平文を残さずに済みます。

## GitHub Pages へのデプロイ例

`vite.config.ts` の `base: './'` により、リポジトリ配下（`https://<user>.github.io/<repo>/`）でも相対パスで動作します。GitHub Actionsでデモ環境を公開する場合は下記のようなWorkflowを作成してください。

```yaml
name: Deploy
on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
        env:
          VITE_API_ENDPOINT: ${{ secrets.VITE_API_ENDPOINT }}
          VITE_SHOP_ID: ${{ secrets.VITE_SHOP_ID }}
          VITE_API_KEY: ${{ secrets.VITE_API_KEY }}
          VITE_TAX_MODE: ${{ secrets.VITE_TAX_MODE }}
          VITE_TAX_RATE: ${{ secrets.VITE_TAX_RATE }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

  ## S3 + CloudFront へのデプロイ（CloudFormation）

  SPA一式をAmazon S3/CloudFrontで配信するためのテンプレートを [infra/cloudfront-s3-stack.yaml](infra/cloudfront-s3-stack.yaml) に用意しています。既存バケットがなくてもスタック作成時に自動的にS3/CloudFrontを作成します。

  1. ビルド
    ```sh
    npm run build
    ```
  2. CloudFormationスタックの作成／更新（`SiteBucketName` や `LogsBucketName` は空欄にするとAWS側で一意の名前が採番されます）
    ```sh
    aws cloudformation deploy \
      --stack-name kvitanco-receipt-hosting \
      --template-file infra/cloudfront-s3-stack.yaml \
      --capabilities CAPABILITY_NAMED_IAM \
      --parameter-overrides SiteBucketName="" LogsBucketName="" PriceClass=PriceClass_100 CertificateArn=""
    ```
  3. 成功後、Outputsに表示される `SiteBucketNameOutput` を使って静的ファイルをアップロードします。
    ```sh
    aws s3 sync dist/ s3://<SiteBucketNameOutput>/ --delete
    ```
  4. 変更を即時反映したい場合はCloudFrontディストリビューションを無効化せず、Invalidationを発行します。
    ```sh
    aws cloudfront create-invalidation \
      --distribution-id <CloudFrontDistributionId> \
      --paths "/*"
    ```

  テンプレートにはCloudFront Origin Access Identity、S3バケットポリシー、ログ保存バケット、SPA向けの 403/404 → index.html リダイレクトなどが含まれています。バケットや証明書を既存のものに合わせたい場合はパラメーターを指定してください。

## ディレクトリ構成（抜粋）

- `index.html`
- `src/main.ts`
- `src/env.ts`
- `src/style.css`
  - `infra/cloudfront-s3-stack.yaml`
- `public/terms.md`
- `.env.example`

本番用の `.env.local` はコミットしないように注意してください。
