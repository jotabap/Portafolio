import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  console.log('🚀 Chat API endpoint called');
  
  try {
    const body = await request.text();
    console.log('📥 Request body length:', body.length);
    console.log('📥 Request body:', body);
    
    if (!body || body.length === 0) {
      console.error('❌ Empty request body');
      return new Response(JSON.stringify({ error: 'Empty request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Raw body was:', JSON.stringify(body));
      return new Response(JSON.stringify({ error: 'Invalid JSON format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { message } = parsedBody;
    console.log('💬 Message received:', message);
    
    if (!message) {
      console.log('❌ No message provided');
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificación rápida de contexto - solo para preguntas muy fuera de tema
    const veryOffTopicKeywords = [
      'receta', 'cocinar', 'medicina', 'doctor', 'enfermedad', 'síntoma',
      'tutorial programación', 'cómo programar', 'aprende a programar',
      'noticias', 'política', 'elecciones', 'gobierno'
    ];

    const messageLower = message.toLowerCase();
    const hasVeryOffTopicKeywords = veryOffTopicKeywords.some(keyword => messageLower.includes(keyword));

    // Solo rechazar preguntas muy específicas fuera de tema
    if (hasVeryOffTopicKeywords) {
      console.log('🚫 Pregunta muy fuera de contexto detectada');
      return new Response(JSON.stringify({ 
        answer: 'Prefiero enfocarme en preguntas sobre John Batista y su experiencia profesional. ¿Hay algo específico que te gustaría saber sobre él?',
        sources: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Configuración de Azure desde variables de entorno
    const azureEndpoint = import.meta.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = import.meta.env.AZURE_OPENAI_API_KEY;
    const deploymentName = import.meta.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const embeddingDeployment = import.meta.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
    const apiVersion = import.meta.env.AZURE_OPENAI_API_VERSION;
    
    // Configuración de Azure Search desde variables de entorno
    const searchEndpoint = import.meta.env.AZURE_SEARCH_ENDPOINT;
    const searchKey = import.meta.env.AZURE_SEARCH_ADMIN_KEY;
    const searchIndex = import.meta.env.AZURE_SEARCH_INDEX_NAME;

    // Validar que todas las variables estén configuradas
    if (!azureEndpoint || !apiKey || !deploymentName || !embeddingDeployment || !searchEndpoint || !searchKey || !searchIndex) {
      console.error('❌ Faltan variables de entorno de Azure');
      return new Response(JSON.stringify({ 
        answer: 'Error de configuración del servicio. Por favor, verifica las variables de entorno.',
        sources: []
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('🔧 Config cargada desde variables de entorno');

    // 1. Generar embedding para la consulta del usuario
    console.log('🔍 Generando embedding para la consulta...');
    const embeddingUrl = `${azureEndpoint}openai/deployments/${embeddingDeployment}/embeddings?api-version=${apiVersion}`;
    
    let searchResults = [];
    let sources = [];
    
    try {
      const embeddingResponse = await fetch(embeddingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify({
          input: message
        })
      });

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;
        console.log('✅ Embedding generado exitosamente');

        // 2. Búsqueda vectorial en Azure AI Search
        console.log('🔍 Realizando búsqueda vectorial...');
        const searchUrl = `${searchEndpoint}/indexes/${searchIndex}/docs/search?api-version=2024-07-01`;
        
        const searchResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': searchKey
          },
          body: JSON.stringify({
            count: true,
            top: 3,
            vectorQueries: [{
              vector: queryEmbedding,
              fields: "embeddings",
              kind: "vector",
              k: 3
            }]
          })
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          searchResults = searchData.value || [];
          console.log(`📚 Encontrados ${searchResults.length} documentos relevantes`);
          
          // Preparar fuentes para la respuesta  
          sources = searchResults.map((result: any) => ({
            title: result.sources || 'Documento',
            url: null
          }));
        } else {
          const errorText = await searchResponse.text();
          console.log('⚠️ Error en búsqueda:', searchResponse.status, errorText);
        }
      } else {
        const errorText = await embeddingResponse.text();
        console.log('⚠️ Error generando embedding:', embeddingResponse.status, errorText);
      }
    } catch (searchError) {
      console.log('⚠️ Error en búsqueda, continuando sin contexto específico:', searchError);
    }

    // 3. Preparar contexto para el chat
    let systemContent = `Eres un asistente inteligente que actúa como representante de John Batista en su portafolio profesional.

COMPORTAMIENTO PRINCIPAL:
- Responder principalmente sobre John Batista: experiencia, proyectos, habilidades, carrera
- Para preguntas generales simples (saludos, idiomas, preguntas básicas): responder brevemente y redirigir hacia John
- Para preguntas muy específicas fuera de tema: redirigir educadamente hacia John

IMPORTANTE - IDIOMA DE RESPUESTA:
- Si la pregunta está en INGLÉS → responder en INGLÉS
- Si la pregunta está en ESPAÑOL → responder en ESPAÑOL
- Detectar automáticamente el idioma de la pregunta y responder en el mismo idioma

EJEMPLOS DE RESPUESTAS:
- "Do you speak English?" → "Yes, I can communicate in English. I'm here to help you learn about John Batista's professional experience. What would you like to know about him?"
- "Who is John?" → "John Batista is a skilled developer and programmer. I'm here to provide information about his professional experience, projects, and skills. What specifically would you like to know about him?"
- "¿Hablas español?" → "Sí, puedo comunicarme en español. Estoy aquí para ayudarte a conocer sobre la experiencia profesional de John Batista. ¿Qué te gustaría saber sobre él?"
- "¿Quién es John?" → "John Batista es un desarrollador experimentado. Estoy aquí para proporcionarte información sobre su experiencia profesional, proyectos y habilidades. ¿Qué te gustaría saber específicamente sobre él?"

Para preguntas sobre John: usar la información disponible para dar respuestas completas y detalladas EN EL MISMO IDIOMA de la pregunta.
Para preguntas muy específicas fuera de tema: redirigir educadamente EN EL MISMO IDIOMA.

Mantén un tono profesional y amigable.`;
    
    if (searchResults.length > 0) {
      const context = searchResults.map((result: any) => result.content).join('\n\n');
      systemContent += `\n\n📚 INFORMACIÓN DISPONIBLE SOBRE JOHN:\n${context}\n\nUsa ÚNICAMENTE esta información para responder. Si la pregunta es sobre John pero no puedes responderla con esta información, di que no tienes esa información específica EN EL MISMO IDIOMA de la pregunta.`;
      console.log('📝 Contexto agregado al prompt');
    } else {
      systemContent += '\n\n⚠️ No se encontró información específica para esta consulta. Para preguntas generales simples, responde brevemente y redirige hacia John EN EL MISMO IDIOMA. Para preguntas específicas sobre John, di que no tienes esa información EN EL MISMO IDIOMA.';
    }
    
    // Llamada directa a Azure OpenAI
    const chatUrl = `${azureEndpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    console.log('🌐 Making request to:', chatUrl);
    
    const requestBody = {
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user', 
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    };
    
    console.log('📤 Request body for Azure:', JSON.stringify(requestBody, null, 2));
    
    const chatResponse = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📈 Azure response status:', chatResponse.status);

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ Azure OpenAI error:', errorText);
      throw new Error(`Azure OpenAI error: ${chatResponse.status} - ${errorText}`);
    }

    const chatData = await chatResponse.json();
    console.log('✅ Azure response data:', JSON.stringify(chatData, null, 2));
    
    const answer = chatData.choices[0]?.message?.content || 'No pude generar una respuesta.';
    
    const responseData = { 
      answer,
      sources: sources // Incluir las fuentes reales de la búsqueda
    };
    
    console.log('📤 Sending response:', responseData);
    
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Chat API error:', error);
    
    const errorResponse = { 
      error: 'Error procesando el mensaje',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    
    console.log('📤 Sending error response:', errorResponse);
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
