# 📦 Almacen 3.0 - Sistema Pro de Gestión de Inventarios

Sistema industrial de alto rendimiento diseñado para la gestión centralizada de refacciones, tubería y consumibles de **Proair**. Construido con una arquitectura moderna, desacoplada y una interfaz premium de última generación.

---

## 🚀 Capacidades Principales

### 💎 Interfaz Premium (Glassmorphism)
*   **Estética de Vanguardia**: Interfaz moderna basada en efectos de cristal, desenfoques (blur) y gradientes profundos que ofrecen una experiencia visual superior.
*   **Modo Oscuro Nativo**: Diseño optimizado para entornos industriales y oficinas, reduciendo la fatiga visual.
*   **Optimización Móvil**: Experiencia 100% responsive con menús laterales deslizantes y controles táctiles amigables.

### 🔄 Gestión Multi-Contexto Inteligente
*   **Dual Inventory System**: Controla los flujos de **Airpipe** (Tubería) y **Proair** (Refacciones) de forma independiente desde una única plataforma.
*   **Persistencia de Selección**: El sistema recuerda tu contexto de trabajo entre sesiones para maximizar la eficiencia.
*   **Bases de Datos Aisladas**: Integridad de datos garantizada mediante motores SQLite independientes para cada contexto de negocio.

### 🛠️ Herramientas de Control Operativo
*   **Inventario Maestro**: Visualización en tiempo real de existencias calculadas mediante vistas optimizadas de SQL.
*   **Registro de Movimientos**: Trazabilidad completa de Entradas, Salidas y Traslados entre almacenes.
*   **Control de Cajas/Ubicaciones**: Gestión precisa de la ubicación física de los productos para reducir tiempos de búsqueda.
*   **Motor de Ajustes**: Herramientas integradas para realizar correcciones de inventario auditadas.
*   **Dashboard Estadístico**: Panel principal con métricas clave y resumen de actividades recientes.

### 🛡️ Seguridad y Administración de Usuarios
*   **RBAC (Role-Based Access Control)**: Restricción de funciones sensibles según el rol del usuario (Administrador vs Personal).
*   **Flujo de Registro con Aprobación**: Los nuevos usuarios requieren validación administrativa antes de acceder al sistema.
*   **Infraestructura Segura**: Implementación de headers de seguridad avanzados (CSP, HSTS, X-Frame) para proteger la información.

---

## 🛠️ Stack Tecnológico

*   **Frontend**: [Next.js 14](https://nextjs.org/) + [React](https://reactjs.org/) + [Tailwind CSS](https://tailwindcss.com/)
*   **Backend**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+) + [SQLAlchemy](https://www.sqlalchemy.org/)
*   **Estilos**: Custom CSS con variables dinámicas y efectos de translucidez.
*   **Despliegue**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) para una portabilidad total.

---

## 📦 Instalación y Configuración

### 🐳 Opción A: Docker (Recomendado)
Asegúrate de tener Docker instalado y ejecuta:
```bash
docker-compose up -d
```

### 🐍 Opción B: Ejecución Manual

#### 1. Backend (API)
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
python init_db.py
python seed_data.py
uvicorn main:app --reload
```

#### 2. Frontend (UI)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔗 Acceso al Ecosistema
*   **App Web**: `http://localhost:3000`
*   **Documentación API (Swagger)**: `http://localhost:8000/docs`

---
*Desarrollado para la excelencia operativa en Proair. 2026.*
