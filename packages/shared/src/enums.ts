export const UserRole = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AppointmentStatus = {
  REQUESTED: 'REQUESTED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const DocumentKind = {
  LAB_REPORT: 'LAB_REPORT',
  SCAN: 'SCAN',
  OTHER: 'OTHER',
} as const;
export type DocumentKind = (typeof DocumentKind)[keyof typeof DocumentKind];

export const NotificationChannel = {
  PUSH: 'PUSH',
  EMAIL: 'EMAIL',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

/** Drug categories that need an explicit flag on a teleconsultation prescription. */
export const DrugCategoryFlag = {
  OTC: 'OTC',
  SCHEDULE_H: 'SCHEDULE_H',
  SCHEDULE_H1: 'SCHEDULE_H1',
  SCHEDULE_X: 'SCHEDULE_X',
} as const;
export type DrugCategoryFlag = (typeof DrugCategoryFlag)[keyof typeof DrugCategoryFlag];

export const API_PREFIX = '/api/v1';
