"""
URL configuration for togotrans_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# En production, le schema Swagger/Redoc ne doit pas etre expose publiquement :
# il documente en detail la surface d'API interne. Seul le staff Django peut y acceder hors DEBUG.
_schema_permission_classes = (
    (permissions.AllowAny,) if settings.DEBUG else (permissions.IsAdminUser,)
)

schema_view = get_schema_view(
    openapi.Info(
        title="TogoTrans API",
        default_version='v1',
        description="API pour la plateforme de transport TogoTrans",
        contact=openapi.Contact(email="contact@togotrans.tg"),
    ),
    public=settings.DEBUG,
    permission_classes=_schema_permission_classes,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('transport.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/guichet/', include('guichet.urls')),
    path('api/compagnie/', include('guichet.company_urls')),
    path('api/ai/', include('ai_assistant.urls')),
    path('api-auth/', include('rest_framework.urls')),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
