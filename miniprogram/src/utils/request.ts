import Taro from '@tarojs/taro';

// 统一配置 API 地址 — 其他页面从这里 import BASE_URL，不要各自硬编码
// API_BASE_URL 由 config/prod.js 和 config/dev.js 中的 defineConstants 在编译时注入。
// 生产构建：https://api.digrunningclub.com（需替换为实际已备案域名）
// 开发构建：http://192.168.1.5:3001
declare const API_BASE_URL: string;
export const BASE_URL: string = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://running.dingstock.net';

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
    const next = token || '';
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

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  auth?: boolean;
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, auth = true } = options;
  const token = getToken();
  const header: any = { 'Content-Type': 'application/json' };
  if (auth && token) {
    header['Authorization'] = `Bearer ${token}`;
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
          if (auth && process.env.NODE_ENV === 'production') {
            clearToken();
            Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          }
          reject(new Error('Unauthorized'));
        } else {
          const msg = (res.data as any)?.message || '请求失败';
          Taro.showToast({ title: Array.isArray(msg) ? msg[0] : msg, icon: 'none' });
          reject(new Error(msg));
        }
      },
      fail: (err) => {
        Taro.showToast({ title: '网络错误，请检查连接', icon: 'none' });
        reject(err);
      },
    });
  });
}
