import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetTokens = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const accessToken = request.headers.authorization
      ?.replace('Bearer', '')
      .trim();
    const refreshToken = request.body.refreshToken;

    return { accessToken, refreshToken };
  },
);
