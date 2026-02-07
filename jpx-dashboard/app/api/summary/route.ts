import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  let db;
  try {
    db = getDb();
  } catch {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
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

    const summary = db.prepare(query).all(...params);
    db.close();

    return NextResponse.json(summary);
  } catch (err) {
    db.close();
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
