from django.urls import path
from . import views

urlpatterns = [
    path('classify_message/', views.classify_message, name='classify_message'),
    path('retrain_model/', views.retrain_model, name='retrain_model'),
    path('reload_model/', views.reload_model, name='reload_model'),
]
