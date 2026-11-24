# Meshy の九龍城キットを部品に分け、細かく色を塗って軽くする
import numpy as np, trimesh, fast_simplification, json, hashlib
P=np.load('P.npy'); I=np.load('I.npy')
C=P[I].mean(1)
TARGET=22000
RANGES=[(-0.96,-0.76),(-0.70,-0.47),(-0.46,-0.13),(-0.10,0.11),(0.14,0.43),(0.45,0.80),(0.80,0.97)]
rng=np.random.default_rng(7)
WALL=np.array([[0.46,0.37,0.40],[0.52,0.42,0.40],[0.40,0.33,0.38],[0.56,0.46,0.43],[0.36,0.30,0.35],[0.48,0.40,0.36]])
NEON=np.array([[1,0.31,0.64],[0.31,0.85,1],[1,0.7,0.12],[0.7,0.42,1],[1,0.23,0.23],[0.49,1,0.42]])
manifest=[]
for k,(a,b) in enumerate(RANGES):
  m=(C[:,0]>=a)&(C[:,0]<b)&~((C[:,2]>0.075)&(C[:,1]<-0.12))&~(C[:,1]<-0.199)
  F=I[m]; used=np.unique(F); remap=-np.ones(len(P),np.int64); remap[used]=np.arange(len(used))
  V=P[used].astype(np.float64); F=remap[F]
  # 原点を足元の中心に
  lo,hi=V.min(0),V.max(0); V-= [ (lo[0]+hi[0])/2, lo[1], (lo[2]+hi[2])/2 ]
  h=hi[1]-lo[1]; V/=h
  target=0.92 if len(F)>60000 else 0.85
  V2,F2=fast_simplification.simplify(V.astype(np.float32),F.astype(np.int32),target_reduction=1-min(1,TARGET/len(F)))
  V2=V2.astype(np.float64)
  tri=V2[F2]; n=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]); ln=np.linalg.norm(n,axis=1,keepdims=True)+1e-12; n/=ln
  c=tri.mean(1)
  # 面の分類
  col=np.zeros((len(F2),4))
  up=n[:,1]>0.6; down=n[:,1]<-0.6; vert=~up&~down
  # 外壁からの奥まり（向きごとの外面を基準に）
  az=np.round(np.arctan2(n[:,2],n[:,0])/(np.pi/4)).astype(int)%8
  s=(c[:,0]*n[:,0]+c[:,2]*n[:,2])
  recess=np.zeros(len(F2))
  for d in range(8):
    sel=vert&(az==d)
    if sel.sum()>20: recess[sel]=np.percentile(s[sel],88)-s[sel]
  # 壁の色：高さの帯と場所でばらつく（階ごとのしみ）
  floor=np.floor(c[:,1]/0.035).astype(int); cellx=np.floor((c[:,0]+c[:,2])/0.06).astype(int)
  hsh=(floor*73856093 ^ cellx*19349663 ^ k*83492791)&0xffff
  wall=WALL[hsh%len(WALL)]*(0.85+0.3*((hsh>>4)%7)/6)[:,None]
  col[:,:3]=wall; col[:,3]=0
  win=vert&(recess>0.012); lit=blue=win&False
  # 張り出し（手すり・室外機・看板）
  out=vert&(recess<-0.01)
  oh=(np.floor(c[:,1]/0.02).astype(int)*13+np.floor(c[:,0]/0.02).astype(int)*7+np.floor(c[:,2]/0.02).astype(int)*3)%100
  ac=out&(oh<30); rail=out&(oh>=30)&(oh<70); sign=out&(oh>=88)
  col[ac,:3]=[0.83,0.81,0.75]; col[rail,:3]=[0.22,0.17,0.2]
  col[sign,:3]=NEON[oh[sign]%len(NEON)]; col[sign,3]=1
  # 屋根・ひさし（上向き）と下向き
  col[up,:3]=np.array([0.26,0.22,0.27])*(0.8+0.4*((hsh[up]>>3)%5)/4)[:,None]; col[up,3]=0
  col[down,:3]=[0.12,0.09,0.13]; col[down,3]=0
  # 頂点はつないだまま、まわりの面の色を平均（ネオンは優先）
  acc=np.zeros((len(V2),4)); cnt=np.zeros(len(V2))
  for j in range(3): np.add.at(acc,F2[:,j],col); np.add.at(cnt,F2[:,j],1)
  vc=acc/np.maximum(cnt,1)[:,None]; vc[:,3]=(vc[:,3]>0.5)
  mesh=trimesh.Trimesh(V2,F2,vertex_colors=(vc*255).clip(0,255).astype(np.uint8),process=False)
  Vf=V2
  _=mesh.vertex_normals
  fn=f'part{k}.glb'; mesh.export(fn, include_normals=True)
  bb=Vf.max(0)-Vf.min(0)
  manifest.append({'file':f'kowloon-{k}.glb','w':round(float(bb[0]),4),'d':round(float(bb[2]),4),'h':1.0,'tris':int(len(F2)),'lit':float(lit.mean()+blue.mean())})
  print(k,len(F),'->',len(F2),'bbox',bb.round(3),'win',win.mean().round(3),'out',out.mean().round(3))
json.dump(manifest,open('manifest.json','w'),indent=1)
