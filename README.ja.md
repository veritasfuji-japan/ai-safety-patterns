# AI Safety Patterns

![One approval, 32 concurrent requests: forced race 32 grants; atomic in-memory consumption 1 grant, 31 denials](assets/social-preview.svg)

**1回の承認。1回の権限消費。**

**[▶ ブラウザで体験する（インストール不要）](https://veritasfuji-japan.github.io/ai-safety-patterns/)**

[English](README.md) · [デモのソース](demo/index.html) · [VERITAS OS](https://github.com/veritasfuji-japan/veritas_os)

AIエージェントの安全設計を、失敗例と改善例の比較で学ぶ教材です。APIキー・外部ライブラリ・外部操作は不要です。

## パターン01：実行権限の単回消費

1回だけ許可された操作に対し、32のワーカーが同時に権限を消費しようとするとどうなるでしょうか。

| 意図的に競合を発生させた設計 | 原子的なメモリ内消費 |
| --- | --- |
| 32許可・0拒否 | 1許可・31拒否 |

## 試す

リポジトリを取得し、ルートでPython 3.10以上を使用して実行します。

```sh
python -m unittest -v
```

`demo/index.html` をブラウザで開くと日英対応の教材を操作できます。デモは決定論的なシミュレーションです。Pythonテストでは実スレッドを使い、危険な順序を意図的に発生させます。

## 改善の原理

確認と更新が別々だと複数の要求が未消費状態を観測できます。ロックで確認と更新を一体化することで、単一プロセス内の同じオブジェクトに対する消費を1回に制限します。

## 保証しないこと

教育用コードであり、本番用セキュリティ製品ではありません。承認の真正性、対象との紐付け、再起動後の永続化、プロセス間の調整、取消し、外部処理の一回限りの成立は保証しません。許可は送信や成功の証明ではありません。外部操作は実行しません。

## VERITASとの関係

[VERITAS OS](https://github.com/veritasfuji-japan/veritas_os) の思想に基づく独立教材です。本体の認証や検証結果を示すものではありません。実装済みはパターン01のみです。

## ライセンス

[MIT](LICENSE)。
