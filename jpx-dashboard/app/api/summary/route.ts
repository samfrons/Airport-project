import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = request.nextUrl;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    let query = 'SELECT * FROM daily_summary WHERE 1=1';
    const params: string[] = [];

    if (start) {
      query += ' AND operation_date >= ?';
      params.push(start);
    }
    if (end) {
      query += ' AND operation_date <= ?';
      params.push(end);
    }

    query += ' ORDER BY operation_date DESC';

    const stmt = db.prepare(query);
    stmt.bind(params);

    const summary: Record<string, unknown>[] = [];
    while (stmt.step()) {
      summary.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json(summary);
  } catch (err) {
    console.error('Summary API error:', err);
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
