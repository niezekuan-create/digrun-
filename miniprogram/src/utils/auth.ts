import Taro from '@tarojs/taro';
import { request, setToken, clearToken } from './request';

export interface UserInfo {
  id: number;
  nickname: string;
  avatar?: string;
  phone?: string;
  city?: string;
  wechat_openid: string;
  is_admin: boolean;
  created_at: string;
}

export function getUserInfo(): UserInfo | null {
  const info = Taro.getStorageSync('userInfo');
  return info || null;
}

export function setUserInfo(user: UserInfo) {
  Taro.setStorageSync('userInfo', user);
}

export function isLoggedIn(): boolean {
  return !!Taro.getStorageSync('token');
}

function getStableDeviceId(): string {
  let id = Taro.getStorageSync('_drc_device_id');
  if (!id) {
    id = 'drc_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    Taro.setStorageSync('_drc_device_id', id);
  }
  return id;
}

export async function login(): Promise<void> {
  let code: string;
  try {
    const loginRes = await new Promise<Taro.login.SuccessCallbackResult>((resolve, reject) => {
      Taro.login({ success: resolve, fail: reject });
    });
    code = loginRes.code;
  } catch (e) {
    code = 'dev_' + Date.now();
  }

  const deviceId = getStableDeviceId();
  const res = await request<{ access_token: string; user: UserInfo }>({
    url: '/auth/login',
    method: 'POST',
    data: { code, device_id: deviceId },
    auth: false,
  });

  setToken(res.access_token);
  setUserInfo(res.user);
}

export function logout() {
  clearToken();
  Taro.reLaunch({ url: '/pages/login/index' });
}
