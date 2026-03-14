'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import styles from './login.module.css';
import { isValidEmail } from '@/lib/validators';
import Image from 'next/image';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      if (!result?.ok) {
        setError('邮箱或密码错误');
        return;
      }

      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.loginRoot}>
      {/* Logo in top left */}
      <div className={styles.logoText}>
        <div className={styles.logoIcon}>
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
        <span className={styles.logoBrand}>JWORS</span>
      </div>

      {/* Main container with flex layout */}
      <div className={styles.mainContainer}>
        {/* Login card on the left */}
        <div className={styles.loginCard}>
          <div className={styles.welcomeText}>欢迎!</div>
          <div className={styles.title}>登录</div>
          <div className={styles.subtitle}>AI 驱动的开发效率平台</div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              <span className={styles.labelText}>邮箱</span>
              <input
                type="text"
                name="email"
                className={styles.input}
                placeholder="请输入邮箱地址"
                autoComplete="email"
                disabled={loading}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className={styles.label}>
              <span className={styles.labelText}>密码</span>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className={styles.input}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  disabled={loading}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <div className={styles.optionsRow}>
              <div className={styles.rememberMe}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  className={styles.checkbox}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMe" className={styles.rememberLabel}>
                  记住我
                </label>
              </div>
              <a href="#" className={styles.forgotLink}>
                忘记密码?
              </a>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? '加载中...' : '登录'}
            </button>

            <a href="/register" className={styles.link}>
              没有账号? 立即注册
            </a>
          </form>
        </div>
      </div>

      {/* Illustration on the right side */}
      <div className={styles.illustrationWrapper}>
        <Image
          src="/images/login-illustration.svg"
          alt="Team discussing ideas"
          width={827}
          height={650}
          priority
        />
      </div>
    </main>
  );
}