import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();

  if (data) {
    return request.user[data];
  }

  const userWithoutPrivateInfo = { ...request.user } as Partial<typeof request.user>;
  delete userWithoutPrivateInfo.password;
  delete userWithoutPrivateInfo.refresh_token;

  return userWithoutPrivateInfo;
});
