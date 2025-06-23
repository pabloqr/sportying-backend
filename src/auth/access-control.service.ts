import { Injectable } from '@nestjs/common';
import { Role } from './enums/role.enum';

interface RolePair {
  currentRole: Role;
  requiredRole: Role;
}

@Injectable()
export class AccessControlService {
  private hierarchies: Array<Map<string, number>> = [];
  private priority: number = 1;

  /**
   * Creates an instance of the class with specified hierarchies and an optional priority.
   */
  constructor() {
    this.buildHierarchy([Role.ANONYMOUS, Role.DEVICE, Role.USER, Role.ADMIN]);
  }

  /**
   * Builds a hierarchical structure for the given roles and updates the internal hierarchy and priority.
   *
   * @param {Role[]} roles - An array of roles to process for creating the hierarchy.
   * @return {void} This method does not return a value.
   */
  private buildHierarchy(roles: Role[]): void {
    const hierarchy: Map<string, number> = new Map();
    roles.forEach((role) => {
      hierarchy.set(role, this.priority);
      this.priority++;
    });
    this.hierarchies.push(hierarchy);
  }

  /**
   * Determines if the current role is authorized based on its priority in a given role hierarchy.
   *
   * @param {Object} RolePair - An object containing the current and required roles.
   * @param {string} RolePair.currentRole - The role of the current user.
   * @param {string} RolePair.requiredRole - The role required for authorization.
   * @return {boolean} Returns true if the current role's priority is greater than or equal to the required role's
   * priority in any hierarchy. Returns false otherwise.
   */
  public isAuthorized({ currentRole, requiredRole }: RolePair): boolean {
    // Se procesa cada jerarquía
    for (const hierarchy of this.hierarchies) {
      // Se trata de obtener la prioridad de los roles dados
      const currentPriority = hierarchy.get(currentRole);
      const requiredPriority = hierarchy.get(requiredRole);

      // Se verifica la existencia de los roles en esta jerarquía y, en caso afirmativo, se comprueba si el rol dado
      // está autorizado
      if (currentPriority && requiredPriority) {
        return currentPriority >= requiredPriority;
      }
    }

    return false;
  }
}
