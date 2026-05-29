// src/app/features/registro/registro.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { HabitusService } from '../../core/services/habitus.service';
import { Food, Activity, FoodLog, ActivityLog } from '../../core/models/user.model';

interface FoodEntry     { food: Food;     qty: number; }
interface ActivityEntry { activity: Activity; minutes: number; }

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  template: `
    <app-header />

    <!-- Toast -->
    <div class="toast" [class.toast-show]="toastVisible()">
      <span class="toast-icon">✓</span>
      <div class="toast-body">
        <strong>Registro guardado</strong>
        <span>{{ toastMsg() }}</span>
      </div>
    </div>

    <!-- Sticky: buscador + pestañas -->
    <div class="reg-sticky">
      <div class="reg-sticky-inner">
        <div class="search-field">
          <input type="text"
                 [ngModel]="search()"
                 (ngModelChange)="search.set($event)"
                 [placeholder]="tab() === 'foods' ? 'Buscar alimento...' : 'Buscar actividad...'"
                 class="search-input">
          @if (search()) {
            <button class="search-clear" (click)="search.set('')">✕</button>
          }
        </div>
        <div class="tabs">
          <button class="tab-btn" [class.tab-active]="tab()==='foods'"
                  (click)="tab.set('foods'); search.set('')">
            Alimentos
            @if (selectedFoods().length) {
              <span class="tab-badge">{{ selectedFoods().length }}</span>
            }
          </button>
          <button class="tab-btn" [class.tab-active]="tab()==='activities'"
                  (click)="tab.set('activities'); search.set('')">
            Actividades
            @if (selectedActivities().length) {
              <span class="tab-badge">{{ selectedActivities().length }}</span>
            }
          </button>
        </div>
      </div>
    </div>

    <div class="page">

      @if (errors().length) {
        <div class="mensaje error">
          <ul>@for (e of errors(); track e) { <li>{{ e }}</li> }</ul>
        </div>
      }

      <!-- Consejo IA -->
      @if (aiLoading()) {
        <div class="ai-card ai-loading">
          <div class="ai-card-header">
            <div class="ai-pulse"></div>
            <span>Analizando tu registro...</span>
          </div>
          <div class="ai-skeleton">
            <div class="sk-line sk-w80"></div>
            <div class="sk-line sk-w60"></div>
            <div class="sk-line sk-w70"></div>
          </div>
        </div>
      }
      @if (aiAdvice() && !aiLoading()) {
        <div class="ai-card ai-card-in">
          <div class="ai-card-header">
            <div class="ai-icon">✦</div>
            <span>Consejo nutricional</span>
          </div>
          <p class="ai-text">{{ formatAiText(aiAdvice()) }}</p>
        </div>
      }

      <!-- Fecha -->
      <div class="section" style="margin-bottom:.75rem">
        <div class="campo" style="margin:0">
          <label for="fecha">Fecha del registro <span class="meta">(últimos 30 días)</span></label>
          <input type="date" id="fecha" [(ngModel)]="fechaReg"
                 [max]="maxDate" [min]="minDate" style="max-width:220px">
        </div>
      </div>

      <!-- Resumen en tiempo real -->
      @if (totalCalIn() > 0 || totalCalOut() > 0) {
        <div class="summary-bar">
          <div class="summary-chip2">
            <span class="summary-label">Consumido</span>
            <span class="summary-val">{{ totalCalIn() }}</span>
            <span class="summary-unit">kcal</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-chip2">
            <span class="summary-label">Quemado</span>
            <span class="summary-val">{{ totalCalOut() }}</span>
            <span class="summary-unit">kcal</span>
          </div>
          <div class="summary-divider"></div>
          <div class="summary-chip2">
            <span class="summary-label">Balance</span>
            <span class="summary-val" [style.color]="netColor()">{{ totalCalIn() - totalCalOut() }}</span>
            <span class="summary-unit">kcal</span>
          </div>
          <span class="tag" [class]="statusClass(totalCalIn() - totalCalOut())">
            {{ statusLabel(totalCalIn() - totalCalOut()) }}
          </span>
        </div>
      }

      <!-- TAB ALIMENTOS -->
      @if (tab() === 'foods') {
        <section class="pictosection">
          <div class="pictosection-header">
            <h3 class="pictosection-title">Alimentos consumidos</h3>
            <p class="pictosection-subtitle">Máximo 10 porciones por alimento.</p>
          </div>



          <div class="pictogrid">
            @for (entry of filteredFoods(); track entry.food.id) {
              <div class="pictocard" [class.pictocard-selected]="entry.qty > 0">
                <div class="pictocard-icon">
                  <img [src]="foodIcon(entry.food.name)" [alt]="entry.food.name" onerror="this.style.display='none'">
                </div>
                <span class="pictocard-name">{{ entry.food.name }}</span>
                <span class="meta">{{ entry.food.caloriesPerUnit }} kcal / {{ entry.food.unit }}</span>
                <div class="picto-counter">
                  <button type="button" class="picto-minus" (click)="adjustFood(entry,-0.5)">−</button>
                  <input type="number" class="picto-input" step="0.5" min="0" max="10"
                         [(ngModel)]="entry.qty" (ngModelChange)="clamp(entry,'qty',0,10)">
                  <button type="button" class="picto-plus" (click)="adjustFood(entry,0.5)">+</button>
                </div>
                <small class="picto-amount-label meta">{{ entry.qty.toFixed(1) }} {{ entry.food.unit }}</small>
              </div>
            }
            @if (filteredFoods().length === 0) {
              <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted)">
                No se encontró "{{ search() }}"
              </div>
            }
          </div>
        </section>
      }

      <!-- TAB ACTIVIDADES -->
      @if (tab() === 'activities') {
        <section class="pictosection">
          <div class="pictosection-header">
            <h3 class="pictosection-title">Actividad física</h3>
            <p class="pictosection-subtitle">Máximo 180 min por actividad · 360 min total.</p>
          </div>
          <div class="pictogrid">
            @for (entry of filteredActivities(); track entry.activity.id) {
              <div class="pictocard" [class.pictocard-selected]="entry.minutes > 0">
                <div class="pictocard-icon">
                  <img [src]="activityIcon(entry.activity.name)" [alt]="entry.activity.name" onerror="this.style.display='none'">
                </div>
                <span class="pictocard-name">{{ entry.activity.name }}</span>
                <span class="meta">{{ entry.activity.caloriesPerMinute }} kcal/min</span>
                <div class="picto-counter">
                  <button type="button" class="picto-minus" (click)="adjustActivity(entry,-5)">−</button>
                  <input type="number" class="picto-input" step="5" min="0" max="180"
                         [(ngModel)]="entry.minutes" (ngModelChange)="clamp(entry,'minutes',0,180)">
                  <button type="button" class="picto-plus" (click)="adjustActivity(entry,5)">+</button>
                </div>
                <small class="picto-amount-label meta">{{ entry.minutes }} min</small>
              </div>
            }
            @if (filteredActivities().length === 0) {
              <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted)">
                No se encontró "{{ search() }}"
              </div>
            }
          </div>
        </section>
      }

      <button [disabled]="saving()" (click)="guardar()"
              style="width:100%;justify-content:center;padding:.9rem;margin-top:1rem;font-size:1rem">
        {{ saving() ? 'Guardando...' : 'Guardar registro' }}
      </button>
    </div>
  `,
  styles: [`
    /* ── Toast azul ───────────────────────────── */
    .toast {
      position: fixed;
      bottom: -120px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999;
      background: var(--accent);
      color: #fff;
      border-radius: 14px;
      padding: .85rem 1.25rem;
      display: flex;
      align-items: center;
      gap: .85rem;
      min-width: 300px;
      max-width: 92vw;
      box-shadow: 0 8px 28px rgba(15,104,172,0.35);
      transition: bottom .4s cubic-bezier(.34,1.56,.64,1);
    }
    .toast-show { bottom: 2rem; }
    .toast-icon {
      width: 30px; height: 30px;
      background: rgba(255,255,255,0.2);
      border: 2px solid rgba(255,255,255,0.5);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: .85rem; font-weight: 700; flex-shrink: 0;
      color: #fff;
    }
    .toast-body { display: flex; flex-direction: column; gap: .15rem; }
    .toast-body strong { font-size: .92rem; color: #fff; }
    .toast-body span   { font-size: .78rem; color: rgba(255,255,255,0.75); }

    /* ── Sticky ──────────────────────────────── */
    .reg-sticky {
      position: sticky;
      top: 56px;
      z-index: 90;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    }
    .reg-sticky-inner {
      max-width: 640px;
      margin: 0 auto;
      padding: .6rem 1.25rem 0;
    }
    .search-field { position: relative; margin-bottom: .5rem; }
    .search-input {
      width: 100%;
      padding: .5rem 2rem .5rem .85rem;
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: .9rem;
      font-family: inherit;
      background: var(--bg);
      transition: border-color .15s;
    }
    .search-input:focus { outline: none; border-color: var(--accent); background: #fff; }
    .search-clear {
      position: absolute; right: .5rem; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; font-size: .8rem; padding: .15rem .35rem; filter: none;
    }
    .search-clear:hover { color: var(--text); filter: none; background: none; }

    /* ── Tabs ────────────────────────────────── */
    .tabs { display: flex; border-top: 1px solid var(--border); }
    .tab-btn {
      flex: 1; padding: .6rem;
      background: none; border: none;
      border-bottom: 2.5px solid transparent;
      font-size: .88rem; font-weight: 600;
      color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: .4rem;
      transition: color .15s, border-color .15s;
      filter: none; margin-bottom: -1px;
    }
    .tab-btn:hover { color: var(--text); filter: none; background: none; }
    .tab-active { color: var(--accent) !important; border-bottom-color: var(--accent) !important; }
    .tab-badge {
      background: var(--accent); color: #fff;
      border-radius: 20px; font-size: .65rem;
      padding: .1rem .4rem; font-weight: 700;
      min-width: 18px; text-align: center;
    }

    /* ── Resumen bar ─────────────────────────── */
    .summary-bar {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: .85rem 1.1rem;
      margin-bottom: .75rem;
      display: flex; align-items: center; gap: .75rem; flex-wrap: wrap;
      box-shadow: var(--shadow);
    }
    .summary-chip2 { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 60px; }
    .summary-label { font-size: .65rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
    .summary-val   { font-family: 'DM Mono', monospace; font-size: 1.25rem; font-weight: 700; line-height: 1.1; }
    .summary-unit  { font-size: .68rem; color: var(--text-muted); }
    .summary-divider { width: 1px; height: 36px; background: var(--border); }

    /* ── AI card ─────────────────────────────── */
    .ai-card {
      background: #fff; border: 1px solid #b8d9f5;
      border-radius: var(--radius); padding: 1.1rem 1.25rem;
      margin-bottom: .75rem;
      box-shadow: 0 2px 12px rgba(15,104,172,.08);
    }
    .ai-card-in { animation: fadeSlideIn .4s ease; }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .ai-loading { background: #f8fbff; }
    .ai-card-header {
      display: flex; align-items: center; gap: .6rem;
      margin-bottom: .75rem;
      font-size: .78rem; font-weight: 700;
      color: var(--accent); text-transform: uppercase; letter-spacing: .06em;
    }
    .ai-icon {
      width: 26px; height: 26px;
      background: var(--accent); color: #fff;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: .9rem; flex-shrink: 0;
    }
    .ai-pulse {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--accent); animation: pulse 1.2s infinite;
    }
    @keyframes pulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50%      { opacity: .4; transform: scale(.85); }
    }
    .ai-text {
      font-size: .9rem; line-height: 1.75;
      color: var(--text); white-space: pre-line;
    }
    /* Skeleton */
    .ai-skeleton { display: flex; flex-direction: column; gap: .4rem; }
    .sk-line {
      height: 10px; border-radius: 6px;
      background: linear-gradient(90deg,#e8f0f8 25%,#d0e4f4 50%,#e8f0f8 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    .sk-w80 { width: 80%; } .sk-w60 { width: 60%; } .sk-w70 { width: 70%; }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

  `]
})
export class RegistroComponent implements OnInit {
  private auth    = inject(AuthService);
  private habitus = inject(HabitusService);

  fechaReg = new Date().toISOString().split('T')[0];
  maxDate  = this.fechaReg;
  minDate  = new Date(Date.now() - 30 * 86400 * 1000).toISOString().split('T')[0];

  tab    = signal<'foods' | 'activities'>('foods');
  search = signal('');

  foodEntries     = signal<FoodEntry[]>([]);
  activityEntries = signal<ActivityEntry[]>([]);
  errors       = signal<string[]>([]);
  toastMsg     = signal('');
  toastVisible = signal(false);
  aiAdvice     = signal('');
  aiLoading    = signal(false);
  saving       = signal(false);

  filteredFoods = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.foodEntries();
    return this.foodEntries().filter(e => e.food.name.toLowerCase().includes(q));
  });

  filteredActivities = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.activityEntries();
    return this.activityEntries().filter(e => e.activity.name.toLowerCase().includes(q));
  });

  selectedFoods      = computed(() => this.foodEntries().filter(e => e.qty > 0));
  selectedActivities = computed(() => this.activityEntries().filter(e => e.minutes > 0));

  totalCalIn  = computed(() => Math.round(this.foodEntries().reduce((s,e) => s + e.qty * e.food.caloriesPerUnit, 0)));
  totalCalOut = computed(() => Math.round(this.activityEntries().reduce((s,e) => s + e.minutes * e.activity.caloriesPerMinute, 0)));

  netColor() {
    const n = this.totalCalIn() - this.totalCalOut();
    return n > 300 ? 'var(--danger)' : n < -300 ? 'var(--warn)' : 'var(--accent)';
  }
  statusClass(net: number) { return net > 300 ? 'tag-excess' : net < -300 ? 'tag-deficit' : 'tag-balanced'; }
  statusLabel(net: number) { return net > 300 ? 'Excesivo'   : net < -300 ? 'Deficiente'  : 'Equilibrado'; }

  formatAiText(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^[\s]*[-•*]\s+/gm, '')
      .replace(/^[\s]*\d+[.)]\s+/gm, '')
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private showToast(msg: string) {
    this.toastMsg.set(msg);
    this.toastVisible.set(true);
    setTimeout(() => this.toastVisible.set(false), 4000);
  }

  async ngOnInit() {
    await this.habitus.seedCatalogs();
    const [foods, activities] = await Promise.all([
      this.habitus.getFoods(),
      this.habitus.getActivities()
    ]);
    this.foodEntries.set(foods.map(f => ({ food: f, qty: 0 })));
    this.activityEntries.set(activities.map(a => ({ activity: a, minutes: 0 })));
  }

  adjustFood(entry: FoodEntry, delta: number) {
    entry.qty = Math.max(0, Math.min(10, +(entry.qty + delta).toFixed(1)));
    this.foodEntries.update(v => [...v]);
  }

  adjustActivity(entry: ActivityEntry, delta: number) {
    entry.minutes = Math.max(0, Math.min(180, entry.minutes + delta));
    this.activityEntries.update(v => [...v]);
  }

  clamp(entry: any, field: string, min: number, max: number) {
    entry[field] = Math.max(min, Math.min(max, +entry[field] || 0));
    this.foodEntries.update(v => [...v]);
    this.activityEntries.update(v => [...v]);
  }

  foodIcon(name: string): string {
    const map: Record<string, string> = {
      'tortilla de maíz':'tortilla','arroz':'arroz','pollo':'pollo',
      'manzana':'manzana','refresco':'refresco','huevos':'huevos',
      'pan integral':'pan','avena':'avena','yogurt natural':'yogurt',
      'queso':'queso','frijoles':'frijoles','carne de res asada':'carne',
      'pescado':'pescado','ensalada mixta':'ensalada','plátano':'platano',
      'nueces mixtas':'nueces','galletas saladas':'galletas',
      'jugo de naranja':'jugo','agua':'agua','leche':'leche'
    };
    const key = map[name.toLowerCase()] ?? null;
    return key ? `assets/foods/${key}.png` : '';
  }

  activityIcon(name: string): string {
    const map: Record<string, string> = {
      'caminar suave':'caminar_suave','caminar rápido':'caminar_rapido',
      'correr ligero':'correr_ligero','correr intenso':'correr_intenso',
      'bicicleta':'bicicleta','natación':'natacion','subir escaleras':'escaleras',
      'yoga':'yoga','entrenamiento de fuerza':'fuerza','saltar la cuerda':'cuerda'
    };
    const key = map[name.toLowerCase()] ?? null;
    return key ? `assets/activities/${key}.png` : '';
  }

  async guardar() {
    this.errors.set([]);
    this.aiAdvice.set('');

    const user = this.auth.currentUser();
    if (!user) return;

    const errs: string[] = [];
    if (!this.fechaReg)     errs.push('La fecha del registro es obligatoria.');
    if (user.heightCm <= 0) errs.push('Tu cuenta no tiene estatura registrada.');
    if (user.weightKg <= 0) errs.push('Tu cuenta no tiene peso registrado.');

    const totalMin = this.activityEntries().reduce((s, e) => s + e.minutes, 0);
    if (totalMin > 360) errs.push(`El total de actividad (${totalMin} min) supera 360 min diarios.`);

    const calIn  = this.totalCalIn();
    const calOut = this.totalCalOut();
    if (calIn > 6000) errs.push(`Las calorías consumidas (${calIn} kcal) superan el máximo de 6000 kcal.`);
    if (errs.length) { this.errors.set(errs); return; }

    this.saving.set(true);
    try {
      const bmi    = this.habitus.calcBmi(user.heightCm, user.weightKg);
      const net    = calIn - calOut;
      const status = this.habitus.classifyBalance(net);

      const foodLogs: FoodLog[] = this.foodEntries()
        .filter(e => e.qty > 0)
        .map(e => ({
          userId: user.uid, recordDate: this.fechaReg,
          foodId: e.food.id!, foodName: e.food.name,
          quantity: e.qty, caloriesPerUnit: e.food.caloriesPerUnit, unit: e.food.unit
        }));

      const activityLogs: ActivityLog[] = this.activityEntries()
        .filter(e => e.minutes > 0)
        .map(e => ({
          userId: user.uid, recordDate: this.fechaReg,
          activityId: e.activity.id!, activityName: e.activity.name,
          minutes: e.minutes, caloriesPerMinute: e.activity.caloriesPerMinute
        }));

      await this.habitus.saveRecord({
        energyBalance: {
          userId: user.uid, recordDate: this.fechaReg,
          bmi, caloriesIn: calIn, caloriesOut: calOut,
          netBalance: net, energyStatus: status
        },
        foodLogs, activityLogs
      });

      this.showToast(`IMC ${bmi} · ${calIn} kcal consumidas · ${calOut} kcal quemadas`);
      this.foodEntries.update(v => v.map(e => ({ ...e, qty: 0 })));
      this.activityEntries.update(v => v.map(e => ({ ...e, minutes: 0 })));
      this.search.set('');
      this.tab.set('foods');

      const foodsSummary = foodLogs.length
        ? foodLogs.map(f => `${f.quantity} ${f.unit} de ${f.foodName}`).join(', ')
        : 'Sin alimentos.';
      const actsSummary = activityLogs.length
        ? activityLogs.map(a => `${a.minutes} min de ${a.activityName}`).join(', ')
        : 'Sin actividad.';

      this.aiLoading.set(true);
      this.habitus.getAiAdvice({
        bmi, caloriesIn: calIn, caloriesOut: calOut, netBalance: net,
        gender: user.gender, age: this.auth.getAge(user.birthDate),
        foodsSummary, activitiesSummary: actsSummary
      }).then(a => { if (a) this.aiAdvice.set(a); })
        .finally(() => this.aiLoading.set(false));

    } catch (err) {
      console.error(err);
      this.errors.set(['Error al guardar el registro. Intenta de nuevo.']);
    } finally {
      this.saving.set(false);
    }
  }
}
