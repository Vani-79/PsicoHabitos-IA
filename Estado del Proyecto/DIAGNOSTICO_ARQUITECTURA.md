# 📋 Diagnóstico de Arquitectura y Buenas Prácticas de Software
**Proyecto:** PsicoHábitos  
**Fecha:** 12 de Septiembre de 2026  
**Entorno:** React Native (Expo) / TypeScript  

---

## 🧭 Resumen Ejecutivo y Diagnóstico General

> [!NOTE]
> **Veredicto:** **El proyecto mantiene una estructura inicial sólida, ordenada y modular para un frontend móvil en React Native.**  
> Sin embargo, para alcanzar un estándar de desarrollo de software profesional listo para producción, es necesario incorporar capas específicas para **Servicios (`services/`)** y **Utilidades (`utils/`)**, así como formalizar la separación entre el **Frontend** y el **Backend**.

---

## 1. 🔍 Lo que SÍ cumple con Buenas Prácticas Actualmente

El código dentro de `psicohabitos-app/src/` presenta una separación inicial coherente:

### 📐 A. Tipos y Contratos de Datos Aislados (`src/types/`)
- **Archivos:** `habits.ts`, `patient.ts`, `psychologist.ts`.
- **Por qué es una buena práctica:**
  - Desacopla los contratos de datos de la interfaz gráfica.
  - Diseña los esquemas pensando en las tablas de la base de datos MySQL (compatibilidad con tipos primitivos, formatos `DATE` y `DATETIME`).
  - Previene errores en tiempo de compilación y asegura consistencia en el intercambio de información.

### 🎨 B. Constantes y Fuente Única de Verdad (`src/constants/`)
- **Archivos:** `habits.ts`, `auth.ts`.
- **Por qué es una buena práctica:**
  - Evita el uso de valores mágicos (*magic strings/numbers*) y colores dispersos en la UI.
  - La escala valorativa del 1 al 5, los colores semáforo (`#ef4444`, `#22c55e`, etc.), el catálogo de preguntas y las definiciones de roles (`psicologo` / `paciente`) tienen un único punto de cambio centralizado.

### 🧩 C. Componentes Modulares y Reutilizables (`src/components/`)
- **Archivos:** `PatientBottomNav.tsx`, `DatePickerModal.tsx`.
- **Por qué es una buena práctica:**
  - Elementos transversales (como la barra de navegación inferior de 5 botones y el selector modal de fecha) no pertenecen a una pantalla aislada, sino que pueden ser reutilizados en cualquier vista sin duplicar código.

### 📱 D. Modularización por Vistas / Pantallas (`src/screens/`)
- **Archivos:** `DailyCheckInScreen.tsx`, `PatientCalendarScreen.tsx`, `PatientExercisesScreen.tsx`, `PatientChatbotScreen.tsx`, `PatientProfileScreen.tsx`, `LoginScreen.tsx`, `RegisterPatientScreen.tsx`, `PsychologistDashboardScreen.tsx`, `WelcomeScreen.tsx`.
- **Por qué es una buena práctica:**
  - Cada pestaña, flujo o pantalla del sistema vive en su propio archivo independiente, manteniendo responsabilidades visuales acotadas.

---

## 2. ⚠️ Oportunidades de Mejora (Lo que falta para nivel de producción)

### 🧱 A. Separación Frontend vs. Backend
- **Situación actual:** La carpeta raíz contiene exclusivamente el cliente móvil (`psicohabitos-app`). No existe un servidor backend dentro del repositorio.
- **Principio de seguridad crítico:** Una aplicación móvil en React Native **nunca debe conectarse directamente a una base de datos MySQL**. Almacenar credenciales de base de datos en una app cliente permite que cualquier atacante las extraiga descompilando la aplicación.
- **Arquitectura recomendada:**
  - **Frontend (App móvil):** Se limita a consumir una API HTTP segura (`GET`, `POST`, `PUT`, `DELETE`).
  - **Backend (Servidor API REST / GraphQL):** Valida sesiones, autentica tokens JWT, ejecuta reglas de negocio y consulta la base de datos MySQL de forma protegida.

### 🌐 B. Capa de Servicios / API (`src/services/`)
- **Situación actual:** Pantallas como `DailyCheckInScreen.tsx` o `RegisterPatientScreen.tsx` manejan la lógica de guardado y logs directamente dentro de los componentes visuales.
- **Buena práctica:** La UI debe ser "tonta" respecto a la procedencia de los datos. Se debe crear una capa intermedia de servicios:
  - `habitService.ts`: funciones para registrar o consultar hábitos.
  - `authService.ts`: funciones para login, logout y manejo de tokens.
  - `patientService.ts`: funciones para listar y registrar fichas clínicas.

### 🛠️ C. Capa de Utilidades y Funciones Puras (`src/utils/`)
- **Situación actual:** El formateo de fechas a estándar MySQL (`YYYY-MM-DD`, `YYYY-MM-DD HH:MM:SS`) o el cálculo de validaciones numéricas se encuentran escritos dentro de los componentes.
- **Buena práctica:** Extraer funciones puras e independientes a `src/utils/date.ts` o `src/utils/validators.ts`. Esto elimina la duplicación de código y permite crear pruebas unitarias automatizadas (`Jest`).

---

## 3. 🏗️ Estructura de Arquitectura Limpia Recomendada

La estructura ideal para escalar el proyecto a producción manteniendo frontend, backend, pestañas, componentes y funciones en sus lugares correspondientes:

```text
Psicohabitos/
│
├── DIAGNOSTICO_ARQUITECTURA.md     <-- Documento de buenas prácticas y diagnóstico
│
├── backend/                        <-- [BACKEND INDEPENDIENTE] Servidor Node.js / Express o Python
│   ├── src/
│   │   ├── controllers/            <-- Lógica de negocio (authController, habitController)
│   │   ├── routes/                 <-- Definición de endpoints (/api/habits, /api/auth)
│   │   ├── models/                 <-- Consultas SQL y esquemas de tablas MySQL
│   │   ├── middlewares/            <-- Autenticación JWT y validadores de peticiones
│   │   └── config/
│   │       └── db.ts               <-- Conexión segura a MySQL (usando variables .env)
│   └── package.json
│
└── psicohabitos-app/               <-- [FRONTEND MÓVIL] React Native con Expo
    ├── assets/                     <-- Recursos estáticos (h.o.p.e.png, habitos-nav.png, etc.)
    │
    ├── src/
    │   ├── components/             <-- Componentes visuales reusables (PatientBottomNav, DatePicker)
    │   ├── screens/                <-- Pantallas y pestañas completas (DailyCheckIn, Calendar, etc.)
    │   ├── types/                  <-- Interfaces TypeScript y contratos de datos
    │   ├── constants/              <-- Paletas de color, escalas, roles, configuraciones
    │   │
    │   ├── services/  [A CREAR]    <-- Capa de peticiones al Backend (habitService, authService)
    │   │   ├── api.ts              <-- Configuración base de Axios o Fetch
    │   │   ├── habitService.ts     <-- Llamadas al endpoint de hábitos
    │   │   └── patientService.ts   <-- Llamadas al endpoint de pacientes
    │   │
    │   └── utils/     [A CREAR]    <-- Funciones puras reutilizables
    │       ├── date.ts             <-- Formateadores a formatos MySQL (DATE, DATETIME)
    │       └── validators.ts       <-- Validadores de formato de email, campos obligatorios
    │
    ├── App.tsx                     <-- Enrutador / Orquestador de vistas
    ├── app.json                    <-- Configuración del runtime de Expo
    ├── tsconfig.json               <-- Configuración de TypeScript
    └── package.json
```

---

## 4. 📊 Matriz de Evaluación de Calidad de Software

| Criterio de Arquitectura | Estado Actual | Calificación | Recomendación Inmediata |
| :--- | :--- | :---: | :--- |
| **Separación de Tipos (TypeScript)** | Centralizado en `src/types/` | 🟢 Excelente | Mantener sincronizado con las columnas de MySQL. |
| **Manejo de Constantes y Configuración** | Centralizado en `src/constants/` | 🟢 Excelente | Mantener escalas y catálogos aquí. |
| **Modularidad de Pantallas** | Archivos separados en `src/screens/` | 🟢 Bueno | Cada pantalla con su propio layout y ciclo de vida. |
| **Componentes Reutilizables** | `src/components/` existente | 🟢 Bueno | Seguir extrayendo componentes comunes. |
| **Separación de Funciones de Fecha/Cálculo** | Inline en los componentes | 🟡 Regular | Crear `src/utils/date.ts` y mover funciones ahí. |
| **Capa de Comunicación con Backend** | Inexistente (se emite `console.log`) | 🔴 Pendiente | Crear `src/services/` antes de integrar la API. |
| **Aislamiento Front / Back** | Repositorio solo contiene Frontend | 🟡 En transición | Alojar el servidor en carpeta o repositorio hermano. |

---

## 5. 🚀 Plan de Acción Sugerido para Próximos Pasos

1. **Paso 1 (Refactorización Frontend Menor):**
   - Crear `src/utils/date.ts` y mover las funciones de formateo de fecha (`YYYY-MM-DD` y `YYYY-MM-DD HH:MM:SS`) desde `DailyCheckInScreen.tsx` y `RegisterPatientScreen.tsx`.
2. **Paso 2 (Preparación de Capa de Servicios):**
   - Crear `src/services/habitService.ts` y `src/services/patientService.ts` simulando la llamada asíncrona antes de conectar la base de datos real.
3. **Paso 3 (Estructuración del Backend):**
   - Iniciar la carpeta `backend/` con una API REST conectada a MySQL para recibir y persistir los registros generados por la app.
