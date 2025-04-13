import { NextRequest, NextResponse } from 'next/server';
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

    await dbConnect();

    const result = await Session.findOneAndUpdate(
      { userId, sessionId },
      { status: 'closed', lastActive: new Date() },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { message: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Session closed' }, { status: 200 });

  } catch (error) {
    console.error('[STOP_SESSION_ERROR]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
