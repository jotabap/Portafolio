const {TextAnalyticsClient, AzureKeyCredential}=requiere("@azure/ai-text-analytics");

module.exports = async function (context, req) {
    try{
        const key=process.env.LANGUAGE_KEY;
        const endpoint=process.env.LANGUAGE_ENDPOINT;

        const client= new TextAnalyticsClient(endpoint, new AzureKeyCredential(key));

        const text=req.body?.text || "";

        if (!text) {
            context.res={status: 400, body: {error: "No text provided"}};
            return;
        }
            //Analizar sentimiento
            const sentimentResult= await client.analyzeSentiment([text]);
            const sentiment= sentimentResult[0];

            //Extraer palabras claves
            const keyPhrasesResult= await client.extractKeyPhrases([text]);
            const keyPhrases= keyPhrasesResult[0];

            //Resumen(extractive summarization)
            const poller= await client.beginExtractiveSummarization([text],"en");
            const summaryResult= await poller.pollUntilDone();
            const summaruSentences=summaryResult[0].sentences.map(s => s.text);

            context.res={
                status: 200,
                body: {
                    sentiment:sentiment.sentiment,
                    confidenceScores: sentiment.confidenceScores,
                    keyPhrases: keyPhrases,
                    summary: summarySentences
                }
            };

        }catch(error){
            context.res={
                status: 500,
                body: {error: error.message}
            };
    }
}