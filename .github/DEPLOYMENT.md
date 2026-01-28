# GitHub Actions 自動デプロイ設定ガイド

このプロジェクトは、mainブランチへの変更が自動的にAWS（S3 + CloudFront）にデプロイされるように設定されています。

## 必要なGitHub Secrets

以下のSecretsをGitHubリポジトリに設定する必要があります：

### AWS認証情報
- `AWS_ACCESS_KEY_ID`: AWSアクセスキーID
- `AWS_SECRET_ACCESS_KEY`: AWSシークレットアクセスキー

### アプリケーション環境変数
- `VITE_API_ENDPOINT`: APIエンドポイントURL
- `VITE_SHOP_ID`: ショップID（loginのメールアドレス）
- `VITE_API_KEY`: APIキー
- `VITE_TAX_MODE`: 税額モード（`inclusive` | `exclusive` | `none`）
- `VITE_TAX_RATE`: 税率（例: `10`）

### AWSリソース情報
- `S3_BUCKET_NAME`: S3バケット名 (現在: `kvitanco-receipt-hosting-sitebucket-r5o24lsasaqk`)
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFrontディストリビューションID (現在: `E3USN73696574D`)

## GitHub Secretsの設定方法

1. GitHubリポジトリのページにアクセス
2. **Settings** タブをクリック
3. 左サイドバーの **Secrets and variables** → **Actions** を選択
4. **New repository secret** ボタンをクリック
5. 上記の各Secretを1つずつ追加

## AWS IAMポリシー

GitHub ActionsからAWSにアクセスするために、以下の権限を持つIAMユーザーを作成することを推奨します：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::kvitanco-receipt-hosting-sitebucket-r5o24lsasaqk",
        "arn:aws:s3:::kvitanco-receipt-hosting-sitebucket-r5o24lsasaqk/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::*:distribution/E3USN73696574D"
    }
  ]
}
```

## デプロイの実行

### 自動デプロイ
- `main` ブランチへのpush時に自動的に実行されます

### 手動デプロイ
1. GitHubリポジトリの **Actions** タブにアクセス
2. 左サイドバーから **Deploy to AWS** ワークフローを選択
3. **Run workflow** ボタンをクリック

## トラブルシューティング

### ビルドが失敗する場合
- 全ての環境変数（VITE_*）が正しく設定されているか確認
- `package.json` の依存関係が最新か確認

### デプロイが失敗する場合
- AWS認証情報が正しく設定されているか確認
- IAMユーザーに必要な権限があるか確認
- S3バケット名とCloudFrontディストリビューションIDが正しいか確認

### キャッシュの問題
- CloudFrontのキャッシュ無効化が自動的に実行されますが、反映に数分かかる場合があります
