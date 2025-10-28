import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../access-control.service';
import { Observable } from 'rxjs';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessControl: AccessControlService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Se trata de obtener los roles especificados en la cabecera de los métodos de las peticiones
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se comprueba si se requiere algún rol
    if (!roles?.length) {
      return true;
    }

    // Se obtiene el usuario y su rol
    const { user } = context.switchToHttp().getRequest();
    const currentRole = user?.role
      ? Role[user.role as keyof typeof Role]
      : Role.NONE;

    // Se verifica si el usuario está autorizado (tiene el rol necesario)
    return roles.some((role) =>
      this.accessControl.isAuthorized({
        currentRole,
        requiredRole: Role[role as keyof typeof Role],
      }),
    );
  }
}
