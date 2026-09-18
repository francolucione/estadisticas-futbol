"""Genera el escudo y los iconos a partir de resources/gallo.jpg (el logo del canal).

    python scripts/escudo.py

El logo es un gallo marino sobre fondo blanco. El escudo es ese mismo cuadro recortado en
un disco blanco con un filo hueso, para que el gallo no se pierda sobre el carbon de la app.
"""
from pathlib import Path
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / 'resources/gallo.jpg'
MARCA = RAIZ / 'src/assets/marca'
ICONOS = RAIZ / 'src/assets/icon'
RECURSOS = RAIZ / 'resources'  # lo que lee @capacitor/assets

CARBON = (12, 15, 22)
HUESO = (242, 237, 227)


def escudo(lado: int, filo: float = 0.035, zoom: float = 1.0) -> Image.Image:
    """Disco blanco con el gallo adentro y un aro hueso. Fondo transparente."""
    grande = lado * 4  # se dibuja grande y se achica: bordes suaves sin antialias propio
    img = Image.new('RGBA', (grande, grande), (0, 0, 0, 0))
    gallo = Image.open(ORIGEN).convert('RGB')
    # El logo trae aire alrededor: un poco de zoom lo hace legible en chico.
    lado_rec = int(gallo.width / zoom)
    x0 = (gallo.width - lado_rec) // 2
    gallo = gallo.crop((x0, x0, x0 + lado_rec, x0 + lado_rec)).resize((grande, grande), Image.LANCZOS)

    mascara = Image.new('L', (grande, grande), 0)
    ImageDraw.Draw(mascara).ellipse((0, 0, grande - 1, grande - 1), fill=255)
    img.paste(gallo, (0, 0), mascara)

    aro = int(grande * filo)
    d = ImageDraw.Draw(img)
    d.ellipse((aro // 2, aro // 2, grande - 1 - aro // 2, grande - 1 - aro // 2), outline=HUESO + (255,), width=aro)
    return img.resize((lado, lado), Image.LANCZOS)


def sobre_carbon(lado: int, proporcion: float) -> Image.Image:
    """El escudo centrado sobre carbon: icono de app y splash."""
    fondo = Image.new('RGBA', (lado, lado), CARBON + (255,))
    e = escudo(int(lado * proporcion), zoom=1.12)
    fondo.alpha_composite(e, ((lado - e.width) // 2, (lado - e.height) // 2))
    return fondo


def main() -> None:
    MARCA.mkdir(parents=True, exist_ok=True)
    RECURSOS.mkdir(parents=True, exist_ok=True)

    # Cabecera y estados vacios: 2x y 3x de lo que se muestra (32-56px).
    for lado in (96, 192):
        escudo(lado, zoom=1.12).save(MARCA / f'escudo-{lado}.png', optimize=True)

    # Favicon del navegador y de la pantalla de inicio.
    escudo(64, filo=0.05, zoom=1.2).save(ICONOS / 'favicon.png', optimize=True)
    for lado in (192, 512):
        sobre_carbon(lado, 0.8).convert('RGB').save(ICONOS / f'icono-{lado}.png', optimize=True)
    sobre_carbon(180, 0.84).convert('RGB').save(ICONOS / 'apple-touch-icon.png', optimize=True)

    # Fuentes para @capacitor/assets (Android): icono 1024 y splash 2732.
    sobre_carbon(1024, 0.8).convert('RGB').save(RECURSOS / 'icon-only.png')
    fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    e = escudo(620, zoom=1.12)  # el foreground adaptativo se recorta: zona segura ~66%
    fg.alpha_composite(e, ((1024 - 620) // 2, (1024 - 620) // 2))
    fg.save(RECURSOS / 'icon-foreground.png')
    Image.new('RGB', (1024, 1024), CARBON).save(RECURSOS / 'icon-background.png')
    sobre_carbon(2732, 0.22).convert('RGB').save(RECURSOS / 'splash.png')
    sobre_carbon(2732, 0.22).convert('RGB').save(RECURSOS / 'splash-dark.png')
    print('listo')


if __name__ == '__main__':
    main()
