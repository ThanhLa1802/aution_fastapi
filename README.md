# 🚀 Auction Backend API

> A scalable Auction backend built with FastAPI, MySQL, Docker, and Alembic.

![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-production-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)

---

## 📖 Overview

Auction Backend API is a RESTful service designed for managing an online auction system.

Built with:

- ⚡ FastAPI
- 🐬 MySQL
- 🧱 SQLAlchemy
- 🔄 Alembic (Database migration)
- 🐳 Docker & Docker Compose

The project follows modular architecture and production-ready practices.

---

# 🏗️ Project Structure

```
AUCTION_PROJECT/
│
├── alembic/              # Database migration scripts
│
├── app/
│   ├── core/             # Config, settings, security
│   ├── db/               # Database session, models
│   ├── modules/          # Business modules (users, products, bids...)
│   ├── workers/          # Background workers
│   ├── dependencies.py
│   └── main.py           # FastAPI entrypoint
│
├── scripts/              # Data generation & import scripts
├── docker/               # Docker related files
├── infra/                # Infrastructure configs
│
├── .env.example
├── alembic.ini
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

# ⚙️ Environment Setup

## 1️⃣ Clone repository

```bash
git clone https://github.com/thanhla1802/auction-project.git
cd auction-project
```

---

## 2️⃣ Configure environment variables

Create `.env` file:

```bash
cp .env.example .env
```

Example `.env`:

```env
MYSQL_HOST=db
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=123456
MYSQL_DATABASE=auction_db

DATABASE_URL=mysql+pymysql://root:123456@db:3306/auction_db
```

---

# 🐳 Run with Docker (Recommended)

## Build and start services

```bash
docker-compose up --build
```

Run in detached mode:

```bash
docker-compose up -d --build
```

---

## 🌐 Access API

| Service | URL |
|----------|------|
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

# 🗄️ Database Migration (Alembic)

This project uses Alembic for database version control.

---

## 🔹 Generate migration

After updating models:

```bash
docker-compose exec app alembic revision --autogenerate -m "init tables"
```

---

## 🔹 Apply migration

```bash
docker-compose exec app alembic upgrade head
```

---

## 🔹 Rollback migration

```bash
docker-compose exec app alembic downgrade -1
```

---

## 🔹 Check current version

```bash
docker-compose exec app alembic current
```

---

# 💻 Run Without Docker

## 1️⃣ Create virtual environment

```bash
python -m venv venv
source venv/bin/activate     # Mac/Linux
venv\Scripts\activate        # Windows
```

## 2️⃣ Install dependencies

```bash
pip install -r requirements.txt
```

## 3️⃣ Run server

```bash
uvicorn app.main:app --reload
```

---

# 📊 Seed / Import Data

Inside `scripts/` folder:

```bash
python scripts/generate_data.py
python scripts/import_user.py
```

---

# 🔐 Environment Variables

| Variable | Description |
|-----------|-------------|
| MYSQL_HOST | MySQL hostname |
| MYSQL_PORT | MySQL port |
| MYSQL_USER | MySQL username |
| MYSQL_PASSWORD | MySQL password |
| MYSQL_DATABASE | Database name |
| DATABASE_URL | SQLAlchemy connection string |

---

# 🧠 Architecture Principles

- Modular design
- Dependency Injection
- Database session per request
- Migration version control
- Containerized environment

---

# 🛠️ Tech Stack

| Technology | Purpose |
|------------|----------|
| FastAPI | REST API framework |
| MySQL | Relational database |
| SQLAlchemy | ORM |
| Alembic | Schema migration |
| Docker | Containerization |

---

# 🛣️ Roadmap

- [ ] JWT Authentication
- [ ] Role-based authorization
- [ ] Redis caching
- [ ] Background task queue
- [ ] Unit & Integration tests
- [ ] CI/CD pipeline
- [ ] Production deployment guide

---

# 🤝 Contributing

1. Fork the repository  
2. Create your feature branch  

```bash
git checkout -b feature/your-feature
```

3. Commit your changes  
4. Push to your branch  
5. Open a Pull Request  

---

---

# 👨‍💻 Author

**Thanh La**  
Backend Developer | FastAPI | AWS | System Design

---

⭐ If you find this project helpful, please give it a star!