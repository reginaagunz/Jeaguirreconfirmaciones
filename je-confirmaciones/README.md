# JE Aguirre Consultores — Confirmación de citas

Mini aplicación web para que los clientes de JE Aguirre Consultores confirmen su
asistencia a reuniones por Zoom mediante un link único y personal.

---

## 1. Decisión de arquitectura (por qué se eligió así)

Antes de programar, la prioridad era: **fácil de mantener, barata, segura, fácil de
desplegar, y usable por alguien no técnico.** Con eso en mente:

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Un solo proyecto sirve el frontend (páginas) *y* el backend (API routes). No hay que mantener ni desplegar dos servicios separados. |
| Base de datos | **Prisma ORM**, SQLite en desarrollo / **Postgres** en producción | Prisma hace segura y simple cualquier consulta (evita SQL injection por diseño). SQLite no requiere nada instalado para probar localmente. Postgres (por ejemplo en [Neon](https://neon.tech) o [Supabase](https://supabase.com), ambos con capa gratuita) es la opción recomendada para producción porque, a diferencia de SQLite, sobrevive a los despliegues de Vercel. |
| Hosting | **Vercel** | Despliegue gratuito para este tamaño de proyecto, hecho por los creadores de Next.js, sin servidores que mantener. |
| Correo | **Gmail SMTP + Nodemailer**, con una "Contraseña de aplicación" | La opción más simple y confiable para un equipo pequeño: no requiere aprobar una app OAuth ante Google ni renovar tokens. Ya usan Gmail, así que solo hace falta una contraseña de aplicación (ver sección 4). |
| Calendario ("Agregar a mi calendario") | Archivo **.ics** generado por el propio servidor | Es un estándar abierto que Google Calendar, Apple Calendar y Outlook abren directamente, sin necesitar ninguna API ni credencial de Google. |
| Autenticación del panel admin | Contraseña única + cookie de sesión firmada (HMAC) | Apropiado para un equipo pequeño que comparte un panel. Es fácil de usar (una sola contraseña) y seguro (la cookie es `httpOnly`, firmada, y expira sola). Si más adelante quieren cuentas individuales por persona, esto se puede reemplazar por NextAuth sin tocar el resto de la app. |

**Lo que NO se usó y por qué:** no se usó una arquitectura de microservicios, colas de
mensajes, ni un backend separado — todo eso sería sobre-ingeniería para una app de un
solo formulario. Tampoco se integró Google Calendar todavía (ver sección 6):
requiere credenciales OAuth que ustedes deben generar y autorizar, y no quise
inventar esa integración sin poder probarla.

---

## 2. Estructura de archivos

```
je-confirmaciones/
├── app/
│   ├── page.tsx                        → "/" redirige a /admin
│   ├── layout.tsx                      → layout raíz, fuentes (Fraunces + Instrument Sans)
│   ├── globals.css                     → tokens de diseño (colores, radios, animaciones)
│   │
│   ├── confirmar/[token]/
│   │   ├── page.tsx                    → server component: busca la cita por token
│   │   └── ConfirmClient.tsx           → UI interactiva: pendiente / confirmada / declinada
│   │
│   ├── admin/
│   │   ├── page.tsx                    → login del panel admin
│   │   └── dashboard/
│   │       ├── page.tsx                → wrapper del dashboard (protegido por middleware)
│   │       ├── DashboardClient.tsx     → tabla de citas, crear, copiar link/WhatsApp
│   │       └── AppointmentFormModal.tsx→ formulario de alta/edición de citas
│   │
│   └── api/
│       ├── confirmar/[token]/
│       │   ├── confirm/route.ts        → POST: marca CONFIRMED, envía correos
│       │   └── decline/route.ts        → POST: marca DECLINED, envía correo al equipo
│       ├── ics/[token]/route.ts        → GET: descarga el archivo .ics de la cita
│       └── admin/
│           ├── login/route.ts          → POST: valida contraseña, crea cookie de sesión
│           ├── logout/route.ts         → POST: borra la cookie
│           └── appointments/
│               ├── route.ts            → GET lista todas, POST crea una
│               └── [id]/route.ts       → PATCH edita, DELETE elimina
│
├── lib/
│   ├── prisma.ts        → cliente de base de datos (singleton)
│   ├── token.ts          → genera tokens únicos e impredecibles (192 bits de entropía)
│   ├── timezone.ts        → convierte "10:00 en America/Mexico_City" a UTC correctamente
│   ├── format.ts          → genera "Jueves 2 de octubre de 2026" / "10:00 AM"
│   ├── ics.ts             → genera el archivo .ics
│   ├── email.ts           → las 3 plantillas y el envío de correos por Gmail
│   ├── session.ts         → cookie de sesión del admin (Web Crypto, corre en Edge)
│   └── auth.ts            → verificación de la contraseña admin (Node crypto)
│
├── middleware.ts          → protege /admin/dashboard/* y /api/admin/appointments/*
├── prisma/
│   ├── schema.prisma      → modelo de datos (Appointment)
│   └── seed.ts            → crea una cita de prueba
│
├── public/
│   ├── logo-vertical.png
│   ├── logo-horizontal.jpeg
│   └── asesor-jose-eduardo.jpeg
│
└── .env.example            → plantilla de variables de entorno (ver sección 4)
```

---

## 3. Cómo funciona el flujo (paso a paso)

1. El equipo entra a **`/admin`**, pone la contraseña, y llega al dashboard
   (**`/admin/dashboard`**).
2. Da clic en **"+ Nueva cita"** y llena: nombre y email del cliente, teléfono
   (opcional), asesor, fecha, hora, zona horaria y el enlace de Zoom **de esa cita
   específica**.
3. Al guardar, el servidor genera un **token único e impredecible** (no un ID
   secuencial) y crea la cita en estado `PENDING`.
4. En la tabla, el equipo da clic en **"Copiar link"** (copia
   `https://tu-dominio.com/confirmar/TOKEN`) o en **"Mensaje WhatsApp"** (copia el
   mensaje ya redactado, listo para pegar en WhatsApp Web o el celular).
5. El cliente abre el link. La página consulta la cita **por el token**, nunca por
   parámetros que el cliente pueda editar — cambiar cualquier cosa en la URL a mano
   simplemente no encuentra ninguna cita.
6. El cliente ve fecha, hora, modalidad y asesor, y dos botones: **Confirmar mi
   asistencia** / **No podré asistir**. El enlace de Zoom todavía no se muestra.
7. Si confirma:
   - El servidor marca la cita como `CONFIRMED` y guarda la fecha/hora de
     confirmación.
   - Envía un correo al equipo (`✅ Cita confirmada — [Nombre]`) y otro al cliente
     (con el botón para entrar a Zoom y el botón para agregar al calendario).
   - La página muestra el enlace de Zoom **de esa cita** y el botón para descargar
     el archivo `.ics`.
8. Si declina:
   - El servidor marca la cita como `DECLINED`.
   - Envía un correo al equipo (`🔴 Cita no confirmada — [Nombre]`).
   - La página muestra un mensaje amable y, si configuraron el número de WhatsApp
     del equipo, un botón para escribirles directamente.
9. Si el cliente vuelve a abrir el mismo link después, la página le muestra
   automáticamente el estado en el que quedó la cita (confirmada o declinada), en
   vez de dejarlo confirmar dos veces.

---

## 4. Variables de entorno necesarias

Copia `.env.example` como `.env` y complétalo. Esto es lo que falta y de dónde
sacarlo:

| Variable | Qué es | Dónde obtenerla |
|---|---|---|
| `DATABASE_URL` | Conexión a la base de datos | En local no necesitas nada (`file:./dev.db`). En producción, crea una base Postgres gratuita en [neon.tech](https://neon.tech) o [supabase.com](https://supabase.com) y copia la cadena de conexión que te dan. |
| `NEXT_PUBLIC_BASE_URL` | URL pública del sitio | En local: `http://localhost:3000`. En producción: el dominio que te asigne Vercel o tu dominio propio. |
| `ADMIN_PASSWORD` | Contraseña del panel admin | La eliges tú. Usa una contraseña robusta, no la reutilices de otro sistema. |
| `ADMIN_SESSION_SECRET` | Secreto para firmar la cookie de sesión | Genera una aleatoria con `openssl rand -hex 32` en la terminal (o pídeme que te genere una). |
| `GMAIL_USER` | Cuenta de Gmail que envía los correos | `contactojeduardoaguirre@dreamakers.com.mx` (o la que prefieran usar para notificaciones). |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de Gmail | **Esta es la que falta configurar.** Se genera en [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Requiere tener activada la verificación en 2 pasos en esa cuenta de Google. Genera una contraseña de 16 caracteres específica para "Mail" y pégala aquí (no es la contraseña normal de la cuenta). |
| `TEAM_NOTIFICATION_EMAIL` | A dónde llegan las notificaciones de confirmación/cancelación | `contactojeduardoaguirre@dreamakers.com.mx`, como pediste. |
| `NEXT_PUBLIC_TEAM_WHATSAPP_NUMBER` | Número para el botón "Contactar a JE Aguirre" | Opcional. Formato internacional sin signos, ej. `5215512345678`. |

**Nunca subas el archivo `.env` a GitHub.** Ya está incluido en `.gitignore`.

---

## 5. Servicios externos que hay que configurar

1. **Una cuenta de Gmail con verificación en 2 pasos activada**, para generar la
   contraseña de aplicación (`GMAIL_APP_PASSWORD`). Sin esto, el envío de correos
   fallará (aunque la confirmación en sí seguirá funcionando — ver sección 8).
2. **Una base de datos Postgres** para producción (Neon o Supabase, capa gratuita
   alcanza de sobra para este volumen de citas).
3. **Una cuenta de Vercel** (gratuita) para el despliegue.
4. Opcional: **número de WhatsApp del equipo**, para el botón de contacto cuando un
   cliente declina.

---

## 6. Sobre Google Calendar / Gmail API (integración futura)

Como pediste, **no inventé** una integración con Google Calendar porque no tengo
las credenciales OAuth de su proyecto anterior. Si quieren agregarla después (para
que el sistema lea automáticamente cliente/fecha/hora/Zoom/asesor desde un evento de
Calendar), esto es lo que se necesitaría:

1. Un proyecto en [Google Cloud Console](https://console.cloud.google.com/) con la
   **Google Calendar API** habilitada.
2. Credenciales OAuth 2.0 (Client ID y Client Secret) autorizadas para su dominio.
3. Un flujo de autorización donde alguien del equipo conecte su cuenta de Google
   una vez (esto genera un *refresh token* que se guarda como variable de entorno).
4. Nuevas variables de entorno: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REFRESH_TOKEN`.

Si ya tienen esas credenciales del proyecto anterior, compártanlas (nunca dentro
del código, siempre como variables de entorno) y puedo conectar esa pieza.

---

## 7. Instalación y primeros pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# edita .env con tus valores (ver sección 4)

# 3. Crear la base de datos y las tablas
npm run db:push

# 4. Iniciar el servidor de desarrollo
npm run dev
```

Abre `http://localhost:3000/admin`, entra con la contraseña que pusiste en
`ADMIN_PASSWORD`, y ya puedes crear tu primera cita desde ahí.

### Crear una cita de prueba sin usar el panel

```bash
npm run db:seed
```

Esto imprime en la terminal el link de confirmación de una cita de prueba, listo
para abrir en el navegador.

### Probar una confirmación

1. Abre el link que te dio el seed (o el que copiaste desde el panel admin).
2. Da clic en **"Confirmar mi asistencia"**.
3. Deberías ver la pantalla de éxito con el botón de Zoom y el de calendario.
4. En el panel admin (`/admin/dashboard`), recarga: el estado de esa cita ahora
   dice **Confirmada**.

### Probar el envío de correos

1. Asegúrate de tener `GMAIL_USER`, `GMAIL_APP_PASSWORD` y
   `TEAM_NOTIFICATION_EMAIL` configurados en `.env`.
2. Confirma o declina una cita de prueba (paso anterior).
3. Revisa la bandeja de `TEAM_NOTIFICATION_EMAIL` (debería llegar en segundos) y,
   si confirmaste, también la bandeja del `clientEmail` que usaste al crear la
   cita.
4. Si algo falla, revisa la terminal donde corre `npm run dev`: los errores de
   envío quedan registrados ahí (la confirmación en sí nunca falla por un error
   de correo, ver sección 8).

---

## 8. Cómo desplegar (Vercel)

1. Sube el proyecto a un repositorio de GitHub (privado, recomendado).
2. En [vercel.com](https://vercel.com), da clic en **"Add New Project"** e
   impórtalo desde GitHub.
3. En **Environment Variables**, agrega todas las variables de la sección 4 con
   sus valores reales de producción (usa la `DATABASE_URL` de Postgres, no la de
   SQLite).
4. Despliega. Vercel construye el proyecto automáticamente (`npm run build`, que ya
   incluye `prisma generate`).
5. Después del primer despliegue, corre la migración de base de datos una vez
   (puedes hacerlo desde tu máquina apuntando a la `DATABASE_URL` de producción):
   ```bash
   DATABASE_URL="postgresql://..." npm run db:push
   ```
6. Actualiza `NEXT_PUBLIC_BASE_URL` en Vercel con el dominio final (el que te dé
   Vercel, o tu dominio propio si conectas uno).

---

## 9. Qué falta para producción (pendientes conocidos)

- **Cambiar `DATABASE_URL` de SQLite a Postgres** antes de desplegar — SQLite no
  persiste entre despliegues en Vercel.
- **Generar y configurar `GMAIL_APP_PASSWORD`** — sin esto no salen los correos
  (el resto de la app funciona igual).
- **Definir `ADMIN_SESSION_SECRET` y `ADMIN_PASSWORD` reales** — los del
  `.env.example` son solo placeholders.
- **Conectar un dominio propio** en Vercel si no quieren usar el subdominio
  `*.vercel.app` (opcional, pero se ve más profesional para un cliente que ve el
  link antes de confirmar).
- **Expiración de links** (opcional, no implementada): si quieren que un link deje
  de funcionar después de X días, es un cambio pequeño en el schema y en
  `page.tsx` — avísenme y lo agrego.
- **Botón "eliminar cita"** en el panel: la API ya lo soporta
  (`DELETE /api/admin/appointments/[id]`), solo falta el botón en la tabla si lo
  quieren visible.
- **Revisar límites de envío de Gmail**: una cuenta normal de Gmail permite hasta
  500 correos salientes por día, más que suficiente para este volumen de citas.

---

## 10. Seguridad — resumen de lo implementado

- Tokens de 192 bits de entropía, imposibles de adivinar por fuerza bruta.
- La URL nunca contiene nombre, email ni el enlace de Zoom del cliente.
- Toda validación (fechas, emails, estado de la cita) ocurre en el servidor; el
  cliente no puede "confirmar" o "editar" una cita distinta cambiando la URL.
- El panel admin está protegido por middleware en el servidor, no solo por lógica
  del lado del cliente.
- La cookie de sesión del admin es `httpOnly` (inaccesible desde JavaScript),
  firmada con HMAC-SHA256, y expira sola a las 12 horas.
- Ninguna credencial (contraseña de Gmail, secretos de sesión) está escrita en el
  código — todo se lee de variables de entorno.
- El enlace de Zoom de una cita pendiente nunca se envía al navegador; solo se
  revela una vez que la cita queda `CONFIRMED`.
