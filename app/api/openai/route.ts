import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';  // Correct import for OpenAI

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure your API key is in the environment variables
});

export async function POST(request: Request) {
  try {
    const { message } = await request.json(); // Get the message from the request body

    // Request OpenAI to generate a response
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use the model you need
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for the PEBEC E-Portal website. Answer questions related to PEBEC only.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    // Send the OpenAI response back
    return NextResponse.json({ message: response.choices[0].message.content });
  } catch (error) {
    console.error('Error in OpenAI API:', error);
    return NextResponse.json({ error: 'Failed to get response from OpenAI API' }, { status: 500 });
  }
}
