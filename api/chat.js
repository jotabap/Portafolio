const { app } = require('@azure/functions');

app.http('chat', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('🚀 Chat API endpoint called');
        
        if (request.method === 'GET') {
            return { 
                status: 200,
                body: JSON.stringify({ message: 'Chat API is running' }),
                headers: { 'Content-Type': 'application/json' }
            };
        }

        try {
            const body = await request.text();
            context.log('📥 Request body length:', body.length);
            
            if (!body) {
                context.log('❌ No request body received');
                return {
                    status: 400,
                    body: JSON.stringify({ 
                        answer: 'No se recibió mensaje. Por favor, envía tu pregunta.',
                        sources: []
                    }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            let message;
            try {
                const parsed = JSON.parse(body);
                message = parsed.message;
                context.log('📝 Message received:', message?.substring(0, 100) + '...');
            } catch (e) {
                context.log('❌ Error parsing JSON:', e.message);
                return {
                    status: 400,
                    body: JSON.stringify({ 
                        answer: 'Error al procesar el mensaje. Por favor, verifica el formato.',
                        sources: []
                    }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                context.log('❌ Invalid message received');
                return {
                    status: 400,
                    body: JSON.stringify({ 
                        answer: 'Por favor, envía un mensaje válido.',
                        sources: []
                    }),
                    headers: { 'Content-Type': 'application/json' }
                };
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
                context.log('🚫 Pregunta muy fuera de contexto detectada');
                return {
                    status: 200,
                    body: JSON.stringify({ 
                        answer: 'Prefiero enfocarme en preguntas sobre John Batista y su experiencia profesional. ¿Hay algo específico que te gustaría saber sobre él?',
                        sources: []
                    }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            // Configuración de Azure desde variables de entorno
            const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
            const apiKey = process.env.AZURE_OPENAI_API_KEY;
            const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_CHAT;
            const embeddingDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_EMBED;
            const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
            
            // Configuración de Azure Search desde variables de entorno
            const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
            const searchKey = process.env.AZURE_SEARCH_KEY;
            const searchIndex = process.env.AZURE_SEARCH_INDEX;

            context.log('🔧 Environment variables check:');
            context.log(`- AZURE_OPENAI_ENDPOINT: ${azureEndpoint ? 'SET' : 'MISSING'}`);
            context.log(`- AZURE_OPENAI_API_KEY: ${apiKey ? 'SET' : 'MISSING'}`);
            context.log(`- AZURE_OPENAI_DEPLOYMENT_CHAT: ${deploymentName ? 'SET' : 'MISSING'}`);
            context.log(`- AZURE_OPENAI_DEPLOYMENT_EMBED: ${embeddingDeployment ? 'SET' : 'MISSING'}`);
            context.log(`- AZURE_SEARCH_ENDPOINT: ${searchEndpoint ? 'SET' : 'MISSING'}`);
            context.log(`- AZURE_SEARCH_KEY: ${searchKey ? 'SET' : 'MISSING'}`);
            context.log(`- AZURE_SEARCH_INDEX: ${searchIndex ? 'SET' : 'MISSING'}`);

            // Validar que todas las variables estén configuradas
            if (!azureEndpoint || !apiKey || !deploymentName || !embeddingDeployment || !searchEndpoint || !searchKey || !searchIndex) {
                context.log('❌ Faltan variables de entorno de Azure');
                const missingVars = [];
                if (!azureEndpoint) missingVars.push('AZURE_OPENAI_ENDPOINT');
                if (!apiKey) missingVars.push('AZURE_OPENAI_API_KEY');
                if (!deploymentName) missingVars.push('AZURE_OPENAI_DEPLOYMENT_CHAT');
                if (!embeddingDeployment) missingVars.push('AZURE_OPENAI_DEPLOYMENT_EMBED');
                if (!searchEndpoint) missingVars.push('AZURE_SEARCH_ENDPOINT');
                if (!searchKey) missingVars.push('AZURE_SEARCH_KEY');
                if (!searchIndex) missingVars.push('AZURE_SEARCH_INDEX');
                context.log(`Missing vars: ${missingVars.join(', ')}`);
                
                return {
                    status: 500,
                    body: JSON.stringify({ 
                        answer: 'Error de configuración del servicio. Variables de entorno faltantes: ' + missingVars.join(', '),
                        sources: []
                    }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }
            
            context.log('🔧 Config cargada desde variables de entorno');

            // 1. Generar embedding para la consulta del usuario
            context.log('🔍 Generando embedding para la consulta...');
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
                    context.log('✅ Embedding generado exitosamente');

                    // 2. Búsqueda vectorial en Azure AI Search
                    context.log('🔍 Realizando búsqueda vectorial...');
                    const searchUrl = `${searchEndpoint}/indexes/${searchIndex}/docs/search?api-version=2024-07-01`;
                    
                    const searchResponse = await fetch(searchUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'api-key': searchKey
                        },
                        body: JSON.stringify({
                            vectorQueries: [
                                {
                                    vector: queryEmbedding,
                                    k: 5,
                                    fields: "content_vector",
                                    kind: "vector"
                                }
                            ],
                            select: "content,source,chunk_id",
                            top: 5
                        })
                    });

                    if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        searchResults = searchData.value || [];
                        sources = searchResults.map((result, index) => ({
                            id: index + 1,
                            title: result.source || 'Documento',
                            chunk: result.chunk_id || 'Fragmento'
                        }));
                        context.log(`✅ Búsqueda completada, ${searchResults.length} resultados encontrados`);
                    } else {
                        const errorText = await searchResponse.text();
                        context.log('⚠️ Error en búsqueda vectorial:', searchResponse.status, errorText);
                    }
                } else {
                    const errorText = await embeddingResponse.text();
                    context.log('⚠️ Error generando embedding:', embeddingResponse.status, errorText);
                }
            } catch (searchError) {
                context.log('⚠️ Error en búsqueda, continuando sin contexto específico:', searchError);
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
                const context_info = searchResults.map((result) => result.content).join('\n\n');
                systemContent += `\n\n📚 INFORMACIÓN DISPONIBLE SOBRE JOHN:\n${context_info}\n\nUsa ÚNICAMENTE esta información para responder. Si la pregunta es sobre John pero no puedes responderla con esta información, di que no tienes esa información específica EN EL MISMO IDIOMA de la pregunta.`;
                context.log('📝 Contexto agregado al prompt');
            } else {
                systemContent += '\n\n⚠️ No se encontró información específica para esta consulta. Para preguntas generales simples, responde brevemente y redirige hacia John EN EL MISMO IDIOMA. Para preguntas específicas sobre John, di que no tienes esa información EN EL MISMO IDIOMA.';
            }

            // 4. Llamada a Azure OpenAI para generar respuesta
            context.log('🤖 Generando respuesta con Azure OpenAI...');
            const chatUrl = `${azureEndpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
            
            const chatResponse = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: systemContent
                        },
                        {
                            role: "user", 
                            content: message
                        }
                    ],
                    max_tokens: 800,
                    temperature: 0.7
                })
            });

            if (!chatResponse.ok) {
                const errorText = await chatResponse.text();
                context.log('❌ Error en Azure OpenAI:', chatResponse.status, errorText);
                throw new Error(`Azure OpenAI API error: ${chatResponse.status}`);
            }

            const chatData = await chatResponse.json();
            const answer = chatData.choices[0].message.content;

            context.log('✅ Respuesta generada exitosamente');
            context.log('📊 Stats:', { 
                searchResults: searchResults.length, 
                sources: sources.length,
                answerLength: answer.length 
            });

            return {
                status: 200,
                body: JSON.stringify({ 
                    answer: answer,
                    sources: sources
                }),
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };

        } catch (error) {
            context.log('❌ Error general en la API:', error);
            context.log('❌ Error stack:', error.stack);
            context.log('❌ Error message:', error.message);
            
            return {
                status: 500,
                body: JSON.stringify({ 
                    answer: 'Lo siento, hubo un error procesando tu solicitud. Error: ' + error.message,
                    sources: []
                }),
                headers: { 'Content-Type': 'application/json' }
            };
        }
    }
});
