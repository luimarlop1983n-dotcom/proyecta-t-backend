
import httpx, hashlib
from bs4 import BeautifulSoup
from datetime import date, timedelta
from .base import RawOpportunity

API_SUMARIO="https://www.boe.es/datosabiertos/api/boe/sumario/{fecha}"

def _text(el):
    return " ".join(el.get_text(" ",strip=True).split()) if el else ""

def fetch_recent(days=7):
    out=[]
    today=date.today()
    headers={"Accept":"application/xml","User-Agent":"PROYECTAPlus/0.4"}
    for i in range(days):
        d=(today-timedelta(days=i)).strftime("%Y%m%d")
        try:
            r=httpx.get(API_SUMARIO.format(fecha=d),timeout=20,headers=headers)
            if r.status_code!=200: continue
            soup=BeautifulSoup(r.text,"xml")
            for item in soup.find_all(["item","documento"]):
                title=_text(item.find(["titulo","texto","descripcion"]))
                if not title: continue
                low=title.lower()
                if not any(k in low for k in ["subvenc","ayuda","premio","beca","convocatoria"]): continue
                ref=_text(item.find(["identificador","id","numerooficial"])) or hashlib.sha1((title+d).encode()).hexdigest()
                url_el=item.find(["url_html","urlHtml","url"])
                url=_text(url_el) if url_el else f"https://www.boe.es/diario_boe/txt.php?id={ref}"
                typ="Subvención" if "subvenc" in low or "ayuda" in low else ("Premio" if "premio" in low else ("Beca" if "beca" in low else "Convocatoria"))
                out.append(RawOpportunity(
                    external_key="boe:"+ref,title=title[:500],org="BOE",type=typ,location="España",
                    deadline="",amount="Consultar publicación",
                    summary="Detectada automáticamente en el sumario oficial del BOE. Debe revisarse la publicación para confirmar plazo y elegibilidad.",
                    source=url,verified=False,tags="boe estatal "+typ.lower(),
                    eligibility_notes=["Pendiente de extracción editorial de plazo y requisitos"],
                    source_name="BOE",source_kind="opportunity"
                ))
        except Exception:
            continue
    return out
