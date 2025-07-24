import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { importSessions, users } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { ClineImportAnalytics } from '@/lib/analytics/cline-import-analytics';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and check if they're admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const isAdmin = adminEmails.includes(user.email) || user.tier === 'enterprise';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') ? new Date(searchParams.get('start')!) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : new Date();

    // Fetch import sessions for Cline
    const sessions = await db.query.importSessions.findMany({
      where: and(
        eq(importSessions.platform, 'cline'),
        gte(importSessions.startedAt, startDate),
        lte(importSessions.startedAt, endDate)
      ),
      orderBy: desc(importSessions.startedAt),
      limit: 100,
    });

    // Calculate metrics
    const totalImports = sessions.length;
    const completedImports = sessions.filter(s => s.status === 'completed');
    const totalPrompts = completedImports.reduce((sum, s) => sum + (s.processedPrompts || 0), 0);
    const averageSuccessRate = totalImports > 0 
      ? (completedImports.length / totalImports) * 100 
      : 0;

    // Calculate average processing time (mock for now)
    const averageProcessingTime = 15000; // 15 seconds average

    // Get error distribution (mock data for now)
    const topErrors = [
      { error: 'Invalid Format', count: 12 },
      { error: 'Large File', count: 8 },
      { error: 'Network Error', count: 5 },
      { error: 'Parse Error', count: 3 },
    ];

    // Get recent sessions
    const recentSessions = sessions.slice(0, 10).map(session => ({
      sessionId: session.id,
      userId: session.userId,
      timestamp: session.startedAt,
      success: session.status === 'completed',
      promptsImported: session.processedPrompts || 0,
    }));

    // Return aggregated metrics
    return NextResponse.json({
      totalImports,
      totalPrompts,
      averageSuccessRate,
      averageProcessingTime,
      topErrors,
      recentSessions,
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}