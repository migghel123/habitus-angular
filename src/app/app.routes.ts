// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [noAuthGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
    canActivate: [noAuthGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/registro/registro.component').then(m => m.RegistroComponent),
    canActivate: [authGuard]
  },
  {
    path: 'historial',
    loadComponent: () => import('./features/historial/historial.component').then(m => m.HistorialComponent),
    canActivate: [authGuard]
  },
  {
    path: 'imc',
    loadComponent: () => import('./features/imc/imc.component').then(m => m.ImcComponent),
    canActivate: [authGuard]
  },
  {
    path: 'cuenta',
    loadComponent: () => import('./features/cuenta/cuenta.component').then(m => m.CuentaComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'dashboard' }
];
