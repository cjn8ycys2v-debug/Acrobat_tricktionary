# ダブルダッチ・アクロ技図鑑

競技者向けのダブルダッチ用アクロバット技図鑑 MVP です。PDF由来のレベルテストを初期データ化し、検索・分類探索、技詳細、学習グラフ、管理画面の入口を実装しています。

## Run

```bash
npm install
npm run dev
```

依存を入れられない環境では、ルートディレクトリで簡易HTTPサーバーを立てて `preview/index.html` を確認できます。

```bash
python3 -m http.server 4173
open http://127.0.0.1:4173/preview/
```

## Environment

Supabase連携を有効にする場合は以下を設定します。

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

DBスキーマは `supabase/migrations/001_initial_schema.sql` にあります。初期実装は環境変数がない場合でも、`data/atlas-data.json` のローカルseedデータで動くようにしています。
Supabaseへ初期データを流し込むSQLは以下で生成できます。

```bash
npm run seed:sql:write
```

## Data Validation

```bash
npm run validate:data
```

`scripts/validate-data.mjs` はレベル表、技slug、相関の循環を検証します。

## Main Routes

- `/tricks`: 無料図鑑、検索、分類探索
- `/levels`: PDF由来のレベルテスト表
- `/map`: 前提・派生の相関マップ
- `/admin`: 技データ、動画、タグ、分類、相関、レベル表の管理入口
