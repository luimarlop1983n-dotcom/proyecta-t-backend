
import hashlib, re, httpx
from bs4 import BeautifulSoup
from datetime import datetime
from .base import RawOpportunity

INDEX_URL="https://www.cultura.gob.es/servicios-a-la-ciudadania/catalogo/convocatorias-abiertas.html"

def fetch_index():
    r=httpx.get(INDEX_URL,timeout=20,headers={"User-Agent":"PROYECTAPlus/0.4"})
    r.raise_for_status()
    text=BeautifulSoup(r.text,"html.parser").get_text("\n",strip=True)
    pattern=re.compile(r"(?P<title>[^\n]{6,500})\nPlazo de presentación de solicitudes:ABIERTA.*?hasta el\s+(?P<date>\d{2}/\d{2}/\d{4})",re.I|re.S)
    out=[]
    for m in pattern.finditer(text):
        title=" ".join(m.group("title").split())
        try: deadline=datetime.strptime(m.group("date"),"%d/%m/%Y").date().isoformat()
        except: continue
        out.append(RawOpportunity(
            external_key="cultura:index:"+hashlib.sha1((title+deadline).encode()).hexdigest(),
            title=title,org="Ministerio de Cultura",type="Convocatoria",location="España",
            deadline=deadline,amount="Consultar bases",
            summary="Detectada en la página oficial de convocatorias abiertas del Ministerio de Cultura.",
            source=INDEX_URL,verified=False,tags="cultura convocatoria",
            source_name="Ministerio de Cultura",source_kind="opportunity"
        ))
    return out
