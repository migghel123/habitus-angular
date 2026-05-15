// src/app/features/registro/registro.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { AuthService } from '../../core/services/auth.service';
import { HabitusService } from '../../core/services/habitus.service';
import { Food, Activity, FoodLog, ActivityLog } from '../../core/models/user.model';

interface FoodEntry { food: Food; qty: number; }
interface ActivityEntry { activity: Activity; minutes: number; }

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  template: `
    <app-header />
    <div class="page">

      @if (mensaje()) {
        <div class="mensaje ok">{{ mensaje() }}</div>
      }
      @if (errors().length) {
        <div class="mensaje error">
          <ul>@for (e of errors(); track e) { <li>{{ e }}</li> }</ul>
        </div>
      }
      @if (aiAdvice()) {
        <div class="ai-box">
          <div class="ai-box-header"><span class="ai-dot"></span><h2>Consejo de nutrición</h2></div>
          <p style="white-space:pre-line">{{ aiAdvice() }}</p>
        </div>
      }

      <div class="section">
        <div class="campo" style="margin:0">
          <label for="fecha">Fecha del registro <span class="meta">(últimos 30 días)</span></label>
          <input type="date" id="fecha" [(ngModel)]="fechaReg"
                 [max]="maxDate" [min]="minDate" style="max-width:220px">
        </div>
        <p class="meta" style="margin-top:.5rem">El IMC se calcula automáticamente con los datos de tu perfil.</p>
      </div>

      <!-- Alimentos -->
      <section class="pictosection">
        <div class="pictosection-header">
          <h3 class="pictosection-title">Alimentos consumidos</h3>
          <p class="pictosection-subtitle">Máximo 10 porciones por alimento.</p>
        </div>
        <div class="pictogrid">
          @for (entry of foodEntries(); track entry.food.id) {
            <div class="pictocard" [class.pictocard-selected]="entry.qty > 0">
              <div class="pictocard-icon">
                <img [src]="foodIcon(entry.food.name)" [alt]="entry.food.name" onerror="this.style.display='none'">
              </div>
              <span class="pictocard-name">{{ entry.food.name }}</span>
              <span class="meta">{{ entry.food.caloriesPerUnit }} kcal / {{ entry.food.unit }}</span>
              <div class="picto-counter">
                <button type="button" class="picto-minus" (click)="adjustFood(entry, -0.5)">−</button>
                <input type="number" class="picto-input" step="0.5" min="0" max="10"
                       [(ngModel)]="entry.qty" (ngModelChange)="clamp(entry,'qty',0,10)">
                <button type="button" class="picto-plus" (click)="adjustFood(entry, 0.5)">+</button>
              </div>
              <small class="picto-amount-label meta">{{ entry.qty.toFixed(1) }} {{ entry.food.unit }}</small>
            </div>
          }
        </div>
      </section>

      <!-- Actividades -->
      <section class="pictosection">
        <div class="pictosection-header">
          <h3 class="pictosection-title">Actividad física</h3>
          <p class="pictosection-subtitle">Máximo 180 min por actividad · 360 min total al día.</p>
        </div>
        <div class="pictogrid">
          @for (entry of activityEntries(); track entry.activity.id) {
            <div class="pictocard" [class.pictocard-selected]="entry.minutes > 0">
              <div class="pictocard-icon">
                <img [src]="activityIcon(entry.activity.name)" [alt]="entry.activity.name" onerror="this.style.display='none'">
              </div>
              <span class="pictocard-name">{{ entry.activity.name }}</span>
              <span class="meta">{{ entry.activity.caloriesPerMinute }} kcal/min</span>
              <div class="picto-counter">
                <button type="button" class="picto-minus" (click)="adjustActivity(entry, -5)">−</button>
                <input type="number" class="picto-input" step="5" min="0" max="180"
                       [(ngModel)]="entry.minutes" (ngModelChange)="clamp(entry,'minutes',0,180)">
                <button type="button" class="picto-plus" (click)="adjustActivity(entry, 5)">+</button>
              </div>
              <small class="picto-amount-label meta">{{ entry.minutes }} min</small>
            </div>
          }
        </div>
      </section>

      <button [disabled]="saving()" (click)="guardar()"
              style="width:100%;justify-content:center;padding:.85rem;margin-top:1rem">
        {{ saving() ? 'Guardando...' : 'Guardar registro' }}
      </button>
    </div>
  `
})
export class RegistroComponent implements OnInit {
  private auth    = inject(AuthService);
  private habitus = inject(HabitusService);

  fechaReg = new Date().toISOString().split('T')[0];
  maxDate  = this.fechaReg;
  minDate  = new Date(Date.now() - 30 * 86400 * 1000).toISOString().split('T')[0];

  foodEntries     = signal<FoodEntry[]>([]);
  activityEntries = signal<ActivityEntry[]>([]);
  errors   = signal<string[]>([]);
  mensaje  = signal('');
  aiAdvice = signal('');
  saving   = signal(false);

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
      'tortilla de maíz': 'tortilla', 'arroz': 'arroz', 'pollo': 'pollo',
      'manzana': 'manzana', 'refresco': 'refresco', 'huevos': 'huevos',
      'pan integral': 'pan', 'avena': 'avena', 'yogurt natural': 'yogurt',
      'queso': 'queso', 'frijoles': 'frijoles', 'carne de res asada': 'carne',
      'pescado': 'pescado', 'ensalada mixta': 'ensalada', 'plátano': 'platano',
      'nueces mixtas': 'nueces', 'galletas saladas': 'galletas',
      'jugo de naranja': 'jugo', 'agua': 'agua', 'leche': 'leche'
    };
    const key = map[name.toLowerCase()] ?? null;
    return key ? `assets/foods/${key}.png` : '';
  }

  activityIcon(name: string): string {
    const map: Record<string, string> = {
      'caminar suave': 'caminar_suave', 'caminar rápido': 'caminar_rapido',
      'correr ligero': 'correr_ligero', 'correr intenso': 'correr_intenso',
      'bicicleta': 'bicicleta', 'natación': 'natacion', 'subir escaleras': 'escaleras',
      'yoga': 'yoga', 'entrenamiento de fuerza': 'fuerza', 'saltar la cuerda': 'cuerda'
    };
    const key = map[name.toLowerCase()] ?? null;
    return key ? `assets/activities/${key}.png` : '';
  }

  async guardar() {
    this.errors.set([]);
    this.mensaje.set('');
    this.aiAdvice.set('');

    const user = this.auth.currentUser();
    if (!user) return;

    const errs: string[] = [];
    if (!this.fechaReg)      errs.push('La fecha del registro es obligatoria.');
    if (user.heightCm <= 0)  errs.push('Tu cuenta no tiene estatura registrada.');
    if (user.weightKg <= 0)  errs.push('Tu cuenta no tiene peso registrado.');

    const totalMin = this.activityEntries().reduce((s, e) => s + e.minutes, 0);
    if (totalMin > 360) errs.push(`El total de actividad física (${totalMin} min) supera el límite de 360 minutos diarios.`);

    let calIn = 0, calOut = 0;
    for (const e of this.foodEntries())    { if (e.qty > 0)     calIn  += e.qty * e.food.caloriesPerUnit; }
    for (const e of this.activityEntries()) { if (e.minutes > 0) calOut += e.minutes * e.activity.caloriesPerMinute; }
    calIn  = Math.round(calIn);
    calOut = Math.round(calOut);
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
        foodLogs,
        activityLogs
      });

      const foodsSummary = foodLogs.map(f => `${f.quantity} ${f.unit} de ${f.foodName}`).join(', ') || 'Sin alimentos.';
      const actsSummary  = activityLogs.map(a => `${a.minutes} min de ${a.activityName}`).join(', ') || 'Sin actividades.';
      const age = this.auth.getAge(user.birthDate);

      const advice = await this.habitus.getAiAdvice({
        bmi, caloriesIn: calIn, caloriesOut: calOut, netBalance: net,
        gender: user.gender, age, foodsSummary, activitiesSummary: actsSummary
      });
      if (advice) this.aiAdvice.set(advice);

      this.mensaje.set(`Registro guardado · IMC: ${bmi} · Consumido: ${calIn} kcal · Quemado: ${calOut} kcal · Balance: ${net} kcal (${status})`);
      this.foodEntries.update(v => v.map(e => ({ ...e, qty: 0 })));
      this.activityEntries.update(v => v.map(e => ({ ...e, minutes: 0 })));

    } catch (err) {
      console.error('Error al guardar:', err);
      this.errors.set(['Error al guardar el registro. Intenta de nuevo.']);
    } finally {
      this.saving.set(false);
    }
  }
}