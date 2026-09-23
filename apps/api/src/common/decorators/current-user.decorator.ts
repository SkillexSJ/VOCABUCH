import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DEFAULT_USER_ID } from '../constants';

export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // When authentication is implemented in the future, request.user.id will be used.
    // For now, it returns the standard unauthenticated default-user.
    return request.user?.id || DEFAULT_USER_ID;
  },
);
