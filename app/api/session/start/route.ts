import { NextRequest, NextResponse } from 'next/server';
// import dbConnect from '@/lib/dbConnect';
// import Session from '@/models/Session';
import dbConnect from '@/app/lib/dbConnect';
import Session from '@/app/models/Session';

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId } = await req.json();

    if (!userId || !sessionId) {
      return NextResponse.json(
        { message: 'Missing userId or sessionId' },
        { status: 400 }
      );
    }

    //await dbConnect();

    // Optional: Check if session already exists
    const existing = await Session.findOne({ sessionId });
    if (existing) {
      return NextResponse.json(
        { message: 'Session already exists' },
        { status: 200 }
      );
    }

    
    // Create a new session
    await Session.create({
      userId,
      sessionId,
      createdAt: new Date(),
      lastActive: new Date(),
      status: 'active',
    });

    return NextResponse.json({ message: 'Session started' }, { status: 200 });

  } catch (error) {
    console.error('[SESSION_START_ERROR]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
