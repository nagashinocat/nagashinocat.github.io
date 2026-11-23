# 各部品の正面(+z)と背面(-z)の出っぱり具合を格子で測る（電線・配管を壁にきちんと沿わせるため）
import numpy as np, json
P=np.load('P.npy'); I=np.load('I.npy'); C=P[I].mean(1)
RANGES=[(-0.96,-0.76),(-0.70,-0.47),(-0.46,-0.13),(-0.10,0.11),(0.14,0.43),(0.45,0.80),(0.80,0.97)]
man=json.load(open('manifest.json'))
NX,NY=24,48
for k,(a,b) in enumerate(RANGES):
  m=(C[:,0]>=a)&(C[:,0]<b)&~((C[:,2]>0.075)&(C[:,1]<-0.12))&~(C[:,1]<-0.199)
  V=P[np.unique(I[m])].astype(np.float64)
  lo,hi=V.min(0),V.max(0); V-=[(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2]; V/=(hi[1]-lo[1])
  w=V[:,0].max()-V[:,0].min(); x0=V[:,0].min()
  ix=np.clip(((V[:,0]-x0)/w*NX).astype(int),0,NX-1); iy=np.clip((V[:,1]*NY).astype(int),0,NY-1)
  front=np.full((NY,NX),-9.); back=np.full((NY,NX),9.)
  np.maximum.at(front,(iy,ix),V[:,2]); np.minimum.at(back,(iy,ix),V[:,2])
  # 空いた所はとなりで埋める（なければ箱の面）
  for g,fill in ((front,V[:,2].min()),(back,V[:,2].max())):
    bad=np.abs(g)>8
    for _ in range(4):
      if not bad.any(): break
      for y,x in zip(*np.where(bad)):
        nb=[g[yy,xx] for yy in range(max(0,y-1),min(NY,y+2)) for xx in range(max(0,x-1),min(NX,x+2)) if abs(g[yy,xx])<8]
        if nb: g[y,x]=max(nb) if g is front else min(nb)
      bad=np.abs(g)>8
    g[bad]=fill
  man[k]['x0']=round(float(x0),4); man[k]['front']=np.round(front,3).tolist(); man[k]['back']=np.round(back,3).tolist(); man[k]['grid']=[NX,NY]
  print(k,'front range',front.min().round(3),front.max().round(3))
json.dump(man,open('manifest.json','w'))
