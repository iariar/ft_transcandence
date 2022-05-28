import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// import { Profile } from 'passport-42';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: Express.Request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

