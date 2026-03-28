import Taro from '@tarojs/taro';
import { request, userManager } from './request';

export interface UserInfo {
  id: string | number;
  nickname?: string;
  username?: string;
  avatar?: string;
  phone?: string;
  city?: string;
  wechat_openid?: string;
  is_admin?: boolean;
  created_at?: string;
}

export function getUserInfo(): UserInfo | null {
  const info = Taro.getStorageSync('userInfo');
  return info || null;
}

export function setUserInfo(user: UserInfo) {
  Taro.setStorageSync('userInfo', user);
}

export function isLoggedIn(): boolean {
  return userManager.hasToken();
}

export async function login(wxLoginCode: string): Promise<void> {
  if (!wxLoginCode) throw new Error('no_wx_login_code');
  const payload = { wxLoginCode };

  const res: any = await request<any>({
    url: '/api/auth/wechat/login',
    method: 'POST',
    data: payload,
    auth: false,
  });
  if (res?.err) throw new Error(res?.msg || res?.message || 'login_failed');

  const token =
    (typeof res?.data === 'string' ? res.data : '') ||
    res?.access_token ||
    res?.token ||
    res?.data?.access_token ||
    res?.data?.token ||
    res?.data?.data?.token;
  if (!token) throw new Error('no_token');
  userManager.setToken(token);
}

export function logout() {
  userManager.clearToken();
  Taro.reLaunch({ url: '/pages/login/index' });
}
