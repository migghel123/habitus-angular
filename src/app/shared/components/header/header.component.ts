// src/app/shared/components/header/header.component.ts
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <a routerLink="/dashboard" class="topbar-logo">
        <span class="logo-text">Habitus</span>
      </a>

      <nav class="nav-desktop">
        <a routerLink="/dashboard"  routerLinkActive="nav-active" class="nav-link">Inicio</a>
        <a routerLink="/registro"   routerLinkActive="nav-active" class="nav-link">Registro diario</a>
        <a routerLink="/historial"  routerLinkActive="nav-active" class="nav-link">Historial</a>
        <a routerLink="/imc"        routerLinkActive="nav-active" class="nav-link">Calcular IMC</a>
        <a routerLink="/cuenta"     routerLinkActive="nav-active" class="nav-link">Mi cuenta</a>
        <button class="nav-link nav-logout-link" (click)="logout()">Cerrar sesión</button>
      </nav>

      <div class="topbar-right">
        <span class="topbar-user">{{ auth.currentUser()?.name?.split(' ')?.[0] }}</span>
        <button class="burger" [class.open]="drawerOpen()" (click)="toggleDrawer()" aria-label="Menú">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>

    <div class="drawer-overlay" [class.open]="drawerOpen()" (click)="closeDrawer()"></div>
    <nav class="nav-drawer" [class.open]="drawerOpen()">
      <a routerLink="/dashboard"  (click)="closeDrawer()" routerLinkActive="nav-active" class="nav-link">Inicio</a>
      <a routerLink="/registro"   (click)="closeDrawer()" routerLinkActive="nav-active" class="nav-link">Registro diario</a>
      <a routerLink="/historial"  (click)="closeDrawer()" routerLinkActive="nav-active" class="nav-link">Historial</a>
      <a routerLink="/imc"        (click)="closeDrawer()" routerLinkActive="nav-active" class="nav-link">Calcular IMC</a>
      <a routerLink="/cuenta"     (click)="closeDrawer()" routerLinkActive="nav-active" class="nav-link">Mi cuenta</a>
      <div class="nav-divider"></div>
      <button class="nav-link nav-logout" (click)="logout()">Cerrar sesión</button>
    </nav>
  `
})
export class HeaderComponent {
  auth = inject(AuthService);
  drawerOpen = signal(false);

  toggleDrawer() { this.drawerOpen.update(v => !v); }
  closeDrawer()  { this.drawerOpen.set(false); }
  logout()       { this.auth.logout(); this.closeDrawer(); }
}
