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

  /** Seed initial catalog data if collections are empty */
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
        { name: 'Caminar suave',              caloriesPerMinute: 4  },
        { name: 'Caminar rápido',             caloriesPerMinute: 6  },
        { name: 'Correr ligero',              caloriesPerMinute: 9  },
        { name: 'Correr intenso',             caloriesPerMinute: 12 },
        { name: 'Bicicleta',                  caloriesPerMinute: 8  },
        { name: 'Natación',                   caloriesPerMinute: 9  },
        { name: 'Subir escaleras',            caloriesPerMinute: 8  },
        { name: 'Yoga',                       caloriesPerMinute: 3  },
        { name: 'Entrenamiento de fuerza',    caloriesPerMinute: 7  },
        { name: 'Saltar la cuerda',           caloriesPerMinute: 10 },
      ];
      acts.forEach(a => batch.set(doc(collection(this.fs, 'activities')), a));
      await batch.commit();
    }
  }

  // ── REGISTROS (CRUD) ────────────────────────────────────

  async saveRecord(record: DailyRecord): Promise<string> {
    const batch = writeBatch(this.fs);

    // Energy balance
    const ebRef = doc(collection(this.fs, 'energy_balance'));
    batch.set(ebRef, { ...record.energyBalance, createdAt: serverTimestamp() });

    // Food logs
    for (const fl of record.foodLogs) {
      batch.set(doc(collection(this.fs, 'food_logs')), fl);
    }

    // Activity logs
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
    await updateDoc(doc(this.fs, 'energy_balance', id), data as any);  }

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

  // ── IA NUTRICIÓN ────────────────────────────────────────

  async getAiAdvice(params: {
    bmi: number; caloriesIn: number; caloriesOut: number; netBalance: number;
    gender: string; age: number; foodsSummary: string; activitiesSummary: string;
  }): Promise<string | null> {
    const prompt =
      `Eres un nutriologo clinico experto. Analiza este registro diario y responde en español ` +
      `siguiendo exactamente esta estructura:\n\n` +
      `1) Primera linea con uno de estos prefijos:\n` +
      `   - 'Dia equilibrado:' si el balance es razonable.\n` +
      `   - 'Exceso de calorias:' si el balance neto supera 300 kcal.\n` +
      `   - 'Poca actividad fisica:' si casi no hay actividad.\n` +
      `   - 'Riesgo alto:' si hay muchas calorias y muy poca actividad.\n` +
      `2) 2 a 3 lineas de explicacion breve.\n` +
      `3) 'Recomendaciones de alimentos:' con 2-3 puntos con guion.\n` +
      `4) 'Recomendaciones de actividad fisica:' con 2-3 puntos con guion.\n\n` +
      `Solo recomendaciones generales, maximo 200 palabras.\n\n` +
      `Datos del dia:\n` +
      `- Sexo: ${params.gender}\n` +
      `- Edad: ${params.age} años\n` +
      `- IMC: ${params.bmi}\n` +
      `- Calorias consumidas: ${params.caloriesIn}\n` +
      `- Calorias quemadas: ${params.caloriesOut}\n` +
      `- Balance neto: ${params.netBalance} kcal\n` +
      `- Alimentos: ${params.foodsSummary}\n` +
      `- Actividades: ${params.activitiesSummary}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${environment.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 400, temperature: 0.4 }
          })
        }
      );
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
    } catch {
      return null;
    }
  }
}
