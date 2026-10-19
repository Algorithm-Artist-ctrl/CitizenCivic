"""
Django settings for CitizenCivic project.
"""

import os
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv

# Load environment variables from .env file at project root
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR.parent / '.env'
load_dotenv(ENV_PATH)

SECRET_KEY = os.environ.get('SECRET_KEY', 'insecure-dev-key-change-me')

DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if h.strip()
]

for default_host in ['localhost', '127.0.0.1', '.onrender.com', 'testserver']:
    if default_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(default_host)

# Support Render external hostname if provided
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# ---------- Application definition ----------

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    'django_filters',
    'django_extensions',
    # Local apps
    'accounts',
    'core',
    'areas',
    'cases',
    'rewards',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.AuditLogMiddleware',
]

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        'CSRF_TRUSTED_ORIGINS',
        'https://*.onrender.com,http://localhost:5173,http://localhost:3000'
    ).split(',')
    if o.strip()
]

ROOT_URLCONF = 'citizencivic.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'citizencivic.wsgi.application'

# ---------- Database ----------

DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

NEON_REALTIME_URL = os.environ.get('NEON_REALTIME_URL', '')

# ---------- Auth ----------

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------- REST Framework ----------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute',
        'user': '120/minute',
    },
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S%z',
}

# ---------- JWT ----------

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ---------- CORS ----------

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
    if o.strip()
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.onrender\.com$",
    r"^https://.*\.pages\.dev$",
]

CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL', 'false').lower() in ('true', '1', 'yes')
CORS_ALLOW_CREDENTIALS = True

# ---------- Internationalization ----------

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ('en', 'English'),
    ('hi', 'Hindi'),
]

# ---------- Static & Media ----------

FRONTEND_DIST_DIR = BASE_DIR.parent / 'frontend' / 'dist'
if not FRONTEND_DIST_DIR.exists():
    FRONTEND_DIST_DIR = BASE_DIR.parent / 'dist'

STATIC_DIR = BASE_DIR / 'static'
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_DIRS = []
if STATIC_DIR.exists():
    STATICFILES_DIRS.append(STATIC_DIR)
if FRONTEND_DIST_DIR.exists() and FRONTEND_DIST_DIR != STATIC_DIR and FRONTEND_DIST_DIR not in STATICFILES_DIRS:
    STATICFILES_DIRS.append(FRONTEND_DIST_DIR)

# WhiteNoise serves SPA assets (e.g. /assets/..., /favicon.svg) from the root URL
WHITENOISE_ROOT = STATIC_DIR if STATIC_DIR.exists() else (FRONTEND_DIST_DIR if FRONTEND_DIST_DIR.exists() else None)

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ---------- File Upload ----------

FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# ---------- AI Configuration ----------

AI_ENABLED = os.environ.get('AI_ENABLED', 'false').lower() in ('true', '1', 'yes')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# ---------- Default primary key field type ----------

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
