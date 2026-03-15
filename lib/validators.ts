/**
 * 验证字符串是否为有效的电子邮件格式。
 * @param value - 待验证的字符串
 * @returns 如果是有效邮箱返回 true
 */
export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * 验证密码强度。
 * 要求：至少 8 位，包含字母和数字。
 * @param password - 待验证的密码
 * @returns 验证结果对象，包含 valid 和 errors 字段
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('请输入密码');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('密码至少需要 8 位');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('密码需包含字母');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('密码需包含数字');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证密码强度（严格模式）。
 * 要求：至少 8 位，包含大小写字母、数字和特殊字符。
 * @param password - 待验证的密码
 * @returns 验证结果对象
 */
function validatePasswordStrict(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push('请输入密码');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('密码至少需要 8 位');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码需包含小写字母');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码需包含大写字母');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('密码需包含数字');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码需包含特殊字符');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
