// src/app/features/historial/historial.component.ts
import { Component, inject, OnInit, signal, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { HabitusService } from '../../core/services/habitus.service';
import { EnergyBalance } from '../../core/models/user.model';
import { DecimalPipe } from '@angular/common';

declare var Chart: any;

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [FormsModule, HeaderComponent, DecimalPipe],
  template: `
    <app-header />
    <div class="page">

      @if (loading()) {
        <div class="empty"><p>Cargando historial...</p></div>
      } @else if (!allRecords().length) {
        <div class="empty">
          <p>Aún no tienes registros.<br>Ve a <strong>Registro diario</strong> para comenzar.</p>
        </div>
      } @else {

        <!-- Filtros -->
        <div class="range-bar">
          <div class="campo">
            <label>Desde</label>
            <input type="date" [(ngModel)]="dateFrom"
                   [min]="allRecords()[0].recordDate"
                   [max]="allRecords()[allRecords().length-1].recordDate">
          </div>
          <div class="campo">
            <label>Hasta</label>
            <input type="date" [(ngModel)]="dateTo"
                   [min]="allRecords()[0].recordDate"
                   [max]="allRecords()[allRecords().length-1].recordDate">
          </div>
          <div class="range-actions">
            <button class="btn" (click)="applyRange()">Aplicar</button>
          </div>
        </div>

        <!-- Rápidos -->
        <div class="quick-ranges">
          <button [class.active]="activeRange==='7d'"  (click)="setQuick('7d')">7 días</button>
          <button [class.active]="activeRange==='30d'" (click)="setQuick('30d')">30 días</button>
          <button [class.active]="activeRange==='3m'"  (click)="setQuick('3m')">3 meses</button>
          <button [class.active]="activeRange==='all'" (click)="setQuick('all')">Todo</button>
        </div>

        <!-- Resumen -->
        @if (filtered().length) {
          <div class="range-summary">
            <div class="summary-chip">{{ filtered().length }} registros</div>
            <div class="summary-chip">Prom. consumido: <strong>{{ avgCalIn() }} kcal</strong></div>
            <div class="summary-chip">Prom. quemado: <strong>{{ avgCalOut() }} kcal</strong></div>
            <div class="summary-chip">IMC promedio: <strong>{{ avgBmi() }}</strong></div>
          </div>
        }

        <!-- Toggle -->
        <div class="view-toggle" style="margin-bottom:1rem">
          <button [class.active]="view==='graficas'" (click)="switchView('graficas')">Gráficas</button>
          <button [class.active]="view==='tabla'"    (click)="switchView('tabla')">Tabla</button>
        </div>

        @if (!filtered().length) {
          <div style="text-align:center;padding:2rem;color:var(--text-muted)">
            No hay registros en el período seleccionado.
          </div>
        }

        <!-- Gráficas -->
        <div id="vistaGraficas" [style.display]="view==='graficas' ? '' : 'none'">
          @if (filtered().length) {
            <div class="charts-grid">
              <div class="chart-box wide">
                <h3>Calorías consumidas vs quemadas</h3>
                <div class="chart-canvas-wrap tall"><canvas id="chartBar"></canvas></div>
              </div>
              <div class="chart-box">
                <h3>Evolución del IMC</h3>
                <div class="chart-canvas-wrap"><canvas id="chartImc"></canvas></div>
              </div>
              <div class="chart-box">
                <h3>Distribución del estado energético</h3>
                <div class="chart-canvas-wrap"><canvas id="chartPie"></canvas></div>
              </div>
              <div class="chart-box wide">
                <h3>Balance neto diario (kcal)</h3>
                <div class="chart-canvas-wrap"><canvas id="chartBalance"></canvas></div>
              </div>
            </div>
          }
        </div>

        <!-- Tabla -->
        <div id="vistaTabla" [style.display]="view==='tabla' ? '' : 'none'">
          @if (filtered().length) {
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>IMC</th><th>Consumido</th>
                    <th>Quemado</th><th>Balance</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of filtered().slice().reverse(); track r.id) {
                    <tr>
                      <td>{{ r.recordDate }}</td>
                      <td style="font-family:'DM Mono',monospace">{{ r.bmi | number:'1.2-2' }}</td>
                      <td>{{ r.caloriesIn }} kcal</td>
                      <td>{{ r.caloriesOut }} kcal</td>
                      <td style="font-family:'DM Mono',monospace">{{ r.netBalance }}</td>
                      <td><span class="tag" [class]="statusClass(r.energyStatus)">{{ statusLabel(r.energyStatus) }}</span></td>
                      <td>
                        <button class="btn-delete" (click)="deleteRecord(r)" title="Eliminar">✕</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .btn-delete {
      border: none; background: none; cursor: pointer;
      padding: .3rem .5rem; border-radius: 4px;
      font-size: .9rem; color: #c0392b;
    }
    .btn-delete:hover { background: rgba(192,57,43,.1); filter: none; }
  `]
})
export class HistorialComponent implements OnInit, OnDestroy {
  private authSvc = inject(AuthService);
  private habitus = inject(HabitusService);

  allRecords = signal<EnergyBalance[]>([]);
  filtered   = signal<EnergyBalance[]>([]);
  loading    = signal(true);
  view       = 'graficas';
  activeRange = 'all';
  dateFrom = '';
  dateTo   = '';

  private charts: Record<string, any> = {};

  async ngOnInit() {
    const user = this.authSvc.currentUser();
    if (user) {
      const records = await this.habitus.getEnergyBalances(user.uid);
      this.allRecords.set(records);
      this.filtered.set(records);
      if (records.length) {
        this.dateFrom = records[0].recordDate;
        this.dateTo   = records[records.length - 1].recordDate;
      }
    }
    this.loading.set(false);
    // Render charts after view updates
    setTimeout(() => this.renderCharts(), 100);
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  applyRange() {
    this.filtered.set(
      this.allRecords().filter(r => r.recordDate >= this.dateFrom && r.recordDate <= this.dateTo)
    );
    this.activeRange = '';
    setTimeout(() => this.renderCharts(), 50);
  }

  setQuick(range: string) {
    this.activeRange = range;
    const all = this.allRecords();
    if (range === 'all' || !all.length) {
      this.filtered.set(all);
      if (all.length) {
        this.dateFrom = all[0].recordDate;
        this.dateTo   = all[all.length - 1].recordDate;
      }
    } else {
      const to   = new Date();
      const from = new Date();
      if      (range === '7d')  from.setDate(to.getDate() - 6);
      else if (range === '30d') from.setDate(to.getDate() - 29);
      else if (range === '3m')  from.setMonth(to.getMonth() - 3);
      const fs = from.toISOString().split('T')[0];
      const ts = to.toISOString().split('T')[0];
      this.dateFrom = fs;
      this.dateTo   = ts;
      this.filtered.set(all.filter(r => r.recordDate >= fs && r.recordDate <= ts));
    }
    setTimeout(() => this.renderCharts(), 50);
  }

  switchView(v: string) {
    this.view = v;
    if (v === 'graficas') {
      setTimeout(() => this.renderCharts(), 50);
    }
  }

  avgCalIn()  { const f = this.filtered(); return f.length ? Math.round(f.reduce((s,r) => s + r.caloriesIn,  0) / f.length) : 0; }
  avgCalOut() { const f = this.filtered(); return f.length ? Math.round(f.reduce((s,r) => s + r.caloriesOut, 0) / f.length) : 0; }
  avgBmi()    { const f = this.filtered(); return f.length ? (f.reduce((s,r) => s + r.bmi, 0) / f.length).toFixed(2) : '0'; }

  async deleteRecord(record: EnergyBalance) {
    if (!confirm(`¿Eliminar el registro del ${record.recordDate}?`)) return;
    await this.habitus.deleteEnergyBalance(record.id!);
    this.allRecords.update(v => v.filter(r => r.id !== record.id));
    this.filtered.update(v => v.filter(r => r.id !== record.id));
    setTimeout(() => this.renderCharts(), 50);
  }

  statusClass(s: string) { return s === 'BALANCEADO' ? 'tag-balanced' : s === 'DEFICIENTE' ? 'tag-deficit' : 'tag-excess'; }
  statusLabel(s: string) { return s === 'BALANCEADO' ? 'Equilibrado'  : s === 'DEFICIENTE' ? 'Deficiente'  : 'Excesivo'; }

  private destroyCharts() {
    Object.values(this.charts).forEach(c => { try { c.destroy(); } catch {} });
    this.charts = {};
  }

  private renderCharts() {
    if (typeof Chart === 'undefined') {
      setTimeout(() => this.renderCharts(), 300);
      return;
    }

    this.destroyCharts();
    const data = this.filtered();
    if (!data.length) return;

    const BRAND  = '#0f68ac';
    const BRANDL = 'rgba(15,104,172,0.18)';
    const WARN   = '#e67e22';
    const WARNL  = 'rgba(230,126,34,0.18)';
    const DANGER = '#c0392b';
    const GRID   = '#f0f0ec';
    const MUTED  = '#aaaaaa';

    const labels = data.map(r => r.recordDate.substring(5).replace('-', '/'));
    const cIn    = data.map(r => r.caloriesIn);
    const cOut   = data.map(r => r.caloriesOut);
    const bmi    = data.map(r => r.bmi);
    const net    = data.map(r => r.netBalance);
    const dotR   = data.length > 30 ? 0 : 3;

    Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = MUTED;

    const scaleX = { grid: { display: false } };
    const scaleY = (sfx = '') => ({
      grid: { color: GRID },
      ticks: { callback: (v: number) => v + sfx }
    });

    // Barras: consumidas vs quemadas
    const barEl = document.getElementById('chartBar');
    if (barEl) {
      this.charts['bar'] = new Chart(barEl, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Consumidas', data: cIn,  backgroundColor: BRANDL, borderColor: BRAND, borderWidth: 1.5, borderRadius: 4 },
            { label: 'Quemadas',   data: cOut, backgroundColor: WARNL,  borderColor: WARN,  borderWidth: 1.5, borderRadius: 4 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: { x: scaleX, y: scaleY(' kcal') }
        }
      });
    }

    // Línea IMC
    const imcEl = document.getElementById('chartImc');
    if (imcEl) {
      this.charts['imc'] = new Chart(imcEl, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'IMC', data: bmi,
            borderColor: BRAND, backgroundColor: BRANDL, borderWidth: 2,
            pointBackgroundColor: BRAND, pointRadius: dotR, pointHoverRadius: 5,
            tension: 0.35, fill: true
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: scaleX, y: { grid: { color: GRID }, suggestedMin: 15, suggestedMax: 35 } }
        }
      });
    }

    // Dona estados
    const cnts = { BALANCEADO: 0, DEFICIENTE: 0, EXCESIVO: 0 };
    data.forEach(r => { if (r.energyStatus in cnts) cnts[r.energyStatus as keyof typeof cnts]++; });
    const pieEl = document.getElementById('chartPie');
    if (pieEl) {
      this.charts['pie'] = new Chart(pieEl, {
        type: 'doughnut',
        data: {
          labels: ['Equilibrado', 'Deficiente', 'Excesivo'],
          datasets: [{
            data: [cnts.BALANCEADO, cnts.DEFICIENTE, cnts.EXCESIVO],
            backgroundColor: ['rgba(15,104,172,0.75)', 'rgba(230,126,34,0.75)', 'rgba(192,57,43,0.75)'],
            borderColor: [BRAND, WARN, DANGER],
            borderWidth: 1.5, hoverOffset: 5
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '58%',
          plugins: { legend: { position: 'bottom', labels: { padding: 12, boxWidth: 10 } } }
        }
      });
    }

    // Balance neto
    const balEl = document.getElementById('chartBalance');
    if (balEl) {
      this.charts['balance'] = new Chart(balEl, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Balance neto',
            data: net,
            backgroundColor: net.map(v => v > 300 ? 'rgba(192,57,43,0.65)' : v < -300 ? 'rgba(230,126,34,0.65)' : 'rgba(15,104,172,0.65)'),
            borderRadius: 3
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: scaleX, y: scaleY(' kcal') }
        }
      });
    }
  }
}
