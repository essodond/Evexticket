FROM python:3.12.3-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copier requirements
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copier le code
COPY . .

# Collecter les fichiers statiques
RUN python manage.py collectstatic --no-input || true

# Exposer le port
EXPOSE 8000

# Lancer l'application
CMD ["gunicorn", "togotrans_api.wsgi:application", "--bind", "0.0.0.0:8000"]
