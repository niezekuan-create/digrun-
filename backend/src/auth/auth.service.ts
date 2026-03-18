import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async wechatLogin(code: string, deviceId?: string) {
    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;

    let openid: string;

    // Dev mode: skip WeChat API when credentials are not configured
    if (!appid || !secret || appid === 'YOUR_APPID') {
      // Use stable device_id if provided, otherwise fall back to code prefix
      openid = deviceId ? `dev_${deviceId}` : `dev_${code.slice(0, 16)}`;
    } else {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
      try {
        const res = await axios.get(url);
        if (res.data.errcode) {
          throw new UnauthorizedException(`WeChat error: ${res.data.errmsg}`);
        }
        openid = res.data.openid;
      } catch (e) {
        if (e instanceof UnauthorizedException) throw e;
        throw new UnauthorizedException('Failed to connect to WeChat API');
      }
    }

    let user = await this.usersService.findByOpenid(openid);
    if (!user) {
      user = await this.usersService.create({
        wechat_openid: openid,
        nickname: '跑者' + Math.floor(Math.random() * 10000),
      });
    }

    const payload = { sub: user.id, openid: user.wechat_openid, is_admin: user.is_admin };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
