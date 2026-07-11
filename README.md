# 💼 CorteSec

**Sistema de nómina y gestión de personal con control de acceso basado en roles (RBAC granular).**

CorteSec es una aplicación web full-stack para la administración de personal, la liquidación de nómina y el control de accesos mediante roles y permisos. Backend en **Django**, frontend en **JavaScript** y base de datos **PostgreSQL**.

## ✨ Características

- 👥 **Gestión de personal** y conceptos laborales.
- 💰 **Liquidación de nómina**, con soporte orientado a nómina electrónica.
- 🔐 **Control de acceso basado en roles (RBAC granular)**: roles, permisos y auditoría de accesos.
- 📊 **Dashboard** de administración.
- 📧 Integración de correo (SMTP) para notificaciones.

## 🛠️ Stack tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| Backend | Python · Django |
| Frontend | JavaScript · CSS |
| Base de datos | PostgreSQL |
| DevOps | Scripts de despliegue · documentación técnica |

## 📁 Estructura

```text
backend/    # API y lógica de negocio (Django)
frontend/   # Interfaz de usuario
scripts/    # Utilidades y despliegue
```

## 🚀 Puesta en marcha

> Requisitos: Python 3.x · Node.js · PostgreSQL

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd ../frontend
npm install
npm run dev
```

## 👤 Autor

**Miguel Ángel Piraquive Pachón** — [@MiguelPiraquive](https://github.com/MiguelPiraquive) · piraquivemiguel6@gmail.com

---
> Proyecto en desarrollo. La documentación técnica detallada está en los archivos `*.md` del repositorio.
