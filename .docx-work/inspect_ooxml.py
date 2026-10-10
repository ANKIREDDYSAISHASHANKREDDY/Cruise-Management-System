import zipfile, hashlib, json, xml.etree.ElementTree as ET
from pathlib import Path
f=Path('PBL Final Documentation templet.docx')
z=zipfile.ZipFile(f)
inv=[]
for n in z.namelist():
    data=z.read(n); inv.append({'part':n,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()})
Path('.docx-work/template-package-inventory.json').write_text(json.dumps(inv,indent=2),encoding='utf-8')
for n in ['word/footnotes.xml','word/endnotes.xml']:
    root=ET.fromstring(z.read(n)); text=' '.join(x.text or '' for x in root.iter() if x.tag.endswith('}t'))
    print(n,'TEXT:',text)
for n in ['word/document.xml','word/footnotes.xml','word/endnotes.xml']:
    root=ET.fromstring(z.read(n)); print(n,'footnoteRefs',sum(1 for x in root.iter() if x.tag.endswith('}footnoteReference')),'endnoteRefs',sum(1 for x in root.iter() if x.tag.endswith('}endnoteReference')))
root=ET.fromstring(z.read('word/theme/theme1.xml'))
for el in root.iter():
    if el.tag.endswith('}majorFont') or el.tag.endswith('}minorFont'):
        latin=next((x for x in el if x.tag.endswith('}latin')),None); print(el.tag.split('}')[-1],latin.attrib if latin is not None else None)
