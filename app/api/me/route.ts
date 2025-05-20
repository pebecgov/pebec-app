import { useAuth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = useAuth()

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  return NextResponse.json({ userId }, { status: 200 })
}
