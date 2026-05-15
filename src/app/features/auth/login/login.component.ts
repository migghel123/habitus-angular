// src/app/features/auth/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-box">
        <div class="auth-logo">
          <span class="logo-text large">Habitus</span>
        </div>
        <h1>Bienvenido</h1>
        <p class="meta">Inicia sesión para continuar</p>

        @if (error()) {
          <div class="mensaje error">{{ error() }}</div>
        }

        <div class="campo">
          <label for="email">Correo electrónico</label>
          <input type="email" id="email" [(ngModel)]="email" maxlength="150" autocomplete="email" required>
        </div>
        <div class="campo">
          <label for="password">Contraseña</label>
          <input type="password" id="password" [(ngModel)]="password" maxlength="72" autocomplete="current-password" required>
        </div>
        <button [disabled]="loading()" (click)="submit()">
          {{ loading() ? 'Entrando...' : 'Entrar' }}
        </button>
        <p>¿No tienes cuenta? <a routerLink="/register">Regístrate</a></p>
      </div>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);

  email    = '';
  password = '';
  error    = signal('');
  loading  = signal(false);

  async submit() {
    this.error.set('');
    if (!this.email) { this.error.set('El correo es obligatorio.'); return; }
    if (!this.password) { this.error.set('La contraseña es obligatoria.'); return; }

    this.loading.set(true);
    try {
      await this.authService.login(this.email, this.password);
    } catch (e: any) {
      this.error.set('Correo o contraseña incorrectos.');
    } finally {
      this.loading.set(false);
    }
  }
}
