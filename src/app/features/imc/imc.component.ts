// src/app/features/imc/imc.component.ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-imc',
  standalone: true,
  imports: [FormsModule, HeaderComponent, DecimalPipe],
  template: `
    <app-header />
    <div class="page">
      <div style="margin-bottom:1.25rem">
        <p class="label">Herramienta</p>
        <h1 style="font-size:1.5rem">Calcular IMC</h1>
        <p class="meta">Usa tus datos del perfil o modifícalos para simular.</p>
      </div>

      <div class="section" style="max-width:420px">
        @if (errors().length) {
          <div class="mensaje error">
            <ul>@for (e of errors(); track e) { <li>{{ e }}</li> }</ul>
          </div>
        }

        <div class="campo">
          <label>Estatura <span class="meta">(100–250 cm)</span></label>
          <input type="number" [(ngModel)]="heightCm" step="0.1" min="100" max="250" placeholder="cm">
        </div>
        <div class="campo">
          <label>Peso <span class="meta">(20–300 kg)</span></label>
          <input type="number" [(ngModel)]="weightKg" step="0.1" min="20" max="300" placeholder="kg">
        </div>
        <button (click)="calcular()">Calcular</button>

        @if (bmi() !== null) {
          <div class="imc-result" style="margin-top:1rem">
            <div class="label" style="font-size:.7rem;margin-bottom:.3rem">Resultado</div>
            <div class="imc-value">{{ bmi()! | number:'1.2-2' }}</div>
            <div style="font-weight:600;margin-top:.3rem">{{ bmiLabel() }}</div>
          </div>
        }
      </div>

      <div class="section" style="max-width:420px">
        <div class="label" style="margin-bottom:.6rem">Tabla de referencia</div>
        <table class="imc-table">
          <tr><td style="color:var(--text-muted)">Menos de 18.5</td><td>Bajo peso</td></tr>
          <tr><td style="color:var(--text-muted)">18.5 – 24.9</td><td>Peso normal</td></tr>
          <tr><td style="color:var(--text-muted)">25 – 29.9</td><td>Sobrepeso</td></tr>
          <tr><td style="color:var(--text-muted)">30 o más</td><td>Obesidad</td></tr>
        </table>
      </div>
    </div>
  `
})
export class ImcComponent {
  private auth = inject(AuthService);

  heightCm: number | null = this.auth.currentUser()?.heightCm ?? null;
  weightKg: number | null = this.auth.currentUser()?.weightKg ?? null;
  bmi      = signal<number | null>(null);
  bmiLabel = signal('');
  errors   = signal<string[]>([]);

  calcular() {
    const errs: string[] = [];
    if (!this.heightCm || this.heightCm < 100 || this.heightCm > 250) errs.push('La estatura debe estar entre 100 y 250 cm.');
    if (!this.weightKg || this.weightKg < 20  || this.weightKg > 300) errs.push('El peso debe estar entre 20 y 300 kg.');

    if (this.heightCm && this.weightKg) {
      const h = this.heightCm / 100;
      const imc = this.weightKg / (h * h);
      if (imc < 10 || imc > 70) errs.push('La combinación estatura/peso no es fisiológicamente posible. Verifica los datos.');
    }

    this.errors.set(errs);
    if (errs.length) { this.bmi.set(null); return; }

    const h   = this.heightCm! / 100;
    const val = Math.round((this.weightKg! / (h * h)) * 100) / 100;
    this.bmi.set(val);
    this.bmiLabel.set(this.auth.classifyBmi(val));
  }
}
