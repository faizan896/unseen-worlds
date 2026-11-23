"""WSGI entry point for the public lab API on Vercel."""
import json
from urllib.parse import parse_qs

from server import serve


def app(environ, start_response):
    if environ["REQUEST_METHOD"] != "GET":
        start_response("405 Method Not Allowed", [("Allow", "GET")])
        return [b""]

    query = parse_qs(environ.get("QUERY_STRING", ""))
    try:
        endpoint = query.pop("endpoint")[0]
        result = serve("/api/" + endpoint, query)
        body = json.dumps(result, allow_nan=False).encode()
        status = "200 OK"
    except (ValueError, IndexError, KeyError, TypeError, OverflowError):
        body = b'{"error":"Invalid lab request"}'
        status = "400 Bad Request"
    start_response(status, [
        ("Content-Type", "application/json"),
        ("Cache-Control", "no-store"),
        ("Content-Length", str(len(body))),
    ])
    return [body]
