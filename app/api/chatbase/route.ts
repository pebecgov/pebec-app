import crypto from 'crypto';

export async function POST(req: Request) {
  const { userId } = await req.json();
  
  // Secret key from your environment or Chatbase
  const secret = process.env.CHATBASE_SECRET_KEY!; 

  // Generate the HMAC hash
  const hash = crypto.createHmac('sha256', secret).update(userId).digest('hex');

  return new Response(JSON.stringify({ hash }), { status: 200 });
}
