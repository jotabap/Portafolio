const { app } = require('@azure/functions');

app.http('chat-debug', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('🔍 Chat DEBUG endpoint called');
        
        if (request.method === 'GET') {
            return { 
                status: 200,
                body: JSON.stringify({ message: 'Chat DEBUG API is running' }),
                headers: { 'Content-Type': 'application/json' }
            };
        }

        try {
            const body = await request.text();
            context.log('📥 Request body received:', body);
            
            const parsed = JSON.parse(body);
            const message = parsed.message;
            
            // Solo verificar variables de entorno
            const envVars = {
                AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT ? 'SET' : 'MISSING',
                AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY ? 'SET' : 'MISSING',
                AZURE_OPENAI_DEPLOYMENT_CHAT: process.env.AZURE_OPENAI_DEPLOYMENT_CHAT ? 'SET' : 'MISSING',
                AZURE_OPENAI_DEPLOYMENT_EMBED: process.env.AZURE_OPENAI_DEPLOYMENT_EMBED ? 'SET' : 'MISSING',
                AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION ? 'SET' : 'MISSING',
                AZURE_SEARCH_ENDPOINT: process.env.AZURE_SEARCH_ENDPOINT ? 'SET' : 'MISSING',
                AZURE_SEARCH_KEY: process.env.AZURE_SEARCH_KEY ? 'SET' : 'MISSING',
                AZURE_SEARCH_INDEX: process.env.AZURE_SEARCH_INDEX ? 'SET' : 'MISSING'
            };
            
            context.log('🔧 Environment variables status:', envVars);
            
            return {
                status: 200,
                body: JSON.stringify({ 
                    answer: `Debug: Received message "${message}". Environment variables: ${JSON.stringify(envVars, null, 2)}`,
                    sources: [],
                    debug: envVars
                }),
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };

        } catch (error) {
            context.log('❌ Debug error:', error);
            return {
                status: 500,
                body: JSON.stringify({ 
                    answer: 'Debug error: ' + error.message,
                    sources: [],
                    error: error.stack
                }),
                headers: { 'Content-Type': 'application/json' }
            };
        }
    }
});