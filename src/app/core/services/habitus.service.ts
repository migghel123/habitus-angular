// src/app/core/services/habitus.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, addDoc, getDocs, getDoc,
  query, where, orderBy, deleteDoc, updateDoc,
  serverTimestamp, writeBatch, setDoc
} from '@angular/fire/firestore';
import {
  EnergyBalance, FoodLog, ActivityLog,
  Food, Activity, DailyRecord
} from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HabitusService {
  private fs = inject(Firestore);

  // ── CATÁLOGOS ───────────────────────────────────────────

  async getFoods(): Promise<Food[]> {
    const snap = await getDocs(query(collection(this.fs, 'foods'), orderBy('name')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Food));
  }

  async getActivities(): Promise<Activity[]> {
    const snap = await getDocs(query(collection(this.fs, 'activities'), orderBy('name')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
  }

  async seedCatalogs(): Promise<void> {
    const foodSnap = await getDocs(collection(this.fs, 'foods'));
    if (foodSnap.empty) {
      const batch = writeBatch(this.fs);
      const foods: Omit<Food, 'id'>[] = [
        { name: 'Tortilla de maíz',    caloriesPerUnit: 65,  unit: 'pieza' },
        { name: 'Arroz',               caloriesPerUnit: 130, unit: 'taza' },
        { name: 'Pollo',               caloriesPerUnit: 200, unit: 'porción' },
        { name: 'Manzana',             caloriesPerUnit: 80,  unit: 'pieza' },
        { name: 'Refresco',            caloriesPerUnit: 140, unit: 'vaso (250 ml)' },
        { name: 'Huevos',              caloriesPerUnit: 160, unit: 'porción' },
        { name: 'Pan integral',        caloriesPerUnit: 70,  unit: 'rebanada' },
        { name: 'Avena',               caloriesPerUnit: 150, unit: 'taza' },
        { name: 'Yogurt natural',      caloriesPerUnit: 120, unit: 'vaso' },
        { name: 'Queso',               caloriesPerUnit: 90,  unit: 'rebanada' },
        { name: 'Frijoles',            caloriesPerUnit: 110, unit: '1/2 taza' },
        { name: 'Carne de res asada',  caloriesPerUnit: 250, unit: 'porción' },
        { name: 'Pescado',             caloriesPerUnit: 180, unit: 'porción' },
        { name: 'Ensalada mixta',      caloriesPerUnit: 80,  unit: 'taza' },
        { name: 'Plátano',             caloriesPerUnit: 100, unit: 'pieza' },
        { name: 'Nueces mixtas',       caloriesPerUnit: 170, unit: '30 g' },
        { name: 'Galletas saladas',    caloriesPerUnit: 60,  unit: 'pieza' },
        { name: 'Jugo de naranja',     caloriesPerUnit: 110, unit: 'vaso (250 ml)' },
        { name: 'Agua',                caloriesPerUnit: 0,   unit: 'vaso (250 ml)' },
        { name: 'Leche',               caloriesPerUnit: 150, unit: 'vaso (250 ml)' },
      ];
      foods.forEach(f => batch.set(doc(collection(this.fs, 'foods')), f));
      await batch.commit();
    }

    const actSnap = await getDocs(collection(this.fs, 'activities'));
    if (actSnap.empty) {
      const batch = writeBatch(this.fs);
      const acts: Omit<Activity, 'id'>[] = [
        { name: 'Caminar suave',           caloriesPerMinute: 4  },
        { name: 'Caminar rápido',          caloriesPerMinute: 6  },
        { name: 'Correr ligero',           caloriesPerMinute: 9  },
        { name: 'Correr intenso',          caloriesPerMinute: 12 },
        { name: 'Bicicleta',               caloriesPerMinute: 8  },
        { name: 'Natación',                caloriesPerMinute: 9  },
        { name: 'Subir escaleras',         caloriesPerMinute: 8  },
        { name: 'Yoga',                    caloriesPerMinute: 3  },
        { name: 'Entrenamiento de fuerza', caloriesPerMinute: 7  },
        { name: 'Saltar la cuerda',        caloriesPerMinute: 10 },
      ];
      acts.forEach(a => batch.set(doc(collection(this.fs, 'activities')), a));
      await batch.commit();
    }
  }

  // ── REGISTROS (CRUD) ────────────────────────────────────

  async saveRecord(record: DailyRecord): Promise<string> {
    const batch = writeBatch(this.fs);
    const ebRef = doc(collection(this.fs, 'energy_balance'));
    batch.set(ebRef, { ...record.energyBalance, createdAt: serverTimestamp() });
    for (const fl of record.foodLogs) {
      batch.set(doc(collection(this.fs, 'food_logs')), fl);
    }
    for (const al of record.activityLogs) {
      batch.set(doc(collection(this.fs, 'activity_logs')), al);
    }
    await batch.commit();
    return ebRef.id;
  }

  async getEnergyBalances(userId: string): Promise<EnergyBalance[]> {
    const q = query(
      collection(this.fs, 'energy_balance'),
      where('userId', '==', userId),
      orderBy('recordDate', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as EnergyBalance));
  }

  async getLastRecord(userId: string): Promise<EnergyBalance | null> {
    const records = await this.getEnergyBalances(userId);
    return records.length ? records[records.length - 1] : null;
  }

  async getFoodLogs(userId: string, recordDate: string): Promise<FoodLog[]> {
    const q = query(
      collection(this.fs, 'food_logs'),
      where('userId', '==', userId),
      where('recordDate', '==', recordDate)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FoodLog));
  }

  async getActivityLogs(userId: string, recordDate: string): Promise<ActivityLog[]> {
    const q = query(
      collection(this.fs, 'activity_logs'),
      where('userId', '==', userId),
      where('recordDate', '==', recordDate)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog));
  }

  async deleteEnergyBalance(id: string): Promise<void> {
    await deleteDoc(doc(this.fs, 'energy_balance', id));
  }

  async updateEnergyBalance(id: string, data: Partial<EnergyBalance>): Promise<void> {
    await updateDoc(doc(this.fs, 'energy_balance', id), data as any);
  }

  // ── CÁLCULOS ────────────────────────────────────────────

  classifyBalance(net: number): 'DEFICIENTE' | 'BALANCEADO' | 'EXCESIVO' {
    if (net < -300)  return 'DEFICIENTE';
    if (net <=  300) return 'BALANCEADO';
    return 'EXCESIVO';
  }

  calcBmi(heightCm: number, weightKg: number): number {
    const h = heightCm / 100;
    return Math.round((weightKg / (h * h)) * 100) / 100;
  }

  // ── IA NUTRICIÓN — Claude API ────────────────────────────

  async getAiAdvice(params: {
    bmi: number;
    caloriesIn: number;
    caloriesOut: number;
    netBalance: number;
    gender: string;
    age: number;
    foodsSummary: string;
    activitiesSummary: string;
  }): Promise<string | null> {

    const prompt =
      `Eres un nutriólogo clínico experto. Analiza este registro diario y responde en español ` +
      `siguiendo exactamente esta estructura:\n\n` +
      `1) Primera línea con uno de estos prefijos:\n` +
      `   - "Día equilibrado:" si el balance es razonable.\n` +
      `   - "Exceso de calorías:" si el balance neto supera 300 kcal.\n` +
      `   - "Poca actividad física:" si casi no hay actividad.\n` +
      `   - "Riesgo alto:" si hay muchas calorías y muy poca actividad.\n` +
      `2) 2 a 3 líneas de explicación breve.\n` +
      `3) "Recomendaciones de alimentos:" con 2-3 puntos con guión.\n` +
      `4) "Recomendaciones de actividad física:" con 2-3 puntos con guión.\n\n` +
      `Solo recomendaciones generales, máximo 200 palabras.\n\n` +
      `Datos del día:\n` +
      `- Sexo: ${params.gender}\n` +
      `- Edad: ${params.age} años\n` +
      `- IMC: ${params.bmi}\n` +
      `- Calorías consumidas: ${params.caloriesIn}\n` +
      `- Calorías quemadas: ${params.caloriesOut}\n` +
      `- Balance neto: ${params.netBalance} kcal\n` +
      `- Alimentos: ${params.foodsSummary}\n` +
      `- Actividades: ${params.activitiesSummary}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': environment.claudeApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        console.error('Claude API error:', response.status);
        return null;
      }

      const data = await response.json();
      return data?.content?.[0]?.text?.trim() ?? null;

    } catch (err) {
      console.error('Error llamando a Claude:', err);
      return null;
    }
  }
}
