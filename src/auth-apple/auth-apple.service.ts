import { Injectable } from '@nestjs/common';
import appleSigninAuth from 'apple-signin-auth';
import { ConfigService } from '@nestjs/config';
import { SocialInterface } from '../social/interfaces/social.interface';
import { AuthAppleLoginDto } from './dto/auth-apple-login.dto';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class AuthAppleService {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  async getProfileByToken(
    loginDto: AuthAppleLoginDto,
  ): Promise<SocialInterface> {
    const data = await appleSigninAuth.verifyIdToken(loginDto.idToken, {
      audience: this.configService.get('apple.appAudience', { infer: true }),
    });

    // Apple types this claim as `'true' | 'false' | boolean`, so both truthy
    // forms are matched explicitly and anything else fails closed.
    const emailVerified =
      data.email_verified === true || data.email_verified === 'true';

    return {
      providerSubject: data.sub,
      email: data.email,
      emailVerified,
      firstName: loginDto.firstName,
      lastName: loginDto.lastName,
    };
  }
}
