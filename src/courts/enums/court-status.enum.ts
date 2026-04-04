export enum CourtStatus {
  OPEN = 'OPEN',
  MAINTENANCE = 'MAINTENANCE',
  BLOCKED = 'BLOCKED',
  WEATHER = 'WEATHER',
}

export const INACTIVE_COURT_STATUS = new Set([CourtStatus.BLOCKED, CourtStatus.MAINTENANCE]);
