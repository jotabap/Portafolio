"""
Script para procesar múltiples PDFs y agregarlos al índice de Azure AI Search
Detecta automáticamente el tipo de documento y aplica metadata apropiada
"""

import PyPDF2
import requests
import json
import os
import argparse
import logging
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

# Configuración de Azure
SEARCH_ENDPOINT = os.environ.get("AZURE_SEARCH_ENDPOINT")
SEARCH_KEY = os.environ.get("AZURE_SEARCH_KEY") 
INDEX_NAME = os.environ.get("AZURE_SEARCH_INDEX")
OPENAI_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT")
OPENAI_KEY = os.environ.get("AZURE_OPENAI_API_KEY")
EMBEDDING_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT_EMBED")
API_VERSION = "2024-02-15-preview"

def extract_text_from_pdf(pdf_path):
    """Extrae texto de PDF"""
    try:
        logger.info(f"Extrayendo texto de PDF: {pdf_path}")
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text()
                text += page_text + "\n"
                logger.info(f"Página {page_num}: {len(page_text)} caracteres")
        
        logger.info(f"Total extraído: {len(text)} caracteres")
        return text.strip()
    except Exception as e:
        logger.error(f"Error extrayendo texto de PDF: {e}")
        return None

def create_text_chunks(text, chunk_size=1000, overlap=200):
    """Divide el texto en chunks con overlap"""
    logger.info("Creando chunks de texto...")
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # Si no es el último chunk, buscar un espacio para cortar limpiamente
        if end < len(text):
            last_space = chunk.rfind(' ')
            if last_space > chunk_size - overlap:
                chunk = chunk[:last_space]
                end = start + last_space
        
        if chunk.strip():  # Solo agregar chunks no vacíos
            chunks.append(chunk.strip())
        
        start = end - overlap
        
        if start >= len(text):
            break
    
    logger.info(f"Creados {len(chunks)} chunks")
    return chunks

def detect_document_type(pdf_path, text_sample):
    """Detecta el tipo de documento basado en el nombre del archivo y contenido"""
    filename = os.path.basename(pdf_path).lower()
    
    # Detección por nombre de archivo
    if any(keyword in filename for keyword in ['about', 'sobre', 'acerca', 'personal']):
        return "aboutme"
    elif any(keyword in filename for keyword in ['hobby', 'hobbies', 'pasatiempo', 'aficiones']):
        return "hobbies"
    elif any(keyword in filename for keyword in ['cv', 'resume', 'curriculum']):
        return "cv"
    else:
        # Análisis de contenido
        text_lower = text_sample.lower()
        
        aboutme_keywords = ['sobre mi', 'acerca de', 'personal', 'personalidad', 'valores', 'filosofía']
        hobby_keywords = ['hobby', 'pasatiempo', 'deporte', 'música', 'arte', 'viaje', 'lectura', 'afición']
        cv_keywords = ['experiencia', 'trabajo', 'empresa', 'proyecto', 'certificación', 'educación']
        
        aboutme_score = sum(1 for word in aboutme_keywords if word in text_lower)
        hobby_score = sum(1 for word in hobby_keywords if word in text_lower)
        cv_score = sum(1 for word in cv_keywords if word in text_lower)
        
        if aboutme_score >= max(hobby_score, cv_score):
            return "aboutme"
        elif hobby_score > cv_score:
            return "hobbies"
        else:
            return "cv"

def generate_embedding(text):
    """Genera embedding usando Azure OpenAI REST API"""
    try:
        url = f"{OPENAI_ENDPOINT}openai/deployments/{EMBEDDING_DEPLOYMENT}/embeddings?api-version={API_VERSION}"
        
        headers = {
            "Content-Type": "application/json",
            "api-key": OPENAI_KEY
        }
        
        data = {
            "input": text
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 200:
            result = response.json()
            return result["data"][0]["embedding"]
        else:
            logger.error(f"Error generando embedding: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error en la llamada a embedding API: {e}")
        return None

def upload_to_search_index(documents):
    """Sube documentos al índice de Azure AI Search"""
    if not documents:
        logger.warning("No hay documentos para subir")
        return False
        
    url = f"{SEARCH_ENDPOINT}/indexes/{INDEX_NAME}/docs/index?api-version=2024-07-01"
    headers = {
        "Content-Type": "application/json",
        "api-key": SEARCH_KEY
    }
    
    payload = {
        "value": documents
    }
    
    try:
        logger.info(f"Subiendo {len(documents)} documentos al índice...")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            logger.info("✅ Documentos subidos exitosamente")
            return True
        else:
            logger.error(f"❌ Error subiendo documentos: {response.status_code}")
            logger.error(f"Respuesta: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error en upload: {e}")
        return False

def get_source_title(doc_type):
    """Obtiene el título de la fuente según el tipo de documento"""
    titles = {
        "cv": "John Batista CV 2024",
        "aboutme": "John Batista - Sobre Mí 2024", 
        "hobbies": "John Batista - Hobbies y Aficiones 2024"
    }
    return titles.get(doc_type, "John Batista - Documento 2024")

def process_pdf(pdf_path, source_override=None):
    """Procesa un PDF y lo agrega al índice"""
    logger.info(f"🚀 Iniciando procesamiento de: {pdf_path}")
    
    # Verificar que el archivo existe
    if not os.path.exists(pdf_path):
        logger.error(f"❌ Archivo no encontrado: {pdf_path}")
        return False
    
    # Extraer texto del PDF
    text = extract_text_from_pdf(pdf_path)
    if not text:
        logger.error("❌ No se pudo extraer texto del PDF")
        return False
    
    # Detectar tipo de documento
    doc_type = detect_document_type(pdf_path, text[:1000])
    logger.info(f"📋 Tipo de documento detectado: {doc_type}")
    
    # Crear chunks del texto
    chunks = create_text_chunks(text)
    if not chunks:
        logger.error("❌ No se pudieron crear chunks del texto")
        return False
    
    # Preparar documentos para el índice
    documents = []
    source_title = source_override or get_source_title(doc_type)
    
    logger.info("🔄 Generando embeddings...")
    
    for i, chunk in enumerate(chunks, 1):
        logger.info(f"Procesando chunk {i}/{len(chunks)}")
        
        # Generar embedding para el chunk
        embedding = generate_embedding(chunk)
        if not embedding:
            logger.warning(f"⚠️ No se pudo generar embedding para chunk {i}")
            continue
        
        # Crear ID único para el documento
        filename_base = os.path.splitext(os.path.basename(pdf_path))[0]
        doc_id = f"{doc_type}_{filename_base}_chunk_{i}"
        
        # Crear documento
        document = {
            "@search.action": "upload",
            "id": doc_id,
            "content": chunk,
            "sources": source_title,
            "embeddings": embedding
        }
        
        documents.append(document)
        logger.info(f"✅ Chunk {i} procesado exitosamente")
    
    if not documents:
        logger.error("❌ No se procesaron documentos válidos")
        return False
    
    # Subir documentos al índice
    logger.info(f"📤 Subiendo {len(documents)} chunks al índice...")
    success = upload_to_search_index(documents)
    
    if success:
        logger.info(f"🎉 ¡Procesamiento completado exitosamente!")
        logger.info(f"📊 Estadísticas:")
        logger.info(f"   📄 Archivo: {pdf_path}")
        logger.info(f"   📋 Tipo: {doc_type}")
        logger.info(f"   🧩 Chunks procesados: {len(documents)}")
        logger.info(f"   📚 Fuente: {source_title}")
        return True
    else:
        logger.error("❌ Error subiendo al índice")
        return False

def main():
    """Función principal"""
    parser = argparse.ArgumentParser(description='Procesa PDFs y los agrega al índice de Azure AI Search')
    parser.add_argument('pdf_path', help='Ruta al archivo PDF')
    parser.add_argument('--source', help='Título personalizado para la fuente')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🚀 PROCESADOR DE PDFs PARA PORTFOLIO")
    print("=" * 60)
    print()
    
    # Verificar configuración
    missing_config = []
    for key in ["AZURE_SEARCH_ENDPOINT", "AZURE_SEARCH_KEY", "AZURE_SEARCH_INDEX", 
                "AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_DEPLOYMENT_EMBED"]:
        if not os.environ.get(key):
            missing_config.append(key)
    
    if missing_config:
        logger.error("❌ Configuración faltante:")
        for key in missing_config:
            logger.error(f"   - {key}")
        return
    
    logger.info("✅ Configuración cargada correctamente")
    
    # Procesar PDF
    success = process_pdf(args.pdf_path, args.source)
    
    if success:
        print("\n" + "=" * 60)
        print("✅ ¡PROCESAMIENTO EXITOSO!")
        print("🔍 El documento ya está disponible para búsqueda en tu chat")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ ERROR EN EL PROCESAMIENTO")
        print("📝 Revisa los logs arriba para más detalles")
        print("=" * 60)

if __name__ == "__main__":
    main()
