# GitHub Pages デプロイ設定ガイド

このプロジェクトをGitHub Pagesにデプロイすることができます。

## GitHub Pagesの有効化

1. GitHubリポジトリのページにアクセス
2. **Settings** タブをクリック
3. 左サイドバーの **Pages** を選択
4. **Source** セクションで **GitHub Actions** を選択

## 必要なGitHub Secrets

以下のSecretsをGitHubリポジトリに設定する必要があります：

### アプリケーション環境変数
- `VITE_API_ENDPOINT`: APIエンドポイントURL
- `VITE_SHOP_ID`: ショップID（loginのメールアドレス）
- `VITE_API_KEY`: APIキー
- `VITE_TAX_MODE`: 税額モード（`inclusive` | `exclusive` | `none`）
- `VITE_TAX_RATE`: 税率（例: `10`）

## GitHub Secretsの設定方法

1. GitHubリポジトリのページにアクセス
2. **Settings** タブをクリック
3. 左サイドバーの **Secrets and variables** → **Actions** を選択
4. **New repository secret** ボタンをクリック
5. 上記の各Secretを1つずつ追加

## デプロイの実行

### 自動デプロイ
- `main` ブランチへのpush時に自動的に実行されます

### 手動デプロイ
1. GitHubリポジトリの **Actions** タブにアクセス
2. 左サイドバーから **Deploy to GitHub Pages** ワークフローを選択
3. **Run workflow** ボタンをクリック

## アクセスURL

デプロイ後、以下のURLでアクセスできます：
- `https://<username>.github.io/<repository-name>/`

例: `https://kvitanco05.github.io/customer_publish_sample/`

URLは、GitHub Actions の実行結果やSettings > Pagesから確認できます。

## AWS vs GitHub Pages の比較

### GitHub Pages
**メリット:**
- 無料で利用可能（Publicリポジトリの場合）
- セットアップが簡単
- GitHubアカウントのみで完結

**デメリット:**
- カスタムドメインの設定が限定的
- CDNの配信拠点が限られる
- AWS認証情報が不要（管理が簡単）

### AWS (S3 + CloudFront)
**メリット:**
- より柔軟なカスタマイズが可能
- グローバルなCDN配信（CloudFront）
- カスタムドメインやSSL証明書の完全な制御

**デメリット:**
- AWSアカウントと認証情報が必要
- 利用料金が発生する可能性
- セットアップがやや複雑

## 推奨

- **開発・テスト環境**: GitHub Pages
- **本番環境**: AWS (S3 + CloudFront)

両方のワークフローを有効にして、GitHub PagesをステージングやデモとしてAWSを本番として使い分けることも可能です。
