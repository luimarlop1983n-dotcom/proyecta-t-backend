
from dataclasses import dataclass, field
from typing import Optional, List

@dataclass
class RawOpportunity:
    external_key: str
    title: str
    org: str
    type: str
    location: str
    deadline: str
    amount: str
    summary: str
    source: str
    verified: bool=False
    tags: str=""
    min_age: Optional[int]=None
    max_age: Optional[int]=None
    eligibility_notes: List[str]=field(default_factory=list)
    source_name: str="unknown"
    source_kind: str="opportunity"
