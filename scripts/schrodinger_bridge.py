"""Local-only Pocket Atlas adapter. Run with SCHRODINGER/run.exe python3.
Calls installed vendor APIs; contains no redistributed Schrodinger code.
"""
import argparse
import json
import math
import secrets
import socket
import sys
import tempfile
import threading
import webbrowser
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen

from schrodinger import structure
from schrodinger.structutils import analyze, interactions
from schrodinger.structutils.interactions import hbond
from schrodinger.rdkit import rdkit_adapter
from rdkit import Chem

ORIGINS = {'https://pocket-atlas.ferguslu.chatgpt.site', 'http://localhost:3000', 'http://127.0.0.1:3000'}
LOCK = threading.Lock()
DATASETS = OrderedDict()
CACHE = {}
RESTORED = OrderedDict()
TOKEN = secrets.token_urlsafe(32)
MAX_BODY = 150 * 1024 * 1024

def native_record(st, index, protein, native_id, folder):
    atoms = []
    for a in st.atom:
        bonds = list(a.bond)
        atoms.append(dict(x=float(a.x), y=float(a.y), z=float(a.z), elem=a.element,
            atom=(a.pdbname.strip() or a.name.strip()), resn=a.pdbres.strip(),
            resi=int(a.resnum), chain=a.chain.strip(), icode=a.inscode.strip(' \x00'), charge=int(a.formal_charge),
            bonds=[b.atom2.index-1 if b.atom1.index==a.index else b.atom1.index-1 for b in bonds],
            bondOrder=[int(b.order) for b in bonds]))
    props = {k:str(v) for k,v in st.property.items()}
    result = dict(title=st.title or 'Structure '+str(index), atoms=atoms,
        properties=props, sourceIndex=index, protein=protein, nativeId=native_id)
    if protein:
        path = Path(folder)/'receptor.pdb'
        st.write(str(path))
        result['pdb'] = path.read_text()
    else:
        result['molblock'] = st.writeToString(structure.SD)
        try:
            props['SMILES'] = Chem.MolToSmiles(rdkit_adapter.to_rdkit(st))
        except Exception as exc:
            result['conversionWarning'] = str(exc)
    return result

def import_file(content, suffix):
    dataset = secrets.token_hex(12)
    records, store, warnings = [], {}, []
    with tempfile.TemporaryDirectory(prefix='pocket-atlas-') as folder:
        path=Path(folder)/('input'+suffix);path.write_bytes(content)
        with structure.StructureReader(str(path)) as reader:
            for index, st in enumerate(reader,1):
                if index>5001: raise ValueError('最多导入 5000 个配体及受体')
                prot = analyze.evaluate_asl(st,'protein')
                pieces=[]
                if prot:
                    embedded = analyze.find_ligands(st)
                    ids = set(i for lig in embedded for i in lig.atom_indexes)
                    receptor=st.extract([a.index for a in st.atom if a.index not in ids]) if ids else st
                    pieces.append((receptor,True))
                    for lig in embedded:
                        part=st.extract(lig.atom_indexes);part.title=st.title+' / '+str(lig.pdbres if hasattr(lig,'pdbres') else 'ligand')
                        # Prime MM/GBSA and Glide scores belong to the parent complex
                        # CT. Preserve them on every extracted ligand record.
                        for prop_key,prop_value in st.property.items():
                            part.property[prop_key]=prop_value
                        pieces.append((part,False))
                    if embedded: warnings.append('记录 '+str(index)+' 已按原生配体识别拆分；请复核其中的辅因子或添加剂。')
                else: pieces.append((st,False))
                for part,is_protein in pieces:
                    key=dataset+':'+str(len(store));store[key]=part
                    records.append(native_record(part,index,is_protein,key,folder))
    DATASETS[dataset]=store
    while len(DATASETS)>3:
        old,_=DATASETS.popitem(last=False)
        for key in list(CACHE):
            if any(v.startswith(old+':') for v in key): del CACHE[key]
    return dict(structures=records,warnings=warnings,engine='Schrodinger 2026-3 native APIs')

def get_structure(key):
    if key in RESTORED:
        RESTORED.move_to_end(key)
        return RESTORED[key]
    dataset=key.split(':')[0]
    if dataset not in DATASETS or key not in DATASETS[dataset]:
        raise ValueError('本地结构会话已失效，请重新连接并导入原始文件。')
    return DATASETS[dataset][key]

def restore_structure(data):
    key = data['id']
    if not isinstance(key, str) or len(key) > 200: raise ValueError('无效结构编号')
    try:
        st = get_structure(key)
        return dict(ready=True, atoms=st.atom_total)
    except ValueError:
        pass
    atoms = data['atoms']
    if not atoms or len(atoms) > 200000: raise ValueError('结构原子数量不受支持')
    st = structure.create_new_structure(len(atoms))
    bonds = []
    for i, source in enumerate(atoms, 1):
        a = st.atom[i]
        a.element = source['elem']
        a.xyz = [float(source[c]) for c in ('x', 'y', 'z')]
        if not all(math.isfinite(v) for v in a.xyz): raise ValueError('无效坐标')
        a.pdbname = source.get('atom', '')
        a.pdbres = source.get('resn', 'UNK')
        a.resnum = int(source.get('resi', 1))
        a.chain = source.get('chain', '')
        a.inscode = source.get('icode', '') or ' '
        a.formal_charge = int(source.get('charge', 0))
        for j, order in zip(source.get('bonds', []), source.get('bondOrder', [])):
            if j + 1 > i:
                if j >= len(atoms) or order not in (1, 2, 3): raise ValueError('无效键')
                bonds.append((i, j + 1, order))
    st.addBonds(bonds)
    st.retype()
    st.title = data.get('title', 'Restored project structure')
    RESTORED[key] = st
    return dict(ready=True, atoms=st.atom_total)

def calculate(rec_id,lig_id):
    key=(rec_id,lig_id)
    if key in CACHE: return CACHE[key]
    rec,lig=get_structure(rec_id),get_structure(lig_id)
    st=rec.merge(lig); n=rec.atom_total
    ra=list(range(1,n+1));la=list(range(n+1,st.atom_total+1))
    pairs=[];errors=[]
    def endpoint(ids, xyz=None):
        ids=[int(i) for i in ids]
        a=st.atom[ids[0]]
        coord=xyz if xyz is not None else a.xyz
        return dict(x=float(coord[0]),y=float(coord[1]),z=float(coord[2]),
            atomIndices=[i if i<=n else i-n for i in ids], side='receptor' if ids[0]<=n else 'ligand',
            label=(a.chain.strip() or '_')+':'+a.pdbres.strip()+str(a.resnum)+a.inscode.strip(' \x00')+':'+(a.pdbname.strip() or a.element)+(' 环中心' if len(ids)>1 else ''))
    def add(kind,a,b,distance_type='atom',**extra):
        if a['side']==b['side']:return
        if a['side']=='ligand':a,b=b,a
        d=math.sqrt(sum((a[c]-b[c])**2 for c in ('x','y','z')))
        pairs.append(dict(type=kind,a=a,b=b,distance=d,distanceType=distance_type,**extra))
    jobs=[('hbond',lambda:hbond.get_hydrogen_bonds(st,atoms1=ra,atoms2=la)),
          ('halogen',lambda:hbond.get_halogen_bonds(st,atoms1=ra,atoms2=la)),
          ('salt',lambda:interactions.get_salt_bridges(st,group1=ra,group2=la))]
    for kind,fn in jobs:
        try:
            for a,b in fn():add(kind,endpoint([a.index]),endpoint([b.index]))
        except Exception as exc: errors.append(kind+': '+str(exc))
    try:
        for p in interactions.find_pi_pi_interactions(st,atoms1=ra,atoms2=la):
            add('pipi',endpoint(p.ring1.atoms,p.ring1.xyz),endpoint(p.ring2.atoms,p.ring2.xyz),'centroid',angle=float(p.angle))
    except Exception as exc:errors.append('pipi: '+str(exc))
    try:
        for p in interactions.find_pi_cation_interactions(st,atoms1=ra,atoms2=la):
            add('pication',endpoint(p.cation_centroid.atoms,p.cation_centroid.xyz),endpoint(p.pi_centroid.atoms,p.pi_centroid.xyz),'centroid',angle=float(p.angle))
    except Exception as exc:errors.append('pication: '+str(exc))
    result=dict(engine='Schrodinger native interaction APIs',criteria='installed API defaults; not another workstation custom LID settings',pairs=pairs,errors=errors,
        receptorId=rec_id,ligandId=lig_id,hydrogens=dict(receptor=sum(a.element=='H' for a in rec.atom),ligand=sum(a.element=='H' for a in lig.atom)))
    if not errors: CACHE[key]=result
    return result

class LocalServer(ThreadingHTTPServer):
    allow_reuse_address = False
    def server_bind(self):
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def allowed(self):
        origin=self.headers.get('Origin')
        return (origin is None or origin in ORIGINS) and self.headers.get('Host','').split(':')[0] in ('127.0.0.1','localhost')
    def send_json(self,status,data):
        body=json.dumps(data,ensure_ascii=False,allow_nan=False).encode()
        self.send_response(status)
        origin=self.headers.get('Origin')
        if origin in ORIGINS:self.send_header('Access-Control-Allow-Origin',origin)
        self.send_header('Vary','Origin');self.send_header('Cache-Control','no-store')
        self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)))
        self.end_headers();self.wfile.write(body)
    def do_OPTIONS(self):
        if not self.allowed():self.send_json(403,dict(error='Origin denied'));return
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin',self.headers.get('Origin',''))
        self.send_header('Access-Control-Allow-Headers','Authorization,Content-Type,X-File-Extension')
        self.send_header('Access-Control-Allow-Methods','GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Private-Network','true');self.end_headers()
    def authorized(self):
        return self.allowed() and secrets.compare_digest(self.headers.get('Authorization',''),'Bearer '+TOKEN)
    def do_GET(self):
        if self.path == '/handshake' and self.allowed():
            self.send_json(200,dict(format='pocket-atlas-connection-v1',url='http://127.0.0.1:'+str(self.server.server_address[1]),token=TOKEN))
            return
        if not self.authorized():self.send_json(403,dict(error='本机桥接会话无效，请重新运行 Pocket Atlas 启动器'));return
        self.send_json(200,dict(engine='Schrodinger native Python',ready=True,protocol=2))
    def do_POST(self):
        if not self.authorized():self.send_json(403,dict(error='连接失效或来源不受支持'));return
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size<=0 or size>MAX_BODY:raise ValueError('请求为空或超过 150 MB')
            body=self.rfile.read(size)
            with LOCK:
                if self.path=='/import':
                    suffix=self.headers.get('X-File-Extension','').lower()
                    if suffix not in ('.mae','.maegz','.sdf','.pdb'):raise ValueError('不支持此结构格式')
                    result=import_file(body,suffix)
                elif self.path=='/interactions':
                    data=json.loads(body);result=calculate(data['receptor'],data['ligand'])
                elif self.path=='/restore':
                    result=restore_structure(json.loads(body))
                else:raise ValueError('未知操作')
            self.send_json(200,result)
        except Exception as exc:self.send_json(400,dict(error=str(exc)))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);parser.add_argument('--open-site',action='store_true');parser.add_argument('--site-url',default='https://pocket-atlas.ferguslu.chatgpt.site/')
    args=parser.parse_args()
    try:
        server=LocalServer(('127.0.0.1',args.port),Handler)
    except OSError:
        # Reuse the current local session when the launcher is opened twice.
        with urlopen('http://127.0.0.1:'+str(args.port)+'/handshake',timeout=3) as response:
            existing=json.load(response)
        if existing.get('format') != 'pocket-atlas-connection-v1': raise ValueError('Port is occupied by another service')
        if args.open_site: webbrowser.open(args.site_url)
        print('Pocket Atlas bridge is already running; the workbench reconnects automatically.',flush=True)
        sys.exit(0)
    print('Pocket Atlas bridge ready; the workbench discovers it automatically.',flush=True)
    if args.open_site: webbrowser.open(args.site_url)
    server.serve_forever()
