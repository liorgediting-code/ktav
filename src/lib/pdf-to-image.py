#!/usr/bin/env python3
"""
PDF → JPEG converter for ktav
Usage: python3 pdf-to-image.py <input.pdf> <output.jpg> [zoom=1.5]
Saves as JPEG (much smaller than PNG) at moderate resolution.
"""
import sys
import fitz  # PyMuPDF

def pdf_to_image(pdf_path: str, output_path: str, zoom: float = 1.5):
    doc = fitz.open(pdf_path)
    page = doc[0]
    mat = fitz.Matrix(zoom, zoom)
    # white background (no alpha)
    pix = page.get_pixmap(matrix=mat, alpha=False, colorspace=fitz.csRGB)

    # Save as JPEG at quality 85 — much smaller than PNG
    pix.save(output_path, jpg_quality=85)
    print(f"OK:{pix.width}x{pix.height}")
    doc.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: pdf-to-image.py <input.pdf> <output.jpg> [zoom]")
        sys.exit(1)
    zoom = float(sys.argv[3]) if len(sys.argv) > 3 else 1.5
    pdf_to_image(sys.argv[1], sys.argv[2], zoom)
