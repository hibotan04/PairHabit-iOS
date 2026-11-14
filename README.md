# Pair Habit

二人で習慣と目標を共有し、達成を記録するiPhoneアプリです。

[App Storeで見る](https://apps.apple.com/jp/app/id6756465441)

## 技術構成

TypeScript、React Native、Expo、NativeWind。iOSウィジェットはSwift、SwiftUI、WidgetKitで実装しています。

## 実装

- [src/screens/HomeScreen.tsx](src/screens/HomeScreen.tsx)
- [targets/HabitWidget/index.swift](targets/HabitWidget/index.swift)

## 開発環境での起動

独自のFirebaseプロジェクトのAuth・Firestore・Storageとアクセスルールを設定し、.env.exampleを.envにコピーしてクライアント設定を入力します。GoogleサインインにはInfo.plistのURLスキーム、通知にはEASプロジェクト、課金にはRevenueCatの設定が必要です。app.jsonのexpo.ios.appleTeamIdに自身のチームIDを設定し、Xcodeで署名とApp Groupsを設定してください。

```sh
npm ci --legacy-peer-deps
cd ios && bundle install && bundle exec pod install && cd ..
npx expo run:ios
```

このリポジトリは開発版のソースをポートフォリオ用に整理したものです。
