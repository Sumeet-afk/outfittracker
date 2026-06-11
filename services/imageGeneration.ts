/**
 * AI Image Generation Service
 *
 * Uses Hugging Face Inference API (Stable Diffusion 3.5 Large).
 * Requires EXPO_PUBLIC_HUGGINGFACE_TOKEN in .env.local.
 */

export async function generateClothingImage(description: string): Promise<string> {
  const hfToken = process.env.EXPO_PUBLIC_HUGGINGFACE_TOKEN;
  
  if (!hfToken) {
    throw new Error('Hugging Face Token is missing. Please add EXPO_PUBLIC_HUGGINGFACE_TOKEN to .env.local and restart the server.');
  }

  // Enhance the prompt for better isolation and lighting
  const prompt = `A highly detailed photo of a single ${description}, clothing item, isolated on a solid bright white background, studio lighting, front view, flat lay, high resolution`;
  
  const url = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    console.error('Image generation failed:', error);
    throw new Error(`AI Error: ${error.message}`);
  }
}
