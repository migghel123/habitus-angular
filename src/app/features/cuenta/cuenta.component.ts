// src/app/features/cuenta/cuenta.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-cuenta',
  standalone: true,
  imports: [FormsModule, HeaderComponent, DecimalPipe],
  template: `
    <app-header />
    <div class="page">

      <div style="margin-bottom:1.25rem">
        <p class="label">Perfil</p>
        <h1 style="font-size:1.5rem">{{ auth.currentUser()?.name }}</h1>
        <p class="meta">{{ auth.currentUser()?.email }}</p>
      </div>

      @if (mensaje()) {
        <div class="mensaje ok">{{ mensaje() }}</div>
      }
      @if (errors().length) {
        <div class="mensaje error">
          <ul>@for (e of errors(); track e) { <li>{{ e }}</li> }</ul>
        </div>
      }

      <!-- Datos personales -->
      <div class="section">
        <div class="section-title"><span class="label">Datos personales</span></div>

        @if (!editing()) {
          <dl class="data-grid">
            <div class="data-item"><dt>Género</dt><dd>{{ genderLabel() }}</dd></div>
            <div class="data-item"><dt>Fecha de nacimiento</dt><dd>{{ auth.currentUser()?.birthDate }} <span class="meta">({{ age() }} años)</span></dd></div>
            <div class="data-item"><dt>Estatura</dt><dd>{{ auth.currentUser()?.heightCm }} cm</dd></div>
            <div class="data-item"><dt>Peso</dt><dd>{{ auth.currentUser()?.weightKg }} kg</dd></div>
          </dl>

          <div style="margin-top:.75rem;display:flex;gap:.5rem">
            <button class="btn" (click)="startEdit()">Editar datos</button>
          </div>

          @if (bmi()) {
            <div style="margin-top:1rem;padding:1rem;background:var(--accent-light);border-radius:var(--radius-sm);display:flex;align-items:center;gap:1rem">
              <div>
                <div class="label" style="font-size:.7rem">IMC actual</div>
                <div style="font-family:'DM Mono',monospace;font-size:2rem;font-weight:600;color:var(--accent);line-height:1">{{ bmi()! | number:'1.2-2' }}</div>
              </div>
              <div>
                <div class="label" style="font-size:.7rem">Clasificación</div>
                <div style="font-weight:600;font-size:1rem">{{ auth.classifyBmi(bmi()!) }}</div>
              </div>
            </div>
          }
        } @else {
          <!-- Formulario de edición (Update) -->
          <div class="campo">
            <label>Género</label>
            <select [(ngModel)]="editForm.gender">
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </select>
          </div>
          <div class="campo">
            <label>Fecha de nacimiento</label>
            <input type="date" [(ngModel)]="editForm.birthDate" [max]="maxDate" [min]="minDate">
          </div>
          <div class="campo">
            <label>Estatura (100–250 cm)</label>
            <input type="number" [(ngModel)]="editForm.heightCm" step="0.1" min="100" max="250" placeholder="cm">
          </div>
          <div class="campo">
            <label>Peso (20–300 kg)</label>
            <input type="number" [(ngModel)]="editForm.weightKg" step="0.1" min="20" max="300" placeholder="kg">
          </div>
          <div style="display:flex;gap:.5rem;margin-top:.5rem">
            <button [disabled]="saving()" (click)="saveEdit()">{{ saving() ? 'Guardando...' : 'Guardar cambios' }}</button>
            <button class="btn btn-ghost" (click)="cancelEdit()">Cancelar</button>
          </div>
        }
      </div>

    </div>
  `
})
export class CuentaComponent implements OnInit {
  auth    = inject(AuthService);
  private fs = inject(Firestore);

  editing = signal(false);
  saving  = signal(false);
  mensaje = signal('');
  errors  = signal<string[]>([]);

  editForm = { gender: '', birthDate: '', heightCm: 0, weightKg: 0 };

  maxDate = new Date(Date.now() - 5   * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0];
  minDate = new Date(Date.now() - 120 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0];

  ngOnInit() {}

  bmi() {
    const u = this.auth.currentUser();
    if (!u || !u.heightCm || !u.weightKg) return null;
    return this.auth.calcBmi(u.heightCm, u.weightKg);
  }

  age() {
    const bd = this.auth.currentUser()?.birthDate;
    return bd ? this.auth.getAge(bd) : null;
  }

  genderLabel() {
    const map: Record<string, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' };
    return map[this.auth.currentUser()?.gender ?? ''] ?? 'N/D';
  }

  startEdit() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.editForm = { gender: u.gender, birthDate: u.birthDate, heightCm: u.heightCm, weightKg: u.weightKg };
    this.editing.set(true);
    this.mensaje.set('');
    this.errors.set([]);
  }

  cancelEdit() { this.editing.set(false); this.errors.set([]); }

  async saveEdit() {
    const errs: string[] = [];
    if (!['M','F','O'].includes(this.editForm.gender)) errs.push('Género no válido.');
    if (!this.editForm.birthDate)                       errs.push('La fecha de nacimiento es obligatoria.');
    if (this.editForm.heightCm < 100 || this.editForm.heightCm > 250) errs.push('Estatura debe estar entre 100 y 250 cm.');
    if (this.editForm.weightKg < 20  || this.editForm.weightKg > 300) errs.push('Peso debe estar entre 20 y 300 kg.');
    if (this.editForm.heightCm && this.editForm.weightKg) {
      const h = this.editForm.heightCm / 100;
      const imc = this.editForm.weightKg / (h * h);
      if (imc < 10 || imc > 70) errs.push('La combinación estatura/peso no es fisiológicamente posible.');
    }
    this.errors.set(errs);
    if (errs.length) return;

    this.saving.set(true);
    try {
      const uid = this.auth.currentUser()!.uid;
      await updateDoc(doc(this.fs, 'users', uid), {
        gender:    this.editForm.gender,
        birthDate: this.editForm.birthDate,
        heightCm:  this.editForm.heightCm,
        weightKg:  this.editForm.weightKg,
      });
      // Update local signal
      this.auth.currentUser.update(u => u ? { ...u, ...this.editForm } as any : u);
      this.editing.set(false);
      this.mensaje.set('Datos actualizados correctamente.');
    } catch {
      this.errors.set(['Error al guardar. Intenta de nuevo.']);
    } finally {
      this.saving.set(false);
    }
  }
}
