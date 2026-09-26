"""
services.ia — Módulo de Inteligencia Artificial de la Biblioteca IUB
====================================================================
Motor 100% compatible con Python:
  - llm_client.py        : cliente de LLM local (Ollama) con fallback automático
  - chatbot.py           : asistente virtual con contexto institucional
  - busqueda_semantica.py: búsqueda por intención sobre el catálogo (TF-IDF)
  - recomendador.py      : recomendaciones de libros por perfil e historial
  - predictivo.py        : análisis predictivo y reportes inteligentes

Todas las funciones degradan con elegancia: si Ollama no está disponible,
los servicios usan algoritmos deterministas (reglas, TF-IDF, estadística).
"""