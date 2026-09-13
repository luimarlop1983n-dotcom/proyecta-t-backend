
from .base import RawOpportunity

DATASET_URL="https://dadesobertes.gva.es/dataset/eco-gvo-subv-2026"

def dataset_descriptor():
    return RawOpportunity(
        external_key="gva:grants-awarded:2026",
        title="Ayudas y subvenciones concedidas por la Generalitat Valenciana 2026",
        org="Generalitat Valenciana",type="Histórico",location="Comunitat Valenciana",
        deadline="",amount="Datos de concesiones",
        summary="Dataset oficial de ayudas y subvenciones ya concedidas. Se usa como inteligencia histórica, no como convocatoria abierta.",
        source=DATASET_URL,verified=True,tags="gva subvenciones concedidas histórico",
        source_name="GVA Dades Obertes",source_kind="historical"
    )
