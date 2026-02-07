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
    const conditions: string[] = [];

    if (start) {
      conditions.push(`operation_date >= '${start}'`);
    }
    if (end) {
      conditions.push(`operation_date <= '${end}'`);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY operation_date DESC';

    const result = db.exec(query);

    // Convert sql.js result to array of objects
    const summary: Record<string, unknown>[] = [];
    if (result.length > 0) {
      const { columns, values } = result[0];
      for (const row of values) {
        const item: Record<string, unknown> = {};
        columns.forEach((col: string, i: number) => {
          item[col] = row[i];
        });
        summary.push(item);
      }
    }

    return NextResponse.json(summary);
  } catch (err) {
    console.error('Summary API error:', err);
    return NextResponse.json(
      { error: 'Query failed', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
