# Habitus — Angular + Firebase

Aplicación de seguimiento de hábitos alimenticios y actividad física.
Migración completa de PHP/MySQL → Angular 17 + Cloud Firestore.

---

## Tecnologías usadas

| Capa           | Tecnología                          |
|----------------|-------------------------------------|
| Framework      | Angular 17 (standalone components)  |
| Base de datos  | Cloud Firestore (Firebase)          |
| Autenticación  | Firebase Authentication             |
| IA Nutrición   | Google Gemini 2.0 Flash Lite API    |
| Estilos        | CSS Puro (sin Bootstrap ni Material)|

---

## Estructura del proyecto

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   └── user.model.ts          ← Interfaces: User, EnergyBalance, Food...
│   │   ├── services/
│   │   │   ├── auth.service.ts        ← Autenticación Firebase + perfil Firestore
│   │   │   └── habitus.service.ts     ← CRUD Firestore + IA Nutrición
│   │   └── guards/
│   │       └── auth.guard.ts          ← Protección de rutas
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login/                 ← Página de login
│   │   │   └── register/              ← Página de registro (Create usuario)
│   │   ├── dashboard/                 ← Inicio (Read último registro)
│   │   ├── registro/                  ← Registro diario (Create energy_balance)
│   │   ├── historial/                 ← Historial (Read + Delete)
│   │   ├── imc/                       ← Calculadora IMC
│   │   └── cuenta/                    ← Mi cuenta (Read + Update perfil)
│   ├── shared/
│   │   └── components/header/         ← Barra de navegación responsiva
│   ├── app.component.ts
│   ├── app.config.ts                  ← Proveedores Firebase
│   └── app.routes.ts                  ← Rutas con lazy loading + guards
├── environments/
│   └── environment.ts                 ← ⚠️ AQUÍ van tus credenciales Firebase
├── styles.css                         ← Estilos globales (CSS puro)
└── index.html
```

---

## Configuración paso a paso

### 1. Crear proyecto en Firebase

1. Ve a https://console.firebase.google.com
2. Haz clic en **Agregar proyecto** y sigue los pasos.
3. En el panel, ve a **Build → Firestore Database**.
4. Haz clic en **Crear base de datos** → Elige **Modo de prueba** → Selecciona una región.

### 2. Registrar la app web y obtener credenciales

1. En el panel de Firebase, ve a ⚙️ **Configuración del proyecto**.
2. En la sección **Tus apps**, haz clic en el ícono `</>` (Web).
3. Registra la app con el nombre `Habitus`.
4. Copia el objeto `firebaseConfig` que aparece.

### 3. Activar Firebase Authentication

1. Ve a **Build → Authentication → Get started**.
2. En la pestaña **Sign-in method**, habilita **Correo electrónico/contraseña**.

### 4. Pegar credenciales en el proyecto

Abre `src/environments/environment.ts` y reemplaza los valores:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: 'PEGA_TU_API_KEY',
    authDomain: 'PEGA_TU_AUTH_DOMAIN',
    projectId: 'PEGA_TU_PROJECT_ID',
    storageBucket: 'PEGA_TU_STORAGE_BUCKET',
    messagingSenderId: 'PEGA_TU_SENDER_ID',
    appId: 'PEGA_TU_APP_ID'
  },
  geminiApiKey: 'TU_GEMINI_API_KEY'  // opcional, para consejos IA
};
```

### 5. Instalar dependencias y ejecutar

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
ng serve

# Abrir en el navegador
http://localhost:4200
```

---

## Operaciones CRUD implementadas

| Operación | Dónde                    | Colección Firestore    |
|-----------|--------------------------|------------------------|
| **Create** | Registro → Guardar       | `energy_balance`, `food_logs`, `activity_logs` |
| **Create** | Register → Crear cuenta  | `users` (Auth + Firestore) |
| **Read**   | Dashboard                | `energy_balance` (último) |
| **Read**   | Historial → Gráficas     | `energy_balance` (todos) |
| **Read**   | Historial → Tabla        | `energy_balance` (filtrado) |
| **Read**   | Mi cuenta                | `users`                |
| **Update** | Mi cuenta → Editar       | `users`                |
| **Delete** | Historial → ✕            | `energy_balance`       |

---

## Colecciones Firestore creadas automáticamente

Al primer inicio de sesión, el servicio crea automáticamente:
- **`foods`** — 20 alimentos con calorías y unidades
- **`activities`** — 10 actividades físicas con kcal/min
- **`users`** — Perfil de cada usuario registrado
- **`energy_balance`** — Registros diarios de balance
- **`food_logs`** — Detalle de alimentos por día
- **`activity_logs`** — Detalle de actividades por día

---

## Validaciones implementadas (equivalentes a validaciones.php)

- Nombre: 2–60 caracteres, solo letras y espacios
- Email: formato válido, máx. 150 chars
- Contraseña: 8–72 caracteres, confirmación
- Género: M, F, O
- Fecha de nacimiento: 5–120 años
- Estatura: 100–250 cm
- Peso: 20–300 kg
- IMC coherente: 10–70 (combinación estatura/peso)
- Fecha de registro: no futura, máx. 30 días atrás
- Porciones: máx. 10 por alimento
- Minutos: máx. 180 por actividad, 360 total
- Calorías consumidas: máx. 6,000 kcal/día

---

## Agregar imágenes (opcional)

Coloca las imágenes en `src/assets/`:
```
src/assets/
├── foods/
│   ├── tortilla.png
│   ├── arroz.png
│   ├── pollo.png
│   └── ... (ver registro.component.ts para nombres)
└── activities/
    ├── caminar_suave.png
    ├── caminar_rapido.png
    └── ... (ver registro.component.ts para nombres)
```

---

## Autor

Proyecto académico — Actividad CRUD con Angular y Firebase
