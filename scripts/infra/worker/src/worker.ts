/**
 * R2 downloads Worker for Microsoft Store package hosting.
 * GET/HEAD: public stream of versioned setup.exe
 * PUT/DELETE/multipart: require X-Custom-Auth-Key === AUTH_KEY_SECRET
 * Large uploads use multipart actions (not single PUT).
 */

type MultipartCompleteBody = {
  parts: R2UploadedPart[];
};

const SETUP_KEY = /^\d+\.\d+\.\d+\/[\w.-]+-setup\.exe$/;

function hasValidHeader(request: Request, env: Env): boolean {
  const secret = env.AUTH_KEY_SECRET;
  if (!secret) {
    return false;
  }
  return request.headers.get("X-Custom-Auth-Key") === secret;
}

function parseObjectKey(url: URL): string {
  return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
}

function authorizeRequest(
  request: Request,
  env: Env,
  key: string,
  action: string | null,
): boolean {
  const isWrite =
    request.method === "PUT" ||
    request.method === "DELETE" ||
    (request.method === "POST" && Boolean(action));

  switch (request.method) {
    case "GET":
    case "HEAD":
      return SETUP_KEY.test(key);
    case "PUT":
    case "DELETE":
    case "POST":
      return isWrite ? hasValidHeader(request, env) : false;
    default:
      return false;
  }
}

async function handleFetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const key = parseObjectKey(url);
  const action = url.searchParams.get("action");

  if (!key) {
    return new Response("Missing object key", { status: 400 });
  }

  if (!authorizeRequest(request, env, key, action)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (request.method === "POST" && action === "mpu-create") {
    const multipart = await env.DOWNLOADS.createMultipartUpload(key, {
      httpMetadata: {
        contentType: "application/octet-stream",
      },
    });
    return Response.json({
      key: multipart.key,
      uploadId: multipart.uploadId,
    });
  }

  if (request.method === "PUT" && action === "mpu-uploadpart") {
    const uploadId = url.searchParams.get("uploadId");
    const partNumber = Number(url.searchParams.get("partNumber"));
    if (!uploadId || !partNumber) {
      return new Response("Missing uploadId or partNumber", { status: 400 });
    }
    if (!request.body) {
      return new Response("Missing body", { status: 400 });
    }
    const multipart = env.DOWNLOADS.resumeMultipartUpload(key, uploadId);
    const part = await multipart.uploadPart(partNumber, request.body);
    return Response.json(part);
  }

  if (request.method === "POST" && action === "mpu-complete") {
    const uploadId = url.searchParams.get("uploadId");
    if (!uploadId) {
      return new Response("Missing uploadId", { status: 400 });
    }
    const body = (await request.json()) as MultipartCompleteBody;
    const multipart = env.DOWNLOADS.resumeMultipartUpload(key, uploadId);
    const object = await multipart.complete(body.parts);
    return Response.json({
      key: object.key,
      size: object.size,
      etag: object.httpEtag,
    });
  }

  switch (request.method) {
    case "PUT": {
      await env.DOWNLOADS.put(key, request.body, {
        httpMetadata: {
          contentType:
            request.headers.get("content-type") || "application/octet-stream",
        },
      });
      return new Response(`Put ${key} successfully!`);
    }

    case "GET":
    case "HEAD": {
      if (request.method === "GET" && url.searchParams.get("meta") === "1") {
        const head = await env.DOWNLOADS.head(key);
        if (head === null) {
          return new Response("Object Not Found", { status: 404 });
        }
        return Response.json({
          key: head.key,
          size: head.size,
          etag: head.httpEtag,
          uploaded: head.uploaded
            ? new Date(head.uploaded).toISOString()
            : null,
        });
      }

      if (request.method === "HEAD") {
        const head = await env.DOWNLOADS.head(key);
        if (head === null) {
          return new Response("Object Not Found", { status: 404 });
        }
        const headers = new Headers();
        head.writeHttpMetadata(headers);
        headers.set("etag", head.httpEtag);
        headers.set("Content-Type", "application/octet-stream");
        headers.set(
          "Content-Disposition",
          `attachment; filename="${key.split("/").pop()}"`,
        );
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("Content-Length", String(head.size));
        return new Response(null, { status: 200, headers });
      }

      const object = await env.DOWNLOADS.get(key, {
        range: request.headers,
        onlyIf: request.headers,
      });

      if (object === null) {
        return new Response("Object Not Found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Content-Type", "application/octet-stream");
      headers.set(
        "Content-Disposition",
        `attachment; filename="${key.split("/").pop()}"`,
      );
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      if (typeof object.size === "number") {
        headers.set("Content-Length", String(object.size));
      }

      return new Response("body" in object ? object.body : undefined, {
        status: "body" in object ? 200 : 412,
        headers,
      });
    }

    case "DELETE": {
      await env.DOWNLOADS.delete(key);
      return new Response("Deleted!");
    }

    default:
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD, PUT, DELETE, POST" },
      });
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleFetch(request, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new Response(`Worker error: ${message}`, { status: 500 });
    }
  },
};

export default worker;
