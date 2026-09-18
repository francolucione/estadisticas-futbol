"""Pone tildes en el texto VISIBLE de la app, sin tocar codigo ni comentarios.

    python scripts/tildes.py          # muestra lo que cambiaria
    python scripts/tildes.py --aplicar

Solo toca: nodos de texto de los templates, los atributos aria-label/title/placeholder/alt
estaticos, y los literales de string de los .ts. Las palabras ambiguas (esta/está,
donde/dónde, quien/quién) no estan en el diccionario: van a mano.
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / 'src' / 'app'

PALABRAS = {
    'mas': 'más', 'ultimos': 'últimos', 'ultimas': 'últimas', 'ultima': 'última', 'ultimo': 'último',
    'todavia': 'todavía', 'pestana': 'pestaña', 'pestanas': 'pestañas', 'participacion': 'participación',
    'tambien': 'también', 'aca': 'acá', 'numeros': 'números', 'numero': 'número', 'ningun': 'ningún',
    'quimica': 'química', 'relacion': 'relación', 'esporadicos': 'esporádicos', 'esporadico': 'esporádico',
    'categoria': 'categoría', 'categorias': 'categorías', 'dias': 'días', 'minimo': 'mínimo',
    'maximo': 'máximo', 'estadisticas': 'estadísticas', 'estadistica': 'estadística',
    'administracion': 'administración', 'correccion': 'corrección', 'unico': 'único', 'unica': 'única',
    'facil': 'fácil', 'rapido': 'rápido', 'pagina': 'página', 'habia': 'había', 'podes': 'podés',
    'tenes': 'tenés', 'atras': 'atrás', 'informacion': 'información', 'jugo': 'jugó', 'sumo': 'sumó',
    'termino': 'terminó', 'metio': 'metió', 'asistio': 'asistió', 'toca': 'tocá', 'segun': 'según',
    'promedios': 'promedios', 'aparecio': 'apareció', 'perdio': 'perdió', 'gano': 'ganó', 'empato': 'empató',
    'jugaron': 'jugaron', 'estan': 'están', 'dia': 'día', 'porcentaje': 'porcentaje', 'record': 'récord',
    'records': 'récords', 'comun': 'común', 'tecnico': 'técnico', 'fisico': 'físico', 'rival': 'rival',
    'invicto': 'invicto', 'goleo': 'goleó', 'asistencia': 'asistencia', 'companero': 'compañero',
    'companeros': 'compañeros', 'seguidas': 'seguidas', 'epoca': 'época', 'sabado': 'sábado',
    'despues': 'después', 'jugador': 'jugador', 'partido': 'partido', 'rachas': 'rachas',
    'posicion': 'posición', 'posiciones': 'posiciones', 'evolucion': 'evolución', 'exportacion': 'exportación',
    'edicion': 'edición', 'accion': 'acción', 'union': 'unión', 'fusion': 'fusión', 'rareza': 'rareza',
    'aun': 'aún', 'jamas': 'jamás', 'algun': 'algún', 'tambien': 'también', 'solo': 'solo',
    'formacion': 'formación', 'formaciones': 'formaciones', 'validacion': 'validación',
    'marco': 'marcó', 'cargo': 'cargó', 'guardo': 'guardó', 'corrigio': 'corrigió',
}
PALABRAS = {k: v for k, v in PALABRAS.items() if k != v}
PATRON = re.compile(r'\b(' + '|'.join(sorted(PALABRAS, key=len, reverse=True)) + r')\b', re.I)


# Zonas que son codigo aunque esten en medio del texto: los bloques de control de flujo
# de Angular (@if (...), @for (...; track ...)) y las interpolaciones ${...} de TS.
CODIGO = re.compile(r'@\w+\s*\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)|\$\{[^}]*\}|track\s+[^;)}]+')
FRASES = {'termino medio': 'término medio'}


def acentuar(texto: str) -> str:
    out, i = [], 0
    for m in CODIGO.finditer(texto):
        out.append(_acentuar(texto[i:m.start()]))
        out.append(m.group(0))
        i = m.end()
    out.append(_acentuar(texto[i:]))
    return ''.join(out)


def _acentuar(texto: str) -> str:
    for a, b in FRASES.items():
        texto = texto.replace(a, b)

    def cambio(m: re.Match) -> str:
        w = m.group(0)
        nueva = PALABRAS[w.lower()]
        if w.isupper() and len(w) > 1:
            return nueva.upper()
        if w[0].isupper():
            return nueva[0].upper() + nueva[1:]
        return nueva
    return PATRON.sub(cambio, texto)


def en_template(s: str) -> str:
    """Solo texto entre tags (fuera de comentarios y de {{ }}) y atributos de texto."""
    out, i = [], 0
    token = re.compile(r'<!--.*?-->|\{\{.*?\}\}|<[^>]*>', re.S)
    for m in token.finditer(s):
        out.append(acentuar(s[i:m.start()]))
        t = m.group(0)
        if t.startswith('<') and not t.startswith('<!--'):
            t = re.sub(r'(\s(?:aria-label|title|placeholder|alt)=")([^"{]*)(")',
                       lambda a: a.group(1) + acentuar(a.group(2)) + a.group(3), t)
        out.append(t)
        i = m.end()
    out.append(acentuar(s[i:]))
    return ''.join(out)


def en_ts(s: str) -> str:
    """Literales de string que parecen frases (tienen un espacio) y templates inline."""
    def lit(m: re.Match) -> str:
        q, cuerpo = m.group(1), m.group(2)
        if q == '`' and ('<' in cuerpo and '>' in cuerpo):
            return q + en_template(cuerpo) + q  # template inline de un componente
        if q == '`' and re.search(r'[.:#&][\w-]*\s*\{', cuerpo):
            return m.group(0)  # estilos inline: es CSS, no texto
        if ' ' not in cuerpo or cuerpo.startswith(('./', '../', 'http')):
            return m.group(0)
        return q + acentuar(cuerpo) + q
    # Saca comentarios del analisis pero los conserva tal cual.
    partes = re.split(r'(/\*.*?\*/|//[^\n]*)', s, flags=re.S)
    for k in range(0, len(partes), 2):
        partes[k] = re.sub(r"(['\"`])((?:\.|(?!\1).)*)\1", lit, partes[k], flags=re.S)
    return ''.join(partes)


def main() -> None:
    aplicar = '--aplicar' in sys.argv
    for f in sorted(RAIZ.rglob('*')):
        if f.suffix not in ('.html', '.ts') or f.name.endswith('.spec.ts'):
            continue
        s = f.read_text(encoding='utf-8')
        nuevo = en_template(s) if f.suffix == '.html' else en_ts(s)
        if nuevo == s:
            continue
        viejas, nuevas = s.splitlines(), nuevo.splitlines()
        for n, (a, b) in enumerate(zip(viejas, nuevas), 1):
            if a != b:
                print(f'{f.relative_to(RAIZ)}:{n}: {b.strip()[:140]}')
        if aplicar:
            f.write_text(nuevo, encoding='utf-8')


if __name__ == '__main__':
    main()
