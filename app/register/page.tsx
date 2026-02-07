'use client';

import { useState } from 'react';
import styles from './register.module.css';
import { message } from 'antd';
import { isValidEmail } from '@/lib/validators';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidEmail(email)) {
      message.error({ content: '请输入正确的邮箱地址' });
      return;
    }
    if (!password) {
      message.error({ content: '请输入密码' });
      return;
    }
    if (password !== confirmPassword) {
      message.error({ content: '请输入相同的密码' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: String(email),
          password: String(password),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        message.success({ content: '注册成功' });
      }
    } catch (err) {
      message.error({ content: '接口请求失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`main route-single ${styles.registerRoot}`}>
      <section className={`panel ${styles.registerPanel}`}>
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

        <div className={styles.title}>创建账户</div>
        <div className={styles.subtitle}>填写信息以注册新用户</div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            邮箱
            <input
              type="email"
              name="email"
              className={`input ${styles.input}`}
              placeholder="name@domain.com"
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
              placeholder="设置密码"
              autoComplete="new-password"
              disabled={loading}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className={styles.label}>
            确认密码
            <input
              type="password"
              name="confirmPassword"
              className={`input ${styles.input}`}
              placeholder="再次输入密码"
              autoComplete="new-password"
              disabled={loading}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          <button className={`button button-primary ${styles.submit}`} type="submit" disabled={loading}>
            {loading ? '正在注册...' : '注册'}
          </button>
          <a href="/login" className={styles.link}>
            已有账号？去登录
          </a>
        </form>
      </section>
    </main>
  );
}
