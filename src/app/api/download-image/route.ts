import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const filename = searchParams.get('filename') || 'download';

    if (!url) {
      return new Response('Missing url parameter', { status: 400 });
    }

    // Basic validation to avoid SSRF vectors
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response('Invalid url parameter', { status: 400 });
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return new Response('Unsupported URL protocol', { status: 400 });
    }

    const upstream = await fetch(parsed.toString(), {
      // do not cache user downloads
      cache: 'no-store',
      // avoid Next.js fetch caching
      next: { revalidate: 0 },
    });

    if (!upstream.ok) {
      return new Response(`Upstream fetch failed: ${upstream.statusText}`, {
        status: 502,
      });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        // Force browser to download with provided filename
        'Content-Disposition': `attachment; filename="${filename}"`,
        // Prevent caching of downloaded assets
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (e: any) {
    return new Response(`Download error: ${e?.message || 'unknown error'}`, { status: 500 });
  }
}

