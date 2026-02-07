'use client';

import { useState } from 'react';
import styles from './login.module.css';
import { isValidEmail } from '@/lib/validators';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('请输入正确的邮箱地址');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    try {
      const result = await fetch('/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: String(email),
          password: String(password),
        }),
      });
      await result.json();
      // TODO: wire to real auth endpoint
      await new Promise((resolve) => setTimeout(resolve, 300));
      setError('登录接口未接入');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`main route-single ${styles.loginRoot}`}>
      <section className={`panel ${styles.loginPanel}`}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path
                d="M10 44c0-12 8-22 20-22 6 0 10 2 14 6l10-10c-8-8-16-12-24-12C12 6 0 20 0 38c0 11 4 20 12 26l8-8c-6-4-10-8-10-12z"
                fill="currentColor"
              />
              <path
                d="M54 30c0 12-8 22-20 22-6 0-10-2-14-6L10 56c8 8 16 12 24 12 18 0 30-14 30-32 0-11-4-20-12-26l-8 8c6 4 10 8 10 12z"
                fill="currentColor"
                opacity="0.7"
              />
            </svg>
          </div>
          <div className={styles.wordmark}>
            <div className={styles.name}>JWORS</div>
            <div className={styles.tagline}>Structured Workflows</div>
          </div>
        </div>

        <div className={styles.title}>欢迎回来</div>
        <div className={styles.subtitle}>请登录以继续使用控制台</div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            邮箱地址
            <input
              type="text"
              name="email"
              className={`input ${styles.input}`}
              placeholder="输入登录邮箱"
              autoComplete="email"
              disabled={loading}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className={styles.label}>
            密码
            <input
              type="password"
              name="password"
              className={`input ${styles.input}`}
              placeholder="输入密码"
              autoComplete="current-password"
              disabled={loading}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className={`button button-primary ${styles.submit}`} type="submit" disabled={loading}>
            {loading ? '正在登录...' : '登录'}
          </button>
          <a href="/register" className={styles.link}>
            没有账号？去注册
          </a>
          {error && <div className="status errmsg">Error: {error}</div>}
        </form>
      </section>
    </main>
  );
}
