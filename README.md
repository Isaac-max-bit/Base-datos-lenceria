# Markethub - Backend API

Servidor backend para la tienda de lencería Markethub. Construido con **Node.js**, **Express** y **Supabase** (PostgreSQL). Proporciona una API RESTful para la gestión de usuarios, catálogo de productos y carrito de compras, implementando seguridad mediante JWT y encriptación de contraseñas.

## Tecnologías Utilizadas

* **Node.js y Express**: Entorno de ejecución y framework para el servidor web.
* **Supabase**: Base de datos PostgreSQL en la nube y almacenamiento de archivos (Storage).
* **JWT (JSON Web Tokens)**: Autenticación y manejo seguro de sesiones.
* **bcryptjs**: Encriptación de contraseñas con salt.
* **dotenv**: Gestión de variables de entorno.
* **Nodemon**: Reinicio automático del servidor en desarrollo.

## Requisitos Previos

* [Node.js](https://nodejs.org/es/) (versión 18 o superior).
* Un proyecto activo en [Supabase](https://supabase.com/).
* Las tablas de la base de datos creadas (puedes usar los scripts de la carpeta `sql/`).

## Instalación y Configuración

**1. Instalar dependencias:**

```bash
npm install
```

**2. Configurar variables de entorno:**

Renombra el archivo `.env.example` a `.env` y completa los valores con tus credenciales reales:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-clave-secreta-de-servidor
JWT_SECRET=una-cadena-larga-y-aleatoria-para-firmar-tokens
```

**3. Configuración en Supabase:**

* Asegúrate de tener las tablas `Usuario`, `Rol`, `Producto`, `ImagenProducto` y el carrito correspondiente.
* La tabla `Rol` debe contener al menos el registro `admin` y `cliente`.
* El backend utiliza la `SERVICE_ROLE_KEY` para saltar el RLS (Row Level Security) de forma segura desde el servidor.

**4. Iniciar el servidor en desarrollo:**

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`.

## Administrador por Defecto

El servidor cuenta con un proceso de auto-inicialización (`src/utils/crearAdminAuto.js`). Al arrancar el servidor por primera vez, verificará si existe un administrador y lo creará automáticamente si no es así.

* **Correo:** `admin@markethub.com`
* **Contraseña:** `Admin123456`


## Seguridad Implementada

* **Contraseñas Encriptadas:** Las contraseñas nunca se guardan en texto plano; se utiliza `bcryptjs` con 10 rondas de sal.
* **Protección de Rutas (JWT):** Middlewares de autenticación verifican la validez del token en cada petición protegida.
* **Control de Roles:** Rutas exclusivas para administradores (`requiereRol('admin')`).
* **Variables Ocultas:** El archivo `.env` está incluido en el `.gitignore` para proteger las claves de Supabase.
* **CORS Configurado:** El servidor solo acepta peticiones desde los orígenes permitidos (por defecto, el puerto de Vite).

## Endpoints Principales

### Usuarios (`/usuarios`)

* `POST /usuarios` - Registrar un nuevo cliente.
* `POST /usuarios/login` - Iniciar sesión y obtener Token JWT.
* `GET /usuarios/perfil` - Obtener datos del usuario logueado.
* `PATCH /usuarios/perfil` - Actualizar datos propios.
* `GET /usuarios` - Listar todos los usuarios (Requiere Admin).

### Productos (`/productos`)

* `GET /productos` - Obtener catálogo público.
* `GET /productos/buscar?q=...` - Buscar productos por nombre o categoría.
* `POST /productos` - Crear producto (Requiere Admin).
* `POST /productos/:id/imagenes` - Subir imágenes de productos (Requiere Admin).

### Carrito (`/carrito`)

* `GET /carrito` - Obtener los productos en el carrito del usuario.
* `POST /carrito` - Añadir un producto al carrito.
* `DELETE /carrito/:id` - Eliminar un producto del carrito.

## Estructura del Proyecto

```text
base-datos-lenceria/
│
├── config/              # Inicialización de clientes Supabase (Admin y Client)
├── sql/                 # Scripts SQL para crear tablas y datos de prueba
├── src/
│   ├── controller/      # Lógica de las peticiones HTTP
│   ├── middlewares/     # Autenticación (JWT), validaciones e imágenes
│   ├── routes/          # Definición de rutas de la API
│   ├── services/        # Lógica de negocio y consultas a Supabase
│   ├── utils/           # Funciones auxiliares (JWT, respuestas, crearAdminAuto)
│   └── app.js           # Punto de entrada de Express
├── .env                 # Variables de entorno (No se sube a Git)
├── .env.example         # Plantilla de variables
├── .gitignore           # Archivos ignorados por Git (node_modules, .env)
├── package.json         # Dependencias y scripts
└── server.js            # Arranque alternativo
```
