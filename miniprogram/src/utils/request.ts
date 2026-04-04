import Taro from '@tarojs/taro';

// 统一配置 API 地址 — 其他页面从这里 import BASE_URL，不要各自硬编码
// API_BASE_URL 由 config/prod.js 和 config/dev.js 中的 defineConstants 在编译时注入。
// 生产构建：https://api.digrunningclub.com（需替换为实际已备案域名）
// 开发构建：http://192.168.1.5:3001
declare const API_BASE_URL: string;
declare const CLUB_ID: string;
declare const ENV_NAME: string;
declare const IMG_VERSION: string;
export const BASE_URL: string =
  typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://running.dingstock.net';
export const CLUB_ID_CONFIG: string =
  typeof CLUB_ID !== 'undefined' && CLUB_ID
    ? CLUB_ID
    : (ENV_NAME === 'prod' ? 'xbc3mQnYPR' : 'Pnkym4dvq4');

let cachedToken: string | null = null;

export const userManager = {
  getToken(): string {
    if (cachedToken !== null) return cachedToken;
    cachedToken = Taro.getStorageSync('token') || '';
    return cachedToken;
  },
  hasToken(): boolean {
    return !!userManager.getToken();
  },
  setToken(token: string) {
    const next = String(token || '')
      .trim()
      .replace(/^Bearer\s+/i, '')
      .replace(/^['"]|['"]$/g, '')
      .trim();
    cachedToken = next;
    Taro.setStorageSync('token', next);
  },
  clearToken() {
    cachedToken = '';
    Taro.removeStorageSync('token');
    Taro.removeStorageSync('userInfo');
  },
};

export function getToken(): string {
  return userManager.getToken();
}

export function setToken(token: string) {
  userManager.setToken(token);
}

export function clearToken() {
  userManager.clearToken();
}

export function cleanText(input: any): string {
  return String(input ?? '').trim().replace(/^`+|`+$/g, '').trim();
}

export function toNumber(input: any): number | undefined {
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
  if (typeof input === 'string' && input.trim()) {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function toNumberOrNull(input: any): number | null {
  return toNumber(input) ?? null;
}

export function toMs(input: any): number | undefined {
  const timestamp = toNumber(input);
  if (!timestamp || timestamp <= 0) return undefined;
  return timestamp < 1e12 ? timestamp * 1000 : timestamp;
}

export function toDate(input: any): Date | null {
  const ms = toMs(input);
  if (!ms) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function redirectToLogin() {
  Taro.redirectTo({ url: '/pages/login/index' });
}

export function isUnauthorizedError(error: unknown): boolean {
  return String((error as any)?.message || error || '').includes('Unauthorized');
}

export function handleRequestError(error: unknown, fallbackTitle: string) {
  if (isUnauthorizedError(error)) {
    Taro.showToast({ title: '请重新登录', icon: 'none' });
    setTimeout(redirectToLogin, 600);
    return;
  }

  Taro.showToast({ title: fallbackTitle, icon: 'none' });
}

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  auth?: boolean;
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, auth = true } = options;
  const token = String(getToken() || '').trim();
  const header: any = { 'Content-Type': 'application/json' };
  if (auth && token) {
    header['Authorization'] = /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else if (res.statusCode === 401) {
          if (auth) {
            clearToken();
            Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          }
          reject(new Error('Unauthorized'));
        } else {
          const msg = (res.data as any)?.msg || (res.data as any)?.message || '请求失败';
          Taro.showToast({ title: Array.isArray(msg) ? msg[0] : msg, icon: 'none' });
          reject(new Error(msg));
        }
      },
      fail: (err) => {
        const msg = (err as any)?.errMsg || '网络错误，请检查连接';
        Taro.showToast({ title: msg, icon: 'none' });
        reject(new Error(msg));
      },
    });
  });
}

export function normalizeImageUrl(input: any): string {
  const raw = cleanText(input);
  if (!raw) return '';

  const abs = /^https?:\/\//i.test(raw) ? raw : `${BASE_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
  const parts = abs.split('#');
  const base = parts[0];
  const hash = parts.length > 1 ? `#${parts.slice(1).join('#')}` : '';

  const hasParam = (url: string, key: string) => new RegExp(`([?&])${key}=`).test(url);
  const withParam = (url: string, key: string, value: string) => {
    if (hasParam(url, key)) return url;
    const joiner = url.includes('?') ? (url.endsWith('?') || url.endsWith('&') ? '' : '&') : '?';
    return `${url}${joiner}${key}=${encodeURIComponent(value)}`;
  };

  const isOss = /(\.oss-|\.aliyuncs\.com|dingstock)/i.test(base);
  const isHeic = /\.(heic|heif)(\?|$)/i.test(base);

  let next = base;
  if ((isOss || isHeic) && !hasParam(next, 'x-oss-process')) {
    next = withParam(next, 'x-oss-process', 'image/format,jpg');
  }

  const version =
    typeof IMG_VERSION !== 'undefined' && String(IMG_VERSION || '').trim()
      ? String(IMG_VERSION).trim()
      : '1';
  next = withParam(next, 'v', version);

  return `${next}${hash}`;
}
