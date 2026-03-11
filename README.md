# Almacen 2.0 - Sistema de Gestión de Inventarios

Sistema centralizado para el control de refacciones, tubería y consumibles de Proair.

## Requisitos Previos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (Versión 18 o superior)
- [Python 3.11+](https://www.python.org/)

## Cómo Ejecutar el Sistema

### 1. Iniciar Base de Datos y Backend
Tienes dos opciones:

#### Opción A: Con Docker (Recomendado)
Asegúrate de que **Docker Desktop** esté abierto y ejecuta:
```bash
docker-compose up -d
```

#### Opción B: Sin Docker (Rápido / SQLite)
Si no tienes Docker abierto, puedes usar SQLite localmente:
```bash
cd backend
pip install -r requirements.txt
python init_db.py
python seed_data.py
uvicorn main:app --reload
```

### 2. Inicializar Datos (Opcional)
Para crear las tablas y cargar datos de prueba:
```bash
cd backend
pip install -r requirements.txt
python init_db.py
python seed_data.py
```

### 2. Inicializar Datos (Requerido para Usuarios)
Para crear las tablas y cargar el usuario administrador por defecto:
```bash
cd backend
pip install -r requirements.txt
python init_db.py
python seed_data.py
```
*Credenciales por defecto: `admin` / `proair2026`*
En una nueva terminal, desde la carpeta `frontend`:
```bash
cd frontend
npm install
npm run dev
```

### 4. Acceder al Sistema
Abre tu navegador en:
- **App Web**: [http://localhost:3000](http://localhost:3000)
- **Documentación API**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Estructura del Proyecto
- `backend/`: API construida con FastAPI y SQLAlchemy.
- `frontend/`: Interfaz de usuario con Next.js y Tailwind CSS.
- `docker-compose.yml`: Orquestación de servicios locales.
