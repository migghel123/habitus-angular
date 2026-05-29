// src/app/features/auth/login/login.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
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

        @if (registeredOk()) {
          <div class="mensaje ok" style="text-align:center">
            <strong>Cuenta creada.</strong><br>
            Revisa tu bandeja de entrada y haz clic en el enlace de verificación antes de iniciar sesión.
          </div>
        }

        @if (notVerified()) {
          <div class="mensaje error">
            <strong>Correo no verificado.</strong><br>
            Revisa tu bandeja de entrada y haz clic en el enlace que te enviamos.
            <br><br>
            <button class="btn-resend" [disabled]="resending()" (click)="resend()">
              {{ resending() ? 'Enviando...' : 'Reenviar correo de verificación' }}
            </button>
            @if (resentOk()) {
              <span style="display:block;margin-top:.5rem;font-size:.82rem">
                Correo reenviado. Revisa tu bandeja.
              </span>
            }
          </div>
        }

        @if (error()) {
          <div class="mensaje error">{{ error() }}</div>
        }

        <div class="campo">
          <label for="email">Correo electrónico</label>
          <input type="email" id="email" [(ngModel)]="email"
                 maxlength="150" autocomplete="email" required>
        </div>
        <div class="campo">
          <label for="password">Contraseña</label>
          <input type="password" id="password" [(ngModel)]="password"
                 maxlength="72" autocomplete="current-password" required>
        </div>
        <button [disabled]="loading()" (click)="submit()">
          {{ loading() ? 'Entrando...' : 'Entrar' }}
        </button>
        <p>¿No tienes cuenta? <a routerLink="/register">Regístrate</a></p>
      </div>
    </div>
  `,
  styles: [`
    .btn-resend {
      background: none;
      border: 1.5px solid var(--danger);
      color: var(--danger);
      border-radius: var(--radius-sm);
      padding: .35rem .85rem;
      font-size: .82rem;
      cursor: pointer;
      font-family: inherit;
      font-weight: 600;
    }
    .btn-resend:hover { background: rgba(192,57,43,.08); filter: none; }
    .btn-resend:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private route       = inject(ActivatedRoute);

  email    = '';
  password = '';

  error        = signal('');
  loading      = signal(false);
  notVerified  = signal(false);
  registeredOk = signal(false);
  resending    = signal(false);
  resentOk     = signal(false);

  ngOnInit() {
    // Mostrar mensaje si viene del registro
    this.route.queryParams.subscribe(p => {
      if (p['registered'] === '1') this.registeredOk.set(true);
    });
  }

  async submit() {
    this.error.set('');
    this.notVerified.set(false);
    this.registeredOk.set(false);
    this.resentOk.set(false);

    if (!this.email)    { this.error.set('El correo es obligatorio.'); return; }
    if (!this.password) { this.error.set('La contraseña es obligatoria.'); return; }

    this.loading.set(true);
    try {
      await this.authService.login(this.email, this.password);
    } catch (e: any) {
      if (e?.code === 'email-not-verified') {
        this.notVerified.set(true);
      } else {
        this.error.set('Correo o contraseña incorrectos.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async resend() {
    if (!this.email || !this.password) {
      this.error.set('Ingresa tu correo y contraseña para reenviar la verificación.');
      return;
    }
    this.resending.set(true);
    this.resentOk.set(false);
    try {
      await this.authService.resendVerification(this.email, this.password);
      this.resentOk.set(true);
    } catch {
      this.error.set('No se pudo reenviar el correo. Verifica tus datos.');
    } finally {
      this.resending.set(false);
    }
  }
}
