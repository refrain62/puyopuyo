import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // グローバルなCSSをインポート
import App from './App'; // メインのAppコンポーネントをインポート

// アプリケーションのエントリーポイント
// public/index.htmlの'root'要素にReactアプリケーションをマウント
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement // 'root'要素を取得し、HTMLElementとして型アサーション
);

// Reactアプリケーションをレンダリング
// StrictModeは開発モードでのみ有効で、潜在的な問題を検出するのに役立つ
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
