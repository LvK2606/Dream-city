import * as T from 'three';import {rng} from './world.js';
export function textureSet(kind,seed=0){
 const n=256,rand=rng(seed+17),rgba=new Uint8Array(n*n*4),normal=new Uint8Array(n*n*4),packed=new Uint8Array(n*n*4),em=new Uint8Array(n*n*4),height=new Float32Array(n*n);
 const palette={stone:[179,173,158],brick:[153,102,81],white:[209,207,194],glass:[115,144,157],asphalt:[76,79,81],grass:[96,119,65],roof:[93,101,103],paving:[155,151,139]};const base=palette[kind]||palette.stone,facade=['stone','brick','white','glass'].includes(kind);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){let color=base,h=.55,r=.83,m=0,lit=0;const u=x%128,v=y%128,noise=(rand()-.5)*13;
 if(facade){const pane=u>16&&u<112&&v>19&&v<100,frame=u>11&&u<117&&v>14&&v<105;
 if(pane){const grad=(v-19)/81;const mull=Math.abs(u-64)<2||Math.abs(v-59)<2;const warm=((x>>7)+(y>>7)*3+seed)%4===0;color=mull?[131,139,137]:warm?[103+grad*23,113+grad*18,111+grad*15]:[58+grad*41,88+grad*43,108+grad*44];h=mull?.73:.20;r=mull?.45:.16;m=mull?.65:0;lit=mull?0:warm?220:8;if(!mull&&v<28)color=[38,54,64];}
 else if(frame){color=[128,130,124];h=.79;r=.52;m=.35}
 else if(v>108&&v<114){color=base.map(c=>c*.76);h=.74}
 else if(kind==='brick'&&(y%12<2||(x+(Math.floor(y/12)%2)*12)%24<2)){color=[112,105,97];h=.34}
 else if(kind==='glass'){color=[125,144,147];m=.55;r=.32}
 }else if(kind==='paving'&&(y%32<2||x%32<2)){color=[102,106,103];h=.37}
 else if(kind==='roof'&&(y%32<2||x%48<2)){color=[67,72,73];h=.35}
 else if(kind==='grass'){color=base.map((c,i)=>c+(Math.sin(x*.1)*Math.cos(y*.12))*13+(i===1?noise:0));h=.48+noise*.015}
 else if(kind==='asphalt'){h=.5+noise*.017;r=.97}
 const p=y*n+x,i=p*4;for(let k=0;k<3;k++)rgba[i+k]=Math.max(0,Math.min(255,color[k]+noise));rgba[i+3]=255;packed[i]=255;packed[i+1]=Math.round(r*255);packed[i+2]=Math.round(m*255);packed[i+3]=255;height[p]=h;em[i]=lit;em[i+1]=Math.round(lit*.71);em[i+2]=Math.round(lit*.35);em[i+3]=255}
 const at=(x,y)=>height[((y+n)%n)*n+(x+n)%n];for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=(at(x-1,y)-at(x+1,y))*.85,dy=(at(x,y-1)-at(x,y+1))*.85,l=Math.hypot(dx,dy,1),i=(y*n+x)*4;normal[i]=Math.round(127.5+127.5*dx/l);normal[i+1]=Math.round(127.5+127.5*dy/l);normal[i+2]=Math.round(127.5+127.5/l);normal[i+3]=255}
 const tex=(a,cs)=>{const t=new T.DataTexture(a,n,n,T.RGBAFormat);t.colorSpace=cs;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;return t};const surface=tex(packed,T.NoColorSpace);
 return new T.MeshStandardMaterial({map:tex(rgba,T.SRGBColorSpace),normalMap:tex(normal,T.NoColorSpace),normalScale:new T.Vector2(.55,.55),roughnessMap:surface,metalnessMap:surface,roughness:1,metalness:1,envMapIntensity:.75,...(facade?{emissive:0xffffff,emissiveMap:tex(em,T.SRGBColorSpace),emissiveIntensity:0}: {})})
}
export function waterNormals(){const n=128,a=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=x/n*Math.PI*2,v=y/n*Math.PI*2,dx=.23*Math.cos(u*3+v*4)+.11*Math.sin(u*8-v*3),dy=.21*Math.sin(v*5-u*2)+.12*Math.cos(v*7+u*6),l=Math.hypot(dx,dy,1),i=(y*n+x)*4;a[i]=127.5+127.5*dx/l;a[i+1]=127.5+127.5*dy/l;a[i+2]=127.5+127.5/l;a[i+3]=255}const t=new T.DataTexture(a,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t}
