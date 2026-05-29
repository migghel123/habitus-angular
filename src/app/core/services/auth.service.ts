// src/app/core/services/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import {
  Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendEmailVerification, User as FirebaseUser
} from '@angular/fire/auth';
import {
  Firestore, doc, setDoc, getDoc, serverTimestamp
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth   = inject(Auth);
  private fs     = inject(Firestore);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  loading     = signal<boolean>(true);

  constructor() {
    onAuthStateChanged(this.auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const profile = await this.loadProfile(fbUser.uid);
        this.currentUser.set(profile);
      } else {
        this.currentUser.set(null);
      }
      this.loading.set(false);
    });
  }

  async register(data: {
    email: string; password: string; name: string;
    gender: 'M'|'F'|'O'; birthDate: string; heightCm: number; weightKg: number;
  }): Promise<void> {
    const cred = await createUserWithEmailAndPassword(this.auth, data.email, data.password);

    // Enviar correo de verificación
    await sendEmailVerification(cred.user);

    const user: User = {
      uid:       cred.user.uid,
      name:      data.name,
      email:     data.email,
      gender:    data.gender,
      birthDate: data.birthDate,
      heightCm:  data.heightCm,
      weightKg:  data.weightKg,
    };

    await setDoc(doc(this.fs, 'users', cred.user.uid), {
      ...user,
      createdAt: serverTimestamp()
    });

    // Cerrar sesión hasta que verifique el correo
    await signOut(this.auth);
    this.currentUser.set(null);

    // Redirigir a login con mensaje
    this.router.navigate(['/login'], {
      queryParams: { registered: '1' }
    });
  }

  async login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);

    // Verificar si el correo fue confirmado
    if (!cred.user.emailVerified) {
      await signOut(this.auth);
      throw { code: 'email-not-verified' };
    }

    const profile = await this.loadProfile(cred.user.uid);
    this.currentUser.set(profile);
    this.router.navigate(['/dashboard']);
  }

  async resendVerification(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    await sendEmailVerification(cred.user);
    await signOut(this.auth);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private async loadProfile(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(this.fs, 'users', uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as User;
  }

  getAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  calcBmi(heightCm: number, weightKg: number): number {
    const h = heightCm / 100;
    return Math.round((weightKg / (h * h)) * 100) / 100;
  }

  classifyBmi(bmi: number): string {
    if (bmi < 18.5) return 'Bajo peso';
    if (bmi < 25)   return 'Peso normal';
    if (bmi < 30)   return 'Sobrepeso';
    return 'Obesidad';
  }
}
