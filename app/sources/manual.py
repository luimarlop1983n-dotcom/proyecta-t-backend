
from .base import RawOpportunity

def verified_seed():
    return [
      RawOpportunity(
        external_key="cultura:dramaturgias-2026",
        title="Programa de Desarrollo de Dramaturgias Actuales 2026",
        org="Ministerio de Cultura",type="Convocatoria",location="España",
        deadline="2026-09-24",amount="Consultar bases",
        summary="Programa para desarrollar lenguajes escénicos innovadores vinculados al teatro y al circo.",
        source="https://www.cultura.gob.es/servicios-a-la-ciudadania/catalogo/general/32/3284599/ficha/3284599-2026.html",
        verified=True,tags="teatro circo dramaturgia artes escénicas creación",
        max_age=35,eligibility_notes=["Edad máxima: 35 años"],
        source_name="Ministerio de Cultura",source_kind="opportunity"
      ),
      RawOpportunity(
        external_key="cultura:patrimonio-audiovisual-2026",
        title="Premio Nacional del Patrimonio Cinematográfico y Audiovisual 2026",
        org="Ministerio de Cultura",type="Premio",location="España",
        deadline="2026-09-18",amount="Consultar convocatoria",
        summary="Convocatoria estatal vinculada al patrimonio cinematográfico y audiovisual.",
        source="https://www.cultura.gob.es/servicios-a-la-ciudadania/catalogo/convocatorias-abiertas.html",
        verified=True,tags="cine audiovisual patrimonio cultura",
        source_name="Ministerio de Cultura",source_kind="opportunity"
      )
    ]
