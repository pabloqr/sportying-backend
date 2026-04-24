import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { GetUser, Public } from './decorator/index.js';
import { SigninAuthDto, SignupAuthDto } from './dto/index.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtRefreshGuard } from './guard/index.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupAuthDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signin(@Body() dto: SigninAuthDto) {
    return this.authService.signin(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() token: RefreshTokenDto) {
    return this.authService.refreshToken(token);
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  async signout(@GetUser('id') id: number) {
    return this.authService.signout(id);
  }
}
