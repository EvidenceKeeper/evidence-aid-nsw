// Fallback helpers for assistant-chat function
// This provides backward compatibility while adding robust fallback

export async function tryOpenAIWithFallback(requestBody: any, apiKey: string): Promise<any> {
  const models = [
    { name: "gpt-5-mini-2025-08-07", useMaxCompletionTokens: true, supportsTemp: false },
    { name: "gpt-4.1-mini-2025-04-14", useMaxCompletionTokens: true, supportsTemp: false },
    { name: "gpt-4o-mini", useMaxCompletionTokens: false, supportsTemp: true },
    { name: "gpt-4o", useMaxCompletionTokens: false, supportsTemp: true }
  ];

  for (const model of models) {
    try {
      const modelRequestBody = {
        ...requestBody,
        model: model.name
      };

      // Fix parameter naming based on model
      if (model.useMaxCompletionTokens) {
        if (modelRequestBody.max_tokens) {
          modelRequestBody.max_completion_tokens = modelRequestBody.max_tokens;
          delete modelRequestBody.max_tokens;
        }
        // Remove temperature for newer models
        delete modelRequestBody.temperature;
      } else {
        if (modelRequestBody.max_completion_tokens) {
          modelRequestBody.max_tokens = modelRequestBody.max_completion_tokens;
          delete modelRequestBody.max_completion_tokens;
        }
        // Add temperature for legacy models
        if (model.supportsTemp) {
          modelRequestBody.temperature = 0.7;
        }
      }

      console.log(`🤖 Trying ${model.name}...`);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(modelRequestBody),
      });

      if (response.ok) {
        console.log(`✅ Success with ${model.name}`);
        return response;
      }

      const errorText = await response.text();
      console.log(`⚠️ ${model.name} failed: ${response.status} - ${errorText}`);

      // Don't retry on auth errors
      if (response.status === 401) {
        throw new Error("Authentication failed");
      }

    } catch (error) {
      console.log(`❌ ${model.name} error:`, error);
      continue;
    }
  }

  return null;
}

export async function tryEmbeddingWithFallback(text: string, apiKey: string): Promise<number[] | null> {
  const models = ["text-embedding-3-large", "text-embedding-3-small"];

  for (const model of models) {
    try {
      console.log(`🔍 Trying embedding with ${model}...`);

      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          input: text,
          dimensions: 1536,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Embedding success with ${model}`);
        return data.data[0].embedding;
      }

      const errorText = await response.text();
      console.log(`⚠️ ${model} embedding failed: ${response.status} - ${errorText}`);

    } catch (error) {
      console.log(`❌ ${model} embedding error:`, error);
      continue;
    }
  }

  return null;
}