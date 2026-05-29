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
          <input type="email" [(ngModel)]="form.email" maxlength="150"
                 autocomplete="email"
                 [class.input-error]="emailError()"
                 (ngModelChange)="onEmailChange($event)"
                 required>
          @if (emailError()) {
            <span class="field-error">{{ emailError() }}</span>
          }
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
  `,
  styles: [`
    .input-error { border-color: var(--danger) !important; }
    .field-error { font-size: .78rem; color: var(--danger); margin-top: .2rem; display: block; }
  `]
})
export class RegisterComponent {
  private authService = inject(AuthService);

  form = {
    name: '', email: '', password: '', password2: '',
    gender: '', birthDate: '',
    heightCm: null as number | null,
    weightKg: null as number | null
  };

  errors     = signal<string[]>([]);
  loading    = signal(false);
  emailError = signal('');

  maxDate = new Date(Date.now() - 5   * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0];
  minDate = new Date(Date.now() - 120 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0];

  // TLDs reconocidos como válidos
  private readonly VALID_TLDS = new Set([
    'com','net','org','edu','gov','mx','es','io','co','info','biz','me',
    'app','dev','tech','online','store','site','web','cloud','ai','tv',
    'us','uk','ca','de','fr','it','br','ar','cl','pe','co','ve','gt',
    'hn','sv','ni','cr','pa','do','cu','bo','ec','py','uy','com.mx',
    'edu.mx','gob.mx','org.mx','net.mx','com.co','edu.co','com.ar',
    'edu.ar','com.br','edu.br'
  ]);

  // Dominios bloqueados (temporales, de prueba, inventados)
  private readonly BLOCKED_DOMAINS = new Set([
    'test.com','fake.com','example.com','dummy.com','temp.com',
    'mailinator.com','guerrillamail.com','throwam.com','yopmail.com',
    'sharklasers.com','trashmail.com','dispostable.com','tempmail.com',
    'getairmail.com','spamgourmet.com','maildrop.cc','nomail.com',
    'fakeinbox.com','spam4.me','discard.email','tempinbox.com',
    'throwaway.email','getnada.com','filzmail.com','spamgrap.com',
    'tempr.email','tempm.com','safetymail.info','spambox.us'
  ]);

  // Dominios reales conocidos — whitelist para pasar directo
  private readonly KNOWN_GOOD = new Set([
    'gmail.com','hotmail.com','outlook.com','yahoo.com','live.com',
    'icloud.com','protonmail.com','me.com','msn.com','mail.com',
    'zoho.com','aol.com','ymail.com','hotmail.es','outlook.es',
    'hotmail.com.mx','gmail.com.mx','yahoo.com.mx',
    'itesz.edu.mx','tecnm.mx','ipn.mx','unam.mx','tec.mx','udg.mx'
  ]);

  onEmailChange(val: string) {
    this.form.email = val;
    if (val.length > 5) {
      this.emailError.set(this.validateEmail(val));
    } else {
      this.emailError.set('');
    }
  }

  validateEmail(email: string): string {
    if (!email) return 'El correo electrónico es obligatorio.';

    // Formato básico
    const regex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(email)) return 'El formato del correo no es válido.';

    const [local, domain] = email.toLowerCase().split('@');

    // Validaciones del local (parte antes del @)
    if (local.length < 3)          return 'El correo es demasiado corto.';
    if (/\.{2,}/.test(local))      return 'El correo no puede tener puntos consecutivos.';
    if (local.startsWith('.') || local.endsWith('.'))
                                   return 'El correo no puede empezar ni terminar con punto.';

    // Patrones de local claramente inventados
    const fakeLocalPattern = /^(test|fake|dummy|prueba|correo|email|asdf|qwerty|abc|xyz|aaa|bbb|ccc|ddd|eee|fff|ggg|hhh|iii|jjj|kkk|lll|mmm|nnn|ooo|ppp|qqq|rrr|sss|ttt|uuu|vvv|www|xxx|yyy|zzz|123|1234|12345|admin|user|noreply|noname)\d*$/i;
    if (fakeLocalPattern.test(local)) return 'Ingresa un correo electrónico real.';

    // Dominios bloqueados explícitamente
    if (this.BLOCKED_DOMAINS.has(domain)) return 'No se permiten correos temporales o de prueba.';

    // Si es un dominio conocido bueno, pasa directo
    if (this.KNOWN_GOOD.has(domain)) return '';

    // Validar estructura del dominio
    const parts = domain.split('.');
    if (parts.length < 2) return 'El dominio del correo no es válido.';

    const tld      = parts[parts.length - 1];
    const sld      = parts[parts.length - 2]; // second-level domain
    const fullTld  = parts.slice(-2).join('.'); // ej: com.mx

    // TLD muy corto o muy largo
    if (tld.length < 2 || tld.length > 6) return 'La extensión del correo no es válida.';

    // Verificar que el TLD o TLD compuesto sea reconocido
    const tldOk = this.VALID_TLDS.has(tld) || this.VALID_TLDS.has(fullTld);
    if (!tldOk) return `La extensión ".${tld}" no corresponde a un dominio válido.`;

    // SLD demasiado corto (ej: a.com, b.net) — probablemente inventado
    if (sld.length < 2) return 'El dominio del correo no es válido.';

    // SLD que parece inventado: solo consonantes, caracteres aleatorios
    // djdks, xkzpt, qwrty, etc.
    const vowels = (sld.match(/[aeiou]/gi) || []).length;
    const consonants = (sld.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
    if (sld.length >= 4 && vowels === 0) {
      return 'El dominio del correo parece inventado. Usa un correo real.';
    }
    if (sld.length >= 5 && (vowels / (vowels + consonants)) < 0.15) {
      return 'El dominio del correo parece inventado. Usa un correo real.';
    }

    // Dominio con demasiados números seguidos
    if (/\d{4,}/.test(sld)) return 'El dominio del correo no parece válido.';

    return '';
  }

  validate(): string[] {
    const e: string[] = [];
    const { name, email, password, password2, gender, birthDate, heightCm, weightKg } = this.form;

    if (!name || name.trim().length < 2)  e.push('El nombre debe tener al menos 2 caracteres.');
    if (!name || name.trim().length > 60) e.push('El nombre no puede superar 60 caracteres.');

    const emailErr = this.validateEmail(email || '');
    if (emailErr) e.push(emailErr);

    if (!password || password.length < 8)  e.push('La contraseña debe tener al menos 8 caracteres.');
    if (password !== password2)            e.push('Las contraseñas no coinciden.');
    if (!['M','F','O'].includes(gender))   e.push('Selecciona un género válido.');
    if (!birthDate)                        e.push('La fecha de nacimiento es obligatoria.');
    if (!heightCm || heightCm < 100 || heightCm > 250) e.push('La estatura debe estar entre 100 y 250 cm.');
    if (!weightKg  || weightKg  < 20  || weightKg  > 300) e.push('El peso debe estar entre 20 y 300 kg.');

    if (heightCm && weightKg) {
      const h = heightCm / 100;
      const imc = weightKg / (h * h);
      if (imc < 10 || imc > 70) e.push('La combinación estatura/peso no es fisiológicamente posible.');
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
        email:     this.form.email.toLowerCase().trim(),
        password:  this.form.password,
        name:      this.form.name.trim(),
        gender:    this.form.gender as 'M' | 'F' | 'O',
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
