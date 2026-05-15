// src/app/features/auth/register/register.component.ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-box" style="max-width:440px">
        <div class="auth-logo">
          <span class="logo-text large">Habitus</span>
        </div>
        <h1>Crear cuenta</h1>
        <p class="meta">Registra tus datos para comenzar</p>

        @if (errors().length) {
          <div class="mensaje error">
            <ul>@for (e of errors(); track e) { <li>{{ e }}</li> }</ul>
          </div>
        }

        <div class="campo">
          <label>Nombre completo</label>
          <input type="text" [(ngModel)]="form.name" minlength="2" maxlength="60" autocomplete="name" required>
        </div>
        <div class="campo">
          <label>Correo electrónico</label>
          <input type="email" [(ngModel)]="form.email" maxlength="150" autocomplete="email" required>
        </div>
        <div class="campo">
          <label>Contraseña <span class="meta">(mín. 8 — máx. 72 caracteres)</span></label>
          <input type="password" [(ngModel)]="form.password" minlength="8" maxlength="72" autocomplete="new-password" required>
        </div>
        <div class="campo">
          <label>Repetir contraseña</label>
          <input type="password" [(ngModel)]="form.password2" minlength="8" maxlength="72" autocomplete="new-password" required>
        </div>
        <div class="campo">
          <label>Género</label>
          <select [(ngModel)]="form.gender" required>
            <option value="">Selecciona</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
        </div>
        <div class="campo">
          <label>Fecha de nacimiento <span class="meta">(5–120 años)</span></label>
          <input type="date" [(ngModel)]="form.birthDate" [max]="maxDate" [min]="minDate" required>
        </div>
        <div class="campo">
          <label>Estatura <span class="meta">(100–250 cm)</span></label>
          <input type="number" [(ngModel)]="form.heightCm" step="0.1" min="100" max="250" placeholder="cm" required>
        </div>
        <div class="campo">
          <label>Peso <span class="meta">(20–300 kg)</span></label>
          <input type="number" [(ngModel)]="form.weightKg" step="0.1" min="20" max="300" placeholder="kg" required>
        </div>
        <button [disabled]="loading()" (click)="submit()">
          {{ loading() ? 'Registrando...' : 'Crear cuenta' }}
        </button>
        <p>¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private authService = inject(AuthService);

  form = { name: '', email: '', password: '', password2: '', gender: '', birthDate: '', heightCm: null as number|null, weightKg: null as number|null };
  errors  = signal<string[]>([]);
  loading = signal(false);

  maxDate = new Date(Date.now() - 5  * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0];
  minDate = new Date(Date.now() - 120 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0];

  validate(): string[] {
    const e: string[] = [];
    const { name, email, password, password2, gender, birthDate, heightCm, weightKg } = this.form;
    if (!name || name.trim().length < 2)    e.push('El nombre debe tener al menos 2 caracteres.');
    if (!email || !email.includes('@'))      e.push('El correo no tiene un formato válido.');
    if (!password || password.length < 8)   e.push('La contraseña debe tener al menos 8 caracteres.');
    if (password !== password2)             e.push('Las contraseñas no coinciden.');
    if (!['M','F','O'].includes(gender))    e.push('Selecciona un género válido.');
    if (!birthDate)                         e.push('La fecha de nacimiento es obligatoria.');
    if (!heightCm || heightCm < 100 || heightCm > 250) e.push('La estatura debe estar entre 100 y 250 cm.');
    if (!weightKg || weightKg < 20  || weightKg > 300) e.push('El peso debe estar entre 20 y 300 kg.');
    if (heightCm && weightKg) {
      const h = heightCm / 100;
      const imc = weightKg / (h * h);
      if (imc < 10 || imc > 70) e.push('La combinación estatura/peso no es fisiológicamente posible. Verifica los datos.');
    }
    return e;
  }

  async submit() {
    const errs = this.validate();
    this.errors.set(errs);
    if (errs.length) return;

    this.loading.set(true);
    try {
      await this.authService.register({
        email:     this.form.email,
        password:  this.form.password,
        name:      this.form.name.trim(),
        gender:    this.form.gender as 'M'|'F'|'O',
        birthDate: this.form.birthDate,
        heightCm:  this.form.heightCm!,
        weightKg:  this.form.weightKg!
      });
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        this.errors.set(['Ya existe una cuenta registrada con ese correo.']);
      } else {
        this.errors.set(['Error al registrar. Intenta de nuevo.']);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
