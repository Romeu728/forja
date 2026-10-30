import http.client
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"
MAX_THEME_LENGTH = 60
MAX_SEARCH_RESULTS = 6
SEARCH_URL = "https://html.duckduckgo.com/html/"


class SearchResultParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.results = []
        self._current = None
        self._capture = None
        self._buffer = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "a" and "result__a" in classes:
            if self._current:
                self.results.append(self._current)
            self._current = {"url": self._result_url(attrs.get("href", "")), "title": ""}
            self._capture = "title"
            self._buffer = []
        elif self._current and "result__snippet" in classes:
            self._capture = "snippet"
            self._buffer = []

    def handle_data(self, data):
        if self._capture:
            self._buffer.append(data)

    def handle_endtag(self, tag):
        if self._capture and tag in ("a", "div", "td"):
            text = re.sub(r"\s+", " ", " ".join(self._buffer)).strip()
            if self._capture == "title" and self._current:
                self._current["title"] = text
            elif self._capture == "snippet" and self._current:
                self._current["snippet"] = text
            self._capture = None
            self._buffer = []

    @staticmethod
    def _result_url(href):
        if href.startswith("//"):
            href = "https:" + href
        parsed = urllib.parse.urlparse(href)
        if parsed.hostname == "duckduckgo.com" or (
            parsed.hostname and parsed.hostname.endswith(".duckduckgo.com")
        ):
            target = urllib.parse.parse_qs(parsed.query).get("uddg", [""])[0]
            return target if target.startswith(("https://", "http://")) else ""
        return href if parsed.scheme in ("https", "http") else ""

    def close(self):
        super().close()
        if self._current:
            self.results.append(self._current)
            self._current = None


def validate_theme(value, field_name):
    value = value.strip() if isinstance(value, str) else ""
    if not value:
        raise ValueError(f"Preencha o campo {field_name}.")
    if len(value) > MAX_THEME_LENGTH:
        raise ValueError(f"Use no máximo {MAX_THEME_LENGTH} caracteres em cada tema.")
    if any(ord(char) < 32 for char in value):
        raise ValueError("Os temas não podem conter caracteres de controle.")
    return value


def search_public_web(theme_a, theme_b):
    query = f"{theme_a} {theme_b} game mechanics ideas"
    url = SEARCH_URL + "?" + urllib.parse.urlencode({"q": query})
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Forja/1.0 (local creative research tool)"},
    )
    with urllib.request.urlopen(request, timeout=12) as response:
        if response.status != 200:
            raise RuntimeError(f"A busca retornou HTTP {response.status}.")
        document = response.read(1_500_000).decode("utf-8", errors="replace")

    parser = SearchResultParser()
    parser.feed(document)
    results = []
    seen = set()
    for item in parser.results:
        link = item.get("url", "")
        title = item.get("title", "")
        snippet = item.get("snippet", "")
        if link and title and link not in seen:
            results.append({"title": title, "url": link, "snippet": snippet})
            seen.add(link)
        if len(results) >= MAX_SEARCH_RESULTS:
            break
    return results


def local_concept(theme_a, theme_b):
    return {
        "title": f"Entre {theme_a} e {theme_b}",
        "premise": (
            f"Em um arquipélago que muda de forma a cada amanhecer, "
            f"uma exploradora combina a curiosidade de {theme_a} com a inventividade de {theme_b} "
            "para reativar faróis adormecidos."
        ),
        "loop": "Explore uma ilha procedural, recolha madeira e minério, e construa um farol antes que a névoa avance.",
        "twist": "Cada estrutura altera o terreno ao redor e revela novas rotas, mas os recursos de cada ilha são limitados.",
    }


def ai_completion_url(base_url):
    parsed = urllib.parse.urlparse(base_url)
    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("AI_BASE_URL precisa ser uma URL HTTP(S) válida, sem credenciais.")
    base = base_url.rstrip("/")
    if base.endswith("/chat/completions"):
        return base
    return base + ("/chat/completions" if base.endswith("/v1") else "/v1/chat/completions")


def generate_concept(theme_a, theme_b):
    api_key = os.environ.get("AI_API_KEY", "").strip()
    base_url = os.environ.get("AI_BASE_URL", "").strip()
    model = os.environ.get("AI_MODEL", "").strip()
    if not (api_key and base_url and model):
        configured = any((api_key, base_url, model))
        notice = (
            "A configuração de IA está incompleta; foi usado o conceito local."
            if configured else None
        )
        return local_concept(theme_a, theme_b), notice

    payload = {
        "model": model,
        "temperature": 0.8,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Crie um conceito de jogo original em português a partir de temas amplos. "
                    "Não reproduza personagens, nomes próprios, histórias, textos, marcas, "
                    "visuais ou conteúdo reconhecível de obras existentes. Responda somente JSON "
                    'com chaves title, premise, loop e twist, cada valor como texto.'
                ),
            },
            {"role": "user", "content": f"Temas: {theme_a} + {theme_b}"},
        ],
    }
    try:
        request = urllib.request.Request(
            ai_completion_url(base_url),
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": "Bearer " + api_key,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            response_data = json.loads(response.read(100_000).decode("utf-8"))
        content = response_data["choices"][0]["message"]["content"]
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        concept = json.loads(match.group(0) if match else content)
        required = ("title", "premise", "loop", "twist")
        if any(not isinstance(concept.get(key), str) or not concept[key].strip() for key in required):
            raise ValueError("A resposta da IA não contém todos os campos do conceito.")
        return {key: concept[key].strip()[:600] for key in required}, None
    except (
        urllib.error.URLError,
        http.client.HTTPException,
        TimeoutError,
        KeyError,
        IndexError,
        TypeError,
        json.JSONDecodeError,
        ValueError,
    ):
        return local_concept(theme_a, theme_b), "A IA configurada não respondeu corretamente; foi usado o conceito local."


class ForjaHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/idea":
            self.handle_idea(urllib.parse.parse_qs(parsed.query))
            return
        if parsed.path == "/":
            self.serve_file("index.html")
            return
        if parsed.path in ("/app.js", "/game.js", "/styles.css"):
            self.serve_file(parsed.path.lstrip("/"))
            return
        self.send_error(404, "Não encontrado")

    def handle_idea(self, query):
        try:
            theme_a = validate_theme(query.get("a", [""])[0], "primeiro tema")
            theme_b = validate_theme(query.get("b", [""])[0], "segundo tema")
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        try:
            sources = search_public_web(theme_a, theme_b)
        except (urllib.error.URLError, http.client.HTTPException, TimeoutError, OSError, RuntimeError) as error:
            self.send_json(502, {"error": f"Não foi possível pesquisar a web agora: {error}"})
            return
        concept, ai_notice = generate_concept(theme_a, theme_b)
        self.send_json(200, {
            "themes": [theme_a, theme_b],
            "sources": sources,
            "concept": concept,
            "ai_notice": ai_notice,
        })

    def serve_file(self, name):
        path = (WEB_ROOT / name).resolve()
        if path.parent != WEB_ROOT.resolve() or not path.is_file():
            self.send_error(404, "Arquivo não encontrado")
            return
        content_type = "text/html; charset=utf-8" if path.suffix == ".html" else (
            "text/css; charset=utf-8" if path.suffix == ".css" else "text/javascript; charset=utf-8"
        )
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string, *args):
        print(f"{self.address_string()} - {format_string % args}")


if __name__ == "__main__":
    host = os.environ.get("FORJA_HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", os.environ.get("FORJA_PORT", "8000")))
    server = ThreadingHTTPServer((host, port), ForjaHandler)
    print(f"Forja disponível em http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
