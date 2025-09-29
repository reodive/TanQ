# AWS Amplify デプロイメント設定ガイド

## 問題の概要
本番環境で `DATABASE_URL` が読まれず、Prisma が `Invalid prisma.school.findFirst()` エラーになる問題の解決方法。

## 必要な環境変数

### 1. 必須環境変数
```bash
DATABASE_URL=postgresql://username:password@host:port/database_name
JWT_SECRET=your-jwt-secret-key
NEXTAUTH_SECRET=your-nextauth-secret-key
```

### 2. オプション環境変数
```bash
ENABLE_GUEST_ACCESS=true
NODE_ENV=production
```

## AWS Amplify での環境変数設定

### 手順 1: Amplify コンソールでの設定
1. AWS Amplify コンソールにログイン
2. プロジェクトを選択
3. 左メニューから「Environment variables」を選択
4. 「Manage variables」をクリック

### 手順 2: 環境変数の追加
以下の環境変数を追加：

```
Variable name: DATABASE_URL
Value: postgresql://[username]:[password]@[host]:[port]/[database]

Variable name: JWT_SECRET
Value: [your-secure-jwt-secret]

Variable name: NEXTAUTH_SECRET
Value: [your-secure-nextauth-secret]

Variable name: NODE_ENV
Value: production

Variable name: ENABLE_GUEST_ACCESS
Value: true
```

### 手順 3: ビルド設定の確認
`amplify.yml` ファイルが存在する場合、以下の設定を確認：

```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
            - npx prisma generate
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
    appRoot: .
```

## デバッグ用コマンド

### ローカルでのテスト
```bash
# データベース接続テスト
npm run test:db

# 開発サーバー起動
npm run dev

# ビルドテスト
npm run build
```

### 環境変数の確認
本プロジェクトでは、以下のファイルで環境変数の状態を確認できます：

- `lib/prisma.ts` - DATABASE_URL の存在確認とログ出力
- `scripts/test-db-connection.ts` - データベース接続テスト
- `/app/api/auth/guest/route.ts` - API実行前の接続確認

## トラブルシューティング

### 1. DATABASE_URL が読まれない場合
- Amplify の環境変数設定を再確認
- 変数名にスペースや特殊文字が含まれていないか確認
- デプロイを再実行

### 2. Prisma エラーが継続する場合
```bash
# Prismaクライアントの再生成
npx prisma generate

# データベースマイグレーション
npx prisma migrate deploy
```

### 3. ログの確認
- Amplify のビルドログを確認
- CloudWatch ログを確認
- 本アプリケーションの console.log 出力を確認

## セキュリティ考慮事項

1. **機密情報の保護**
   - データベースパスワードは強力なものを使用
   - JWT_SECRET は最低32文字の安全な文字列を使用
   - 環境変数にハードコードされた値を使用しない

2. **アクセス制御**
   - データベースへのアクセスは必要最小限に制限
   - VPC設定がある場合は適切に設定

## 接続確認手順

1. **環境変数設定後**
   ```bash
   npm run test:db
   ```

2. **本番デプロイ後**
   - `/api/auth/guest` エンドポイントにアクセス
   - ログでデータベース接続状況を確認

3. **エラー時の対応**
   - ログを確認してエラーの詳細を特定
   - 環境変数の値を再確認
   - 必要に応じてAmplifyの再デプロイを実行