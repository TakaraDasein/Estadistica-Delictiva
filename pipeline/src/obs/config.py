"""Rutas, esquema canónico y catálogos controlados (fuente única de verdad)."""

from __future__ import annotations

from pathlib import Path

# ── Rutas ────────────────────────────────────────────────────────────────
PROJECT = Path(__file__).resolve().parents[3]  # observatorio/
DATA = PROJECT / "data"
RAW = DATA / "raw"
RAW_DELITOS = RAW / "delitos"
RAW_OPERATIVOS = RAW / "operativos"
BRONZE = DATA / "bronze"
SILVER = DATA / "silver"
GOLD = DATA / "gold"
REPORTS = DATA / "reports"
REFS = PROJECT / "pipeline" / "refs"
WEB_DATA = PROJECT / "web" / "src" / "data"
WEB_PUBLIC_DATA = PROJECT / "web" / "public" / "data"

ANIO_MIN, ANIO_MAX = 2010, 2024

# ── Alias de encabezados → columna canónica ─────────────────────────────
# Las claves están normalizadas con utils.norm_col (MAYÚSCULAS, sin tildes,
# sin '*', separadores → '_').
COL_ALIAS: dict[str, str] = {
    "DEPARTAMENTO": "departamento",
    "DEPTO_HECHO": "departamento",
    "MUNICIPIO": "municipio",
    "MUNICIPIO_HECHO": "municipio",
    "MUNICIPO": "municipio",
    "MUNICICPIO": "municipio",
    "CODIGO_DANE": "codigo_dane",
    "FECHA": "fecha",
    "FECHA_HECHO": "fecha",
    "FECHA_DE_HECHO": "fecha",
    "ARMAS_MEDIOS": "arma_medio",
    "ARMAS_MEDIO": "arma_medio",
    "ARMA_MEDIO": "arma_medio",
    "ARMA_MEDIOS": "arma_medio",
    "ARMA_EMPLEADA": "arma_medio",
    "GENERO": "genero",
    "AGRUPA_EDAD_PERSONA": "grupo_edad",
    "AGRUPA_EDAD": "grupo_edad",
    "GRUPO_ETARIO": "grupo_edad",
    "DELITO": "subtipo",
    "DELITOS": "subtipo",
    "DELITO_CAPTURA": "subtipo",
    "DESCRIPCION_CONDUCTA": "subtipo",
    "DESCRIPCION_CONDUCTA_CAPTURA": "subtipo",
    "CLASE_BIEN": "clase_bien",
    "CLASE_DE_BIEN": "clase_bien",
    "CANTIDAD": "cantidad",
    "PERIODO": None,  # metadato redundante
    "FUENTE": None,
}

CANON_COLS = [
    "dominio", "categoria", "categoria_slug", "fecha", "departamento", "municipio",
    "codigo_dane", "arma_medio", "genero", "grupo_edad", "subtipo", "clase_bien",
    "cantidad", "archivo", "hoja",
]

# ── Delitos: carpeta → (slug, nombre, familia) ──────────────────────────
# La familia agrupa delitos para la lectura narrativa del dashboard.
DELITOS: dict[str, tuple[str, str, str]] = {
    "1. Abigeato": ("abigeato", "Abigeato", "Patrimonio rural"),
    "2. Amenazas": ("amenazas", "Amenazas", "Libertad y seguridad"),
    "3. Delitos Sexuales": ("delitos-sexuales", "Delitos sexuales", "Vida e integridad"),
    "4. Extorsión": ("extorsion", "Extorsión", "Libertad y seguridad"),
    "6. Homicidios": ("homicidios", "Homicidios", "Vida e integridad"),
    "7. Homicidios En Accidente De Transito": ("homicidios-transito", "Homicidios en accidente de tránsito", "Seguridad vial"),
    "8. Hurto a Cabezas De Ganado": ("hurto-ganado", "Hurto a cabezas de ganado", "Patrimonio rural"),
    "9. Hurto a Comercio": ("hurto-comercio", "Hurto a comercio", "Patrimonio urbano"),
    "10. Hurto a Entidades Financieras": ("hurto-financieras", "Hurto a entidades financieras", "Patrimonio urbano"),
    "11. Hurto a Motocicletas": ("hurto-motos", "Hurto a motocicletas", "Patrimonio urbano"),
    "12. Hurto a Personas": ("hurto-personas", "Hurto a personas", "Patrimonio urbano"),
    "13. Hurto a Residencias": ("hurto-residencias", "Hurto a residencias", "Patrimonio urbano"),
    "14. Hurto De Automotores": ("hurto-automotores", "Hurto de automotores", "Patrimonio urbano"),
    "15. Lesiones En Accidente De Transito": ("lesiones-transito", "Lesiones en accidente de tránsito", "Seguridad vial"),
    "16. Lesiones Personales": ("lesiones-personales", "Lesiones personales", "Vida e integridad"),
    "17. Pirateria Terrestre": ("pirateria-terrestre", "Piratería terrestre", "Patrimonio urbano"),
    "18. Secuestro": ("secuestro", "Secuestro", "Libertad y seguridad"),
    "19. Terrorismo": ("terrorismo", "Terrorismo", "Libertad y seguridad"),
    "20. Violencia Intrafamiliar": ("violencia-intrafamiliar", "Violencia intrafamiliar", "Vida e integridad"),
}

# Series que la fuente renombró: "Abigeato" (2010-2022) pasa a llamarse
# "Hurto a cabezas de ganado" (2023-2024). Se unifican en una serie continua.
UNIFICAR_SERIES = {"hurto-ganado": ("abigeato", "Abigeato (hurto de ganado)")}

# Archivos mal ubicados en la fuente: nombre → carpeta correcta.
RELOCALIZAR = {
    "Lesiones_En_Accidente_De_Transito_2014_0.xlsx": "15. Lesiones En Accidente De Transito",
}

# ── Operativos: patrón en nombre de archivo → (slug, nombre, unidad) ────
OPERATIVOS: list[tuple[str, tuple[str, str, str]]] = [
    ("captura", ("capturas", "Capturas", "personas")),
    ("estupefaciente", ("droga", "Incautación de estupefacientes", "gramos")),
    ("droga", ("droga", "Incautación de estupefacientes", "gramos")),
    ("arma", ("armas", "Incautación de armas de fuego", "unidades")),
    ("automotor", ("vehiculos", "Recuperación de vehículos", "unidades")),
    ("vehiculo", ("vehiculos", "Recuperación de vehículos", "unidades")),
    ("motocicleta", ("motos", "Recuperación de motocicletas", "unidades")),
]

# ── Catálogos controlados ───────────────────────────────────────────────
NO_REPORTA = "No reporta"

GENERO = {
    "MASCULINO": "Masculino", "HOMBRE": "Masculino", "M": "Masculino",
    "FEMENINO": "Femenino", "MUJER": "Femenino", "F": "Femenino",
}

GRUPO_EDAD = {
    "ADULTOS": "Adultos", "ADULTO": "Adultos",
    "ADOLESCENTES": "Adolescentes", "ADOLESCENTE": "Adolescentes",
    "MENORES": "Menores", "MENOR": "Menores",
    "MENORES DE EDAD": "Menores",
}

# Orden importa: la primera coincidencia gana.
ARMA_GRUPOS: list[tuple[str, str]] = [
    ("SIN EMPLEO", "Sin empleo de armas"),
    ("NO REPORT", NO_REPORTA),
    ("FUEGO", "Arma de fuego"),
    ("BLANCA", "Arma blanca / cortopunzante"),
    ("CORTOPUNZ", "Arma blanca / cortopunzante"),
    ("CORTANTE", "Arma blanca / cortopunzante"),
    ("PUNZANTE", "Arma blanca / cortopunzante"),
    ("CONTUNDENT", "Contundente"),
    ("EXPLOSIV", "Explosivos"),
    ("GRANADA", "Explosivos"),
    ("MINA", "Explosivos"),
    ("ESCOPOLAMINA", "Escopolamina / químicos"),
    ("QUIMIC", "Escopolamina / químicos"),
    ("VEHICULO", "Vehículo"),
    ("MOTO", "Vehículo"),
    ("BICICLETA", "Vehículo"),
    ("LLAVE MAESTRA", "Llave maestra / ganzúa"),
    ("GANZUA", "Llave maestra / ganzúa"),
    ("PALANCA", "Llave maestra / ganzúa"),
    ("CELULAR", "Medios digitales / telefónicos"),
    ("TELEFON", "Medios digitales / telefónicos"),
    ("INTERNET", "Medios digitales / telefónicos"),
    ("RED SOCIAL", "Medios digitales / telefónicos"),
    ("REDES SOCIALES", "Medios digitales / telefónicos"),
    ("CARTA", "Medios digitales / telefónicos"),
]

# Tokens que delatan filas de pie de página / metadatos en la columna
# departamento (nunca son un departamento real).
TOKENS_METADATO = (
    "FUENTE", "REVISADO", "ELABORADO", "AUTORIZADO", "DIJIN", "SIEDCO",
    "POLICIA NACIONAL", "CIFRAS SUJETAS", "TOTAL", "TOIAL", "CONTADOR",
    "AGRUPACION", "FECHA DE CORTE", "NOTA",
)
