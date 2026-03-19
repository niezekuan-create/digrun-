import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: (() => {
        const s = process.env.JWT_SECRET;
        if (!s || s === 'digrun-secret-key') {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET must be set in production environment');
          }
          console.warn('[SECURITY] JWT_SECRET is not set — using insecure default. Set JWT_SECRET in .env before going live.');
        }
        return s || 'digrun-secret-key';
      })(),
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
