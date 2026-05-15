// src/app/core/models/user.model.ts

export interface User {
  uid: string;
  name: string;
  email: string;
  gender: 'M' | 'F' | 'O';
  birthDate: string;       // 'YYYY-MM-DD'
  heightCm: number;
  weightKg: number;
  createdAt?: Date;
}

export interface EnergyBalance {
  id?: string;             // Firestore doc ID
  userId: string;
  recordDate: string;      // 'YYYY-MM-DD'
  bmi: number;
  caloriesIn: number;
  caloriesOut: number;
  netBalance: number;
  energyStatus: 'DEFICIENTE' | 'BALANCEADO' | 'EXCESIVO';
  createdAt?: Date;
}

export interface Food {
  id?: string;
  name: string;
  caloriesPerUnit: number;
  unit: string;
}

export interface Activity {
  id?: string;
  name: string;
  caloriesPerMinute: number;
}

export interface FoodLog {
  id?: string;
  userId: string;
  recordDate: string;
  foodId: string;
  foodName: string;
  quantity: number;
  caloriesPerUnit: number;
  unit: string;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  recordDate: string;
  activityId: string;
  activityName: string;
  minutes: number;
  caloriesPerMinute: number;
}

export interface DailyRecord {
  energyBalance: EnergyBalance;
  foodLogs: FoodLog[];
  activityLogs: ActivityLog[];
  aiAdvice?: string;
}
