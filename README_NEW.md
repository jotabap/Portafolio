# Portfolio Personal - John Batista

Portfolio personal con chat RAG inteligente integrado usando Azure OpenAI y Azure AI Search.

## 🚀 Características

- **Portfolio moderno**: Diseño responsivo con Astro y Tailwind CSS
- **Chat RAG inteligente**: Responde preguntas específicas sobre experiencia, proyectos y habilidades
- **Búsqueda vectorial**: Utiliza Azure AI Search para encontrar información relevante
- **IA conversacional**: Powered by Azure OpenAI (gpt-4o-mini)
- **Procesamiento de PDFs**: Indexa automáticamente documentos CV y información personal
- **Modo oscuro/claro**: Interface adaptable

## 🛠️ Tecnologías

- **Frontend**: Astro, TypeScript, Tailwind CSS
- **Backend**: API Routes de Astro
- **IA**: Azure OpenAI (gpt-4o-mini, text-embedding-3-large)
- **Búsqueda**: Azure AI Search con vectores
- **Documentos**: Procesamiento automático de PDFs

## ⚙️ Configuración

### 1. Clonar e instalar
```bash
git clone https://github.com/jotabap/Portafolio.git
cd Portafolio
npm install
```

### 2. Variables de entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales de Azure
# NUNCA subir .env al repositorio
```

Variables requeridas en `.env`:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_SEARCH_ENDPOINT`
- `AZURE_SEARCH_KEY`
- `AZURE_SEARCH_INDEX`

### 3. Ejecutar en desarrollo
```bash
npm run dev
```

## 📄 Agregar documentos al chat

Para agregar nuevos PDFs (CV, información personal, etc.):

```bash
python src/components/api/process_multiple_pdfs.py public/tu-documento.pdf
```

El sistema detecta automáticamente el tipo de documento y lo indexa apropiadamente.

## 🔒 Seguridad

- ✅ Archivo `.env` protegido en `.gitignore`
- ✅ Credenciales nunca se suben al repositorio
- ✅ Chat limitado solo a información personal
- ✅ Validación de contexto para evitar preguntas fuera de tema

## 🌐 Deployment

Este proyecto está configurado para Azure Static Web Apps:

1. Las variables de entorno se configuran en Azure Portal
2. Deployment automático desde GitHub
3. Chat endpoint funciona sin configuración adicional

## 📊 Estructura del proyecto

```
src/
├── components/
│   ├── ChatWidget.astro      # Widget del chat
│   └── api/
│       └── process_multiple_pdfs.py  # Procesador de PDFs
├── pages/
│   ├── api/
│   │   └── chat.ts           # Endpoint del chat
│   └── index.astro           # Página principal
└── scripts/
    └── chat.js               # Lógica del chat frontend
```

## 🧪 Funcionalidades del Chat

### ✅ Responde sobre:
- Experiencia profesional
- Proyectos desarrollados
- Habilidades técnicas y certificaciones
- Educación y formación
- Hobbies y pasatiempos
- Personalidad y valores

### ❌ No responde sobre:
- Programación general
- Otros desarrolladores
- Noticias, clima, política
- Temas fuera del contexto personal

## 📧 Contacto

- **Email**: jbatista247@gmail.com
- **LinkedIn**: [johnbatistaalvarez](https://www.linkedin.com/in/johnbatistaalvarez)
- **GitHub**: [jotabap](https://github.com/jotabap)
- **Website**: https://johnbatista.net/

---

*Desarrollado con ❤️ usando Astro, Azure OpenAI y Azure AI Search*
