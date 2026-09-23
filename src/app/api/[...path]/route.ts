import { NextResponse } from 'next/server';
import {
  action,
  confirmSession,
  createSession,
  DemoError,
  getSession,
  reset,
  resolveCode,
  snapshot,
} from '@/lib/store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handler(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const route = path.join('/');
    let result: unknown;
    if (request.method === 'GET' && route === 'demo/state') result = snapshot();
    else if (request.method === 'GET' && path.length === 3 && route.startsWith('pairing/sessions/'))
      result = getSession(path[2]);
    else if (request.method === 'POST') {
      if (route === 'demo/reset') {
        reset();
        result = { ok: true };
      } else if (route === 'pairing/sessions') result = createSession();
      else if (route === 'pairing/resolve') result = resolveCode((await request.json()).shortCode);
      else if (path.length === 4 && path[0] === 'pairing' && path[1] === 'sessions')
        result =
          path[3] === 'confirm'
            ? confirmSession(path[2], await request.json())
            : action(path[2], path[3]);
      else throw new DemoError('Not found', 404);
    } else throw new DemoError('Not found', 404);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof SyntaxError
            ? 'Invalid JSON request.'
            : e instanceof Error
              ? e.message
              : 'Unexpected error',
      },
      { status: e instanceof DemoError ? e.code : e instanceof SyntaxError ? 400 : 500 },
    );
  }
}
export { handler as GET, handler as POST };
