// src/app/features/dashboard/dashboard.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { HabitusService } from '../../core/services/habitus.service';
import { EnergyBalance } from '../../core/models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, HeaderComponent, DecimalPipe],
  template: `
    <app-header />
    <div class="page">

      <div class="hero">
        <p class="label">Bienvenido/a</p>
        <h1>Hola, {{ firstName() }}</h1>
        <p class="meta">Registra tu alimentación y actividad física de hoy.</p>
        <div class="hero-actions">
          <a routerLink="/registro" class="btn">Nuevo registro</a>
          <a routerLink="/historial" class="btn btn-ghost">Ver historial</a>
        </div>
      </div>

      @if (loading()) {
        <div class="empty"><p>Cargando...</p></div>
      } @else if (last()) {
        <div class="section">
          <div class="section-title">
            <span class="label">Último registro</span>
            <span class="meta" style="margin-left:auto">{{ last()!.recordDate }}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.75rem">
            <div class="data-item"><dt class="label" style="font-size:.7rem">IMC</dt><dd style="font-family:'DM Mono',monospace;font-size:1.1rem;font-weight:600">{{ last()!.bmi | number:'1.2-2' }}</dd></div>
            <div class="data-item"><dt class="label" style="font-size:.7rem">Consumido</dt><dd style="font-family:'DM Mono',monospace;font-size:1.1rem;font-weight:600">{{ last()!.caloriesIn }} kcal</dd></div>
            <div class="data-item"><dt class="label" style="font-size:.7rem">Quemado</dt><dd style="font-family:'DM Mono',monospace;font-size:1.1rem;font-weight:600">{{ last()!.caloriesOut }} kcal</dd></div>
            <div class="data-item"><dt class="label" style="font-size:.7rem">Balance neto</dt><dd style="font-family:'DM Mono',monospace;font-size:1.1rem;font-weight:600">{{ last()!.netBalance }} kcal</dd></div>
          </div>
          <div style="margin-top:.75rem">
            <span class="tag" [class]="statusClass(last()!.energyStatus)">{{ statusLabel(last()!.energyStatus) }}</span>
          </div>
        </div>
      } @else {
        <div class="empty">
          <p>Aún no tienes registros.<br>Empieza hoy registrando lo que comiste.</p>
          <a routerLink="/registro" class="btn" style="margin-top:.75rem;display:inline-flex">Hacer primer registro</a>
        </div>
      }

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-top:1rem">
        <a routerLink="/imc" class="section" style="text-decoration:none;cursor:pointer">
          <div style="font-weight:600;font-size:.95rem">Calcular IMC</div>
          <div class="meta">Usando tus datos actuales</div>
        </a>
        <a routerLink="/cuenta" class="section" style="text-decoration:none;cursor:pointer">
          <div style="font-weight:600;font-size:.95rem">Mi cuenta</div>
          <div class="meta">Ver perfil y datos</div>
        </a>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private auth    = inject(AuthService);
  private habitus = inject(HabitusService);

  last    = signal<EnergyBalance | null>(null);
  loading = signal(true);

  firstName() {
    return this.auth.currentUser()?.name?.split(' ')[0] ?? '';
  }

  async ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.last.set(await this.habitus.getLastRecord(user.uid));
    }
    this.loading.set(false);
  }

  statusClass(s: string) {
    return s === 'BALANCEADO' ? 'tag-balanced' : s === 'DEFICIENTE' ? 'tag-deficit' : 'tag-excess';
  }

  statusLabel(s: string) {
    return s === 'BALANCEADO' ? 'Equilibrado' : s === 'DEFICIENTE' ? 'Deficiente' : 'Excesivo';
  }
}