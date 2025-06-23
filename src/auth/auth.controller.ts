import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SigninAuthDto, SignupAuthDto } from './dto';
import { GetTokens, GetUser, Public } from './decorator';
import { JwtRefreshGuard } from './guard';
import { TokensDto } from './dto/tokens.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup')
  signup(@Body() dto: SignupAuthDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  signin(@Body() dto: SigninAuthDto) {
    return this.authService.signin(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetUser('id') id: number) {
    return this.authService.logout(id);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  refreshToken(@GetTokens() tokens: TokensDto) {
    return this.authService.refreshToken(tokens);
  }
}
