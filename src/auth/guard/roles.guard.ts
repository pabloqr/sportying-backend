import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AccessControlService } from '../../auth/access-control.service.js';
import { ROLES_KEY } from '../../auth/decorator/index.js';
import { Role } from '../../auth/enums/index.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessControl: AccessControlService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Tratar de obtener los roles especificados en la cabecera de los métodos de las peticiones
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    // Comprobar si se requiere algún rol
    if (!roles?.length) {
      return true;
    }

    // Obtener el usuario y su rol
    const { user } = context.switchToHttp().getRequest();
    const currentRole = user?.role ? Role[user.role as keyof typeof Role] : Role.NONE;

    // Verificar si el usuario está autorizado (tiene el rol necesario)
    return roles.some((role) =>
      this.accessControl.isAuthorized({
        currentRole,
        requiredRole: Role[role as keyof typeof Role],
      }),
    );
  }
}

