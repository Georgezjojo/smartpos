# SmartPOS & Business Intelligence System

A modern, multi-tenant POS system built with **Django REST Framework** and a **Vanilla JS Frontend**.

## Quick Start
1. Clone the repo
2. Install backend dependencies: `pip install -r backend/requirements.txt`
3. Set up MySQL database and update `settings.py`
4. Run migrations: `python manage.py migrate`
5. Start Redis for Celery & Channels
6. Start Celery worker: `celery -A smartpos worker -l info`
7. Start Daphne: `daphne smartpos.asgi:application`
8. Open `frontend/index.html` in a browser (or serve via Nginx)

## Features
- Multi-business / multi-branch
- Real-time inventory & sales
- Beautiful responsive UI with dark mode
- OTP verification, password strength meter
- POS with cart, receipts, keyboard shortcuts
- Dashboard with auto-refresh
- CSV export, Swagger docs, audit logs
- Docker support