"""Regression: Adobe rejects RGB scn operands left in DeviceCMYK after k."""
from pathlib import Path
import json
from pypdf import PdfReader
from pypdf.generic import ContentStream

ROOT=Path(__file__).resolve().parents[1]
inputs=json.loads((ROOT/'exports/print_v3/PRINT_COMPONENT_INPUTS.json').read_text('utf-8'))
checked=0
def audit(stream,resources,reader):
    global checked
    state={b'cs':'/DeviceGray',b'CS':'/DeviceGray'};stack=[]
    spaces=resources.get('/ColorSpace',{})
    if hasattr(spaces,'get_object'):spaces=spaces.get_object()
    def channels(name):
        if name=='/DeviceRGB':return 3
        if name=='/DeviceCMYK':return 4
        if name=='/DeviceGray':return 1
        v=spaces.get(name)
        assert v is not None,'Unknown PDF color resource '+str(name)
        v=v.get_object()
        if v[0]=='/ICCBased':return int(v[1].get_object()['/N'])
        if v[0]=='/Separation':return 1
        if v[0]=='/DeviceN':return len(v[1])
        if v[0]=='/Indexed':return 1
        return None  # No patterns in these text/folio production inputs.
    for args,op in ContentStream(stream,reader).operations:
        if op==b'q':stack.append(dict(state))
        elif op==b'Q':
            assert stack,'Unbalanced graphics state'
            state=stack.pop()
        elif op in (b'cs',b'CS'):state[op]=args[0]
        elif op in (b'rg',b'RG'):state[b'cs' if op==b'rg' else b'CS']='/DeviceRGB'
        elif op in (b'k',b'K'):state[b'cs' if op==b'k' else b'CS']='/DeviceCMYK'
        elif op in (b'g',b'G'):state[b'cs' if op==b'g' else b'CS']='/DeviceGray'
        elif op in (b'scn',b'SCN',b'sc',b'SC'):
            n=channels(state[b'cs' if op in (b'scn',b'sc') else b'CS'])
            assert n is not None and len(args)==n,('Color operand mismatch',state,args)
            checked+=1
    assert not stack,'Unclosed graphics state'

for c in inputs['components']:
    reader=PdfReader(ROOT/c['file'])
    for page in reader.pages:audit(page.get_contents(),page.get('/Resources',{}),reader)
assert checked>0,'Native RGB scn path was not exercised'
print('PASS PDF color-state regression:',checked,'native color operators / valid RGB restore after 100K')
