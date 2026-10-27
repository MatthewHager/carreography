(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=t(s);fetch(s.href,r)}})();class ds extends Error{}const Hp="PSEQ",Vp=32;function Gp(i){if(i.length<Vp)throw new ds("File is too small to be an FSEQ file");const e=new DataView(i.buffer,i.byteOffset,i.byteLength),t=String.fromCharCode(...i.subarray(0,4));if(t!==Hp)throw new ds(`Not an FSEQ v2 file (magic is "${t}")`);const n=e.getUint16(4,!0),s=e.getUint8(6),r=e.getUint8(7),o=e.getUint16(8,!0),a=e.getUint32(10,!0),l=e.getUint32(14,!0),c=e.getUint8(18),h=e.getUint8(20)&15,u=e.getUint8(21),d=e.getUint8(22),f=e.getBigUint64(24,!0);if(r!==2)throw new ds(`Unsupported FSEQ version ${r}.${s}`);if(h!==0)throw new ds("Compressed FSEQ files are not supported; Tesla requires uncompressed");if(d!==0)throw new ds("Sparse FSEQ files are not supported");const g=[];let _=o+u*8;for(;_+4<=n;){const m=e.getUint16(_,!0);if(m<4||_+m>n)break;g.push({code:String.fromCharCode(i[_+2],i[_+3]),data:i.slice(_+4,_+m)}),_+=m}const p=a*l;if(n+p>i.length)throw new ds(`File is truncated: expected ${n+p} bytes, got ${i.length}`);return{channelCount:a,frameCount:l,stepTimeMs:c,minorVersion:s,uniqueId:f,variableHeaders:g,data:i.slice(n,n+p)}}const as=(i,e,t,n)=>({commandLimit:i,supportsDance:e,openSeconds:t,closeSeconds:n}),eu=as(6,!0,20,8),tu=as(6,!1,22,3),nu=as(20,!1,2,2),ao=as(6,!0,4,4),Wp=as(6,!0,14,4),lo=as(20,!1,2,2),Xp=as(3,!0,2,2),cf=[[1,"leftOuterMainBeam","Left Outer Main Beam","ramping"],[2,"rightOuterMainBeam","Right Outer Main Beam","ramping"],[3,"leftInnerMainBeam","Left Inner Main Beam","ramping"],[4,"rightInnerMainBeam","Right Inner Main Beam","ramping"],[5,"leftSignature","Left Signature","ramping"],[6,"rightSignature","Right Signature","ramping"],[7,"leftChannel4","Left Channel 4","ramping"],[8,"rightChannel4","Right Channel 4","ramping"],[9,"leftChannel5","Left Channel 5","ramping"],[10,"rightChannel5","Right Channel 5","ramping"],[11,"leftChannel6","Left Channel 6","ramping"],[12,"rightChannel6","Right Channel 6","ramping"],[13,"leftFrontTurn","Left Front Turn","ramping"],[14,"rightFrontTurn","Right Front Turn","ramping"],[15,"leftFrontFog","Left Front Fog","boolean"],[16,"rightFrontFog","Right Front Fog","boolean"],[17,"leftAuxPark","Left Aux Park","boolean"],[18,"rightAuxPark","Right Aux Park","boolean"],[19,"leftSideMarker","Left Side Marker","boolean"],[20,"rightSideMarker","Right Side Marker","boolean"],[21,"leftSideRepeater","Left Side Repeater","boolean"],[22,"rightSideRepeater","Right Side Repeater","boolean"],[23,"leftRearTurn","Left Rear Turn","boolean"],[24,"rightRearTurn","Right Rear Turn","boolean"],[25,"brakeLights","Brake Lights","boolean"],[26,"leftTail","Left Tail","boolean"],[27,"rightTail","Right Tail","boolean"],[28,"reverseLights","Reverse Lights","boolean"],[29,"rearFog","Rear Fog","boolean"],[30,"licensePlate","License Plate","boolean"],[31,"leftFalconDoor","Left Falcon Door","closure",eu],[32,"rightFalconDoor","Right Falcon Door","closure",eu],[33,"leftFrontDoor","Left Front Door","closure",tu],[34,"rightFrontDoor","Right Front Door","closure",tu],[35,"leftMirror","Left Mirror","closure",nu],[36,"rightMirror","Right Mirror","closure",nu],[37,"leftFrontWindow","Left Front Window","closure",ao],[38,"leftRearWindow","Left Rear Window","closure",ao],[39,"rightFrontWindow","Right Front Window","closure",ao],[40,"rightRearWindow","Right Rear Window","closure",ao],[41,"liftgate","Liftgate","closure",Wp],[42,"leftFrontDoorHandle","Left Front Door Handle","closure",lo],[43,"leftRearDoorHandle","Left Rear Door Handle","closure",lo],[44,"rightFrontDoorHandle","Right Front Door Handle","closure",lo],[45,"rightRearDoorHandle","Right Rear Door Handle","closure",lo],[46,"chargePort","Charge Port","closure",Xp]];function fs(i,e,t){return["Red","Green","Blue"].map((n,s)=>[i+s,`${e}${n}`,`${t} (${n})`,"rgb"])}function Fa(i,e,t,n){return Array.from({length:e},(s,r)=>[i+r,`${t}${r+1}`,`${n} ${r+1}`,"dimmable"])}cf.push(...Fa(47,60,"frontLightBar","Front Light Bar"),...Fa(111,52,"rearLightBar","Rear Light Bar"),...Fa(167,6,"offroadLightBar","Offroad Light Bar"),...fs(176,"centerFrontDisplay","Center Front Display"),...fs(179,"rightRearAccent","Right Rear Accent"),...fs(182,"rightFrontAccent","Right Front Accent"),...fs(185,"centerFrontAccent","Center Front Accent"),...fs(188,"leftFrontAccent","Left Front Accent"),...fs(191,"leftRearAccent","Left Rear Accent"));const hf=cf.map(([i,e,t,n,s])=>({id:e,index:i-1,name:t,kind:n,...s?{closure:s}:{}})),qc=new Map(hf.map(i=>[i.id,i])),Yp=new Map(hf.map(i=>[i.index,i]));function uf(i){const e=qc.get(i);if(!e)throw new Error(`Unknown channel: ${i}`);return e}const qp={off:0,off500:25,off1000:51,off2000:76,on500:178,on1000:204,on2000:229,on:255},iu={off:0,off500:500,off1000:1e3,off2000:2e3,on500:500,on1000:1e3,on2000:2e3,on:0};function Kp(i){return i<32?"idle":i<96?"open":i<160?"dance":i<224?"close":"stop"}const $p=Object.entries(qp);function su(i){let e="off",t=1/0;for(const[n,s]of $p){const r=Math.abs(s-i);r<t&&(e=n,t=r)}return e}const ru={window:2,other:4},Zp=.35;function Jp(i,e){const{frameCount:t,channelCount:n,data:s,stepTimeMs:r}=i,o=(c,h)=>h<n?s[c*n+h]:0,a=new Map,l=new Map;for(const c of e.channels){const h=qc.get(c.id);if(c.kind==="closure"){l.set(c.id,Qp(i,c.id,o,e.closureSeconds?.[c.id]));continue}const u=new Float32Array(t);if(c.kind==="boolean")for(let d=0;d<t;d++)u[d]=o(d,h.index)>127?1:0;else if(c.kind==="dimmable"||c.kind==="rgb")for(let d=0;d<t;d++)u[d]=o(d,h.index)/255;else{const d=e.channel4LeadsRamps?jp(c.id):void 0,f=d?uf(d).index:void 0;let g=0;for(let _=0;_<t;_++){const p=su(o(_,h.index)),m=p.startsWith("on"),M=f===void 0?iu[p]:iu[su(o(_,f))],T=M===0?1:r/M;g=m?Math.min(1,g+T):Math.max(0,g-T),u[_]=g}}a.set(c.id,u)}for(const c of e.orGroups){const h=c.inputs.map(d=>a.get(d)).filter(d=>!!d),u=new Float32Array(t);for(const d of h)for(let f=0;f<t;f++)d[f]>u[f]&&(u[f]=d[f]);for(const d of c.outputs)a.set(d,u)}return{frameCount:t,stepTimeMs:r,levels:a,closures:l}}function jp(i){const e=/^(left|right)Channel[56]$/.exec(i);return e?`${e[1]}Channel4`:void 0}function Qp(i,e,t,n){const{frameCount:s,stepTimeMs:r}=i,o=uf(e),a=n?{...o.closure,openSeconds:n[0],closeSeconds:n[1]}:o.closure,l=new Float32Array(s),c=new Float32Array(s),h=new Uint8Array(s),u=e.endsWith("Window"),d=e!=="chargePort",f=u?ru.window:ru.other,g=r/(a.openSeconds*1e3),_=r/(a.closeSeconds*1e3);let p=e.endsWith("Mirror")?1:0,m="none",M=-1;for(let T=0;T<s;T++){const x=t(T,o.index),S=Kp(x);if(S==="open"?m="opening":S==="close"?m="closing":S==="stop"&&(m="none"),m==="opening"?(p=Math.min(1,p+g),p===1&&(m="none")):m==="closing"&&(p=Math.max(0,p-_),p===0&&(m="none")),a.supportsDance&&S==="dance"&&(u||p>=.999)){M<0&&(M=T);const E=(T-M)*r/1e3,y=d?Zp*(.5-.5*Math.cos(2*Math.PI*E/f)):0;l[T]=u?p>.5?p-y:p+y:p-y,h[T]=1}else M=-1,l[T]=p;c[T]=p}return{position:l,dancing:h,rest:c}}const Kc="186",Gs={ROTATE:0,DOLLY:1,PAN:2},Fs={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},em=0,ou=1,tm=2,Jo=1,nm=2,Er=3,Bi=0,sn=1,pn=2,ei=0,Pr=1,Qi=2,au=3,lu=4,im=5,Ns=100,sm=101,rm=102,om=103,am=104,lm=200,cm=201,hm=202,um=203,df=204,ff=205,dm=206,fm=207,pm=208,mm=209,gm=210,_m=211,xm=212,vm=213,ym=214,Hl=0,Vl=1,Gl=2,zr=3,Wl=4,Xl=5,Yl=6,ql=7,$c=0,Mm=1,Sm=2,ti=0,Zc=1,Jc=2,jc=3,ba=4,Qc=5,eh=6,th=7,cu="attached",bm="detached",pf=300,es=301,Ks=302,Oa=303,Ba=304,Ta=306,ts=1e3,Zn=1001,oa=1002,Ut=1003,mf=1004,Ar=1005,Ft=1006,jo=1007,Jn=1008,mn=1009,gf=1010,_f=1011,kr=1012,nh=1013,ii=1014,wn=1015,Zt=1016,ih=1017,sh=1018,Hr=1020,xf=35902,vf=35899,yf=1021,Mf=1022,En=1023,vi=1026,$i=1027,rh=1028,oh=1029,ns=1030,ah=1031,lh=1033,Qo=33776,ea=33777,ta=33778,na=33779,Kl=35840,$l=35841,Zl=35842,Jl=35843,jl=36196,Ql=37492,ec=37496,tc=37488,nc=37489,aa=37490,ic=37491,sc=37808,rc=37809,oc=37810,ac=37811,lc=37812,cc=37813,hc=37814,uc=37815,dc=37816,fc=37817,pc=37818,mc=37819,gc=37820,_c=37821,xc=36492,vc=36494,yc=36495,Mc=36283,Sc=36284,la=36285,bc=36286,Tm=2200,wm=2201,Em=2202,Vr=2300,Gr=2301,za=2302,hu=2303,Os=2400,Bs=2401,ca=2402,ch=2500,Am=2501,Rm=0,Sf=1,Tc=2,Cm=3200,ha=0,Pm=1,Fi="",wt="srgb",_n="srgb-linear",ua="linear",dt="srgb",ka=7680,Lm=519,Im=512,Dm=513,Nm=514,hh=515,Um=516,Fm=517,uh=518,Om=519,bf=35044,co=35048,uu="300 es",jn=2e3,Wr=2001;function Bm(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function zm(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Xr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function km(){const i=Xr("canvas");return i.style.display="block",i}const du={};function da(...i){const e="THREE."+i.shift();console.log(e,...i)}function Tf(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Ne(...i){i=Tf(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function We(...i){i=Tf(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function Ws(...i){const e=i.join(" ");e in du||(du[e]=!0,Ne(...i))}function Hm(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}const Vm={[Hl]:Vl,[Gl]:Yl,[Wl]:ql,[zr]:Xl,[Vl]:Hl,[Yl]:Gl,[ql]:Wl,[Xl]:zr};class Mi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const s=n[e];if(s!==void 0){const r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}}const Yt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let fu=1234567;const Lr=Math.PI/180,$s=180/Math.PI;function Rn(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Yt[i&255]+Yt[i>>8&255]+Yt[i>>16&255]+Yt[i>>24&255]+"-"+Yt[e&255]+Yt[e>>8&255]+"-"+Yt[e>>16&15|64]+Yt[e>>24&255]+"-"+Yt[t&63|128]+Yt[t>>8&255]+"-"+Yt[t>>16&255]+Yt[t>>24&255]+Yt[n&255]+Yt[n>>8&255]+Yt[n>>16&255]+Yt[n>>24&255]).toLowerCase()}function Je(i,e,t){return Math.max(e,Math.min(t,i))}function dh(i,e){return(i%e+e)%e}function Gm(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function Wm(i,e,t){return i!==e?(t-i)/(e-i):0}function Ir(i,e,t){return(1-t)*i+t*e}function Xm(i,e,t,n){return Ir(i,e,1-Math.exp(-t*n))}function Ym(i,e=1){return e-Math.abs(dh(i,e*2)-e)}function qm(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Km(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function $m(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Zm(i,e){return i+Math.random()*(e-i)}function Jm(i){return i*(.5-Math.random())}function jm(i){i!==void 0&&(fu=i);let e=fu+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Qm(i){return i*Lr}function eg(i){return i*$s}function tg(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function ng(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function ig(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function sg(i,e,t,n,s){const r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+n)/2),h=o((e+n)/2),u=r((e-n)/2),d=o((e-n)/2),f=r((n-e)/2),g=o((n-e)/2);switch(s){case"XYX":i.set(a*h,l*u,l*d,a*c);break;case"YZY":i.set(l*d,a*h,l*u,a*c);break;case"ZXZ":i.set(l*u,l*d,a*h,a*c);break;case"XZX":i.set(a*h,l*g,l*f,a*c);break;case"YXY":i.set(l*f,a*h,l*g,a*c);break;case"ZYZ":i.set(l*g,l*f,a*h,a*c);break;default:Ne("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Un(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:case Uint8ClampedArray:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function pt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const Jt={DEG2RAD:Lr,RAD2DEG:$s,generateUUID:Rn,clamp:Je,euclideanModulo:dh,mapLinear:Gm,inverseLerp:Wm,lerp:Ir,damp:Xm,pingpong:Ym,smoothstep:qm,smootherstep:Km,randInt:$m,randFloat:Zm,randFloatSpread:Jm,seededRandom:jm,degToRad:Qm,radToDeg:eg,isPowerOfTwo:tg,ceilPowerOfTwo:ng,floorPowerOfTwo:ig,setQuaternionFromProperEuler:sg,normalize:pt,denormalize:Un},zh=class zh{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Je(this.x,e.x,t.x),this.y=Je(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Je(this.x,e,t),this.y=Je(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Je(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Je(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*s+e.x,this.y=r*s+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};zh.prototype.isVector2=!0;let ne=zh;class hn{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],u=n[s+3],d=r[o+0],f=r[o+1],g=r[o+2],_=r[o+3];if(u!==_||l!==d||c!==f||h!==g){let p=l*d+c*f+h*g+u*_;p<0&&(d=-d,f=-f,g=-g,_=-_,p=-p);let m=1-a;if(p<.9995){const M=Math.acos(p),T=Math.sin(M);m=Math.sin(m*M)/T,a=Math.sin(a*M)/T,l=l*m+d*a,c=c*m+f*a,h=h*m+g*a,u=u*m+_*a}else{l=l*m+d*a,c=c*m+f*a,h=h*m+g*a,u=u*m+_*a;const M=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=M,c*=M,h*=M,u*=M}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,s,r,o){const a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],u=r[o],d=r[o+1],f=r[o+2],g=r[o+3];return e[t]=a*g+h*u+l*f-c*d,e[t+1]=l*g+h*d+c*u-a*f,e[t+2]=c*g+h*f+a*d-l*u,e[t+3]=h*g-a*u-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),u=a(r/2),d=l(n/2),f=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"YXZ":this._x=d*h*u+c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"ZXY":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u-d*f*g;break;case"ZYX":this._x=d*h*u-c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u+d*f*g;break;case"YZX":this._x=d*h*u+c*f*g,this._y=c*f*u+d*h*g,this._z=c*h*g-d*f*u,this._w=c*h*u-d*f*g;break;case"XZY":this._x=d*h*u-c*f*g,this._y=c*f*u-d*h*g,this._z=c*h*g+d*f*u,this._w=c*h*u+d*f*g;break;default:Ne("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],s=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],h=t[6],u=t[10],d=n+a+u;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(n>a&&n>u){const f=2*Math.sqrt(1+n-a-u);this._w=(h-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>u){const f=2*Math.sqrt(1+a-n-u);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+u-n-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Je(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,s=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){const c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const kh=class kh{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(pu.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(pu.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,s=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*s-a*n),h=2*(a*t-r*s),u=2*(r*n-o*t);return this.x=t+l*c+o*u-a*h,this.y=n+l*h+a*c-r*u,this.z=s+l*u+r*h-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Je(this.x,e.x,t.x),this.y=Je(this.y,e.y,t.y),this.z=Je(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Je(this.x,e,t),this.y=Je(this.y,e,t),this.z=Je(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Je(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,s=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Ha.copy(this).projectOnVector(e),this.sub(Ha)}reflect(e){return this.sub(Ha.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Je(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};kh.prototype.isVector3=!0;let A=kh;const Ha=new A,pu=new hn,Hh=class Hh{constructor(e,t,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c)}set(e,t,n,s,r,o,a,l,c){const h=this.elements;return h[0]=e,h[1]=s,h[2]=a,h[3]=t,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],g=n[8],_=s[0],p=s[3],m=s[6],M=s[1],T=s[4],x=s[7],S=s[2],w=s[5],E=s[8];return r[0]=o*_+a*M+l*S,r[3]=o*p+a*T+l*w,r[6]=o*m+a*x+l*E,r[1]=c*_+h*M+u*S,r[4]=c*p+h*T+u*w,r[7]=c*m+h*x+u*E,r[2]=d*_+f*M+g*S,r[5]=d*p+f*T+g*w,r[8]=d*m+f*x+g*E,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return t*o*h-t*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],u=h*o-a*c,d=a*l-h*r,f=c*r-o*l,g=t*u+n*d+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return e[0]=u*_,e[1]=(s*c-h*n)*_,e[2]=(a*n-s*o)*_,e[3]=d*_,e[4]=(h*t-s*l)*_,e[5]=(s*r-a*t)*_,e[6]=f*_,e[7]=(n*l-c*t)*_,e[8]=(o*t-n*r)*_,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-s*c,s*l,-s*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return Ws("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Va.makeScale(e,t)),this}rotate(e){return Ws("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Va.makeRotation(-e)),this}translate(e,t){return Ws("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Va.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Hh.prototype.isMatrix3=!0;let Ke=Hh;const Va=new Ke,mu=new Ke().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),gu=new Ke().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function rg(){const i={enabled:!0,workingColorSpace:_n,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===dt&&(s.r=xi(s.r),s.g=xi(s.g),s.b=xi(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===dt&&(s.r=Xs(s.r),s.g=Xs(s.g),s.b=Xs(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Fi?ua:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Ws("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Ws("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[_n]:{primaries:e,whitePoint:n,transfer:ua,toXYZ:mu,fromXYZ:gu,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:wt},outputColorSpaceConfig:{drawingBufferColorSpace:wt}},[wt]:{primaries:e,whitePoint:n,transfer:dt,toXYZ:mu,fromXYZ:gu,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:wt}}}),i}const et=rg();function xi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Xs(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let ps;class og{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{ps===void 0&&(ps=Xr("canvas")),ps.width=e.width,ps.height=e.height;const s=ps.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=ps}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Xr("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=xi(r[o]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(xi(t[n]/255)*255):t[n]=xi(t[n]);return{data:t,width:e.width,height:e.height}}else return Ne("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let ag=0;class fh{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:ag++}),this.uuid=Rn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Ga(s[o].image)):r.push(Ga(s[o]))}else r=Ga(s);n.url=r}return t||(e.images[this.uuid]=n),n}}function Ga(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?og.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ne("Texture: Unable to serialize Texture."),{})}let lg=0;const Wa=new A;class Ot extends Mi{constructor(e=Ot.DEFAULT_IMAGE,t=Ot.DEFAULT_MAPPING,n=Zn,s=Zn,r=Ft,o=Jn,a=En,l=mn,c=Ot.DEFAULT_ANISOTROPY,h=Fi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:lg++}),this.uuid=Rn(),this.name="",this.source=new fh(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ne(0,0),this.repeat=new ne(1,1),this.center=new ne(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ke,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Wa).x}get height(){return this.source.getSize(Wa).y}get depth(){return this.source.getSize(Wa).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){Ne(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Ne(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==pf)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case ts:e.x=e.x-Math.floor(e.x);break;case Zn:e.x=e.x<0?0:1;break;case oa:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case ts:e.y=e.y-Math.floor(e.y);break;case Zn:e.y=e.y<0?0:1;break;case oa:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Ot.DEFAULT_IMAGE=null;Ot.DEFAULT_MAPPING=pf;Ot.DEFAULT_ANISOTROPY=1;const Vh=class Vh{constructor(e=0,t=0,n=0,s=1){this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r;const l=e.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],g=l[9],_=l[2],p=l[6],m=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-_)<.01&&Math.abs(g-p)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+_)<.1&&Math.abs(g+p)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const T=(c+1)/2,x=(f+1)/2,S=(m+1)/2,w=(h+d)/4,E=(u+_)/4,y=(g+p)/4;return T>x&&T>S?T<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(T),s=w/n,r=E/n):x>S?x<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(x),n=w/s,r=y/s):S<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(S),n=E/r,s=y/r),this.set(n,s,r,t),this}let M=Math.sqrt((p-g)*(p-g)+(u-_)*(u-_)+(d-h)*(d-h));return Math.abs(M)<.001&&(M=1),this.x=(p-g)/M,this.y=(u-_)/M,this.z=(d-h)/M,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Je(this.x,e.x,t.x),this.y=Je(this.y,e.y,t.y),this.z=Je(this.z,e.z,t.z),this.w=Je(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Je(this.x,e,t),this.y=Je(this.y,e,t),this.z=Je(this.z,e,t),this.w=Je(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Je(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Vh.prototype.isVector4=!0;let ft=Vh;class cg extends Mi{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ft,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new ft(0,0,e,t),this.scissorTest=!1,this.viewport=new ft(0,0,e,t),this.textures=[];const s={width:e,height:t,depth:n.depth},r=new Ot(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Ft,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new fh(s)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){const t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Wt extends cg{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class wf extends Ot{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Ut,this.minFilter=Ut,this.wrapR=Zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class hg extends Ot{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Ut,this.minFilter=Ut,this.wrapR=Zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}}const Sa=class Sa{constructor(e,t,n,s,r,o,a,l,c,h,u,d,f,g,_,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c,h,u,d,f,g,_,p)}set(e,t,n,s,r,o,a,l,c,h,u,d,f,g,_,p){const m=this.elements;return m[0]=e,m[4]=t,m[8]=n,m[12]=s,m[1]=r,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=h,m[10]=u,m[14]=d,m[3]=f,m[7]=g,m[11]=_,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Sa().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,n=e.elements,s=1/ms.setFromMatrixColumn(e,0).length(),r=1/ms.setFromMatrixColumn(e,1).length(),o=1/ms.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,s=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){const d=o*h,f=o*u,g=a*h,_=a*u;t[0]=l*h,t[4]=-l*u,t[8]=c,t[1]=f+g*c,t[5]=d-_*c,t[9]=-a*l,t[2]=_-d*c,t[6]=g+f*c,t[10]=o*l}else if(e.order==="YXZ"){const d=l*h,f=l*u,g=c*h,_=c*u;t[0]=d+_*a,t[4]=g*a-f,t[8]=o*c,t[1]=o*u,t[5]=o*h,t[9]=-a,t[2]=f*a-g,t[6]=_+d*a,t[10]=o*l}else if(e.order==="ZXY"){const d=l*h,f=l*u,g=c*h,_=c*u;t[0]=d-_*a,t[4]=-o*u,t[8]=g+f*a,t[1]=f+g*a,t[5]=o*h,t[9]=_-d*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const d=o*h,f=o*u,g=a*h,_=a*u;t[0]=l*h,t[4]=g*c-f,t[8]=d*c+_,t[1]=l*u,t[5]=_*c+d,t[9]=f*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const d=o*l,f=o*c,g=a*l,_=a*c;t[0]=l*h,t[4]=_-d*u,t[8]=g*u+f,t[1]=u,t[5]=o*h,t[9]=-a*h,t[2]=-c*h,t[6]=f*u+g,t[10]=d-_*u}else if(e.order==="XZY"){const d=o*l,f=o*c,g=a*l,_=a*c;t[0]=l*h,t[4]=-u,t[8]=c*h,t[1]=d*u+_,t[5]=o*h,t[9]=f*u-g,t[2]=g*u-f,t[6]=a*h,t[10]=_*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(ug,e,dg)}lookAt(e,t,n){const s=this.elements;return dn.subVectors(e,t),dn.lengthSq()===0&&(dn.z=1),dn.normalize(),Ei.crossVectors(n,dn),Ei.lengthSq()===0&&(Math.abs(n.z)===1?dn.x+=1e-4:dn.z+=1e-4,dn.normalize(),Ei.crossVectors(n,dn)),Ei.normalize(),ho.crossVectors(dn,Ei),s[0]=Ei.x,s[4]=ho.x,s[8]=dn.x,s[1]=Ei.y,s[5]=ho.y,s[9]=dn.y,s[2]=Ei.z,s[6]=ho.z,s[10]=dn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],g=n[2],_=n[6],p=n[10],m=n[14],M=n[3],T=n[7],x=n[11],S=n[15],w=s[0],E=s[4],y=s[8],R=s[12],P=s[1],I=s[5],F=s[9],V=s[13],U=s[2],B=s[6],K=s[10],W=s[14],ie=s[3],q=s[7],Q=s[11],O=s[15];return r[0]=o*w+a*P+l*U+c*ie,r[4]=o*E+a*I+l*B+c*q,r[8]=o*y+a*F+l*K+c*Q,r[12]=o*R+a*V+l*W+c*O,r[1]=h*w+u*P+d*U+f*ie,r[5]=h*E+u*I+d*B+f*q,r[9]=h*y+u*F+d*K+f*Q,r[13]=h*R+u*V+d*W+f*O,r[2]=g*w+_*P+p*U+m*ie,r[6]=g*E+_*I+p*B+m*q,r[10]=g*y+_*F+p*K+m*Q,r[14]=g*R+_*V+p*W+m*O,r[3]=M*w+T*P+x*U+S*ie,r[7]=M*E+T*I+x*B+S*q,r[11]=M*y+T*F+x*K+S*Q,r[15]=M*R+T*V+x*W+S*O,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],h=e[2],u=e[6],d=e[10],f=e[14],g=e[3],_=e[7],p=e[11],m=e[15],M=l*f-c*d,T=a*f-c*u,x=a*d-l*u,S=o*f-c*h,w=o*d-l*h,E=o*u-a*h;return t*(_*M-p*T+m*x)-n*(g*M-p*S+m*w)+s*(g*T-_*S+m*E)-r*(g*x-_*w+p*E)}determinantAffine(){const e=this.elements,t=e[0],n=e[4],s=e[8],r=e[1],o=e[5],a=e[9],l=e[2],c=e[6],h=e[10];return t*(o*h-a*c)-n*(r*h-a*l)+s*(r*c-o*l)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],u=e[9],d=e[10],f=e[11],g=e[12],_=e[13],p=e[14],m=e[15],M=t*a-n*o,T=t*l-s*o,x=t*c-r*o,S=n*l-s*a,w=n*c-r*a,E=s*c-r*l,y=h*_-u*g,R=h*p-d*g,P=h*m-f*g,I=u*p-d*_,F=u*m-f*_,V=d*m-f*p,U=M*V-T*F+x*I+S*P-w*R+E*y;if(U===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const B=1/U;return e[0]=(a*V-l*F+c*I)*B,e[1]=(s*F-n*V-r*I)*B,e[2]=(_*E-p*w+m*S)*B,e[3]=(d*w-u*E-f*S)*B,e[4]=(l*P-o*V-c*R)*B,e[5]=(t*V-s*P+r*R)*B,e[6]=(p*x-g*E-m*T)*B,e[7]=(h*E-d*x+f*T)*B,e[8]=(o*F-a*P+c*y)*B,e[9]=(n*P-t*F-r*y)*B,e[10]=(g*w-_*x+m*M)*B,e[11]=(u*x-h*w-f*M)*B,e[12]=(a*R-o*I-l*y)*B,e[13]=(t*I-n*R+s*y)*B,e[14]=(_*T-g*S-p*M)*B,e[15]=(h*S-u*T+d*M)*B,this}scale(e){const t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),s=Math.sin(t),r=1-n,o=e.x,a=e.y,l=e.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,o){return this.set(1,n,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){const s=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,h=o+o,u=a+a,d=r*c,f=r*h,g=r*u,_=o*h,p=o*u,m=a*u,M=l*c,T=l*h,x=l*u,S=n.x,w=n.y,E=n.z;return s[0]=(1-(_+m))*S,s[1]=(f+x)*S,s[2]=(g-T)*S,s[3]=0,s[4]=(f-x)*w,s[5]=(1-(d+m))*w,s[6]=(p+M)*w,s[7]=0,s[8]=(g+T)*E,s[9]=(p-M)*E,s[10]=(1-(d+_))*E,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){const s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];const r=this.determinantAffine();if(r===0)return n.set(1,1,1),t.identity(),this;let o=ms.set(s[0],s[1],s[2]).length();const a=ms.set(s[4],s[5],s[6]).length(),l=ms.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Ln.copy(this);const c=1/o,h=1/a,u=1/l;return Ln.elements[0]*=c,Ln.elements[1]*=c,Ln.elements[2]*=c,Ln.elements[4]*=h,Ln.elements[5]*=h,Ln.elements[6]*=h,Ln.elements[8]*=u,Ln.elements[9]*=u,Ln.elements[10]*=u,t.setFromRotationMatrix(Ln),n.x=o,n.y=a,n.z=l,this}makePerspective(e,t,n,s,r,o,a=jn,l=!1){const c=this.elements,h=2*r/(t-e),u=2*r/(n-s),d=(t+e)/(t-e),f=(n+s)/(n-s);let g,_;if(l)g=r/(o-r),_=o*r/(o-r);else if(a===jn)g=-(o+r)/(o-r),_=-2*o*r/(o-r);else if(a===Wr)g=-o/(o-r),_=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,o,a=jn,l=!1){const c=this.elements,h=2/(t-e),u=2/(n-s),d=-(t+e)/(t-e),f=-(n+s)/(n-s);let g,_;if(l)g=1/(o-r),_=o/(o-r);else if(a===jn)g=-2/(o-r),_=-(o+r)/(o-r);else if(a===Wr)g=-1/(o-r),_=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=g,c[14]=_,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};Sa.prototype.isMatrix4=!0;let Xe=Sa;const ms=new A,Ln=new Xe,ug=new A(0,0,0),dg=new A(1,1,1),Ei=new A,ho=new A,dn=new A,_u=new Xe,xu=new hn;class yi{constructor(e=0,t=0,n=0,s=yi.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const s=e.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(Je(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Je(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Je(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Je(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Je(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-Je(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Ne("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return _u.makeRotationFromQuaternion(e),this.setFromRotationMatrix(_u,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return xu.setFromEuler(this),this.setFromQuaternion(xu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}yi.DEFAULT_ORDER="XYZ";class Ef{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let fg=0;const vu=new A,gs=new hn,ci=new Xe,uo=new A,hr=new A,pg=new A,mg=new hn,yu=new A(1,0,0),Mu=new A(0,1,0),Su=new A(0,0,1),bu={type:"added"},gg={type:"removed"},_s={type:"childadded",child:null},Xa={type:"childremoved",child:null};class Tt extends Mi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:fg++}),this.uuid=Rn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Tt.DEFAULT_UP.clone();const e=new A,t=new yi,n=new hn,s=new A(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Xe},normalMatrix:{value:new Ke}}),this.matrix=new Xe,this.matrixWorld=new Xe,this.matrixAutoUpdate=Tt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Tt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ef,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return gs.setFromAxisAngle(e,t),this.quaternion.multiply(gs),this}rotateOnWorldAxis(e,t){return gs.setFromAxisAngle(e,t),this.quaternion.premultiply(gs),this}rotateX(e){return this.rotateOnAxis(yu,e)}rotateY(e){return this.rotateOnAxis(Mu,e)}rotateZ(e){return this.rotateOnAxis(Su,e)}translateOnAxis(e,t){return vu.copy(e).applyQuaternion(this.quaternion),this.position.add(vu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(yu,e)}translateY(e){return this.translateOnAxis(Mu,e)}translateZ(e){return this.translateOnAxis(Su,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ci.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?uo.copy(e):uo.set(e,t,n);const s=this.parent;this.updateWorldMatrix(!0,!1),hr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ci.lookAt(hr,uo,this.up):ci.lookAt(uo,hr,this.up),this.quaternion.setFromRotationMatrix(ci),s&&(ci.extractRotation(s.matrixWorld),gs.setFromRotationMatrix(ci),this.quaternion.premultiply(gs.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(We("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(bu),_s.child=e,this.dispatchEvent(_s),_s.child=null):We("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(gg),Xa.child=e,this.dispatchEvent(Xa),Xa.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ci.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ci.multiply(e.parent.matrixWorld)),e.applyMatrix4(ci),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(bu),_s.child=e,this.dispatchEvent(_s),_s.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(hr,e,pg),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(hr,mg,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(e){e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,n=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*s,r[13]+=n-r[1]*t-r[5]*n-r[9]*s,r[14]+=s-r[2]*t-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){const s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){const r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];r(e.shapes,u)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];s.animations.push(r(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),h=o(e.images),u=o(e.shapes),d=o(e.skeletons),f=o(e.animations),g=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const s=e.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}Tt.DEFAULT_UP=new A(0,1,0);Tt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Tt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class vt extends Tt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const _g={type:"move"};class Ya{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new vt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new vt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new A,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new A),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new vt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new A,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new A,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const _ of e.hand.values()){const p=t.getJointPose(_,n),m=this._getHandJoint(c,_);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,g=.005;c.inputState.pinching&&d>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(_g)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new vt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const Af={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ai={h:0,s:0,l:0},fo={h:0,s:0,l:0};function qa(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class de{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=wt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,et.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=et.workingColorSpace){return this.r=e,this.g=t,this.b=n,et.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=et.workingColorSpace){if(e=dh(e,1),t=Je(t,0,1),n=Je(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=qa(o,r,e+1/3),this.g=qa(o,r,e),this.b=qa(o,r,e-1/3)}return et.colorSpaceToWorking(this,s),this}setStyle(e,t=wt){function n(r){r!==void 0&&parseFloat(r)<1&&Ne("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Ne("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);Ne("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=wt){const n=Af[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Ne("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=xi(e.r),this.g=xi(e.g),this.b=xi(e.b),this}copyLinearToSRGB(e){return this.r=Xs(e.r),this.g=Xs(e.g),this.b=Xs(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=wt){return et.workingToColorSpace(qt.copy(this),e),Math.round(Je(qt.r*255,0,255))*65536+Math.round(Je(qt.g*255,0,255))*256+Math.round(Je(qt.b*255,0,255))}getHexString(e=wt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=et.workingColorSpace){et.workingToColorSpace(qt.copy(this),t);const n=qt.r,s=qt.g,r=qt.b,o=Math.max(n,s,r),a=Math.min(n,s,r);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case n:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-n)/u+2;break;case r:l=(n-s)/u+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=et.workingColorSpace){return et.workingToColorSpace(qt.copy(this),t),e.r=qt.r,e.g=qt.g,e.b=qt.b,e}getStyle(e=wt){et.workingToColorSpace(qt.copy(this),e);const t=qt.r,n=qt.g,s=qt.b;return e!==wt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(Ai),this.setHSL(Ai.h+e,Ai.s+t,Ai.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Ai),e.getHSL(fo);const n=Ir(Ai.h,fo.h,t),s=Ir(Ai.s,fo.s,t),r=Ir(Ai.l,fo.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const qt=new de;de.NAMES=Af;class ph{constructor(e,t=1,n=1e3){this.isFog=!0,this.name="",this.color=new de(e),this.near=t,this.far=n}clone(){return new ph(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class Rf extends Tt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new yi,this.environmentIntensity=1,this.environmentRotation=new yi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}}const In=new A,hi=new A,Ka=new A,ui=new A,xs=new A,vs=new A,Tu=new A,$a=new A,Za=new A,Ja=new A,ja=new ft,Qa=new ft,el=new ft;class Tn{constructor(e=new A,t=new A,n=new A){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),In.subVectors(e,t),s.cross(In);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){In.subVectors(s,t),hi.subVectors(n,t),Ka.subVectors(e,t);const o=In.dot(In),a=In.dot(hi),l=In.dot(Ka),c=hi.dot(hi),h=hi.dot(Ka),u=o*c-a*a;if(u===0)return r.set(0,0,0),null;const d=1/u,f=(c*l-a*h)*d,g=(o*h-a*l)*d;return r.set(1-f-g,g,f)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,ui)===null?!1:ui.x>=0&&ui.y>=0&&ui.x+ui.y<=1}static getInterpolation(e,t,n,s,r,o,a,l){return this.getBarycoord(e,t,n,s,ui)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,ui.x),l.addScaledVector(o,ui.y),l.addScaledVector(a,ui.z),l)}static getInterpolatedAttribute(e,t,n,s,r,o){return ja.setScalar(0),Qa.setScalar(0),el.setScalar(0),ja.fromBufferAttribute(e,t),Qa.fromBufferAttribute(e,n),el.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(ja,r.x),o.addScaledVector(Qa,r.y),o.addScaledVector(el,r.z),o}static isFrontFacing(e,t,n,s){return In.subVectors(n,t),hi.subVectors(e,t),In.cross(hi).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return In.subVectors(this.c,this.b),hi.subVectors(this.a,this.b),In.cross(hi).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Tn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Tn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return Tn.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return Tn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Tn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,s=this.b,r=this.c;let o,a;xs.subVectors(s,n),vs.subVectors(r,n),$a.subVectors(e,n);const l=xs.dot($a),c=vs.dot($a);if(l<=0&&c<=0)return t.copy(n);Za.subVectors(e,s);const h=xs.dot(Za),u=vs.dot(Za);if(h>=0&&u<=h)return t.copy(s);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0)return o=l/(l-h),t.copy(n).addScaledVector(xs,o);Ja.subVectors(e,r);const f=xs.dot(Ja),g=vs.dot(Ja);if(g>=0&&f<=g)return t.copy(r);const _=f*c-l*g;if(_<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(n).addScaledVector(vs,a);const p=h*g-f*u;if(p<=0&&u-h>=0&&f-g>=0)return Tu.subVectors(r,s),a=(u-h)/(u-h+(f-g)),t.copy(s).addScaledVector(Tu,a);const m=1/(p+_+d);return o=_*m,a=d*m,t.copy(n).addScaledVector(xs,o).addScaledVector(vs,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Ct{constructor(e=new A(1/0,1/0,1/0),t=new A(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Dn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Dn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Dn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Dn):Dn.fromBufferAttribute(r,o),Dn.applyMatrix4(e.matrixWorld),this.expandByPoint(Dn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),po.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),po.copy(n.boundingBox)),po.applyMatrix4(e.matrixWorld),this.union(po)}const s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Dn),Dn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(ur),mo.subVectors(this.max,ur),ys.subVectors(e.a,ur),Ms.subVectors(e.b,ur),Ss.subVectors(e.c,ur),Ri.subVectors(Ms,ys),Ci.subVectors(Ss,Ms),Vi.subVectors(ys,Ss);let t=[0,-Ri.z,Ri.y,0,-Ci.z,Ci.y,0,-Vi.z,Vi.y,Ri.z,0,-Ri.x,Ci.z,0,-Ci.x,Vi.z,0,-Vi.x,-Ri.y,Ri.x,0,-Ci.y,Ci.x,0,-Vi.y,Vi.x,0];return!tl(t,ys,Ms,Ss,mo)||(t=[1,0,0,0,1,0,0,0,1],!tl(t,ys,Ms,Ss,mo))?!1:(go.crossVectors(Ri,Ci),t=[go.x,go.y,go.z],tl(t,ys,Ms,Ss,mo))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Dn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Dn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(di[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),di[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),di[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),di[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),di[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),di[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),di[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),di[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(di),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const di=[new A,new A,new A,new A,new A,new A,new A,new A],Dn=new A,po=new Ct,ys=new A,Ms=new A,Ss=new A,Ri=new A,Ci=new A,Vi=new A,ur=new A,mo=new A,go=new A,Gi=new A;function tl(i,e,t,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){Gi.fromArray(i,r);const a=s.x*Math.abs(Gi.x)+s.y*Math.abs(Gi.y)+s.z*Math.abs(Gi.z),l=e.dot(Gi),c=t.dot(Gi),h=n.dot(Gi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const It=new A,_o=new ne;let xg=0;class Dt extends Mi{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:xg++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=bf,this.updateRanges=[],this.gpuType=wn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)_o.fromBufferAttribute(this,t),_o.applyMatrix3(e),this.setXY(t,_o.x,_o.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)It.fromBufferAttribute(this,t),It.applyMatrix3(e),this.setXYZ(t,It.x,It.y,It.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)It.fromBufferAttribute(this,t),It.applyMatrix4(e),this.setXYZ(t,It.x,It.y,It.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)It.fromBufferAttribute(this,t),It.applyNormalMatrix(e),this.setXYZ(t,It.x,It.y,It.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)It.fromBufferAttribute(this,t),It.transformDirection(e),this.setXYZ(t,It.x,It.y,It.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Un(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=pt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Un(t,this.array)),t}setX(e,t){return this.normalized&&(t=pt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Un(t,this.array)),t}setY(e,t){return this.normalized&&(t=pt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Un(t,this.array)),t}setZ(e,t){return this.normalized&&(t=pt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Un(t,this.array)),t}setW(e,t){return this.normalized&&(t=pt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array),s=pt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array),s=pt(s,this.array),r=pt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:"dispose"})}}class Cf extends Dt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Pf extends Dt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class ot extends Dt{constructor(e,t,n){super(new Float32Array(e),t,n)}}const vg=new Ct,dr=new A,nl=new A;class ri{constructor(e=new A,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):vg.setFromPoints(e).getCenter(n);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;dr.subVectors(e,this.center);const t=dr.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(dr,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(nl.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(dr.copy(e.center).add(nl)),this.expandByPoint(dr.copy(e.center).sub(nl))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let yg=0;const Mn=new Xe,il=new Tt,bs=new A,fn=new Ct,fr=new Ct,kt=new A;class yt extends Mi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:yg++}),this.uuid=Rn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Bm(e)?Pf:Cf)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Ke().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Mn.makeRotationFromQuaternion(e),this.applyMatrix4(Mn),this}rotateX(e){return Mn.makeRotationX(e),this.applyMatrix4(Mn),this}rotateY(e){return Mn.makeRotationY(e),this.applyMatrix4(Mn),this}rotateZ(e){return Mn.makeRotationZ(e),this.applyMatrix4(Mn),this}translate(e,t,n){return Mn.makeTranslation(e,t,n),this.applyMatrix4(Mn),this}scale(e,t,n){return Mn.makeScale(e,t,n),this.applyMatrix4(Mn),this}lookAt(e){return il.lookAt(e),il.updateMatrix(),this.applyMatrix4(il.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(bs).negate(),this.translate(bs.x,bs.y,bs.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let s=0,r=e.length;s<r;s++){const o=e[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ot(n,3))}else{const n=Math.min(e.length,t.count);for(let s=0;s<n;s++){const r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Ne("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ct);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){We("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new A(-1/0,-1/0,-1/0),new A(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){const r=t[n];fn.setFromBufferAttribute(r),this.morphTargetsRelative?(kt.addVectors(this.boundingBox.min,fn.min),this.boundingBox.expandByPoint(kt),kt.addVectors(this.boundingBox.max,fn.max),this.boundingBox.expandByPoint(kt)):(this.boundingBox.expandByPoint(fn.min),this.boundingBox.expandByPoint(fn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&We('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ri);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){We("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new A,1/0);return}if(e){const n=this.boundingSphere.center;if(fn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];fr.setFromBufferAttribute(a),this.morphTargetsRelative?(kt.addVectors(fn.min,fr.min),fn.expandByPoint(kt),kt.addVectors(fn.max,fr.max),fn.expandByPoint(kt)):(fn.expandByPoint(fr.min),fn.expandByPoint(fr.max))}fn.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)kt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(kt));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)kt.fromBufferAttribute(a,c),l&&(bs.fromBufferAttribute(e,c),kt.add(bs)),s=Math.max(s,n.distanceToSquared(kt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&We('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){We("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,s=t.normal,r=t.uv;let o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new Dt(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));const a=[],l=[];for(let y=0;y<n.count;y++)a[y]=new A,l[y]=new A;const c=new A,h=new A,u=new A,d=new ne,f=new ne,g=new ne,_=new A,p=new A;function m(y,R,P){c.fromBufferAttribute(n,y),h.fromBufferAttribute(n,R),u.fromBufferAttribute(n,P),d.fromBufferAttribute(r,y),f.fromBufferAttribute(r,R),g.fromBufferAttribute(r,P),h.sub(c),u.sub(c),f.sub(d),g.sub(d);const I=1/(f.x*g.y-g.x*f.y);isFinite(I)&&(_.copy(h).multiplyScalar(g.y).addScaledVector(u,-f.y).multiplyScalar(I),p.copy(u).multiplyScalar(f.x).addScaledVector(h,-g.x).multiplyScalar(I),a[y].add(_),a[R].add(_),a[P].add(_),l[y].add(p),l[R].add(p),l[P].add(p))}let M=this.groups;M.length===0&&(M=[{start:0,count:e.count}]);for(let y=0,R=M.length;y<R;++y){const P=M[y],I=P.start,F=P.count;for(let V=I,U=I+F;V<U;V+=3)m(e.getX(V+0),e.getX(V+1),e.getX(V+2))}const T=new A,x=new A,S=new A,w=new A;function E(y){S.fromBufferAttribute(s,y),w.copy(S);const R=a[y];T.copy(R),T.sub(S.multiplyScalar(S.dot(R))).normalize(),x.crossVectors(w,R);const I=x.dot(l[y])<0?-1:1;o.setXYZW(y,T.x,T.y,T.z,I)}for(let y=0,R=M.length;y<R;++y){const P=M[y],I=P.start,F=P.count;for(let V=I,U=I+F;V<U;V+=3)E(e.getX(V+0)),E(e.getX(V+1)),E(e.getX(V+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new Dt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const s=new A,r=new A,o=new A,a=new A,l=new A,c=new A,h=new A,u=new A;if(e)for(let d=0,f=e.count;d<f;d+=3){const g=e.getX(d+0),_=e.getX(d+1),p=e.getX(d+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,_),o.fromBufferAttribute(t,p),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,p),a.add(h),l.add(h),c.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,f=t.count;d<f;d+=3)s.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)kt.fromBufferAttribute(e,t),kt.normalize(),e.setXYZ(t,kt.x,kt.y,kt.z)}toNonIndexed(){function e(a,l){const c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h);let f=0,g=0;for(let _=0,p=l.length;_<p;_++){a.isInterleavedBufferAttribute?f=l[_]*a.data.stride+a.offset:f=l[_]*h;for(let m=0;m<h;m++)d[g++]=c[f++]}return new Dt(d,h,u)}if(this.index===null)return Ne("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new yt,n=this.index.array,s=this.attributes;for(const a in s){const l=s[a],c=e(l,n);t.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let h=0,u=c.length;h<u;h++){const d=c[h],f=e(d,n);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const f=c[u];h.push(f.toJSON(e.data))}h.length>0&&(s[l]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const s=e.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(t))}const r=e.morphAttributes;for(const c in r){const h=[],u=r[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,h=o.length;c<h;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Lf{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=bf,this.updateRanges=[],this.version=0,this.uuid=Rn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Rn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Rn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer)));const t={uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride};return t.usage=this.usage,t}}const Qt=new A;class Yr{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Qt.fromBufferAttribute(this,t),Qt.applyMatrix4(e),this.setXYZ(t,Qt.x,Qt.y,Qt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Qt.fromBufferAttribute(this,t),Qt.applyNormalMatrix(e),this.setXYZ(t,Qt.x,Qt.y,Qt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Qt.fromBufferAttribute(this,t),Qt.transformDirection(e),this.setXYZ(t,Qt.x,Qt.y,Qt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Un(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=pt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=pt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=pt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=pt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=pt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Un(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Un(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Un(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Un(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array),s=pt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array),s=pt(s,this.array),r=pt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){da("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new Dt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new Yr(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){da("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}const sl=new A,Mg=new A,Sg=new Ke;class Yn{constructor(e=new A(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const s=sl.subVectors(n,t).cross(Mg.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){const s=e.delta(sl),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const o=-(e.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:t.copy(e.start).addScaledVector(s,o)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Sg.getNormalMatrix(e),s=this.coplanarPoint(sl).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}}let bg=0;class un extends Mi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:bg++}),this.uuid=Rn(),this.name="",this.type="Material",this.blending=Pr,this.side=Bi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=df,this.blendDst=ff,this.blendEquation=Ns,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new de(0,0,0),this.blendAlpha=0,this.depthFunc=zr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Lm,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ka,this.stencilZFail=ka,this.stencilZPass=ka,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){Ne(`Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Ne(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(t){const r=s(e.textures),o=s(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new de().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(n=>new Yn().fromJSON(n))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new ne().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ne().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class fa extends un{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new de(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let Ts;const pr=new A,ws=new A,Es=new A,As=new ne,mr=new ne,If=new Xe,xo=new A,gr=new A,vo=new A,wu=new ne,rl=new ne,Eu=new ne;class wc extends Tt{constructor(e=new fa){if(super(),this.isSprite=!0,this.type="Sprite",Ts===void 0){Ts=new yt;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Lf(t,5);Ts.setIndex([0,1,2,0,2,3]),Ts.setAttribute("position",new Yr(n,3,0,!1)),Ts.setAttribute("uv",new Yr(n,2,3,!1))}this.geometry=Ts,this.material=e,this.center=new ne(.5,.5),this.count=1}intersectsFrustum(e){return e.intersectsSprite(this)}raycast(e,t){e.camera===null&&We('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),ws.setFromMatrixScale(this.matrixWorld),If.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Es.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ws.multiplyScalar(-Es.z);const n=this.material.rotation;let s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));const o=this.center;yo(xo.set(-.5,-.5,0),Es,o,ws,s,r),yo(gr.set(.5,-.5,0),Es,o,ws,s,r),yo(vo.set(.5,.5,0),Es,o,ws,s,r),wu.set(0,0),rl.set(1,0),Eu.set(1,1);let a=e.ray.intersectTriangle(xo,gr,vo,!1,pr);if(a===null&&(yo(gr.set(-.5,.5,0),Es,o,ws,s,r),rl.set(0,1),a=e.ray.intersectTriangle(xo,vo,gr,!1,pr),a===null))return;const l=e.ray.origin.distanceTo(pr);l<e.near||l>e.far||t.push({distance:l,point:pr.clone(),uv:Tn.getInterpolation(pr,xo,gr,vo,wu,rl,Eu,new ne),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function yo(i,e,t,n,s,r){As.subVectors(i,t).addScalar(.5).multiply(n),s!==void 0?(mr.x=r*As.x-s*As.y,mr.y=s*As.x+r*As.y):mr.copy(As),i.copy(e),i.x+=mr.x,i.y+=mr.y,i.applyMatrix4(If)}const fi=new A,ol=new A,Mo=new A,So=new A;class to{constructor(e=new A,t=new A(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,fi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=fi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(fi.copy(this.origin).addScaledVector(this.direction,t),fi.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){ol.copy(e).add(t).multiplyScalar(.5),Mo.copy(t).sub(e).normalize(),So.copy(this.origin).sub(ol);const r=e.distanceTo(t)*.5,o=-this.direction.dot(Mo),a=So.dot(this.direction),l=-So.dot(Mo),c=So.lengthSq(),h=Math.abs(1-o*o);let u,d,f,g;if(h>0)if(u=o*l-a,d=o*a-l,g=r*h,u>=0)if(d>=-g)if(d<=g){const _=1/h;u*=_,d*=_,f=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d<=-g?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c):d<=g?(u=0,d=Math.min(Math.max(-r,-l),r),f=d*(d+2*l)+c):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(ol).addScaledVector(Mo,d),f}intersectSphere(e,t){if(e.radius<0)return null;fi.subVectors(e.center,this.origin);const n=fi.dot(this.direction),s=fi.dot(fi)-n*n,r=e.radius*e.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,s=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,s=(e.min.x-d.x)*c),h>=0?(r=(e.min.y-d.y)*h,o=(e.max.y-d.y)*h):(r=(e.max.y-d.y)*h,o=(e.min.y-d.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(e.min.z-d.z)*u,l=(e.max.z-d.z)*u):(a=(e.max.z-d.z)*u,l=(e.min.z-d.z)*u),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,fi)!==null}intersectTriangle(e,t,n,s,r){const o=this.origin,a=this.direction,l=a.x,c=a.y,h=a.z,u=e.x-o.x,d=e.y-o.y,f=e.z-o.z,g=t.x-o.x,_=t.y-o.y,p=t.z-o.z,m=n.x-o.x,M=n.y-o.y,T=n.z-o.z,x=Math.abs(l),S=Math.abs(c),w=Math.abs(h);let E,y,R,P,I,F,V,U,B,K,W,ie;if(x>=S&&x>=w?(R=l,F=u,B=g,ie=m,l>=0?(E=c,y=h,P=d,I=f,V=_,U=p,K=M,W=T):(E=h,y=c,P=f,I=d,V=p,U=_,K=T,W=M)):S>=w?(R=c,F=d,B=_,ie=M,c>=0?(E=h,y=l,P=f,I=u,V=p,U=g,K=T,W=m):(E=l,y=h,P=u,I=f,V=g,U=p,K=m,W=T)):(R=h,F=f,B=p,ie=T,h>=0?(E=l,y=c,P=u,I=d,V=g,U=_,K=m,W=M):(E=c,y=l,P=d,I=u,V=_,U=g,K=M,W=m)),R===0)return null;const q=E/R,Q=y/R,O=1/R,re=P-q*F,ae=I-Q*F,Ie=V-q*B,ze=U-Q*B,qe=K-q*ie,Y=W-Q*ie,J=qe*ze-Y*Ie,me=re*Y-ae*qe,ke=Ie*ae-ze*re;if(s){if(J<0||me<0||ke<0)return null}else if((J<0||me<0||ke<0)&&(J>0||me>0||ke>0))return null;const we=J+me+ke;if(we===0)return null;const He=O*(J*F+me*B+ke*ie);return(we>0?He<0:He>0)?null:this.at(He/we,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class gn extends un{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new de(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new yi,this.combine=$c,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Au=new Xe,Wi=new to,bo=new ri,Ru=new A,To=new A,wo=new A,Eo=new A,al=new A,Ao=new A,Cu=new A,Ro=new A;class Re extends Tt{constructor(e=new yt,t=new gn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(s,e);const a=this.morphTargetInfluences;if(r&&a){Ao.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=a[l],u=r[l];h!==0&&(al.fromBufferAttribute(u,e),o?Ao.addScaledVector(al,h):Ao.addScaledVector(al.sub(t),h))}t.add(Ao)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),bo.copy(n.boundingSphere),bo.applyMatrix4(r),Wi.copy(e.ray).recast(e.near),!(bo.containsPoint(Wi.origin)===!1&&(Wi.intersectSphere(bo,Ru)===null||Wi.origin.distanceToSquared(Ru)>(e.far-e.near)**2))&&(Au.copy(r).invert(),Wi.copy(e.ray).applyMatrix4(Au),!(n.boundingBox!==null&&Wi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Wi)))}_computeIntersections(e,t,n){let s;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,_=d.length;g<_;g++){const p=d[g],m=o[p.materialIndex],M=Math.max(p.start,f.start),T=Math.min(a.count,Math.min(p.start+p.count,f.start+f.count));for(let x=M,S=T;x<S;x+=3){const w=a.getX(x),E=a.getX(x+1),y=a.getX(x+2);s=Co(this,m,e,n,c,h,u,w,E,y),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{const g=Math.max(0,f.start),_=Math.min(a.count,f.start+f.count);for(let p=g,m=_;p<m;p+=3){const M=a.getX(p),T=a.getX(p+1),x=a.getX(p+2);s=Co(this,o,e,n,c,h,u,M,T,x),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,_=d.length;g<_;g++){const p=d[g],m=o[p.materialIndex],M=Math.max(p.start,f.start),T=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let x=M,S=T;x<S;x+=3){const w=x,E=x+1,y=x+2;s=Co(this,m,e,n,c,h,u,w,E,y),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{const g=Math.max(0,f.start),_=Math.min(l.count,f.start+f.count);for(let p=g,m=_;p<m;p+=3){const M=p,T=p+1,x=p+2;s=Co(this,o,e,n,c,h,u,M,T,x),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}}}function Tg(i,e,t,n,s,r,o,a){let l;if(e.side===sn?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,e.side===Bi,a),l===null)return null;Ro.copy(a),Ro.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(Ro);return c<t.near||c>t.far?null:{distance:c,point:Ro.clone(),object:i}}function Co(i,e,t,n,s,r,o,a,l,c){i.getVertexPosition(a,To),i.getVertexPosition(l,wo),i.getVertexPosition(c,Eo);const h=Tg(i,e,t,n,To,wo,Eo,Cu);if(h){const u=new A;Tn.getBarycoord(Cu,To,wo,Eo,u),s&&(h.uv=Tn.getInterpolatedAttribute(s,a,l,c,u,new ne)),r&&(h.uv1=Tn.getInterpolatedAttribute(r,a,l,c,u,new ne)),o&&(h.normal=Tn.getInterpolatedAttribute(o,a,l,c,u,new A),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new A,materialIndex:0};Tn.getNormal(To,wo,Eo,d.normal),h.face=d,h.barycoord=u}return h}const _r=new ft,Pu=new ft,Lu=new ft,wg=new ft,Iu=new Xe,Po=new A,ll=new ri,Du=new Xe,cl=new to;class Eg extends Re{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=cu,this.bindMatrix=new Xe,this.bindMatrixInverse=new Xe,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Ct),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Po),this.boundingBox.expandByPoint(Po)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new ri),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Po),this.boundingSphere.expandByPoint(Po)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const n=this.material,s=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ll.copy(this.boundingSphere),ll.applyMatrix4(s),e.ray.intersectsSphere(ll)!==!1&&(Du.copy(s).invert(),cl.copy(e.ray).applyMatrix4(Du),!(this.boundingBox!==null&&cl.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,cl)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new ft,t=this.geometry.attributes.skinWeight;for(let n=0,s=t.count;n<s;n++){e.fromBufferAttribute(t,n);const r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===cu?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===bm?this.bindMatrixInverse.copy(this.bindMatrix).invert():Ne("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const n=this.skeleton,s=this.geometry;Pu.fromBufferAttribute(s.attributes.skinIndex,e),Lu.fromBufferAttribute(s.attributes.skinWeight,e),t.isVector4?(_r.copy(t),t.set(0,0,0,0)):(_r.set(...t,1),t.set(0,0,0)),_r.applyMatrix4(this.bindMatrix);for(let r=0;r<4;r++){const o=Lu.getComponent(r);if(o!==0){const a=Pu.getComponent(r);Iu.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),t.addScaledVector(wg.copy(_r).applyMatrix4(Iu),o)}}return t.isVector4&&(t.w=_r.w),t.applyMatrix4(this.bindMatrixInverse)}}class Df extends Tt{constructor(){super(),this.isBone=!0,this.type="Bone"}}class mh extends Ot{constructor(e=null,t=1,n=1,s,r,o,a,l,c=Ut,h=Ut,u,d){super(null,o,a,l,c,h,s,r,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Nu=new Xe,Ag=new Xe;class gh{constructor(e=[],t=[]){this.uuid=Rn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){Ne("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,s=this.bones.length;n<s;n++)this.boneInverses.push(new Xe)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const n=new Xe;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){const e=this.bones,t=this.boneInverses,n=this.boneMatrices,s=this.boneTexture;for(let r=0,o=e.length;r<o;r++){const a=e[r]?e[r].matrixWorld:Ag;Nu.multiplyMatrices(a,t[r]),Nu.toArray(n,r*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new gh(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const n=new mh(t,e,e,En,wn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){const s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,s=e.bones.length;n<s;n++){const r=e.bones[n];let o=t[r];o===void 0&&(Ne("Skeleton: No bone found with UUID:",r),o=new Df),this.bones.push(o),this.boneInverses.push(new Xe().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,n=this.boneInverses;for(let s=0,r=t.length;s<r;s++){const o=t[s];e.bones.push(o.uuid);const a=n[s];e.boneInverses.push(a.toArray())}return e}}class pa extends Dt{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const Rs=new Xe,Uu=new Xe,Lo=[],Fu=new Ct,Rg=new Xe,xr=new Re,vr=new ri;class Cg extends Re{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new pa(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,Rg)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Ct),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Rs),Fu.copy(e.boundingBox).applyMatrix4(Rs),this.boundingBox.union(Fu)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new ri),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Rs),vr.copy(e.boundingSphere).applyMatrix4(Rs),this.boundingSphere.union(vr)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,o=e*r+1;for(let a=0;a<n.length;a++)n[a]=s[o+a]}raycast(e,t){const n=this.matrixWorld,s=this.count;if(xr.geometry=this.geometry,xr.material=this.material,xr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),vr.copy(this.boundingSphere),vr.applyMatrix4(n),e.ray.intersectsSphere(vr)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Rs),Uu.multiplyMatrices(n,Rs),xr.matrixWorld=Uu,xr.raycast(e,Lo);for(let o=0,a=Lo.length;o<a;o++){const l=Lo[o];l.instanceId=r,l.object=this,t.push(l)}Lo.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new pa(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){const n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new mh(new Float32Array(s*this.count),s,this.count,rh,wn));const r=this.morphTexture.source.data.data;let o=0;for(let c=0;c<n.length;c++)o+=n[c];const a=this.geometry.morphTargetsRelative?1:1-o,l=s*e;return r[l]=a,r.set(n,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const Xi=new ri,Pg=new ne(.5,.5),Io=new A;class _h{constructor(e=new Yn,t=new Yn,n=new Yn,s=new Yn,r=new Yn,o=new Yn){this.planes=[e,t,n,s,r,o]}set(e,t,n,s,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=jn,n=!1){const s=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],u=r[5],d=r[6],f=r[7],g=r[8],_=r[9],p=r[10],m=r[11],M=r[12],T=r[13],x=r[14],S=r[15];if(s[0].setComponents(c-o,f-h,m-g,S-M).normalize(),s[1].setComponents(c+o,f+h,m+g,S+M).normalize(),s[2].setComponents(c+a,f+u,m+_,S+T).normalize(),s[3].setComponents(c-a,f-u,m-_,S-T).normalize(),n)s[4].setComponents(l,d,p,x).normalize(),s[5].setComponents(c-l,f-d,m-p,S-x).normalize();else if(s[4].setComponents(c-l,f-d,m-p,S-x).normalize(),t===jn)s[5].setComponents(c+l,f+d,m+p,S+x).normalize();else if(t===Wr)s[5].setComponents(l,d,p,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Xi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Xi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Xi)}intersectsSprite(e){Xi.center.set(0,0,0);const t=Pg.distanceTo(e.center);return Xi.radius=.7071067811865476+t,Xi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Xi)}intersectsSphere(e){const t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const s=t[n];if(Io.x=s.normal.x>0?e.max.x:e.min.x,Io.y=s.normal.y>0?e.max.y:e.min.y,Io.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Io)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Dr extends un{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new de(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ma=new A,ga=new A,Ou=new Xe,yr=new to,Do=new ri,hl=new A,Bu=new A;class xh extends Tt{constructor(e=new yt,t=new Dr){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let s=1,r=t.count;s<r;s++)ma.fromBufferAttribute(t,s-1),ga.fromBufferAttribute(t,s),n[s]=n[s-1],n[s]+=ma.distanceTo(ga);e.setAttribute("lineDistance",new ot(n,1))}else Ne("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Do.copy(n.boundingSphere),Do.applyMatrix4(s),Do.radius+=r,e.ray.intersectsSphere(Do)===!1)return;Ou.copy(s).invert(),yr.copy(e.ray).applyMatrix4(Ou);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){const f=Math.max(0,o.start),g=Math.min(h.count,o.start+o.count);for(let _=f,p=g-1;_<p;_+=c){const m=h.getX(_),M=h.getX(_+1),T=No(this,e,yr,l,m,M,_);T&&t.push(T)}if(this.isLineLoop){const _=h.getX(g-1),p=h.getX(f),m=No(this,e,yr,l,_,p,g-1);m&&t.push(m)}}else{const f=Math.max(0,o.start),g=Math.min(d.count,o.start+o.count);for(let _=f,p=g-1;_<p;_+=c){const m=No(this,e,yr,l,_,_+1,_);m&&t.push(m)}if(this.isLineLoop){const _=No(this,e,yr,l,g-1,f,g-1);_&&t.push(_)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function No(i,e,t,n,s,r,o){const a=i.geometry.attributes.position;if(ma.fromBufferAttribute(a,s),ga.fromBufferAttribute(a,r),t.distanceSqToSegment(ma,ga,hl,Bu)>n)return;hl.applyMatrix4(i.matrixWorld);const c=e.ray.origin.distanceTo(hl);if(!(c<e.near||c>e.far))return{distance:c,point:Bu.clone().applyMatrix4(i.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:i}}const zu=new A,ku=new A;class Ec extends xh{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let s=0,r=t.count;s<r;s+=2)zu.fromBufferAttribute(t,s),ku.fromBufferAttribute(t,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+zu.distanceTo(ku);e.setAttribute("lineDistance",new ot(n,1))}else Ne("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Lg extends xh{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class zs extends un{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new de(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Hu=new Xe,Ac=new to,Uo=new ri,Fo=new A;class Nr extends Tt{constructor(e=new yt,t=new zs){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Uo.copy(n.boundingSphere),Uo.applyMatrix4(s),Uo.radius+=r,e.ray.intersectsSphere(Uo)===!1)return;Hu.copy(s).invert(),Ac.copy(e.ray).applyMatrix4(Hu);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,u=n.attributes.position;if(c!==null){const d=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let g=d,_=f;g<_;g++){const p=c.getX(g);Fo.fromBufferAttribute(u,p),Vu(Fo,p,l,s,e,t,this)}}else{const d=Math.max(0,o.start),f=Math.min(u.count,o.start+o.count);for(let g=d,_=f;g<_;g++)Fo.fromBufferAttribute(u,g),Vu(Fo,g,l,s,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Vu(i,e,t,n,s,r,o){const a=Ac.distanceSqToPoint(i);if(a<t){const l=new A;Ac.closestPointToPoint(i,l),l.applyMatrix4(n);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class Nf extends Ot{constructor(e=[],t=es,n,s,r,o,a,l,c,h){super(e,t,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class no extends Ot{constructor(e,t,n,s,r,o,a,l,c){super(e,t,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class qr extends Ot{constructor(e,t,n=ii,s,r,o,a=Ut,l=Ut,c,h=vi,u=1){if(h!==vi&&h!==$i)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:u};super(d,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new fh(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}}class Ig extends qr{constructor(e,t=ii,n=es,s,r,o=Ut,a=Ut,l,c=vi){const h={width:e,height:e,depth:1},u=[h,h,h,h,h,h];super(e,e,t,n,s,r,o,a,l,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Uf extends Ot{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Et extends yt{constructor(e=1,t=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],h=[],u=[];let d=0,f=0;g("z","y","x",-1,-1,n,t,e,o,r,0),g("z","y","x",1,-1,n,t,-e,o,r,1),g("x","z","y",1,1,e,n,t,s,o,2),g("x","z","y",1,-1,e,n,-t,s,o,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ot(c,3)),this.setAttribute("normal",new ot(h,3)),this.setAttribute("uv",new ot(u,2));function g(_,p,m,M,T,x,S,w,E,y,R){const P=x/E,I=S/y,F=x/2,V=S/2,U=w/2,B=E+1,K=y+1;let W=0,ie=0;const q=new A;for(let Q=0;Q<K;Q++){const O=Q*I-V;for(let re=0;re<B;re++){const ae=re*P-F;q[_]=ae*M,q[p]=O*T,q[m]=U,c.push(q.x,q.y,q.z),q[_]=0,q[p]=0,q[m]=w>0?1:-1,h.push(q.x,q.y,q.z),u.push(re/E),u.push(1-Q/y),W+=1}}for(let Q=0;Q<y;Q++)for(let O=0;O<E;O++){const re=d+O+B*Q,ae=d+O+B*(Q+1),Ie=d+(O+1)+B*(Q+1),ze=d+(O+1)+B*Q;l.push(re,ae,ze),l.push(ae,Ie,ze),ie+=6}a.addGroup(f,ie,R),f+=ie,d+=W}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Et(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class Zs extends yt{constructor(e=1,t=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};const c=this;s=Math.floor(s),r=Math.floor(r);const h=[],u=[],d=[],f=[];let g=0;const _=[],p=n/2;let m=0;M(),o===!1&&(e>0&&T(!0),t>0&&T(!1)),this.setIndex(h),this.setAttribute("position",new ot(u,3)),this.setAttribute("normal",new ot(d,3)),this.setAttribute("uv",new ot(f,2));function M(){const x=new A,S=new A;let w=0;const E=(t-e)/n;for(let y=0;y<=r;y++){const R=[],P=y/r,I=P*(t-e)+e;for(let F=0;F<=s;F++){const V=F/s,U=V*l+a,B=Math.sin(U),K=Math.cos(U);S.x=I*B,S.y=-P*n+p,S.z=I*K,u.push(S.x,S.y,S.z),x.set(B,E,K).normalize(),d.push(x.x,x.y,x.z),f.push(V,1-P),R.push(g++)}_.push(R)}for(let y=0;y<s;y++)for(let R=0;R<r;R++){const P=_[R][y],I=_[R+1][y],F=_[R+1][y+1],V=_[R][y+1];(e>0||R!==0)&&(h.push(P,I,V),w+=3),(t>0||R!==r-1)&&(h.push(I,F,V),w+=3)}c.addGroup(m,w,0),m+=w}function T(x){const S=g,w=new ne,E=new A;let y=0;const R=x===!0?e:t,P=x===!0?1:-1;for(let F=1;F<=s;F++)u.push(0,p*P,0),d.push(0,P,0),f.push(.5,.5),g++;const I=g;for(let F=0;F<=s;F++){const U=F/s*l+a,B=Math.cos(U),K=Math.sin(U);E.x=R*K,E.y=p*P,E.z=R*B,u.push(E.x,E.y,E.z),d.push(0,P,0),w.x=B*.5+.5,w.y=K*.5*P+.5,f.push(w.x,w.y),g++}for(let F=0;F<s;F++){const V=S+F,U=I+F;x===!0?h.push(U,U+1,V):h.push(U+1,U,V),y+=3}c.addGroup(m,y,x===!0?1:2),m+=y}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Zs(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class oi{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Ne("Curve: .getPoint() not implemented.")}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,s=this.getPoint(0),r=0;t.push(0);for(let o=1;o<=e;o++)n=this.getPoint(o/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const n=this.getLengths();let s=0;const r=n.length;let o;t?o=t:o=e*n[r-1];let a=0,l=r-1,c;for(;a<=l;)if(s=Math.floor(a+(l-a)/2),c=n[s]-o,c<0)a=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===o)return s/(r-1);const h=n[s],d=n[s+1]-h,f=(o-h)/d;return(s+f)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);const o=this.getPoint(s),a=this.getPoint(r),l=t||(o.isVector2?new ne:new A);return l.copy(a).sub(o).normalize(),l}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){const n=new A,s=[],r=[],o=[],a=new A,l=new Xe;for(let f=0;f<=e;f++){const g=f/e;s[f]=this.getTangentAt(g,new A)}r[0]=new A,o[0]=new A;let c=Number.MAX_VALUE;const h=Math.abs(s[0].x),u=Math.abs(s[0].y),d=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let f=1;f<=e;f++){if(r[f]=r[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(s[f-1],s[f]),a.length()>Number.EPSILON){a.normalize();const g=Math.acos(Je(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(l.makeRotationAxis(a,g))}o[f].crossVectors(s[f],r[f])}if(t===!0){let f=Math.acos(Je(r[0].dot(r[e]),-1,1));f/=e,s[0].dot(a.crossVectors(r[0],r[e]))>0&&(f=-f);for(let g=1;g<=e;g++)r[g].applyMatrix4(l.makeRotationAxis(s[g],f*g)),o[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class vh extends oi{constructor(e=0,t=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(e,t=new ne){const n=t,s=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);const a=this.aStartAngle+e*r;let l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=l-this.aX,f=c-this.aY;l=d*h-f*u+this.aX,c=d*u+f*h+this.aY}return n.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}class Dg extends vh{constructor(e,t,n,s,r,o){super(e,t,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function yh(){let i=0,e=0,t=0,n=0;function s(r,o,a,l){i=r,e=a,t=-3*r+3*o-2*a-l,n=2*r-2*o+a+l}return{initCatmullRom:function(r,o,a,l,c){s(o,a,c*(a-r),c*(l-o))},initNonuniformCatmullRom:function(r,o,a,l,c,h,u){let d=(o-r)/c-(a-r)/(c+h)+(a-o)/h,f=(a-o)/h-(l-o)/(h+u)+(l-a)/u;d*=h,f*=h,s(o,a,d,f)},calc:function(r){const o=r*r,a=o*r;return i+e*r+t*o+n*a}}}const Gu=new A,Wu=new A,ul=new yh,dl=new yh,fl=new yh;class Ng extends oi{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new A){const n=t,s=this.points,r=s.length,o=(r-(this.closed?0:1))*e;let a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:l===0&&a===r-1&&(a=r-2,l=1);let c,h;this.closed||a>0?c=s[(a-1)%r]:(Wu.subVectors(s[0],s[1]).add(s[0]),c=Wu);const u=s[a%r],d=s[(a+1)%r];if(this.closed||a+2<r?h=s[(a+2)%r]:(Gu.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Gu),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let g=Math.pow(c.distanceToSquared(u),f),_=Math.pow(u.distanceToSquared(d),f),p=Math.pow(d.distanceToSquared(h),f);_<1e-4&&(_=1),g<1e-4&&(g=_),p<1e-4&&(p=_),ul.initNonuniformCatmullRom(c.x,u.x,d.x,h.x,g,_,p),dl.initNonuniformCatmullRom(c.y,u.y,d.y,h.y,g,_,p),fl.initNonuniformCatmullRom(c.z,u.z,d.z,h.z,g,_,p)}else this.curveType==="catmullrom"&&(ul.initCatmullRom(c.x,u.x,d.x,h.x,this.tension),dl.initCatmullRom(c.y,u.y,d.y,h.y,this.tension),fl.initCatmullRom(c.z,u.z,d.z,h.z,this.tension));return n.set(ul.calc(l),dl.calc(l),fl.calc(l)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(new A().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function Xu(i,e,t,n,s){const r=(n-e)*.5,o=(s-t)*.5,a=i*i,l=i*a;return(2*t-2*n+r+o)*l+(-3*t+3*n-2*r-o)*a+r*i+t}function Ug(i,e){const t=1-i;return t*t*e}function Fg(i,e){return 2*(1-i)*i*e}function Og(i,e){return i*i*e}function Ur(i,e,t,n){return Ug(i,e)+Fg(i,t)+Og(i,n)}function Bg(i,e){const t=1-i;return t*t*t*e}function zg(i,e){const t=1-i;return 3*t*t*i*e}function kg(i,e){return 3*(1-i)*i*i*e}function Hg(i,e){return i*i*i*e}function Fr(i,e,t,n,s){return Bg(i,e)+zg(i,t)+kg(i,n)+Hg(i,s)}class Ff extends oi{constructor(e=new ne,t=new ne,n=new ne,s=new ne){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new ne){const n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Fr(e,s.x,r.x,o.x,a.x),Fr(e,s.y,r.y,o.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Vg extends oi{constructor(e=new A,t=new A,n=new A,s=new A){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new A){const n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Fr(e,s.x,r.x,o.x,a.x),Fr(e,s.y,r.y,o.y,a.y),Fr(e,s.z,r.z,o.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Of extends oi{constructor(e=new ne,t=new ne){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new ne){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new ne){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Gg extends oi{constructor(e=new A,t=new A){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new A){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new A){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Bf extends oi{constructor(e=new ne,t=new ne,n=new ne){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new ne){const n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(Ur(e,s.x,r.x,o.x),Ur(e,s.y,r.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Wg extends oi{constructor(e=new A,t=new A,n=new A){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new A){const n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(Ur(e,s.x,r.x,o.x),Ur(e,s.y,r.y,o.y),Ur(e,s.z,r.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class zf extends oi{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new ne){const n=t,s=this.points,r=(s.length-1)*e,o=Math.floor(r),a=r-o,l=s[o===0?o:o-1],c=s[o],h=s[o>s.length-2?s.length-1:o+1],u=s[o>s.length-3?s.length-1:o+2];return n.set(Xu(a,l.x,c.x,h.x,u.x),Xu(a,l.y,c.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(s.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(new ne().fromArray(s))}return this}}var Rc=Object.freeze({__proto__:null,ArcCurve:Dg,CatmullRomCurve3:Ng,CubicBezierCurve:Ff,CubicBezierCurve3:Vg,EllipseCurve:vh,LineCurve:Of,LineCurve3:Gg,QuadraticBezierCurve:Bf,QuadraticBezierCurve3:Wg,SplineCurve:zf});class Xg extends oi{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){const e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){const n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Rc[n](t,e))}return this}getPoint(e,t){const n=e*this.getLength(),s=this.getCurveLengths();let r=0;for(;r<s.length;){if(s[r]>=n){const o=s[r]-n,a=this.curves[r],l=a.getLength(),c=l===0?0:1-o/l;return a.getPointAt(c,t)}r++}return null}getLength(){const e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const e=[];let t=0;for(let n=0,s=this.curves.length;n<s;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){const t=[];let n;for(let s=0,r=this.curves;s<r.length;s++){const o=r[s],a=o.isEllipseCurve?e*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?e*o.points.length:e,l=o.getPoints(a);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){const e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){const s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const s=e.curves[t];this.curves.push(new Rc[s.type]().fromJSON(s))}return this}}class Yu extends Xg{constructor(e){super(),this.type="Path",this.currentPoint=new ne,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){const n=new Of(this.currentPoint.clone(),new ne(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,s){const r=new Bf(this.currentPoint.clone(),new ne(e,t),new ne(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(e,t,n,s,r,o){const a=new Ff(this.currentPoint.clone(),new ne(e,t),new ne(n,s),new ne(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(e){const t=[this.currentPoint.clone()].concat(e),n=new zf(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,s,r,o){const a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+a,t+l,n,s,r,o),this}absarc(e,t,n,s,r,o){return this.absellipse(e,t,n,n,s,r,o),this}ellipse(e,t,n,s,r,o,a,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+c,t+h,n,s,r,o,a,l),this}absellipse(e,t,n,s,r,o,a,l){const c=new vh(e,t,n,s,r,o,a,l);if(this.curves.length>0){const u=c.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){const e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}}class tr extends Yu{constructor(e){super(e),this.uuid=Rn(),this.type="Shape",this.holes=[]}getPointsHoles(e){const t=[];for(let n=0,s=this.holes.length;n<s;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){const e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){const s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const s=e.holes[t];this.holes.push(new Yu().fromJSON(s))}return this}}function Yg(i,e,t=2){const n=e&&e.length,s=n?e[0]*t:i.length;let r=kf(i,0,s,t,!0);const o=[];if(!r||r.next===r.prev)return o;let a,l,c;if(n&&(r=Jg(i,e,r,t)),i.length>80*t){a=i[0],l=i[1];let h=a,u=l;for(let d=t;d<s;d+=t){const f=i[d],g=i[d+1];f<a&&(a=f),g<l&&(l=g),f>h&&(h=f),g>u&&(u=g)}c=Math.max(h-a,u-l),c=c!==0?32767/c:0}return Kr(r,o,t,a,l,c,0),o}function kf(i,e,t,n,s){let r;if(s===l0(i,e,t,n)>0)for(let o=e;o<t;o+=n)r=qu(o/n|0,i[o],i[o+1],r);else for(let o=t-n;o>=e;o-=n)r=qu(o/n|0,i[o],i[o+1],r);return r&&Js(r,r.next)&&(Zr(r),r=r.next),r}function is(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(Js(t,t.next)||At(t.prev,t,t.next)===0)){if(Zr(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function Kr(i,e,t,n,s,r,o){if(!i)return;!o&&r&&n0(i,n,s,r);let a=i;for(;i.prev!==i.next;){const l=i.prev,c=i.next;if(r?Kg(i,n,s,r):qg(i)){e.push(l.i,i.i,c.i),Zr(i),i=c.next,a=c.next;continue}if(i=c,i===a){o?o===1?(i=$g(is(i),e),Kr(i,e,t,n,s,r,2)):o===2&&Zg(i,e,t,n,s,r):Kr(is(i),e,t,n,s,r,1);break}}}function qg(i){const e=i.prev,t=i,n=i.next;if(At(e,t,n)>=0)return!1;const s=e.x,r=t.x,o=n.x,a=e.y,l=t.y,c=n.y,h=Math.min(s,r,o),u=Math.min(a,l,c),d=Math.max(s,r,o),f=Math.max(a,l,c);let g=n.next;for(;g!==e;){if(g.x>=h&&g.x<=d&&g.y>=u&&g.y<=f&&Rr(s,a,r,l,o,c,g.x,g.y)&&At(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function Kg(i,e,t,n){const s=i.prev,r=i,o=i.next;if(At(s,r,o)>=0)return!1;const a=s.x,l=r.x,c=o.x,h=s.y,u=r.y,d=o.y,f=Math.min(a,l,c),g=Math.min(h,u,d),_=Math.max(a,l,c),p=Math.max(h,u,d),m=Cc(f,g,e,t,n),M=Cc(_,p,e,t,n);let T=i.prevZ,x=i.nextZ;for(;T&&T.z>=m&&x&&x.z<=M;){if(T.x>=f&&T.x<=_&&T.y>=g&&T.y<=p&&T!==s&&T!==o&&Rr(a,h,l,u,c,d,T.x,T.y)&&At(T.prev,T,T.next)>=0||(T=T.prevZ,x.x>=f&&x.x<=_&&x.y>=g&&x.y<=p&&x!==s&&x!==o&&Rr(a,h,l,u,c,d,x.x,x.y)&&At(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;T&&T.z>=m;){if(T.x>=f&&T.x<=_&&T.y>=g&&T.y<=p&&T!==s&&T!==o&&Rr(a,h,l,u,c,d,T.x,T.y)&&At(T.prev,T,T.next)>=0)return!1;T=T.prevZ}for(;x&&x.z<=M;){if(x.x>=f&&x.x<=_&&x.y>=g&&x.y<=p&&x!==s&&x!==o&&Rr(a,h,l,u,c,d,x.x,x.y)&&At(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function $g(i,e){let t=i;do{const n=t.prev,s=t.next.next;!Js(n,s)&&Vf(n,t,t.next,s)&&$r(n,s)&&$r(s,n)&&(e.push(n.i,t.i,s.i),Zr(t),Zr(t.next),t=i=s),t=t.next}while(t!==i);return is(t)}function Zg(i,e,t,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&r0(o,a)){let l=Gf(o,a);o=is(o,o.next),l=is(l,l.next),Kr(o,e,t,n,s,r,0),Kr(l,e,t,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}function Jg(i,e,t,n){const s=[];for(let r=0,o=e.length;r<o;r++){const a=e[r]*n,l=r<o-1?e[r+1]*n:i.length,c=kf(i,a,l,n,!1);c===c.next&&(c.steiner=!0),s.push(s0(c))}s.sort(jg);for(let r=0;r<s.length;r++)t=Qg(s[r],t);return t}function jg(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){const n=(i.next.y-i.y)/(i.next.x-i.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=n-s}return t}function Qg(i,e){const t=e0(i,e);if(!t)return e;const n=Gf(t,i);return is(n,n.next),is(t,t.next)}function e0(i,e){let t=e;const n=i.x,s=i.y;let r=-1/0,o;if(Js(i,t))return t;do{if(Js(i,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){const u=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(u<=n&&u>r&&(r=u,o=t.x<t.next.x?t:t.next,u===n))return o}t=t.next}while(t!==e);if(!o)return null;const a=o,l=o.x,c=o.y;let h=1/0;t=o;do{if(n>=t.x&&t.x>=l&&n!==t.x&&Hf(s<c?n:r,s,l,c,s<c?r:n,s,t.x,t.y)){const u=Math.abs(s-t.y)/(n-t.x);$r(t,i)&&(u<h||u===h&&(t.x>o.x||t.x===o.x&&t0(o,t)))&&(o=t,h=u)}t=t.next}while(t!==a);return o}function t0(i,e){return At(i.prev,i,e.prev)<0&&At(e.next,i,i.next)<0}function n0(i,e,t,n){let s=i;do s.z===0&&(s.z=Cc(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,i0(s)}function i0(i){let e,t=1;do{let n=i,s;i=null;let r=null;for(e=0;n;){e++;let o=n,a=0;for(let c=0;c<t&&(a++,o=o.nextZ,!!o);c++);let l=t;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,t*=2}while(e>1);return i}function Cc(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function s0(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function Hf(i,e,t,n,s,r,o,a){return(s-o)*(e-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(t-o)*(e-a)&&(t-o)*(r-a)>=(s-o)*(n-a)}function Rr(i,e,t,n,s,r,o,a){return!(i===o&&e===a)&&Hf(i,e,t,n,s,r,o,a)}function r0(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!o0(i,e)&&($r(i,e)&&$r(e,i)&&a0(i,e)&&(At(i.prev,i,e.prev)||At(i,e.prev,e))||Js(i,e)&&At(i.prev,i,i.next)>0&&At(e.prev,e,e.next)>0)}function At(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function Js(i,e){return i.x===e.x&&i.y===e.y}function Vf(i,e,t,n){const s=Bo(At(i,e,t)),r=Bo(At(i,e,n)),o=Bo(At(t,n,i)),a=Bo(At(t,n,e));return!!(s!==r&&o!==a||s===0&&Oo(i,t,e)||r===0&&Oo(i,n,e)||o===0&&Oo(t,i,n)||a===0&&Oo(t,e,n))}function Oo(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function Bo(i){return i>0?1:i<0?-1:0}function o0(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&Vf(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function $r(i,e){return At(i.prev,i,i.next)<0?At(i,e,i.next)>=0&&At(i,i.prev,e)>=0:At(i,e,i.prev)<0||At(i,i.next,e)<0}function a0(i,e){let t=i,n=!1;const s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Gf(i,e){const t=Pc(i.i,i.x,i.y),n=Pc(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function qu(i,e,t,n){const s=Pc(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Zr(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function Pc(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function l0(i,e,t,n){let s=0;for(let r=e,o=t-n;r<t;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}class c0{static triangulate(e,t,n=2){return Yg(e,t,n)}}class ks{static area(e){const t=e.length;let n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return ks.area(e)<0}static triangulateShape(e,t){const n=[],s=[],r=[];Ku(e),$u(n,e);let o=e.length;t.forEach(Ku);for(let l=0;l<t.length;l++)s.push(o),o+=t[l].length,$u(n,t[l]);const a=c0.triangulate(n,s);for(let l=0;l<a.length;l+=3)r.push(a.slice(l,l+3));return r}}function Ku(i){const e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function $u(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}class Jr extends yt{constructor(e=new tr([new ne(.5,.5),new ne(-.5,.5),new ne(-.5,-.5),new ne(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];const n=this,s=[],r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];o(c)}this.setAttribute("position",new ot(s,3)),this.setAttribute("uv",new ot(r,2)),this.computeVertexNormals();function o(a){const l=[],c=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1,u=t.depth!==void 0?t.depth:1;let d=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:.2,g=t.bevelSize!==void 0?t.bevelSize:f-.1,_=t.bevelOffset!==void 0?t.bevelOffset:0,p=t.bevelSegments!==void 0?t.bevelSegments:3;const m=t.extrudePath,M=t.UVGenerator!==void 0?t.UVGenerator:h0;let T,x=!1,S,w,E,y;if(m){T=m.getSpacedPoints(h),x=!0,d=!1;const te=m.isCatmullRomCurve3?m.closed:!1;S=m.computeFrenetFrames(h,te),w=new A,E=new A,y=new A}d||(p=0,f=0,g=0,_=0);const R=a.extractPoints(c);let P=R.shape;const I=R.holes;if(!ks.isClockWise(P)){P=P.reverse();for(let te=0,oe=I.length;te<oe;te++){const le=I[te];ks.isClockWise(le)&&(I[te]=le.reverse())}}function V(te){const le=10000000000000001e-36;let ce=te[0];for(let pe=1;pe<=te.length;pe++){const Ve=pe%te.length,Be=te[Ve],Ye=Be.x-ce.x,$e=Be.y-ce.y,L=Ye*Ye+$e*$e,ct=Math.max(Math.abs(Be.x),Math.abs(Be.y),Math.abs(ce.x),Math.abs(ce.y)),nt=le*ct*ct;if(L<=nt){te.splice(Ve,1),pe--;continue}ce=Be}}V(P),I.forEach(V);const U=I.length,B=P;for(let te=0;te<U;te++){const oe=I[te];P=P.concat(oe)}function K(te,oe,le){return oe||We("ExtrudeGeometry: vec does not exist"),te.clone().addScaledVector(oe,le)}const W=P.length;function ie(te,oe,le){let ce,pe,Ve;const Be=te.x-oe.x,Ye=te.y-oe.y,$e=le.x-te.x,L=le.y-te.y,ct=Be*Be+Ye*Ye,nt=Be*L-Ye*$e;if(Math.abs(nt)>Number.EPSILON){const C=Math.sqrt(ct),v=Math.sqrt($e*$e+L*L),z=oe.x-Ye/C,G=oe.y+Be/C,$=le.x-L/v,ue=le.y+$e/v,fe=(($-z)*L-(ue-G)*$e)/(Be*L-Ye*$e);ce=z+Be*fe-te.x,pe=G+Ye*fe-te.y;const Z=ce*ce+pe*pe;if(Z<=2)return new ne(ce,pe);Ve=Math.sqrt(Z/2)}else{let C=!1;Be>Number.EPSILON?$e>Number.EPSILON&&(C=!0):Be<-Number.EPSILON?$e<-Number.EPSILON&&(C=!0):Math.sign(Ye)===Math.sign(L)&&(C=!0),C?(ce=-Ye,pe=Be,Ve=Math.sqrt(ct)):(ce=Be,pe=Ye,Ve=Math.sqrt(ct/2))}return new ne(ce/Ve,pe/Ve)}const q=[];for(let te=0,oe=B.length,le=oe-1,ce=te+1;te<oe;te++,le++,ce++)le===oe&&(le=0),ce===oe&&(ce=0),q[te]=ie(B[te],B[le],B[ce]);const Q=[];let O,re=q.concat();for(let te=0,oe=U;te<oe;te++){const le=I[te];O=[];for(let ce=0,pe=le.length,Ve=pe-1,Be=ce+1;ce<pe;ce++,Ve++,Be++)Ve===pe&&(Ve=0),Be===pe&&(Be=0),O[ce]=ie(le[ce],le[Ve],le[Be]);Q.push(O),re=re.concat(O)}let ae;if(p===0)ae=ks.triangulateShape(B,I);else{const te=[],oe=[];for(let le=0;le<p;le++){const ce=le/p,pe=f*Math.cos(ce*Math.PI/2),Ve=g*Math.sin(ce*Math.PI/2)+_;for(let Be=0,Ye=B.length;Be<Ye;Be++){const $e=K(B[Be],q[Be],Ve);me($e.x,$e.y,-pe),ce===0&&te.push($e)}for(let Be=0,Ye=U;Be<Ye;Be++){const $e=I[Be];O=Q[Be];const L=[];for(let ct=0,nt=$e.length;ct<nt;ct++){const C=K($e[ct],O[ct],Ve);me(C.x,C.y,-pe),ce===0&&L.push(C)}ce===0&&oe.push(L)}}ae=ks.triangulateShape(te,oe)}const Ie=ae.length,ze=g+_;for(let te=0;te<W;te++){const oe=d?K(P[te],re[te],ze):P[te];x?(E.copy(S.normals[0]).multiplyScalar(oe.x),w.copy(S.binormals[0]).multiplyScalar(oe.y),y.copy(T[0]).add(E).add(w),me(y.x,y.y,y.z)):me(oe.x,oe.y,0)}for(let te=1;te<=h;te++)for(let oe=0;oe<W;oe++){const le=d?K(P[oe],re[oe],ze):P[oe];x?(E.copy(S.normals[te]).multiplyScalar(le.x),w.copy(S.binormals[te]).multiplyScalar(le.y),y.copy(T[te]).add(E).add(w),me(y.x,y.y,y.z)):me(le.x,le.y,u/h*te)}for(let te=p-1;te>=0;te--){const oe=te/p,le=f*Math.cos(oe*Math.PI/2),ce=g*Math.sin(oe*Math.PI/2)+_;for(let pe=0,Ve=B.length;pe<Ve;pe++){const Be=K(B[pe],q[pe],ce);me(Be.x,Be.y,u+le)}for(let pe=0,Ve=I.length;pe<Ve;pe++){const Be=I[pe];O=Q[pe];for(let Ye=0,$e=Be.length;Ye<$e;Ye++){const L=K(Be[Ye],O[Ye],ce);x?me(L.x,L.y+T[h-1].y,T[h-1].x+le):me(L.x,L.y,u+le)}}}qe(),Y();function qe(){const te=s.length/3;if(d){let oe=0,le=W*oe;for(let ce=0;ce<Ie;ce++){const pe=ae[ce];ke(pe[2]+le,pe[1]+le,pe[0]+le)}oe=h+p*2,le=W*oe;for(let ce=0;ce<Ie;ce++){const pe=ae[ce];ke(pe[0]+le,pe[1]+le,pe[2]+le)}}else{for(let oe=0;oe<Ie;oe++){const le=ae[oe];ke(le[2],le[1],le[0])}for(let oe=0;oe<Ie;oe++){const le=ae[oe];ke(le[0]+W*h,le[1]+W*h,le[2]+W*h)}}n.addGroup(te,s.length/3-te,0)}function Y(){const te=s.length/3;let oe=0;J(B,oe),oe+=B.length;for(let le=0,ce=I.length;le<ce;le++){const pe=I[le];J(pe,oe),oe+=pe.length}n.addGroup(te,s.length/3-te,1)}function J(te,oe){let le=te.length;for(;--le>=0;){const ce=le;let pe=le-1;pe<0&&(pe=te.length-1);for(let Ve=0,Be=h+p*2;Ve<Be;Ve++){const Ye=W*Ve,$e=W*(Ve+1),L=oe+ce+Ye,ct=oe+pe+Ye,nt=oe+pe+$e,C=oe+ce+$e;we(L,ct,nt,C)}}}function me(te,oe,le){l.push(te),l.push(oe),l.push(le)}function ke(te,oe,le){He(te),He(oe),He(le);const ce=s.length/3,pe=M.generateTopUV(n,s,ce-3,ce-2,ce-1);at(pe[0]),at(pe[1]),at(pe[2])}function we(te,oe,le,ce){He(te),He(oe),He(ce),He(oe),He(le),He(ce);const pe=s.length/3,Ve=M.generateSideWallUV(n,s,pe-6,pe-3,pe-2,pe-1);at(Ve[0]),at(Ve[1]),at(Ve[3]),at(Ve[1]),at(Ve[2]),at(Ve[3])}function He(te){s.push(l[te*3+0]),s.push(l[te*3+1]),s.push(l[te*3+2])}function at(te){r.push(te.x),r.push(te.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return u0(t,n,e)}static fromJSON(e,t){const n=[];for(let r=0,o=e.shapes.length;r<o;r++){const a=t[e.shapes[r]];n.push(a)}const s=e.options.extrudePath;return s!==void 0&&(e.options.extrudePath=new Rc[s.type]().fromJSON(s)),new Jr(n,e.options)}}const h0={generateTopUV:function(i,e,t,n,s){const r=e[t*3],o=e[t*3+1],a=e[n*3],l=e[n*3+1],c=e[s*3],h=e[s*3+1];return[new ne(r,o),new ne(a,l),new ne(c,h)]},generateSideWallUV:function(i,e,t,n,s,r){const o=e[t*3],a=e[t*3+1],l=e[t*3+2],c=e[n*3],h=e[n*3+1],u=e[n*3+2],d=e[s*3],f=e[s*3+1],g=e[s*3+2],_=e[r*3],p=e[r*3+1],m=e[r*3+2];return Math.abs(a-h)<Math.abs(o-c)?[new ne(o,1-l),new ne(c,1-u),new ne(d,1-g),new ne(_,1-m)]:[new ne(a,1-l),new ne(h,1-u),new ne(f,1-g),new ne(p,1-m)]}};function u0(i,e,t){if(t.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){const r=i[n];t.shapes.push(r.uuid)}else t.shapes.push(i.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}class Si extends yt{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};const r=e/2,o=t/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,u=e/a,d=t/l,f=[],g=[],_=[],p=[];for(let m=0;m<h;m++){const M=m*d-o;for(let T=0;T<c;T++){const x=T*u-r;g.push(x,-M,0),_.push(0,0,1),p.push(T/a),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let M=0;M<a;M++){const T=M+c*m,x=M+c*(m+1),S=M+1+c*(m+1),w=M+1+c*m;f.push(T,x,w),f.push(x,S,w)}this.setIndex(f),this.setAttribute("position",new ot(g,3)),this.setAttribute("normal",new ot(_,3)),this.setAttribute("uv",new ot(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Si(e.width,e.height,e.widthSegments,e.heightSegments)}}class Mh extends yt{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const h=[],u=new A,d=new A,f=[],g=[],_=[],p=[];for(let m=0;m<=n;m++){const M=[],T=m/n,x=o+T*a,S=e*Math.cos(x),w=Math.sqrt(e*e-S*S);let E=0;m===0&&o===0?E=.5/t:m===n&&l===Math.PI&&(E=-.5/t);for(let y=0;y<=t;y++){const R=y/t,P=s+R*r;u.x=-w*Math.cos(P),u.y=S,u.z=w*Math.sin(P),g.push(u.x,u.y,u.z),d.copy(u).normalize(),_.push(d.x,d.y,d.z),p.push(R+E,1-T),M.push(c++)}h.push(M)}for(let m=0;m<n;m++)for(let M=0;M<t;M++){const T=h[m][M+1],x=h[m][M],S=h[m+1][M],w=h[m+1][M+1];(m!==0||o>0)&&f.push(T,x,w),(m!==n-1||l<Math.PI)&&f.push(x,S,w)}this.setIndex(f),this.setAttribute("position",new ot(g,3)),this.setAttribute("normal",new ot(_,3)),this.setAttribute("uv",new ot(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Mh(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}function js(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const s=i[t][n];if(Zu(s))s.isRenderTargetTexture?(Ne("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone();else if(Array.isArray(s))if(Zu(s[0])){const r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();e[t][n]=r}else e[t][n]=s.slice();else e[t][n]=s}}return e}function tn(i){const e={};for(let t=0;t<i.length;t++){const n=js(i[t]);for(const s in n)e[s]=n[s]}return e}function Zu(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function d0(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Wf(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:et.workingColorSpace}const Qs={clone:js,merge:tn};var f0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,p0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Ht extends un{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=f0,this.fragmentShader=p0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=js(e.uniforms),this.uniformsGroups=d0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const n in e.uniforms){const s=e.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=t[s.value]||null;break;case"c":this.uniforms[n].value=new de().setHex(s.value);break;case"v2":this.uniforms[n].value=new ne().fromArray(s.value);break;case"v3":this.uniforms[n].value=new A().fromArray(s.value);break;case"v4":this.uniforms[n].value=new ft().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Ke().fromArray(s.value);break;case"m4":this.uniforms[n].value=new Xe().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class Xf extends Ht{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class _t extends un{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new de(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new de(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ha,this.normalScale=new ne(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new yi,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class $t extends _t{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ne(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Je(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new de(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new de(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new de(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(e){this._retroreflectivity>0!=e>0&&this.version++,this._retroreflectivity=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.retroreflectivity=e.retroreflectivity,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class m0 extends un{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new de(16777215),this.specular=new de(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new de(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ha,this.normalScale=new ne(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new yi,this.combine=$c,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class g0 extends un{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Cm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class _0 extends un{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}function Ui(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function ia(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}function x0(i){function e(s,r){return i[s]-i[r]}const t=i.length,n=new Array(t);for(let s=0;s!==t;++s)n[s]=s;return n.sort(e),n}function Ju(i,e,t){const n=i.length,s=new i.constructor(n);for(let r=0,o=0;o!==n;++r){const a=t[r]*e;for(let l=0;l!==e;++l)s[o++]=i[a+l]}return s}function v0(i,e,t,n){let s=1,r=i[0];for(;r!==void 0&&r[n]===void 0;)r=i[s++];if(r===void 0)return;let o=r[n];if(o!==void 0)if(Array.isArray(o))do o=r[n],o!==void 0&&(e.push(r.time),t.push(...o)),r=i[s++];while(r!==void 0);else if(o.toArray!==void 0)do o=r[n],o!==void 0&&(e.push(r.time),o.toArray(t,t.length)),r=i[s++];while(r!==void 0);else do o=r[n],o!==void 0&&(e.push(r.time),t.push(o)),r=i[s++];while(r!==void 0)}class nr{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,s=t[n],r=t[n-1];e:{t:{let o;n:{i:if(!(e<s)){for(let a=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=t[++n],e<s)break t}o=t.length;break n}if(!(e>=r)){const a=t[1];e<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=t[--n-1],e>=r)break t}o=n,n=0;break n}break e}for(;n<o;){const a=n+o>>>1;e<t[a]?o=a:n=a+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let o=0;o!==s;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class y0 extends nr{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Os,endingEnd:Os}}intervalChanged_(e,t,n){const s=this.parameterPositions;let r=e-2,o=e+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case Bs:r=e,a=2*t-n;break;case ca:r=s.length-2,a=t+s[r]-s[r+1];break;default:r=e,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case Bs:o=e,l=2*n-t;break;case ca:o=1,l=n+s[1]-s[0];break;default:o=e-1,l=t}const c=(n-t)*.5,h=this.valueSize;this._weightPrev=c/(t-a),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(e,t,n,s){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,g=(n-t)/(s-t),_=g*g,p=_*g,m=-d*p+2*d*_-d*g,M=(1+d)*p+(-1.5-2*d)*_+(-.5+d)*g+1,T=(-1-f)*p+(1.5+f)*_+.5*g,x=f*p-f*_;for(let S=0;S!==a;++S)r[S]=m*o[h+S]+M*o[c+S]+T*o[l+S]+x*o[u+S];return r}}class Yf extends nr{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=(n-t)/(s-t),u=1-h;for(let d=0;d!==a;++d)r[d]=o[c+d]*u+o[l+d]*h;return r}}class M0 extends nr{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}}class S0 extends nr{interpolate_(e,t,n,s){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=this.inTangents,u=this.outTangents;if(!h||!u){const g=(n-t)/(s-t),_=1-g;for(let p=0;p!==a;++p)r[p]=o[c+p]*_+o[l+p]*g;return r}const d=a*2,f=e-1;for(let g=0;g!==a;++g){const _=o[c+g],p=o[l+g],m=f*d+g*2,M=u[m],T=u[m+1],x=e*d+g*2,S=h[x],w=h[x+1],E=T0(n,t,M,S,s);r[g]=qf(E,_,T,w,p)}return r}}function qf(i,e,t,n,s){const r=1-i;return r*r*r*e+3*r*r*i*t+3*r*i*i*n+i*i*i*s}function b0(i,e,t,n,s){const r=1-i;return 3*r*r*(t-e)+6*r*i*(n-t)+3*i*i*(s-n)}function T0(i,e,t,n,s){let r=(i-e)/(s-e);for(let o=0;o<8;o++){const a=qf(r,e,t,n,s)-i;if(Math.abs(a)<1e-10)break;const l=b0(r,e,t,n,s);if(Math.abs(l)<1e-10)break;r=Math.max(0,Math.min(1,r-a/l))}return r}class Bn{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Ui(t,this.TimeBufferType),this.values=Ui(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Ui(e.times,Array),values:Ui(e.values,Array)};const s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s),ia(e.settings)&&(n.settings={inTangents:Ui(e.settings.inTangents,Array),outTangents:Ui(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new M0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Yf(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new y0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){const t=new S0(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case Vr:t=this.InterpolantFactoryMethodDiscrete;break;case Gr:t=this.InterpolantFactoryMethodLinear;break;case za:t=this.InterpolantFactoryMethodSmooth;break;case hu:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Ne("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Vr;case this.InterpolantFactoryMethodLinear:return Gr;case this.InterpolantFactoryMethodSmooth:return za;case this.InterpolantFactoryMethodBezier:return hu}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e;ia(this.settings)&&(ju(this.settings.inTangents,e),ju(this.settings.outTangents,e))}return this}trim(e,t){const n=this.times,s=n.length;let r=0,o=s-1;for(;r!==s&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);const a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(We("KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,s=this.values,r=n.length;r===0&&(We("KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){const l=n[a];if(typeof l=="number"&&isNaN(l)){We("KeyframeTrack: Time is not a valid number.",this,a,l),e=!1;break}if(o!==null&&o>l){We("KeyframeTrack: Out of order keys.",this,a,l,o),e=!1;break}o=l}if(s!==void 0&&zm(s))for(let a=0,l=s.length;a!==l;++a){const c=s[a];if(isNaN(c)){We("KeyframeTrack: Value is not a valid number.",this,a,c),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===za,r=e.length-1;let o=1;for(let a=1;a<r;++a){let l=!1;const c=e[a],h=e[a+1];if(c!==h&&(a!==1||c!==e[0]))if(s)l=!0;else{const u=a*n,d=u-n,f=u+n;for(let g=0;g!==n;++g){const _=t[u+g];if(_!==t[d+g]||_!==t[f+g]){l=!0;break}}}if(l){if(a!==o){e[o]=e[a];const u=a*n,d=o*n;for(let f=0;f!==n;++f)t[d+f]=t[u+f]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)t[l+c]=t[a+c];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,ia(this.settings)&&(s.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),s}}function ju(i,e){for(let t=0,n=i.length;t!==n;t+=2)i[t]*=e}Bn.prototype.ValueTypeName="";Bn.prototype.TimeBufferType=Float32Array;Bn.prototype.ValueBufferType=Float32Array;Bn.prototype.DefaultInterpolation=Gr;class ir extends Bn{constructor(e,t,n){super(e,t,n)}}ir.prototype.ValueTypeName="bool";ir.prototype.ValueBufferType=Array;ir.prototype.DefaultInterpolation=Vr;ir.prototype.InterpolantFactoryMethodLinear=void 0;ir.prototype.InterpolantFactoryMethodSmooth=void 0;class Kf extends Bn{constructor(e,t,n,s){super(e,t,n,s)}}Kf.prototype.ValueTypeName="color";class jr extends Bn{constructor(e,t,n,s){super(e,t,n,s)}}jr.prototype.ValueTypeName="number";class w0 extends nr{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-t)/(s-t);let c=e*a;for(let h=c+a;c!==h;c+=4)hn.slerpFlat(r,0,o,c-a,o,c,l);return r}}class Qr extends Bn{constructor(e,t,n,s){super(e,t,n,s)}InterpolantFactoryMethodLinear(e){return new w0(this.times,this.values,this.getValueSize(),e)}}Qr.prototype.ValueTypeName="quaternion";Qr.prototype.InterpolantFactoryMethodSmooth=void 0;class sr extends Bn{constructor(e,t,n){super(e,t,n)}}sr.prototype.ValueTypeName="string";sr.prototype.ValueBufferType=Array;sr.prototype.DefaultInterpolation=Vr;sr.prototype.InterpolantFactoryMethodLinear=void 0;sr.prototype.InterpolantFactoryMethodSmooth=void 0;class _a extends Bn{constructor(e,t,n,s){super(e,t,n,s)}}_a.prototype.ValueTypeName="vector";class Lc{constructor(e="",t=-1,n=[],s=ch){this.name=e,this.tracks=n,this.duration=t,this.blendMode=s,this.uuid=Rn(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],n=e.tracks,s=1/(e.fps||1);for(let o=0,a=n.length;o!==a;++o)t.push(A0(n[o]).scale(s));const r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r.userData=JSON.parse(e.userData||"{}"),r}static toJSON(e){const t=[],n=e.tracks,s={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let r=0,o=n.length;r!==o;++r)t.push(Bn.toJSON(n[r]));return s}static CreateFromMorphTargetSequence(e,t,n,s){const r=t.length,o=[];for(let a=0;a<r;a++){let l=[],c=[];l.push((a+r-1)%r,a,(a+1)%r),c.push(0,1,0);const h=x0(l);l=Ju(l,1,h),c=Ju(c,1,h),!s&&l[0]===0&&(l.push(r),c.push(c[0])),o.push(new jr(".morphTargetInfluences["+t[a].name+"]",l,c).scale(1/n))}return new this(e,-1,o)}static findByName(e,t){let n=e;if(!Array.isArray(e)){const s=e;n=s.geometry&&s.geometry.animations||s.animations}for(let s=0;s<n.length;s++)if(n[s].name===t)return n[s];return null}static CreateClipsFromMorphTargetSequences(e,t,n){const s={},r=/^([\w-]*?)([\d]+)$/;for(let a=0,l=e.length;a<l;a++){const c=e[a],h=c.name.match(r);if(h&&h.length>1){const u=h[1];let d=s[u];d||(s[u]=d=[]),d.push(c)}}const o=[];for(const a in s)o.push(this.CreateFromMorphTargetSequence(a,s[a],t,n));return o}resetDuration(){const e=this.tracks;let t=0;for(let n=0,s=e.length;n!==s;++n){const r=this.tracks[n];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function E0(i){switch(i.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return jr;case"vector":case"vector2":case"vector3":case"vector4":return _a;case"color":return Kf;case"quaternion":return Qr;case"bool":case"boolean":return ir;case"string":return sr}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+i)}function A0(i){if(i.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=E0(i.type);if(i.times===void 0){const n=[],s=[];v0(i.keys,n,s,"value"),i.times=n,i.values=s}let t;return e.parse!==void 0?t=e.parse(i):t=new e(i.name,i.times,i.values,i.interpolation),ia(i.settings)&&(t.settings={inTangents:Ui(i.settings.inTangents,Float32Array),outTangents:Ui(i.settings.outTangents,Float32Array)}),t}const _i={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(Qu(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!Qu(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function Qu(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class R0{constructor(e,t,n){const s=this;let r=!1,o=0,a=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,u){return c.push(h,u),this},this.removeHandler=function(h){const u=c.indexOf(h);return u!==-1&&c.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=c.length;u<d;u+=2){const f=c[u],g=c[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const C0=new R0;class ls{constructor(e){this.manager=e!==void 0?e:C0,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}ls.DEFAULT_MATERIAL_NAME="__DEFAULT";const pi={};class P0 extends Error{constructor(e,t){super(e),this.response=t}}class Sh extends ls{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=_i.get(`file:${e}`);if(r!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0);return}if(pi[e]!==void 0){pi[e].push({onLoad:t,onProgress:n,onError:s});return}pi[e]=[],pi[e].push({onLoad:t,onProgress:n,onError:s});const o=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,l=this.responseType;fetch(o).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&Ne("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;const h=pi[e],u=c.body.getReader(),d=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),f=d?parseInt(d):0,g=f!==0;let _=0;const p=new ReadableStream({start(m){M();function M(){u.read().then(({done:T,value:x})=>{if(T)m.close();else{_+=x.byteLength;const S=new ProgressEvent("progress",{lengthComputable:g,loaded:_,total:f});for(let w=0,E=h.length;w<E;w++){const y=h[w];y.onProgress&&y.onProgress(S)}m.enqueue(x),M()}},T=>{m.error(T)})}}});return new Response(p)}else throw new P0(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,a));case"json":return c.json();default:if(a==="")return c.text();{const u=/charset="?([^;"\s]*)"?/i.exec(a),d=u&&u[1]?u[1].toLowerCase():void 0,f=new TextDecoder(d);return c.arrayBuffer().then(g=>f.decode(g))}}}).then(c=>{_i.add(`file:${e}`,c);const h=pi[e];delete pi[e];for(let u=0,d=h.length;u<d;u++){const f=h[u];f.onLoad&&f.onLoad(c)}}).catch(c=>{const h=pi[e];if(h===void 0)throw this.manager.itemError(e),c;delete pi[e];for(let u=0,d=h.length;u<d;u++){const f=h[u];f.onError&&f.onError(c)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const Cs=new WeakMap;class L0 extends ls{constructor(e){super(e)}load(e,t,n,s){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,o=_i.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0);else{let u=Cs.get(o);u===void 0&&(u=[],Cs.set(o,u)),u.push({onLoad:t,onError:s})}return o}const a=Xr("img");function l(){h(),t&&t(this);const u=Cs.get(this)||[];for(let d=0;d<u.length;d++){const f=u[d];f.onLoad&&f.onLoad(this)}Cs.delete(this),r.manager.itemEnd(e)}function c(u){h(),s&&s(u),_i.remove(`image:${e}`);const d=Cs.get(this)||[];for(let f=0;f<d.length;f++){const g=d[f];g.onError&&g.onError(u)}Cs.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),_i.add(`image:${e}`,a),r.manager.itemStart(e),a.src=e,a}}class $f extends ls{constructor(e){super(e)}load(e,t,n,s){const r=new Ot,o=new L0(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){r.image=a,r.needsUpdate=!0,t!==void 0&&t(r)},n,s),r}}class wa extends Tt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new de(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class I0 extends wa{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Tt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new de(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const pl=new Xe,ed=new A,td=new A;class bh{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ne(512,512),this.mapType=mn,this.map=null,this.mapPass=null,this.matrix=new Xe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new _h,this._frameExtents=new ne(1,1),this._viewportCount=1,this._viewports=[new ft(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera;ed.setFromMatrixPosition(e.matrixWorld),t.position.copy(ed),td.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(td),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,n,s){pl.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),n.setFromProjectionMatrix(pl,e.coordinateSystem,e.reversedDepth);const r=this._frameExtents,o=s?s.z/r.x:1,a=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;e.coordinateSystem===Wr||e.reversedDepth?t.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,1,0,0,0,0,1):t.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,.5,.5,0,0,0,1),t.multiply(pl)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const zo=new A,ko=new hn,Gn=new A;class Zf extends Tt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Xe,this.projectionMatrix=new Xe,this.projectionMatrixInverse=new Xe,this.coordinateSystem=jn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(zo,ko,Gn),Gn.x===1&&Gn.y===1&&Gn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(zo,ko,Gn.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(zo,ko,Gn),Gn.x===1&&Gn.y===1&&Gn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(zo,ko,Gn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Pi=new A,nd=new ne,id=new ne;class nn extends Zf{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=$s*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Lr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return $s*2*Math.atan(Math.tan(Lr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Pi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Pi.x,Pi.y).multiplyScalar(-e/Pi.z),Pi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Pi.x,Pi.y).multiplyScalar(-e/Pi.z)}getViewSize(e,t){return this.getViewBounds(e,nd,id),t.subVectors(id,nd)}setViewOffset(e,t,n,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Lr*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,t-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class D0 extends bh{constructor(){super(new nn(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,n=$s*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(n!==t.fov||s!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=s,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this.aspect=e.aspect,this}toJSON(){const e=super.toJSON();return e.focus=this.focus,e.aspect=this.aspect,e}}class ss extends wa{constructor(e,t,n=0,s=Math.PI/3,r=0,o=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Tt.DEFAULT_UP),this.updateMatrix(),this.target=new Tt,this.distance=n,this.angle=s,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new D0}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}}class N0 extends bh{constructor(){super(new nn(90,1,.5,500)),this.isPointLightShadow=!0}}class rr extends wa{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new N0}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}}class io extends Zf{constructor(e=-1,t=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-e,o=n+e,a=s+t,l=s-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class U0 extends bh{constructor(){super(new io(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Jf extends wa{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Tt.DEFAULT_UP),this.updateMatrix(),this.target=new Tt,this.shadow=new U0}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class Or{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const ml=new WeakMap;class F0 extends ls{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&Ne("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&Ne("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,o=_i.get(`image-bitmap:${e}`);if(o!==void 0){if(r.manager.itemStart(e),o.then){o.then(c=>{ml.has(o)===!0?(s&&s(ml.get(o)),r.manager.itemError(e),r.manager.itemEnd(e)):(t&&t(c),r.manager.itemEnd(e))});return}setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0);return}const a={};a.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",a.headers=this.requestHeader,a.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const l=fetch(e,a).then(function(c){return c.blob()}).then(function(c){return createImageBitmap(c,Object.assign({},r.options,{colorSpaceConversion:"none"}))}).then(function(c){return _i.add(`image-bitmap:${e}`,c),t&&t(c),r.manager.itemEnd(e),c}).catch(function(c){s&&s(c),ml.set(l,c),_i.remove(`image-bitmap:${e}`),r.manager.itemError(e),r.manager.itemEnd(e)});_i.add(`image-bitmap:${e}`,l),r.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const Ps=-90,Ls=1;class O0 extends Tt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new nn(Ps,Ls,e,t);s.layers=this.layers,this.add(s);const r=new nn(Ps,Ls,e,t);r.layers=this.layers,this.add(r);const o=new nn(Ps,Ls,e,t);o.layers=this.layers,this.add(o);const a=new nn(Ps,Ls,e,t);a.layers=this.layers,this.add(a);const l=new nn(Ps,Ls,e,t);l.layers=this.layers,this.add(l);const c=new nn(Ps,Ls,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,s,r,o,a,l]=t;for(const c of t)this.remove(c);if(e===jn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===Wr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(n,0,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,2,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,3,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(u,d,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class B0 extends nn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class z0{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=k0.bind(this),e.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e!==void 0?e:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}}function k0(){this._document.hidden===!1&&this.reset()}class H0{constructor(e,t,n){this.binding=e,this.valueSize=n;let s,r,o;switch(t){case"quaternion":s=this._slerp,r=this._slerpAdditive,o=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case"string":case"bool":s=this._select,r=this._select,o=this._setAdditiveIdentityOther,this.buffer=new Array(n*5);break;default:s=this._lerp,r=this._lerpAdditive,o=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=s,this._mixBufferRegionAdditive=r,this._setIdentity=o,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(e,t){const n=this.buffer,s=this.valueSize,r=e*s+s;let o=this.cumulativeWeight;if(o===0){for(let a=0;a!==s;++a)n[r+a]=n[a];o=t}else{o+=t;const a=t/o;this._mixBufferRegion(n,r,0,a,s)}this.cumulativeWeight=o}accumulateAdditive(e){const t=this.buffer,n=this.valueSize,s=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(t,s,0,e,n),this.cumulativeWeightAdditive+=e}apply(e){const t=this.valueSize,n=this.buffer,s=e*t+t,r=this.cumulativeWeight,o=this.cumulativeWeightAdditive,a=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,r<1){const l=t*this._origIndex;this._mixBufferRegion(n,s,l,1-r,t)}o>0&&this._mixBufferRegionAdditive(n,s,this._addIndex*t,1,t);for(let l=t,c=t+t;l!==c;++l)if(n[l]!==n[l+t]){a.setValue(n,s);break}}saveOriginalState(){const e=this.binding,t=this.buffer,n=this.valueSize,s=n*this._origIndex;e.getValue(t,s);for(let r=n,o=s;r!==o;++r)t[r]=t[s+r%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){const e=this.valueSize*3;this.binding.setValue(this.buffer,e)}_setAdditiveIdentityNumeric(){const e=this._addIndex*this.valueSize,t=e+this.valueSize;for(let n=e;n<t;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){const e=this._origIndex*this.valueSize,t=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[t+n]=this.buffer[e+n]}_select(e,t,n,s,r){if(s>=.5)for(let o=0;o!==r;++o)e[t+o]=e[n+o]}_slerp(e,t,n,s){hn.slerpFlat(e,t,e,t,e,n,s)}_slerpAdditive(e,t,n,s,r){const o=this._workIndex*r;hn.multiplyQuaternionsFlat(e,o,e,t,e,n),hn.slerpFlat(e,t,e,t,e,o,s)}_lerp(e,t,n,s,r){const o=1-s;for(let a=0;a!==r;++a){const l=t+a;e[l]=e[l]*o+e[n+a]*s}}_lerpAdditive(e,t,n,s,r){for(let o=0;o!==r;++o){const a=t+o;e[a]=e[a]+e[n+o]*s}}}const Th="\\[\\]\\.:\\/",V0=new RegExp("["+Th+"]","g"),wh="[^"+Th+"]",G0="[^"+Th.replace("\\.","")+"]",W0=/((?:WC+[\/:])*)/.source.replace("WC",wh),X0=/(WCOD+)?/.source.replace("WCOD",G0),Y0=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",wh),q0=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",wh),K0=new RegExp("^"+W0+X0+Y0+q0+"$"),$0=["material","materials","bones","map"];class Z0{constructor(e,t,n){const s=n||lt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class lt{constructor(e,t,n){this.path=t,this.parsedPath=n||lt.parseTrackName(t),this.node=lt.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new lt.Composite(e,t,n):new lt(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(V0,"")}static parseTrackName(e){const t=K0.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);const n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){const r=n.nodeName.substring(s+1);$0.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){const n=function(r){for(let o=0;o<r.length;o++){const a=r[o];if(a.name===t||a.uuid===t)return a;const l=n(a.children);if(l)return l}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,n=t.objectName,s=t.propertyName;let r=t.propertyIndex;if(e||(e=lt.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Ne("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){We("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){We("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){We("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){We("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){We("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){We("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){We("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}const o=e[s];if(o===void 0){const c=t.nodeName;We("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){We("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){We("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}lt.Composite=Z0;lt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};lt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};lt.prototype.GetterByBindingType=[lt.prototype._getValue_direct,lt.prototype._getValue_array,lt.prototype._getValue_arrayElement,lt.prototype._getValue_toArray];lt.prototype.SetterByBindingTypeAndVersioning=[[lt.prototype._setValue_direct,lt.prototype._setValue_direct_setNeedsUpdate,lt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[lt.prototype._setValue_array,lt.prototype._setValue_array_setNeedsUpdate,lt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[lt.prototype._setValue_arrayElement,lt.prototype._setValue_arrayElement_setNeedsUpdate,lt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[lt.prototype._setValue_fromArray,lt.prototype._setValue_fromArray_setNeedsUpdate,lt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class J0{constructor(e,t,n=null,s=t.blendMode){this._mixer=e,this._clip=t,this._localRoot=n,this.blendMode=s;const r=t.tracks,o=r.length,a=new Array(o),l={endingStart:Os,endingEnd:Os};for(let c=0;c!==o;++c){const h=r[c].createInterpolant(null);a[c]=h,h.settings=l}this._interpolantSettings=l,this._interpolants=a,this._propertyBindings=new Array(o),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._restoreTimeScale=null,this._weightInterpolant=null,this.loop=wm,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(e){return this._startTime=e,this}setLoop(e,t){return this.loop=e,this.repetitions=t,this}setEffectiveWeight(e){return this.weight=e,this._effectiveWeight=this.enabled?e:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(e){return this._scheduleFading(e,0,1)}fadeOut(e){return this._scheduleFading(e,1,0)}crossFadeFrom(e,t,n=!1){if(e.fadeOut(t),this.fadeIn(t),n===!0){const s=this._clip.duration,r=e._clip.duration,o=r/s,a=s/r;e._restoreTimeScale=e.timeScale,this._restoreTimeScale=this.timeScale,e.warp(1,o,t),this.warp(a,1,t)}return this}crossFadeTo(e,t,n=!1){return e.crossFadeFrom(this,t,n)}stopFading(){const e=this._weightInterpolant;return e!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}setEffectiveTimeScale(e){return this.timeScale=e,this._effectiveTimeScale=this.paused?0:e,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(e){return this.timeScale=this._clip.duration/e,this.stopWarping()}syncWith(e){return this.time=e.time,this.timeScale=e.timeScale,this.stopWarping()}halt(e){return this.warp(this._effectiveTimeScale,0,e)}warp(e,t,n){const s=this._mixer,r=s.time,o=this.timeScale;let a=this._timeScaleInterpolant;a===null&&(a=s._lendControlInterpolant(),this._timeScaleInterpolant=a);const l=a.parameterPositions,c=a.sampleValues;return l[0]=r,l[1]=r+n,c[0]=e/o,c[1]=t/o,this}stopWarping(){const e=this._timeScaleInterpolant;return e!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this._restoreTimeScale=null,this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(e,t,n,s){if(!this.enabled){this._updateWeight(e);return}const r=this._startTime;if(r!==null){const l=(e-r)*n;l<0||n===0?t=0:(this._startTime=null,t=n*l)}t*=this._updateTimeScale(e);const o=this._updateTime(t),a=this._updateWeight(e);if(a>0){const l=this._interpolants,c=this._propertyBindings;switch(this.blendMode){case Am:for(let h=0,u=l.length;h!==u;++h)l[h].evaluate(o),c[h].accumulateAdditive(a);break;case ch:default:for(let h=0,u=l.length;h!==u;++h)l[h].evaluate(o),c[h].accumulate(s,a)}}}_updateWeight(e){let t=0;if(this.enabled){t=this.weight;const n=this._weightInterpolant;if(n!==null){const s=n.evaluate(e)[0];t*=s,e>n.parameterPositions[1]&&(this.stopFading(),s===0&&(this.enabled=!1))}}return this._effectiveWeight=t,t}_updateTimeScale(e){let t=0;if(!this.paused){t=this.timeScale;const n=this._timeScaleInterpolant;if(n!==null){const s=n.evaluate(e)[0];t*=s,e>n.parameterPositions[1]&&(t===0?this.paused=!0:(this._restoreTimeScale!==null&&(t=this._restoreTimeScale),this.timeScale=t),this.stopWarping())}}return this._effectiveTimeScale=t,t}_updateTime(e){const t=this._clip.duration,n=this.loop;let s=this.time+e,r=this._loopCount;const o=n===Em;if(e===0)return r===-1?s:o&&(r&1)===1?t-s:s;if(n===Tm){r===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));e:{if(s>=t)s=t;else if(s<0)s=0;else{this.time=s;break e}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=s,this._mixer.dispatchEvent({type:"finished",action:this,direction:e<0?-1:1})}}else{if(r===-1&&(e>=0?(r=0,this._setEndings(!0,this.repetitions===0,o)):this._setEndings(this.repetitions===0,!0,o)),s>=t||s<0){const a=Math.floor(s/t);s-=t*a,r+=Math.abs(a);const l=this.repetitions-r;if(l<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,s=e>0?t:0,this.time=s,this._mixer.dispatchEvent({type:"finished",action:this,direction:e>0?1:-1});else{if(l===1){const c=e<0;this._setEndings(c,!c,o)}else this._setEndings(!1,!1,o);this._loopCount=r,this.time=s,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:a})}}else this._loopCount=r,this.time=s;if(o&&(r&1)===1)return t-s}return s}_setEndings(e,t,n){const s=this._interpolantSettings;n?(s.endingStart=Bs,s.endingEnd=Bs):(e?s.endingStart=this.zeroSlopeAtStart?Bs:Os:s.endingStart=ca,t?s.endingEnd=this.zeroSlopeAtEnd?Bs:Os:s.endingEnd=ca)}_scheduleFading(e,t,n){const s=this._mixer,r=s.time;let o=this._weightInterpolant;o===null&&(o=s._lendControlInterpolant(),this._weightInterpolant=o);const a=o.parameterPositions,l=o.sampleValues;return a[0]=r,l[0]=t,a[1]=r+e,l[1]=n,this}}const j0=new Float32Array(1);class Q0 extends Mi{constructor(e){super(),this._root=e,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}_bindAction(e,t){const n=e._localRoot||this._root,s=e._clip.tracks,r=s.length,o=e._propertyBindings,a=e._interpolants,l=n.uuid,c=this._bindingsByRootAndName;let h=c[l];h===void 0&&(h={},c[l]=h);for(let u=0;u!==r;++u){const d=s[u],f=d.name;let g=h[f];if(g!==void 0)++g.referenceCount,o[u]=g;else{if(g=o[u],g!==void 0){g._cacheIndex===null&&(++g.referenceCount,this._addInactiveBinding(g,l,f));continue}const _=t&&t._propertyBindings[u].binding.parsedPath;g=new H0(lt.create(n,f,_),d.ValueTypeName,d.getValueSize()),++g.referenceCount,this._addInactiveBinding(g,l,f),o[u]=g}a[u].resultBuffer=g.buffer}}_activateAction(e){if(!this._isActiveAction(e)){if(e._cacheIndex===null){const n=(e._localRoot||this._root).uuid,s=e._clip.uuid,r=this._actionsByClip[s];this._bindAction(e,r&&r.knownActions[0]),this._addInactiveAction(e,s,n)}const t=e._propertyBindings;for(let n=0,s=t.length;n!==s;++n){const r=t[n];r.useCount++===0&&(this._lendBinding(r),r.saveOriginalState())}this._lendAction(e)}}_deactivateAction(e){if(this._isActiveAction(e)){const t=e._propertyBindings;for(let n=0,s=t.length;n!==s;++n){const r=t[n];--r.useCount===0&&(r.restoreOriginalState(),this._takeBackBinding(r))}this._takeBackAction(e)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;const e=this;this.stats={actions:{get total(){return e._actions.length},get inUse(){return e._nActiveActions}},bindings:{get total(){return e._bindings.length},get inUse(){return e._nActiveBindings}},controlInterpolants:{get total(){return e._controlInterpolants.length},get inUse(){return e._nActiveControlInterpolants}}}}_isActiveAction(e){const t=e._cacheIndex;return t!==null&&t<this._nActiveActions}_addInactiveAction(e,t,n){const s=this._actions,r=this._actionsByClip;let o=r[t];if(o===void 0)o={knownActions:[e],actionByRoot:{}},e._byClipCacheIndex=0,r[t]=o;else{const a=o.knownActions;e._byClipCacheIndex=a.length,a.push(e)}e._cacheIndex=s.length,s.push(e),o.actionByRoot[n]=e}_removeInactiveAction(e){const t=this._actions,n=t[t.length-1],s=e._cacheIndex;n._cacheIndex=s,t[s]=n,t.pop(),e._cacheIndex=null;const r=e._clip.uuid,o=this._actionsByClip,a=o[r],l=a.knownActions,c=l[l.length-1],h=e._byClipCacheIndex;c._byClipCacheIndex=h,l[h]=c,l.pop(),e._byClipCacheIndex=null;const u=a.actionByRoot,d=(e._localRoot||this._root).uuid;delete u[d],l.length===0&&delete o[r],this._removeInactiveBindingsForAction(e)}_removeInactiveBindingsForAction(e){const t=e._propertyBindings;for(let n=0,s=t.length;n!==s;++n){const r=t[n];--r.referenceCount===0&&this._removeInactiveBinding(r)}}_lendAction(e){const t=this._actions,n=e._cacheIndex,s=this._nActiveActions++,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_takeBackAction(e){const t=this._actions,n=e._cacheIndex,s=--this._nActiveActions,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_addInactiveBinding(e,t,n){const s=this._bindingsByRootAndName,r=this._bindings;let o=s[t];o===void 0&&(o={},s[t]=o),o[n]=e,e._cacheIndex=r.length,r.push(e)}_removeInactiveBinding(e){const t=this._bindings,n=e.binding,s=n.rootNode.uuid,r=n.path,o=this._bindingsByRootAndName,a=o[s],l=t[t.length-1],c=e._cacheIndex;l._cacheIndex=c,t[c]=l,t.pop(),delete a[r],Object.keys(a).length===0&&delete o[s]}_lendBinding(e){const t=this._bindings,n=e._cacheIndex,s=this._nActiveBindings++,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_takeBackBinding(e){const t=this._bindings,n=e._cacheIndex,s=--this._nActiveBindings,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_lendControlInterpolant(){const e=this._controlInterpolants,t=this._nActiveControlInterpolants++;let n=e[t];return n===void 0&&(n=new Yf(new Float32Array(2),new Float32Array(2),1,j0),n.__cacheIndex=t,e[t]=n),n}_takeBackControlInterpolant(e){const t=this._controlInterpolants,n=e.__cacheIndex,s=--this._nActiveControlInterpolants,r=t[s];e.__cacheIndex=s,t[s]=e,r.__cacheIndex=n,t[n]=r}clipAction(e,t,n){const s=t||this._root,r=s.uuid;let o=typeof e=="string"?Lc.findByName(s,e):e;const a=o!==null?o.uuid:e,l=this._actionsByClip[a];let c=null;if(n===void 0&&(o!==null?n=o.blendMode:n=ch),l!==void 0){const u=l.actionByRoot[r];if(u!==void 0&&u.blendMode===n)return u;c=l.knownActions[0],o===null&&(o=c._clip)}if(o===null)return null;const h=new J0(this,o,t,n);return this._bindAction(h,c),this._addInactiveAction(h,a,r),h}existingAction(e,t){const n=t||this._root,s=n.uuid,r=typeof e=="string"?Lc.findByName(n,e):e,o=r?r.uuid:e,a=this._actionsByClip[o];return a!==void 0&&a.actionByRoot[s]||null}stopAllAction(){const e=this._actions,t=this._nActiveActions;for(let n=t-1;n>=0;--n)e[n].stop();return this}update(e){e*=this.timeScale;const t=this._actions,n=this._nActiveActions,s=this.time+=e,r=Math.sign(e),o=this._accuIndex^=1;for(let c=0;c!==n;++c)t[c]._update(s,e,r,o);const a=this._bindings,l=this._nActiveBindings;for(let c=0;c!==l;++c)a[c].apply(o);return this}setTime(e){this.time=0;for(let t=0;t<this._actions.length;t++)this._actions[t].time=0;return this.update(e)}getRoot(){return this._root}uncacheClip(e){const t=this._actions,n=e.uuid,s=this._actionsByClip,r=s[n];if(r!==void 0){const o=r.knownActions;for(let a=0,l=o.length;a!==l;++a){const c=o[a];this._deactivateAction(c);const h=c._cacheIndex,u=t[t.length-1];c._cacheIndex=null,c._byClipCacheIndex=null,u._cacheIndex=h,t[h]=u,t.pop(),this._removeInactiveBindingsForAction(c)}delete s[n]}}uncacheRoot(e){const t=e.uuid,n=this._actionsByClip;for(const o in n){const a=n[o].actionByRoot,l=a[t];l!==void 0&&(this._deactivateAction(l),this._removeInactiveAction(l))}const s=this._bindingsByRootAndName,r=s[t];if(r!==void 0)for(const o in r){const a=r[o];a.restoreOriginalState(),this._removeInactiveBinding(a)}}uncacheAction(e,t){const n=this.existingAction(e,t);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}}class sd{constructor(e=1,t=0,n=0){this.radius=e,this.phi=t,this.theta=n}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Je(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(Je(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Gh=class Gh{constructor(e,t,n,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,s){const r=this.elements;return r[0]=e,r[2]=t,r[1]=n,r[3]=s,this}};Gh.prototype.isMatrix2=!0;let rd=Gh;class e_ extends Mi{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function od(i,e,t,n){const s=t_(n);switch(t){case yf:return i*e;case rh:return i*e/s.components*s.byteLength;case oh:return i*e/s.components*s.byteLength;case ns:return i*e*2/s.components*s.byteLength;case ah:return i*e*2/s.components*s.byteLength;case Mf:return i*e*3/s.components*s.byteLength;case En:return i*e*4/s.components*s.byteLength;case lh:return i*e*4/s.components*s.byteLength;case Qo:case ea:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case ta:case na:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case $l:case Jl:return Math.max(i,16)*Math.max(e,8)/4;case Kl:case Zl:return Math.max(i,8)*Math.max(e,8)/2;case jl:case Ql:case tc:case nc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case ec:case aa:case ic:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case sc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case rc:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case oc:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case ac:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case lc:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case cc:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case hc:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case uc:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case dc:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case fc:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case pc:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case mc:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case gc:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case _c:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case xc:case vc:case yc:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Mc:case Sc:return Math.ceil(i/4)*Math.ceil(e/4)*8;case la:case bc:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function t_(i){switch(i){case mn:case gf:return{byteLength:1,components:1};case kr:case _f:case Zt:return{byteLength:2,components:1};case ih:case sh:return{byteLength:2,components:4};case ii:case nh:case wn:return{byteLength:4,components:1};case xf:case vf:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Kc}}));typeof window<"u"&&(window.__THREE__?Ne("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Kc);function jf(){let i=null,e=!1,t=null,n=null;function s(r,o){n=i.requestAnimationFrame(s),t(r,o)}return{start:function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function n_(i){const e=new WeakMap;function t(a,l){const c=a.array,h=a.usage,u=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,l,c){const h=l.array,u=l.updateRanges;if(i.bindBuffer(c,a),u.length===0)i.bufferSubData(c,0,h);else{u.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<u.length;f++){const g=u[d],_=u[f];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++d,u[d]=_)}u.length=d+1;for(let f=0,g=u.length;f<g;f++){const _=u[f];i.bufferSubData(c,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(i.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var i_=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,s_=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,r_=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,o_=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,a_=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,l_=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,c_=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,h_=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,u_=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,d_=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,f_=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,p_=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,m_=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,g_=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,__=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,x_=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,v_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,y_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,M_=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,S_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,b_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,T_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,w_=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,E_=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,A_=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,R_=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,C_=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,P_=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,L_=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,I_=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,D_="gl_FragColor = linearToOutputTexel( gl_FragColor );",N_=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,U_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,F_=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,O_=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,B_=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,z_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,k_=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,H_=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,V_=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,G_=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,W_=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,X_=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Y_=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,q_=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,K_=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,$_=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,Z_=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,J_=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,j_=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Q_=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,ex=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,tx=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,nx=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,ix=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,sx=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,rx=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,ox=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,ax=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,lx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,cx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,hx=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ux=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,dx=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,fx=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,px=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,mx=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,gx=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,_x=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,xx=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,vx=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,yx=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Mx=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Sx=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,bx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Tx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,wx=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Ex=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Ax=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Rx=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Cx=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Px=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Lx=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Ix=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Dx=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Nx=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Ux=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Fx=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Ox=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Bx=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,zx=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,kx=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Hx=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Vx=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Gx=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Wx=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Xx=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Yx=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,qx=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Kx=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,$x=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Zx=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Jx=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,jx=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Qx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,ev=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,tv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,nv=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const iv=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,sv=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,rv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ov=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,av=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,lv=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cv=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,hv=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,uv=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,dv=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,fv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,pv=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mv=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,gv=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,_v=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,xv=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vv=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,yv=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Mv=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Sv=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bv=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Tv=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,wv=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ev=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Av=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Rv=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Cv=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Pv=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lv=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Iv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Dv=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Nv=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Uv=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Fv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Qe={alphahash_fragment:i_,alphahash_pars_fragment:s_,alphamap_fragment:r_,alphamap_pars_fragment:o_,alphatest_fragment:a_,alphatest_pars_fragment:l_,aomap_fragment:c_,aomap_pars_fragment:h_,batching_pars_vertex:u_,batching_vertex:d_,begin_vertex:f_,beginnormal_vertex:p_,bsdfs:m_,iridescence_fragment:g_,bumpmap_pars_fragment:__,clipping_planes_fragment:x_,clipping_planes_pars_fragment:v_,clipping_planes_pars_vertex:y_,clipping_planes_vertex:M_,color_fragment:S_,color_pars_fragment:b_,color_pars_vertex:T_,color_vertex:w_,common:E_,cube_uv_reflection_fragment:A_,defaultnormal_vertex:R_,displacementmap_pars_vertex:C_,displacementmap_vertex:P_,emissivemap_fragment:L_,emissivemap_pars_fragment:I_,colorspace_fragment:D_,colorspace_pars_fragment:N_,envmap_fragment:U_,envmap_common_pars_fragment:F_,envmap_pars_fragment:O_,envmap_pars_vertex:B_,envmap_physical_pars_fragment:$_,envmap_vertex:z_,fog_vertex:k_,fog_pars_vertex:H_,fog_fragment:V_,fog_pars_fragment:G_,gradientmap_pars_fragment:W_,lightmap_pars_fragment:X_,lights_lambert_fragment:Y_,lights_lambert_pars_fragment:q_,lights_pars_begin:K_,lights_toon_fragment:Z_,lights_toon_pars_fragment:J_,lights_phong_fragment:j_,lights_phong_pars_fragment:Q_,lights_physical_fragment:ex,lights_physical_pars_fragment:tx,lights_fragment_begin:nx,lights_fragment_maps:ix,lights_fragment_end:sx,lightprobes_pars_fragment:rx,logdepthbuf_fragment:ox,logdepthbuf_pars_fragment:ax,logdepthbuf_pars_vertex:lx,logdepthbuf_vertex:cx,map_fragment:hx,map_pars_fragment:ux,map_particle_fragment:dx,map_particle_pars_fragment:fx,metalnessmap_fragment:px,metalnessmap_pars_fragment:mx,morphinstance_vertex:gx,morphcolor_vertex:_x,morphnormal_vertex:xx,morphtarget_pars_vertex:vx,morphtarget_vertex:yx,normal_fragment_begin:Mx,normal_fragment_maps:Sx,normal_pars_fragment:bx,normal_pars_vertex:Tx,normal_vertex:wx,normalmap_pars_fragment:Ex,clearcoat_normal_fragment_begin:Ax,clearcoat_normal_fragment_maps:Rx,clearcoat_pars_fragment:Cx,iridescence_pars_fragment:Px,opaque_fragment:Lx,packing:Ix,premultiplied_alpha_fragment:Dx,project_vertex:Nx,dithering_fragment:Ux,dithering_pars_fragment:Fx,roughnessmap_fragment:Ox,roughnessmap_pars_fragment:Bx,shadowmap_pars_fragment:zx,shadowmap_pars_vertex:kx,shadowmap_vertex:Hx,shadowmask_pars_fragment:Vx,skinbase_vertex:Gx,skinning_pars_vertex:Wx,skinning_vertex:Xx,skinnormal_vertex:Yx,specularmap_fragment:qx,specularmap_pars_fragment:Kx,tonemapping_fragment:$x,tonemapping_pars_fragment:Zx,transmission_fragment:Jx,transmission_pars_fragment:jx,uv_pars_fragment:Qx,uv_pars_vertex:ev,uv_vertex:tv,worldpos_vertex:nv,background_vert:iv,background_frag:sv,backgroundCube_vert:rv,backgroundCube_frag:ov,cube_vert:av,cube_frag:lv,depth_vert:cv,depth_frag:hv,distance_vert:uv,distance_frag:dv,equirect_vert:fv,equirect_frag:pv,linedashed_vert:mv,linedashed_frag:gv,meshbasic_vert:_v,meshbasic_frag:xv,meshlambert_vert:vv,meshlambert_frag:yv,meshmatcap_vert:Mv,meshmatcap_frag:Sv,meshnormal_vert:bv,meshnormal_frag:Tv,meshphong_vert:wv,meshphong_frag:Ev,meshphysical_vert:Av,meshphysical_frag:Rv,meshtoon_vert:Cv,meshtoon_frag:Pv,points_vert:Lv,points_frag:Iv,shadow_vert:Dv,shadow_frag:Nv,sprite_vert:Uv,sprite_frag:Fv},Me={common:{diffuse:{value:new de(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ke},alphaMap:{value:null},alphaMapTransform:{value:new Ke},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ke}},envmap:{envMap:{value:null},envMapRotation:{value:new Ke},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ke}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ke}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ke},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ke},normalScale:{value:new ne(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ke},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ke}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ke}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ke}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new de(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new A},probesMax:{value:new A},probesResolution:{value:new A}},points:{diffuse:{value:new de(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ke},alphaTest:{value:0},uvTransform:{value:new Ke}},sprite:{diffuse:{value:new de(16777215)},opacity:{value:1},center:{value:new ne(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ke},alphaMap:{value:null},alphaMapTransform:{value:new Ke},alphaTest:{value:0}}},qn={basic:{uniforms:tn([Me.common,Me.specularmap,Me.envmap,Me.aomap,Me.lightmap,Me.fog]),vertexShader:Qe.meshbasic_vert,fragmentShader:Qe.meshbasic_frag},lambert:{uniforms:tn([Me.common,Me.specularmap,Me.envmap,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.fog,Me.lights,{emissive:{value:new de(0)},envMapIntensity:{value:1}}]),vertexShader:Qe.meshlambert_vert,fragmentShader:Qe.meshlambert_frag},phong:{uniforms:tn([Me.common,Me.specularmap,Me.envmap,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.fog,Me.lights,{emissive:{value:new de(0)},specular:{value:new de(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Qe.meshphong_vert,fragmentShader:Qe.meshphong_frag},standard:{uniforms:tn([Me.common,Me.envmap,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.roughnessmap,Me.metalnessmap,Me.fog,Me.lights,{emissive:{value:new de(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag},toon:{uniforms:tn([Me.common,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.gradientmap,Me.fog,Me.lights,{emissive:{value:new de(0)}}]),vertexShader:Qe.meshtoon_vert,fragmentShader:Qe.meshtoon_frag},matcap:{uniforms:tn([Me.common,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.fog,{matcap:{value:null}}]),vertexShader:Qe.meshmatcap_vert,fragmentShader:Qe.meshmatcap_frag},points:{uniforms:tn([Me.points,Me.fog]),vertexShader:Qe.points_vert,fragmentShader:Qe.points_frag},dashed:{uniforms:tn([Me.common,Me.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Qe.linedashed_vert,fragmentShader:Qe.linedashed_frag},depth:{uniforms:tn([Me.common,Me.displacementmap]),vertexShader:Qe.depth_vert,fragmentShader:Qe.depth_frag},normal:{uniforms:tn([Me.common,Me.bumpmap,Me.normalmap,Me.displacementmap,{opacity:{value:1}}]),vertexShader:Qe.meshnormal_vert,fragmentShader:Qe.meshnormal_frag},sprite:{uniforms:tn([Me.sprite,Me.fog]),vertexShader:Qe.sprite_vert,fragmentShader:Qe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ke},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Qe.background_vert,fragmentShader:Qe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ke}},vertexShader:Qe.backgroundCube_vert,fragmentShader:Qe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Qe.cube_vert,fragmentShader:Qe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Qe.equirect_vert,fragmentShader:Qe.equirect_frag},distance:{uniforms:tn([Me.common,Me.displacementmap,{referencePosition:{value:new A},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Qe.distance_vert,fragmentShader:Qe.distance_frag},shadow:{uniforms:tn([Me.lights,Me.fog,{color:{value:new de(0)},opacity:{value:1}}]),vertexShader:Qe.shadow_vert,fragmentShader:Qe.shadow_frag}};qn.physical={uniforms:tn([qn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ke},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ke},clearcoatNormalScale:{value:new ne(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ke},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ke},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ke},sheen:{value:0},sheenColor:{value:new de(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ke},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ke},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ke},transmissionSamplerSize:{value:new ne},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ke},attenuationDistance:{value:0},attenuationColor:{value:new de(0)},specularColor:{value:new de(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ke},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ke},anisotropyVector:{value:new ne},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ke}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag};const Ho={r:0,b:0,g:0},Ov=new Xe,Qf=new Ke;Qf.set(-1,0,0,0,1,0,0,0,1);function Bv(i,e,t,n,s,r){const o=new de(0);let a=s===!0?0:1,l,c,h=null,u=0,d=null;function f(M){let T=M.isScene===!0?M.background:null;if(T&&T.isTexture){const x=M.backgroundBlurriness>0;T=e.get(T,x)}return T}function g(M){let T=!1;const x=f(M);x===null?p(o,a):x&&x.isColor&&(p(x,1),T=!0);const S=i.xr.getEnvironmentBlendMode();S==="additive"?t.buffers.color.setClear(0,0,0,1,r):S==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||T)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function _(M,T){const x=f(T);x&&(x.isCubeTexture||x.mapping===Ta)?(c===void 0&&(c=new Re(new Et(1,1,1),new Ht({name:"BackgroundCubeMaterial",uniforms:js(qn.backgroundCube.uniforms),vertexShader:qn.backgroundCube.vertexShader,fragmentShader:qn.backgroundCube.fragmentShader,side:sn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(S,w,E){this.matrixWorld.copyPosition(E.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=x,c.material.uniforms.backgroundBlurriness.value=T.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Ov.makeRotationFromEuler(T.backgroundRotation)).transpose(),x.isCubeTexture&&x.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(Qf),c.material.toneMapped=et.getTransfer(x.colorSpace)!==dt,(h!==x||u!==x.version||d!==i.toneMapping)&&(c.material.needsUpdate=!0,h=x,u=x.version,d=i.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new Re(new Si(2,2),new Ht({name:"BackgroundMaterial",uniforms:js(qn.background.uniforms),vertexShader:qn.background.vertexShader,fragmentShader:qn.background.fragmentShader,side:Bi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,l.material.toneMapped=et.getTransfer(x.colorSpace)!==dt,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(h!==x||u!==x.version||d!==i.toneMapping)&&(l.material.needsUpdate=!0,h=x,u=x.version,d=i.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null))}function p(M,T){M.getRGB(Ho,Wf(i)),t.buffers.color.setClear(Ho.r,Ho.g,Ho.b,T,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(M,T=1){o.set(M),a=T,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(M){a=M,p(o,a)},render:g,addToRenderList:_,dispose:m}}function zv(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null);let r=s,o=!1;function a(I,F,V,U,B){let K=!1;const W=u(I,U,V,F);r!==W&&(r=W,c(r.object)),K=f(I,U,V,B),K&&g(I,U,V,B),B!==null&&e.update(B,i.ELEMENT_ARRAY_BUFFER),(K||o)&&(o=!1,x(I,F,V,U),B!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(B).buffer))}function l(){return i.createVertexArray()}function c(I){return i.bindVertexArray(I)}function h(I){return i.deleteVertexArray(I)}function u(I,F,V,U){const B=U.wireframe===!0;let K=n[F.id];K===void 0&&(K={},n[F.id]=K);const W=I.isInstancedMesh===!0?I.id:0;let ie=K[W];ie===void 0&&(ie={},K[W]=ie);let q=ie[V.id];q===void 0&&(q={},ie[V.id]=q);let Q=q[B];return Q===void 0&&(Q=d(l()),q[B]=Q),Q}function d(I){const F=[],V=[],U=[];for(let B=0;B<t;B++)F[B]=0,V[B]=0,U[B]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:V,attributeDivisors:U,object:I,attributes:{},index:null}}function f(I,F,V,U){const B=r.attributes,K=F.attributes;let W=0;const ie=V.getAttributes();for(const q in ie)if(ie[q].location>=0){const O=B[q];let re=K[q];if(re===void 0&&(q==="instanceMatrix"&&I.instanceMatrix&&(re=I.instanceMatrix),q==="instanceColor"&&I.instanceColor&&(re=I.instanceColor)),O===void 0||O.attribute!==re||re&&O.data!==re.data)return!0;W++}return r.attributesNum!==W||r.index!==U}function g(I,F,V,U){const B={},K=F.attributes;let W=0;const ie=V.getAttributes();for(const q in ie)if(ie[q].location>=0){let O=K[q];O===void 0&&(q==="instanceMatrix"&&I.instanceMatrix&&(O=I.instanceMatrix),q==="instanceColor"&&I.instanceColor&&(O=I.instanceColor));const re={};re.attribute=O,O&&O.data&&(re.data=O.data),B[q]=re,W++}r.attributes=B,r.attributesNum=W,r.index=U}function _(){const I=r.newAttributes;for(let F=0,V=I.length;F<V;F++)I[F]=0}function p(I){m(I,0)}function m(I,F){const V=r.newAttributes,U=r.enabledAttributes,B=r.attributeDivisors;V[I]=1,U[I]===0&&(i.enableVertexAttribArray(I),U[I]=1),B[I]!==F&&(i.vertexAttribDivisor(I,F),B[I]=F)}function M(){const I=r.newAttributes,F=r.enabledAttributes;for(let V=0,U=F.length;V<U;V++)F[V]!==I[V]&&(i.disableVertexAttribArray(V),F[V]=0)}function T(I,F,V,U,B,K,W){W===!0?i.vertexAttribIPointer(I,F,V,B,K):i.vertexAttribPointer(I,F,V,U,B,K)}function x(I,F,V,U){_();const B=U.attributes,K=V.getAttributes(),W=F.defaultAttributeValues;for(const ie in K){const q=K[ie];if(q.location>=0){let Q=B[ie];if(Q===void 0&&(ie==="instanceMatrix"&&I.instanceMatrix&&(Q=I.instanceMatrix),ie==="instanceColor"&&I.instanceColor&&(Q=I.instanceColor)),Q!==void 0){const O=Q.normalized,re=Q.itemSize,ae=e.get(Q);if(ae===void 0)continue;const Ie=ae.buffer,ze=ae.type,qe=ae.bytesPerElement,Y=ze===i.INT||ze===i.UNSIGNED_INT||Q.gpuType===nh;if(Q.isInterleavedBufferAttribute){const J=Q.data,me=J.stride,ke=Q.offset;if(J.isInstancedInterleavedBuffer){for(let we=0;we<q.locationSize;we++)m(q.location+we,J.meshPerAttribute);I.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let we=0;we<q.locationSize;we++)p(q.location+we);i.bindBuffer(i.ARRAY_BUFFER,Ie);for(let we=0;we<q.locationSize;we++)T(q.location+we,re/q.locationSize,ze,O,me*qe,(ke+re/q.locationSize*we)*qe,Y)}else{if(Q.isInstancedBufferAttribute){for(let J=0;J<q.locationSize;J++)m(q.location+J,Q.meshPerAttribute);I.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let J=0;J<q.locationSize;J++)p(q.location+J);i.bindBuffer(i.ARRAY_BUFFER,Ie);for(let J=0;J<q.locationSize;J++)T(q.location+J,re/q.locationSize,ze,O,re*qe,re/q.locationSize*J*qe,Y)}}else if(W!==void 0){const O=W[ie];if(O!==void 0)switch(O.length){case 2:i.vertexAttrib2fv(q.location,O);break;case 3:i.vertexAttrib3fv(q.location,O);break;case 4:i.vertexAttrib4fv(q.location,O);break;default:i.vertexAttrib1fv(q.location,O)}}}}M()}function S(){R();for(const I in n){const F=n[I];for(const V in F){const U=F[V];for(const B in U){const K=U[B];for(const W in K)h(K[W].object),delete K[W];delete U[B]}}delete n[I]}}function w(I){if(n[I.id]===void 0)return;const F=n[I.id];for(const V in F){const U=F[V];for(const B in U){const K=U[B];for(const W in K)h(K[W].object),delete K[W];delete U[B]}}delete n[I.id]}function E(I){for(const F in n){const V=n[F];for(const U in V){const B=V[U];if(B[I.id]===void 0)continue;const K=B[I.id];for(const W in K)h(K[W].object),delete K[W];delete B[I.id]}}}function y(I){for(const F in n){const V=n[F],U=I.isInstancedMesh===!0?I.id:0,B=V[U];if(B!==void 0){for(const K in B){const W=B[K];for(const ie in W)h(W[ie].object),delete W[ie];delete B[K]}delete V[U],Object.keys(V).length===0&&delete n[F]}}}function R(){P(),o=!0,r!==s&&(r=s,c(r.object))}function P(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:R,resetDefaultState:P,dispose:S,releaseStatesOfGeometry:w,releaseStatesOfObject:y,releaseStatesOfProgram:E,initAttributes:_,enableAttribute:p,disableUnusedAttributes:M}}function kv(i,e,t){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),t.update(c,n,1)}function o(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),t.update(c,n,h))}function a(l,c,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let d=0;for(let f=0;f<h;f++)d+=c[f];t.update(d,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function Hv(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const E=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(E){return!(E!==En&&n.convert(E)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(E){const y=E===Zt&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(E!==mn&&E!==wn&&!y&&n.convert(E)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(E){if(E==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(Ne("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const u=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&d===!1&&Ne("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),p=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),M=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),T=i.getParameter(i.MAX_VARYING_VECTORS),x=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),S=i.getParameter(i.MAX_SAMPLES),w=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:M,maxVaryings:T,maxFragmentUniforms:x,maxSamples:S,samples:w}}function Vv(i){const e=this;let t=null,n=0,s=!1,r=!1;const o=new Yn,a=new Ke,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const f=u.length!==0||d||n!==0||s;return s=d,n=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){t=h(u,d,0)},this.setState=function(u,d,f){const g=u.clippingPlanes,_=u.clipIntersection,p=u.clipShadows,m=i.get(u);if(!s||g===null||g.length===0||r&&!p)r?h(null):c();else{const M=r?0:n,T=M*4;let x=m.clippingState||null;l.value=x,x=h(g,d,T,f);for(let S=0;S!==T;++S)x[S]=t[S];m.clippingState=x,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=M}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,d,f,g){const _=u!==null?u.length:0;let p=null;if(_!==0){if(p=l.value,g!==!0||p===null){const m=f+_*4,M=d.matrixWorldInverse;a.getNormalMatrix(M),(p===null||p.length<m)&&(p=new Float32Array(m));for(let T=0,x=f;T!==_;++T,x+=4)o.copy(u[T]).applyMatrix4(M,a),o.normal.toArray(p,x),p[x+3]=o.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,p}}const Hs=4,Gv=6,Wv=20,Xv=256,Mr=new io,ad=new de;let gl=null,_l=0,xl=0,vl=!1;const Yv=new A,Yi=new A;class Ic{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,s=100,r={}){const{size:o=256,position:a=Yv}=r;gl=this._renderer.getRenderTarget(),_l=this._renderer.getActiveCubeFace(),xl=this._renderer.getActiveMipmapLevel(),vl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,s,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=hd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=cd(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(gl,_l,xl),this._renderer.xr.enabled=vl,e.scissorTest=!1,Is(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===es||e.mapping===Ks?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),gl=this._renderer.getRenderTarget(),_l=this._renderer.getActiveCubeFace(),xl=this._renderer.getActiveMipmapLevel(),vl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Ft,minFilter:Ft,generateMipmaps:!1,type:Zt,format:En,colorSpace:_n,depthBuffer:!1},s=ld(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ld(e,t,n);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=qv(r)),this._blurMaterial=$v(r,e,t),this._ggxMaterial=Kv(r,e,t)}return s}_compileMaterial(e){const t=new Re(new yt,e);this._renderer.compile(t,Mr)}_sceneToCubeUV(e,t,n,s,r){const l=new nn(90,1,t,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(ad),u.toneMapping=ti,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Re(new Et,new gn({name:"PMREM.Background",side:sn,depthWrite:!1,depthTest:!1})));const _=this._backgroundBox,p=_.material;let m=!1;const M=e.background;M?M.isColor&&(p.color.copy(M),e.background=null,m=!0):(p.color.copy(ad),m=!0);for(let T=0;T<6;T++){const x=T%3;x===0?(l.up.set(0,c[T],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[T],r.y,r.z)):x===1?(l.up.set(0,0,c[T]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[T],r.z)):(l.up.set(0,c[T],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[T]));const S=this._cubeSize;Is(s,x*S,T>2?S:0,S,S),u.setRenderTarget(s),m&&u.render(_,l),u.render(e,l)}u.toneMapping=f,u.autoClear=d,e.background=M}_textureToCubeUV(e,t){const n=this._renderer,s=e.mapping===es||e.mapping===Ks;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=hd()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=cd());const r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;const a=r.uniforms;a.envMap.value=e;const l=this._cubeSize;Is(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,Mr)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){const s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;const l=o.uniforms,c=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-h*h),d=c*1.25,f=u*d,{_lodMax:g}=this,_=this._sizeLods[n],p=3*_*(n>g-Hs?n-g+Hs:0),m=4*(this._cubeSize-_);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=g-t,Is(r,p,m,3*_,2*_),s.setRenderTarget(r),s.render(a,Mr),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-n,Is(e,p,m,3*_,2*_),s.setRenderTarget(e),s.render(a,Mr)}_blur(e,t,n,s){const r=this._pingPongRenderTarget,o=Math.min(s,Math.PI)/Math.SQRT2;this._blurPass(e,r,t,n,o),this._blurPass(r,e,n,n,o)}_blurPass(e,t,n,s,r){const o=this._renderer,a=this._blurMaterial,l=this._lodMeshes[s];l.material=a;const c=a.uniforms;c.envMap.value=e.texture,c.sigma.value=r,c.mipInt.value=this._lodMax-n;const h=this._sizeLods[s],u=3*h*(s>this._lodMax-Hs?s-this._lodMax+Hs:0),d=4*(this._cubeSize-h);Is(t,u,d,3*h,2*h),o.setRenderTarget(t),o.render(l,Mr)}}function qv(i){const e=[],t=[];let n=i;const s=i-Hs+1+Gv;for(let r=0;r<s;r++){const o=Math.pow(2,n);e.push(o);const a=1/(o-2),l=-a,c=1+a,h=[l,l,c,l,c,c,l,l,c,c,l,c],u=6,d=6,f=3,g=new Float32Array(f*d*u),_=new Float32Array(f*d*u);for(let m=0;m<u;m++){const M=m%3*2/3-1,T=m>2?0:-1,x=[M,T,0,M+2/3,T,0,M+2/3,T+1,0,M,T,0,M+2/3,T+1,0,M,T+1,0];g.set(x,f*d*m);for(let S=0;S<d;S++){const w=h[S*2]*2-1,E=h[S*2+1]*2-1;m===0?Yi.set(1,E,w):m===1?Yi.set(-w,1,-E):m===2?Yi.set(-w,E,1):m===3?Yi.set(-1,E,-w):m===4?Yi.set(-w,-1,E):Yi.set(w,E,-1),Yi.toArray(_,(m*d+S)*f)}}const p=new yt;p.setAttribute("position",new Dt(g,f)),p.setAttribute("outputDirection",new Dt(_,f)),t.push(new Re(p,null)),n>Hs&&n--}return{lodMeshes:t,sizeLods:e}}function ld(i,e,t){const n=new Wt(i,e,t);return n.texture.mapping=Ta,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Is(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function Kv(i,e,t){return new Ht({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Xv,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Ea(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:ei,depthTest:!1,depthWrite:!1})}function $v(i,e,t){return new Ht({name:"SphericalGaussianBlur",defines:{SAMPLES:Wv,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Ea(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:ei,depthTest:!1,depthWrite:!1})}function cd(){return new Ht({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Ea(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:ei,depthTest:!1,depthWrite:!1})}function hd(){return new Ht({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ea(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ei,depthTest:!1,depthWrite:!1})}function Ea(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}class ep extends Wt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new Nf(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Et(5,5,5),r=new Ht({name:"CubemapFromEquirect",uniforms:js(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:sn,blending:ei});r.uniforms.tEquirect.value=t;const o=new Re(s,r),a=t.minFilter;return t.minFilter===Jn&&(t.minFilter=Ft),new O0(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,s);e.setRenderTarget(r)}}function Zv(i){let e=new WeakMap,t=new WeakMap,n=null;function s(d,f=!1){return d==null?null:f?o(d):r(d)}function r(d){if(d&&d.isTexture){const f=d.mapping;if(f===Oa||f===Ba)if(e.has(d)){const g=e.get(d).texture;return a(g,d.mapping)}else{const g=d.image;if(g&&g.height>0){const _=new ep(g.height);return _.fromEquirectangularTexture(i,d),e.set(d,_),d.addEventListener("dispose",c),a(_.texture,d.mapping)}else return null}}return d}function o(d){if(d&&d.isTexture){const f=d.mapping,g=f===Oa||f===Ba,_=f===es||f===Ks;if(g||_){let p=t.get(d);const m=p!==void 0?p.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==m)return n===null&&(n=new Ic(i)),p=g?n.fromEquirectangular(d,p):n.fromCubemap(d,p),p.texture.pmremVersion=d.pmremVersion,t.set(d,p),p.texture;if(p!==void 0)return p.texture;{const M=d.image;return g&&M&&M.height>0||_&&M&&l(M)?(n===null&&(n=new Ic(i)),p=g?n.fromEquirectangular(d):n.fromCubemap(d),p.texture.pmremVersion=d.pmremVersion,t.set(d,p),d.addEventListener("dispose",h),p.texture):null}}}return d}function a(d,f){return f===Oa?d.mapping=es:f===Ba&&(d.mapping=Ks),d}function l(d){let f=0;const g=6;for(let _=0;_<g;_++)d[_]!==void 0&&f++;return f===g}function c(d){const f=d.target;f.removeEventListener("dispose",c);const g=e.get(f);g!==void 0&&(e.delete(f),g.dispose())}function h(d){const f=d.target;f.removeEventListener("dispose",h);const g=t.get(f);g!==void 0&&(t.delete(f),g.dispose())}function u(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:u}}function Jv(i){const e={};function t(n){if(e[n]!==void 0)return e[n];const s=i.getExtension(n);return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const s=t(n);return s===null&&Ws("WebGLRenderer: "+n+" extension not supported."),s}}}function jv(i,e,t,n){const s={},r=new WeakMap;function o(u){const d=u.target;d.index!==null&&e.remove(d.index);for(const g in d.attributes)e.remove(d.attributes[g]);d.removeEventListener("dispose",o),delete s[d.id];const f=r.get(d);f&&(e.remove(f),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(u,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,t.memory.geometries++),d}function l(u){const d=u.attributes;for(const f in d)e.update(d[f],i.ARRAY_BUFFER)}function c(u){const d=[],f=u.index,g=u.attributes.position;let _=0;if(g===void 0)return;if(f!==null){const M=f.array;_=f.version;for(let T=0,x=M.length;T<x;T+=3){const S=M[T+0],w=M[T+1],E=M[T+2];d.push(S,w,w,E,E,S)}}else{const M=g.array;_=g.version;for(let T=0,x=M.length/3-1;T<x;T+=3){const S=T+0,w=T+1,E=T+2;d.push(S,w,w,E,E,S)}}const p=new(g.count>=65535?Pf:Cf)(d,1);p.version=_;const m=r.get(u);m&&e.remove(m),r.set(u,p)}function h(u){const d=r.get(u);if(d){const f=u.index;f!==null&&d.version<f.version&&c(u)}else c(u);return r.get(u)}return{get:a,update:l,getWireframeAttribute:h}}function Qv(i,e,t){let n;function s(u){n=u}let r,o;function a(u){r=u.type,o=u.bytesPerElement}function l(u,d){i.drawElements(n,d,r,u*o),t.update(d,n,1)}function c(u,d,f){f!==0&&(i.drawElementsInstanced(n,d,r,u*o,f),t.update(d,n,f))}function h(u,d,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,d,0,r,u,0,f);let _=0;for(let p=0;p<f;p++)_+=d[p];t.update(_,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function ey(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(r/3);break;case i.LINES:t.lines+=a*(r/2);break;case i.LINE_STRIP:t.lines+=a*(r-1);break;case i.LINE_LOOP:t.lines+=a*r;break;case i.POINTS:t.points+=a*r;break;default:We("WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function ty(i,e,t){const n=new WeakMap,s=new ft;function r(o,a,l){const c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let d=n.get(a);if(d===void 0||d.count!==u){let P=function(){y.dispose(),n.delete(a),a.removeEventListener("dispose",P)};var f=P;d!==void 0&&d.texture.dispose();const g=a.morphAttributes.position!==void 0,_=a.morphAttributes.normal!==void 0,p=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],M=a.morphAttributes.normal||[],T=a.morphAttributes.color||[];let x=0;g===!0&&(x=1),_===!0&&(x=2),p===!0&&(x=3);let S=a.attributes.position.count*x,w=1;S>e.maxTextureSize&&(w=Math.ceil(S/e.maxTextureSize),S=e.maxTextureSize);const E=new Float32Array(S*w*4*u),y=new wf(E,S,w,u);y.type=wn,y.needsUpdate=!0;const R=x*4;for(let I=0;I<u;I++){const F=m[I],V=M[I],U=T[I],B=S*w*4*I;for(let K=0;K<F.count;K++){const W=K*R;g===!0&&(s.fromBufferAttribute(F,K),E[B+W+0]=s.x,E[B+W+1]=s.y,E[B+W+2]=s.z,E[B+W+3]=0),_===!0&&(s.fromBufferAttribute(V,K),E[B+W+4]=s.x,E[B+W+5]=s.y,E[B+W+6]=s.z,E[B+W+7]=0),p===!0&&(s.fromBufferAttribute(U,K),E[B+W+8]=s.x,E[B+W+9]=s.y,E[B+W+10]=s.z,E[B+W+11]=U.itemSize===4?s.w:1)}}d={count:u,texture:y,size:new ne(S,w)},n.set(a,d),a.addEventListener("dispose",P)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let g=0;for(let p=0;p<c.length;p++)g+=c[p];const _=a.morphTargetsRelative?1:1-g;l.getUniforms().setValue(i,"morphTargetBaseInfluence",_),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function ny(i,e,t,n,s){let r=new WeakMap;function o(c){const h=s.render.frame,u=c.geometry,d=e.get(c,u);if(r.get(d)!==h&&(e.update(d),r.set(d,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){const f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return d}function a(){r=new WeakMap}function l(c){const h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:o,dispose:a}}const iy={[Zc]:"LINEAR_TONE_MAPPING",[Jc]:"REINHARD_TONE_MAPPING",[jc]:"CINEON_TONE_MAPPING",[ba]:"ACES_FILMIC_TONE_MAPPING",[eh]:"AGX_TONE_MAPPING",[th]:"NEUTRAL_TONE_MAPPING",[Qc]:"CUSTOM_TONE_MAPPING"};function sy(i,e,t,n,s,r){const o=new Wt(e,t,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1});let a=null,l=null;const c=new yt;c.setAttribute("position",new ot([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new ot([0,2,0,0,2,0],2));const h=new Xf({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new Re(c,h),d=new io(-1,1,1,-1,0,1);let f=null,g=null,_=!1,p,m=null,M=[],T=!1;this.setSize=function(x,S){o.setSize(x,S),a!==null&&a.setSize(x,S),l!==null&&l.setSize(x,S);for(let w=0;w<M.length;w++){const E=M[w];E.setSize&&E.setSize(x,S)}},this.setEffects=function(x){M=x,T=M.length>0&&M[0].isRenderPass===!0;const S=o.width,w=o.height;M.length>0&&a===null&&(a=new Wt(S,w,{type:Zt,depthBuffer:!1,stencilBuffer:!1}),l=new Wt(S,w,{type:Zt,depthBuffer:!1,stencilBuffer:!1}));for(let E=0;E<M.length;E++){const y=M[E];y.setSize&&y.setSize(S,w)}},this.begin=function(x,S){if(_||x.toneMapping===ti&&M.length===0)return!1;if(m=S,S!==null){const w=S.width,E=S.height;(o.width!==w||o.height!==E)&&this.setSize(w,E)}return T===!1&&x.setRenderTarget(o),p=x.toneMapping,x.toneMapping=ti,!0},this.hasRenderPass=function(){return T},this.end=function(x,S){x.toneMapping=p,_=!0;let w=o,E=a;for(let y=0;y<M.length;y++){const R=M[y];R.enabled!==!1&&(R.render(x,E,w,S),R.needsSwap!==!1&&(w=E,E=E===a?l:a))}if(f!==x.outputColorSpace||g!==x.toneMapping){f=x.outputColorSpace,g=x.toneMapping,h.defines={},et.getTransfer(f)===dt&&(h.defines.SRGB_TRANSFER="");const y=iy[g];y&&(h.defines[y]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=w.texture,x.setRenderTarget(m),x.render(u,d),m=null,_=!1},this.isCompositing=function(){return _},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),l!==null&&l.dispose(),c.dispose(),h.dispose()}}const tp=new Ot,Dc=new qr(1,1),np=new wf,ip=new hg,sp=new Nf,ud=[],dd=[],fd=new Float32Array(16),pd=new Float32Array(9),md=new Float32Array(4);function or(i,e,t){const n=i[0];if(n<=0||n>0)return i;const s=e*t;let r=ud[s];if(r===void 0&&(r=new Float32Array(s),ud[s]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(r,a)}return r}function Bt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function zt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Aa(i,e){let t=dd[e];t===void 0&&(t=new Int32Array(e),dd[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function ry(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function oy(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Bt(t,e))return;i.uniform2fv(this.addr,e),zt(t,e)}}function ay(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Bt(t,e))return;i.uniform3fv(this.addr,e),zt(t,e)}}function ly(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Bt(t,e))return;i.uniform4fv(this.addr,e),zt(t,e)}}function cy(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Bt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),zt(t,e)}else{if(Bt(t,n))return;md.set(n),i.uniformMatrix2fv(this.addr,!1,md),zt(t,n)}}function hy(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Bt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),zt(t,e)}else{if(Bt(t,n))return;pd.set(n),i.uniformMatrix3fv(this.addr,!1,pd),zt(t,n)}}function uy(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Bt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),zt(t,e)}else{if(Bt(t,n))return;fd.set(n),i.uniformMatrix4fv(this.addr,!1,fd),zt(t,n)}}function dy(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function fy(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Bt(t,e))return;i.uniform2iv(this.addr,e),zt(t,e)}}function py(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Bt(t,e))return;i.uniform3iv(this.addr,e),zt(t,e)}}function my(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Bt(t,e))return;i.uniform4iv(this.addr,e),zt(t,e)}}function gy(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function _y(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Bt(t,e))return;i.uniform2uiv(this.addr,e),zt(t,e)}}function xy(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Bt(t,e))return;i.uniform3uiv(this.addr,e),zt(t,e)}}function vy(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Bt(t,e))return;i.uniform4uiv(this.addr,e),zt(t,e)}}function yy(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Dc.compareFunction=t.isReversedDepthBuffer()?uh:hh,r=Dc):r=tp,t.setTexture2D(e||r,s)}function My(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||ip,s)}function Sy(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||sp,s)}function by(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||np,s)}function Ty(i){switch(i){case 5126:return ry;case 35664:return oy;case 35665:return ay;case 35666:return ly;case 35674:return cy;case 35675:return hy;case 35676:return uy;case 5124:case 35670:return dy;case 35667:case 35671:return fy;case 35668:case 35672:return py;case 35669:case 35673:return my;case 5125:return gy;case 36294:return _y;case 36295:return xy;case 36296:return vy;case 35678:case 36198:case 36298:case 36306:case 35682:return yy;case 35679:case 36299:case 36307:return My;case 35680:case 36300:case 36308:case 36293:return Sy;case 36289:case 36303:case 36311:case 36292:return by}}function wy(i,e){i.uniform1fv(this.addr,e)}function Ey(i,e){const t=or(e,this.size,2);i.uniform2fv(this.addr,t)}function Ay(i,e){const t=or(e,this.size,3);i.uniform3fv(this.addr,t)}function Ry(i,e){const t=or(e,this.size,4);i.uniform4fv(this.addr,t)}function Cy(i,e){const t=or(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Py(i,e){const t=or(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function Ly(i,e){const t=or(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Iy(i,e){i.uniform1iv(this.addr,e)}function Dy(i,e){i.uniform2iv(this.addr,e)}function Ny(i,e){i.uniform3iv(this.addr,e)}function Uy(i,e){i.uniform4iv(this.addr,e)}function Fy(i,e){i.uniform1uiv(this.addr,e)}function Oy(i,e){i.uniform2uiv(this.addr,e)}function By(i,e){i.uniform3uiv(this.addr,e)}function zy(i,e){i.uniform4uiv(this.addr,e)}function ky(i,e,t){const n=this.cache,s=e.length,r=Aa(t,s);Bt(n,r)||(i.uniform1iv(this.addr,r),zt(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=Dc:o=tp;for(let a=0;a!==s;++a)t.setTexture2D(e[a]||o,r[a])}function Hy(i,e,t){const n=this.cache,s=e.length,r=Aa(t,s);Bt(n,r)||(i.uniform1iv(this.addr,r),zt(n,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||ip,r[o])}function Vy(i,e,t){const n=this.cache,s=e.length,r=Aa(t,s);Bt(n,r)||(i.uniform1iv(this.addr,r),zt(n,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||sp,r[o])}function Gy(i,e,t){const n=this.cache,s=e.length,r=Aa(t,s);Bt(n,r)||(i.uniform1iv(this.addr,r),zt(n,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||np,r[o])}function Wy(i){switch(i){case 5126:return wy;case 35664:return Ey;case 35665:return Ay;case 35666:return Ry;case 35674:return Cy;case 35675:return Py;case 35676:return Ly;case 5124:case 35670:return Iy;case 35667:case 35671:return Dy;case 35668:case 35672:return Ny;case 35669:case 35673:return Uy;case 5125:return Fy;case 36294:return Oy;case 36295:return By;case 36296:return zy;case 35678:case 36198:case 36298:case 36306:case 35682:return ky;case 35679:case 36299:case 36307:return Hy;case 35680:case 36300:case 36308:case 36293:return Vy;case 36289:case 36303:case 36311:case 36292:return Gy}}class Xy{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Ty(t.type)}}class Yy{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Wy(t.type)}}class qy{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(e,t[a.id],n)}}}const yl=/(\w+)(\])?(\[|\.)?/g;function gd(i,e){i.seq.push(e),i.map[e.id]=e}function Ky(i,e,t){const n=i.name,s=n.length;for(yl.lastIndex=0;;){const r=yl.exec(n),o=yl.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){gd(t,c===void 0?new Xy(a,i,e):new Yy(a,i,e));break}else{let u=t.map[a];u===void 0&&(u=new qy(a),gd(t,u)),t=u}}}class sa{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){const a=e.getActiveUniform(t,o),l=e.getUniformLocation(t,a.name);Ky(a,l,this)}const s=[],r=[];for(const o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,n,s){const r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){const s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,o=t.length;r!==o;++r){const a=t[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,s)}}static seqWithValue(e,t){const n=[];for(let s=0,r=e.length;s!==r;++s){const o=e[s];o.id in t&&n.push(o)}return n}}function _d(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const $y=37297;let Zy=0;function Jy(i,e){const t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const xd=new Ke;function jy(i){et._getMatrix(xd,et.workingColorSpace,i);const e=`mat3( ${xd.elements.map(t=>t.toFixed(4))} )`;switch(et.getTransfer(i)){case ua:return[e,"LinearTransferOETF"];case dt:return[e,"sRGBTransferOETF"];default:return Ne("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function vd(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+Jy(i.getShaderSource(e),a)}else return r}function Qy(i,e){const t=jy(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const eM={[Zc]:"Linear",[Jc]:"Reinhard",[jc]:"Cineon",[ba]:"ACESFilmic",[eh]:"AgX",[th]:"Neutral",[Qc]:"Custom"};function tM(i,e){const t=eM[e];return t===void 0?(Ne("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Vo=new A;function nM(){et.getLuminanceCoefficients(Vo);const i=Vo.x.toFixed(4),e=Vo.y.toFixed(4),t=Vo.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function iM(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Cr).join(`
`)}function sM(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function rM(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(e,s),o=r.name;let a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function Cr(i){return i!==""}function yd(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,e.numSunLights).replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,e.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Md(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const oM=/^[ \t]*#include +<([\w\d./]+)>/gm;function Nc(i){return i.replace(oM,lM)}const aM=new Map;function lM(i,e){let t=Qe[e];if(t===void 0){const n=aM.get(e);if(n!==void 0)t=Qe[n],Ne('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return Nc(t)}const cM=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Sd(i){return i.replace(cM,hM)}function hM(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function bd(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const uM={[Jo]:"SHADOWMAP_TYPE_PCF",[Er]:"SHADOWMAP_TYPE_VSM"};function dM(i){return uM[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const fM={[es]:"ENVMAP_TYPE_CUBE",[Ks]:"ENVMAP_TYPE_CUBE",[Ta]:"ENVMAP_TYPE_CUBE_UV"};function pM(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":fM[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const mM={[Ks]:"ENVMAP_MODE_REFRACTION"};function gM(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":mM[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const _M={[$c]:"ENVMAP_BLENDING_MULTIPLY",[Mm]:"ENVMAP_BLENDING_MIX",[Sm]:"ENVMAP_BLENDING_ADD"};function xM(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":_M[i.combine]||"ENVMAP_BLENDING_NONE"}function vM(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function yM(i,e,t,n){const s=i.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=dM(t),c=pM(t),h=gM(t),u=xM(t),d=vM(t),f=iM(t),g=sM(r),_=s.createProgram();let p,m,M=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Cr).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Cr).join(`
`),m.length>0&&(m+=`
`)):(p=[bd(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Cr).join(`
`),m=[bd(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.retroreflection?"#define USE_RETROREFLECTION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==ti?"#define TONE_MAPPING":"",t.toneMapping!==ti?Qe.tonemapping_pars_fragment:"",t.toneMapping!==ti?tM("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Qe.colorspace_pars_fragment,Qy("linearToOutputTexel",t.outputColorSpace),nM(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Cr).join(`
`)),o=Nc(o),o=yd(o,t),o=Md(o,t),a=Nc(a),a=yd(a,t),a=Md(a,t),o=Sd(o),a=Sd(a),t.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",t.glslVersion===uu?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===uu?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);const T=M+p+o,x=M+m+a,S=_d(s,s.VERTEX_SHADER,T),w=_d(s,s.FRAGMENT_SHADER,x);s.attachShader(_,S),s.attachShader(_,w),t.index0AttributeName!==void 0?s.bindAttribLocation(_,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function E(I){if(i.debug.checkShaderErrors){const F=s.getProgramInfoLog(_)||"",V=s.getShaderInfoLog(S)||"",U=s.getShaderInfoLog(w)||"",B=F.trim(),K=V.trim(),W=U.trim();let ie=!0,q=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(ie=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,_,S,w);else{const Q=vd(s,S,"vertex"),O=vd(s,w,"fragment");We("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+B+`
`+Q+`
`+O)}else B!==""?Ne("WebGLProgram: Program Info Log:",B):(K===""||W==="")&&(q=!1);q&&(I.diagnostics={runnable:ie,programLog:B,vertexShader:{log:K,prefix:p},fragmentShader:{log:W,prefix:m}})}s.deleteShader(S),s.deleteShader(w),y=new sa(s,_),R=rM(s,_)}let y;this.getUniforms=function(){return y===void 0&&E(this),y};let R;this.getAttributes=function(){return R===void 0&&E(this),R};let P=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=s.getProgramParameter(_,$y)),P},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Zy++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=S,this.fragmentShader=w,this}let MM=0;class SM{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){const s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new bM(e),t.set(e,n)),n}}class bM{constructor(e){this.id=MM++,this.code=e,this.usedTimes=0}}function TM(i){return i===ns||i===aa||i===la}function wM(i,e,t,n,s,r){const o=new Ef,a=new SM,l=new Set,c=[],h=new Map,u=n.logarithmicDepthBuffer;let d=n.precision;const f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(y){return l.add(y),y===0?"uv":`uv${y}`}function _(y,R,P,I,F,V){const U=I.fog,B=F.geometry,K=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?I.environment:null,W=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,ie=e.get(y.envMap||K,W),q=ie&&ie.mapping===Ta?ie.image.height:null,Q=f[y.type];y.precision!==null&&(d=n.getMaxPrecision(y.precision),d!==y.precision&&Ne("WebGLProgram.getParameters:",y.precision,"not supported, using",d,"instead."));const O=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,re=O!==void 0?O.length:0;let ae=0;B.morphAttributes.position!==void 0&&(ae=1),B.morphAttributes.normal!==void 0&&(ae=2),B.morphAttributes.color!==void 0&&(ae=3);let Ie,ze,qe,Y;if(Q){const Mt=qn[Q];Ie=Mt.vertexShader,ze=Mt.fragmentShader}else{Ie=y.vertexShader,ze=y.fragmentShader;const Mt=a.getVertexShaderStage(y),ht=a.getFragmentShaderStage(y);a.update(y,Mt,ht),qe=Mt.id,Y=ht.id}const J=i.getRenderTarget(),me=i.state.buffers.depth.getReversed(),ke=F.isInstancedMesh===!0,we=F.isBatchedMesh===!0,He=!!y.map,at=!!y.matcap,te=!!ie,oe=!!y.aoMap,le=!!y.lightMap,ce=!!y.bumpMap&&y.wireframe===!1,pe=!!y.normalMap,Ve=!!y.displacementMap,Be=!!y.emissiveMap,Ye=!!y.metalnessMap,$e=!!y.roughnessMap,L=y.anisotropy>0,ct=y.clearcoat>0,nt=y.dispersion>0,C=y.retroreflectivity>0,v=y.iridescence>0,z=y.sheen>0,G=y.transmission>0,$=L&&!!y.anisotropyMap,ue=ct&&!!y.clearcoatMap,fe=ct&&!!y.clearcoatNormalMap,Z=ct&&!!y.clearcoatRoughnessMap,ee=v&&!!y.iridescenceMap,ge=v&&!!y.iridescenceThicknessMap,Ue=z&&!!y.sheenColorMap,ye=z&&!!y.sheenRoughnessMap,_e=!!y.specularMap,Fe=!!y.specularColorMap,Ge=!!y.specularIntensityMap,Ze=G&&!!y.transmissionMap,N=G&&!!y.thicknessMap,xe=!!y.gradientMap,j=!!y.alphaMap,ve=y.alphaTest>0,Te=!!y.alphaHash,se=!!y.extensions;let Oe=ti;y.toneMapped&&(J===null||J.isXRRenderTarget===!0)&&(Oe=i.toneMapping);const Le={shaderID:Q,shaderType:y.type,shaderName:y.name,vertexShader:Ie,fragmentShader:ze,defines:y.defines,customVertexShaderID:qe,customFragmentShaderID:Y,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:d,batching:we,batchingColor:we&&F._colorsTexture!==null,instancing:ke,instancingColor:ke&&F.instanceColor!==null,instancingMorph:ke&&F.morphTexture!==null,outputColorSpace:J===null?i.outputColorSpace:J.isXRRenderTarget===!0?J.texture.colorSpace:et.workingColorSpace,alphaToCoverage:!!y.alphaToCoverage,map:He,matcap:at,envMap:te,envMapMode:te&&ie.mapping,envMapCubeUVHeight:q,aoMap:oe,lightMap:le,bumpMap:ce,normalMap:pe,displacementMap:Ve,emissiveMap:Be,normalMapObjectSpace:pe&&y.normalMapType===Pm,normalMapTangentSpace:pe&&y.normalMapType===ha,packedNormalMap:pe&&y.normalMapType===ha&&TM(y.normalMap.format),metalnessMap:Ye,roughnessMap:$e,anisotropy:L,anisotropyMap:$,clearcoat:ct,clearcoatMap:ue,clearcoatNormalMap:fe,clearcoatRoughnessMap:Z,dispersion:nt,retroreflection:C,iridescence:v,iridescenceMap:ee,iridescenceThicknessMap:ge,sheen:z,sheenColorMap:Ue,sheenRoughnessMap:ye,specularMap:_e,specularColorMap:Fe,specularIntensityMap:Ge,transmission:G,transmissionMap:Ze,thicknessMap:N,gradientMap:xe,opaque:y.transparent===!1&&y.blending===Pr&&y.alphaToCoverage===!1,alphaMap:j,alphaTest:ve,alphaHash:Te,combine:y.combine,mapUv:He&&g(y.map.channel),aoMapUv:oe&&g(y.aoMap.channel),lightMapUv:le&&g(y.lightMap.channel),bumpMapUv:ce&&g(y.bumpMap.channel),normalMapUv:pe&&g(y.normalMap.channel),displacementMapUv:Ve&&g(y.displacementMap.channel),emissiveMapUv:Be&&g(y.emissiveMap.channel),metalnessMapUv:Ye&&g(y.metalnessMap.channel),roughnessMapUv:$e&&g(y.roughnessMap.channel),anisotropyMapUv:$&&g(y.anisotropyMap.channel),clearcoatMapUv:ue&&g(y.clearcoatMap.channel),clearcoatNormalMapUv:fe&&g(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Z&&g(y.clearcoatRoughnessMap.channel),iridescenceMapUv:ee&&g(y.iridescenceMap.channel),iridescenceThicknessMapUv:ge&&g(y.iridescenceThicknessMap.channel),sheenColorMapUv:Ue&&g(y.sheenColorMap.channel),sheenRoughnessMapUv:ye&&g(y.sheenRoughnessMap.channel),specularMapUv:_e&&g(y.specularMap.channel),specularColorMapUv:Fe&&g(y.specularColorMap.channel),specularIntensityMapUv:Ge&&g(y.specularIntensityMap.channel),transmissionMapUv:Ze&&g(y.transmissionMap.channel),thicknessMapUv:N&&g(y.thicknessMap.channel),alphaMapUv:j&&g(y.alphaMap.channel),vertexTangents:!!B.attributes.tangent&&(pe||L),vertexNormals:!!B.attributes.normal,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!B.attributes.uv&&(He||j),fog:!!U,useFog:y.fog===!0,fogExp2:!!U&&U.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||B.attributes.normal===void 0&&pe===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:me,skinning:F.isSkinnedMesh===!0,hasPositionAttribute:B.attributes.position!==void 0,morphTargets:B.morphAttributes.position!==void 0,morphNormals:B.morphAttributes.normal!==void 0,morphColors:B.morphAttributes.color!==void 0,morphTargetsCount:re,morphTextureStride:ae,numSunLights:R.sun.length,numDirLights:R.directional.length,numPointLights:R.point.length,numSpotLights:R.spot.length,numSpotLightMaps:R.spotLightMap.length,numRectAreaLights:R.rectArea.length,numHemiLights:R.hemi.length,numSunLightShadows:R.sunShadowMap.length,numDirLightShadows:R.directionalShadowMap.length,numPointLightShadows:R.pointShadowMap.length,numSpotLightShadows:R.spotShadowMap.length,numSpotLightShadowsWithMaps:R.numSpotLightShadowsWithMaps,numLightProbes:R.numLightProbes,numLightProbeGrids:V.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:y.dithering,shadowMapEnabled:i.shadowMap.enabled&&P.length>0,shadowMapType:i.shadowMap.type,toneMapping:Oe,decodeVideoTexture:He&&y.map.isVideoTexture===!0&&et.getTransfer(y.map.colorSpace)===dt,decodeVideoTextureEmissive:Be&&y.emissiveMap.isVideoTexture===!0&&et.getTransfer(y.emissiveMap.colorSpace)===dt,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===pn,flipSided:y.side===sn,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:se&&y.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(se&&y.extensions.multiDraw===!0||we)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return Le.vertexUv1s=l.has(1),Le.vertexUv2s=l.has(2),Le.vertexUv3s=l.has(3),l.clear(),Le}function p(y){const R=[];if(y.shaderID?R.push(y.shaderID):(R.push(y.customVertexShaderID),R.push(y.customFragmentShaderID)),y.defines!==void 0)for(const P in y.defines)R.push(P),R.push(y.defines[P]);return y.isRawShaderMaterial===!1&&(m(R,y),M(R,y),R.push(i.outputColorSpace)),R.push(y.customProgramCacheKey),R.join()}function m(y,R){y.push(R.precision),y.push(R.outputColorSpace),y.push(R.envMapMode),y.push(R.envMapCubeUVHeight),y.push(R.mapUv),y.push(R.alphaMapUv),y.push(R.lightMapUv),y.push(R.aoMapUv),y.push(R.bumpMapUv),y.push(R.normalMapUv),y.push(R.displacementMapUv),y.push(R.emissiveMapUv),y.push(R.metalnessMapUv),y.push(R.roughnessMapUv),y.push(R.anisotropyMapUv),y.push(R.clearcoatMapUv),y.push(R.clearcoatNormalMapUv),y.push(R.clearcoatRoughnessMapUv),y.push(R.iridescenceMapUv),y.push(R.iridescenceThicknessMapUv),y.push(R.sheenColorMapUv),y.push(R.sheenRoughnessMapUv),y.push(R.specularMapUv),y.push(R.specularColorMapUv),y.push(R.specularIntensityMapUv),y.push(R.transmissionMapUv),y.push(R.thicknessMapUv),y.push(R.combine),y.push(R.fogExp2),y.push(R.sizeAttenuation),y.push(R.morphTargetsCount),y.push(R.morphAttributeCount),y.push(R.numSunLights),y.push(R.numDirLights),y.push(R.numPointLights),y.push(R.numSpotLights),y.push(R.numSpotLightMaps),y.push(R.numHemiLights),y.push(R.numRectAreaLights),y.push(R.numSunLightShadows),y.push(R.numDirLightShadows),y.push(R.numPointLightShadows),y.push(R.numSpotLightShadows),y.push(R.numSpotLightShadowsWithMaps),y.push(R.numLightProbes),y.push(R.shadowMapType),y.push(R.toneMapping),y.push(R.numClippingPlanes),y.push(R.numClipIntersection),y.push(R.depthPacking)}function M(y,R){o.disableAll(),R.instancing&&o.enable(0),R.instancingColor&&o.enable(1),R.instancingMorph&&o.enable(2),R.matcap&&o.enable(3),R.envMap&&o.enable(4),R.normalMapObjectSpace&&o.enable(5),R.normalMapTangentSpace&&o.enable(6),R.clearcoat&&o.enable(7),R.iridescence&&o.enable(8),R.alphaTest&&o.enable(9),R.vertexColors&&o.enable(10),R.vertexAlphas&&o.enable(11),R.vertexUv1s&&o.enable(12),R.vertexUv2s&&o.enable(13),R.vertexUv3s&&o.enable(14),R.vertexTangents&&o.enable(15),R.anisotropy&&o.enable(16),R.alphaHash&&o.enable(17),R.batching&&o.enable(18),R.dispersion&&o.enable(19),R.retroreflection&&o.enable(24),R.batchingColor&&o.enable(20),R.gradientMap&&o.enable(21),R.packedNormalMap&&o.enable(22),R.vertexNormals&&o.enable(23),y.push(o.mask),o.disableAll(),R.fog&&o.enable(0),R.useFog&&o.enable(1),R.flatShading&&o.enable(2),R.logarithmicDepthBuffer&&o.enable(3),R.reversedDepthBuffer&&o.enable(4),R.skinning&&o.enable(5),R.morphTargets&&o.enable(6),R.morphNormals&&o.enable(7),R.morphColors&&o.enable(8),R.premultipliedAlpha&&o.enable(9),R.shadowMapEnabled&&o.enable(10),R.doubleSided&&o.enable(11),R.flipSided&&o.enable(12),R.useDepthPacking&&o.enable(13),R.dithering&&o.enable(14),R.transmission&&o.enable(15),R.sheen&&o.enable(16),R.opaque&&o.enable(17),R.pointsUvs&&o.enable(18),R.decodeVideoTexture&&o.enable(19),R.decodeVideoTextureEmissive&&o.enable(20),R.alphaToCoverage&&o.enable(21),R.numLightProbeGrids>0&&o.enable(22),R.hasPositionAttribute&&o.enable(23),y.push(o.mask)}function T(y){const R=f[y.type];let P;if(R){const I=qn[R];P=Qs.clone(I.uniforms)}else P=y.uniforms;return P}function x(y,R){let P=h.get(R);return P!==void 0?++P.usedTimes:(P=new yM(i,R,y,s),c.push(P),h.set(R,P)),P}function S(y){if(--y.usedTimes===0){const R=c.indexOf(y);c[R]=c[c.length-1],c.pop(),h.delete(y.cacheKey),y.destroy()}}function w(y){a.remove(y)}function E(){a.dispose()}return{getParameters:_,getProgramCacheKey:p,getUniforms:T,acquireProgram:x,releaseProgram:S,releaseShaderCache:w,programs:c,dispose:E}}function EM(){let i=new WeakMap;function e(o){return i.has(o)}function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function AM(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Td(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function wd(){const i=[];let e=0;const t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function o(d){let f=0;return d.isInstancedMesh&&(f+=2),d.isSkinnedMesh&&(f+=1),f}function a(d,f,g,_,p,m){let M=i[e];return M===void 0?(M={id:d.id,object:d,geometry:f,material:g,materialVariant:o(d),groupOrder:_,renderOrder:d.renderOrder,z:p,group:m},i[e]=M):(M.id=d.id,M.object=d,M.geometry=f,M.material=g,M.materialVariant=o(d),M.groupOrder=_,M.renderOrder=d.renderOrder,M.z=p,M.group=m),e++,M}function l(d,f,g,_,p,m,M){M.reversedDepth===!0&&(p=-p);const T=a(d,f,g,_,p,m);g.transmission>0?n.push(T):g.transparent===!0?s.push(T):t.push(T)}function c(d,f,g,_,p,m){const M=a(d,f,g,_,p,m);g.transmission>0?n.unshift(M):g.transparent===!0?s.unshift(M):t.unshift(M)}function h(d,f){t.length>1&&t.sort(d||AM),n.length>1&&n.sort(f||Td),s.length>1&&s.sort(f||Td)}function u(){for(let d=e,f=i.length;d<f;d++){const g=i[d];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:u,sort:h}}function RM(){let i=new WeakMap;function e(n,s){const r=i.get(n);let o;return r===void 0?(o=new wd,i.set(n,[o])):s>=r.length?(o=new wd,r.push(o)):o=r[s],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function CM(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={direction:new A,color:new de};break;case"SpotLight":t={position:new A,direction:new A,color:new de,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new A,color:new de,distance:0,decay:0};break;case"HemisphereLight":t={direction:new A,skyColor:new de,groundColor:new de};break;case"RectAreaLight":t={color:new de,position:new A,halfWidth:new A,halfHeight:new A};break}return i[e.id]=t,t}}}function PM(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ne};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ne};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ne,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let LM=0;function IM(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function DM(i){const e=new CM,t=PM(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new A);const s=new A,r=new Xe,o=new Xe;function a(c){let h=0,u=0,d=0;for(let F=0;F<9;F++)n.probe[F].set(0,0,0);let f=0,g=0,_=0,p=0,m=0,M=0,T=0,x=0,S=0,w=0,E=0,y=0,R=0,P=0;c.sort(IM);for(let F=0,V=c.length;F<V;F++){const U=c[F],B=U.color,K=U.intensity,W=U.distance;let ie=null;if(U.shadow&&U.shadow.map&&(U.shadow.map.texture.format===ns?ie=U.shadow.map.texture:ie=U.shadow.map.depthTexture||U.shadow.map.texture),U.isAmbientLight)h+=B.r*K,u+=B.g*K,d+=B.b*K;else if(U.isLightProbe){for(let q=0;q<9;q++)n.probe[q].addScaledVector(U.sh.coefficients[q],K);P++}else if(U.isSunLight){const q=e.get(U);if(q.color.copy(U.color).multiplyScalar(U.intensity),U.castShadow){const Q=U.shadow,O=t.get(U);O.shadowIntensity=Q.intensity,O.shadowBias=Q.bias,O.shadowNormalBias=Q.normalBias,O.shadowRadius=Q.radius,O.shadowMapSize.copy(Q.mapSize).multiply(Q.getFrameExtents()),n.sunShadow[g]=O,n.sunShadowMap[g]=ie;const re=Q.getViewportCount();for(let ae=0;ae<re;ae++)n.sunShadowMatrix[_+ae]=Q.getMatrix(ae),n.sunShadowCascade[_+ae]=Q._cascadeData[ae];_+=re,g++}n.sun[f]=q,f++}else if(U.isDirectionalLight){const q=e.get(U);if(q.color.copy(U.color).multiplyScalar(U.intensity),U.castShadow){const Q=U.shadow,O=t.get(U);O.shadowIntensity=Q.intensity,O.shadowBias=Q.bias,O.shadowNormalBias=Q.normalBias,O.shadowRadius=Q.radius,O.shadowMapSize=Q.mapSize,n.directionalShadow[p]=O,n.directionalShadowMap[p]=ie,n.directionalShadowMatrix[p]=U.shadow.matrix,S++}n.directional[p]=q,p++}else if(U.isSpotLight){const q=e.get(U);q.position.setFromMatrixPosition(U.matrixWorld),q.color.copy(B).multiplyScalar(K),q.distance=W,q.coneCos=Math.cos(U.angle),q.penumbraCos=Math.cos(U.angle*(1-U.penumbra)),q.decay=U.decay,n.spot[M]=q;const Q=U.shadow;if(U.map&&(n.spotLightMap[y]=U.map,y++,Q.updateMatrices(U),U.castShadow&&R++),n.spotLightMatrix[M]=Q.matrix,U.castShadow){const O=t.get(U);O.shadowIntensity=Q.intensity,O.shadowBias=Q.bias,O.shadowNormalBias=Q.normalBias,O.shadowRadius=Q.radius,O.shadowMapSize=Q.mapSize,n.spotShadow[M]=O,n.spotShadowMap[M]=ie,E++}M++}else if(U.isRectAreaLight){const q=e.get(U);q.color.copy(B).multiplyScalar(K),q.halfWidth.set(U.width*.5,0,0),q.halfHeight.set(0,U.height*.5,0),n.rectArea[T]=q,T++}else if(U.isPointLight){const q=e.get(U);if(q.color.copy(U.color).multiplyScalar(U.intensity),q.distance=U.distance,q.decay=U.decay,U.castShadow){const Q=U.shadow,O=t.get(U);O.shadowIntensity=Q.intensity,O.shadowBias=Q.bias,O.shadowNormalBias=Q.normalBias,O.shadowRadius=Q.radius,O.shadowMapSize=Q.mapSize,O.shadowCameraNear=Q.camera.near,O.shadowCameraFar=Q.camera.far,n.pointShadow[m]=O,n.pointShadowMap[m]=ie,n.pointShadowMatrix[m]=U.shadow.matrix,w++}n.point[m]=q,m++}else if(U.isHemisphereLight){const q=e.get(U);q.skyColor.copy(U.color).multiplyScalar(K),q.groundColor.copy(U.groundColor).multiplyScalar(K),n.hemi[x]=q,x++}}T>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Me.LTC_FLOAT_1,n.rectAreaLTC2=Me.LTC_FLOAT_2):(n.rectAreaLTC1=Me.LTC_HALF_1,n.rectAreaLTC2=Me.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;const I=n.hash;(I.sunLength!==f||I.directionalLength!==p||I.pointLength!==m||I.spotLength!==M||I.rectAreaLength!==T||I.hemiLength!==x||I.numSunShadows!==g||I.numDirectionalShadows!==S||I.numPointShadows!==w||I.numSpotShadows!==E||I.numSpotMaps!==y||I.numLightProbes!==P)&&(n.sun.length=f,n.directional.length=p,n.spot.length=M,n.rectArea.length=T,n.point.length=m,n.hemi.length=x,n.sunShadow.length=g,n.sunShadowMap.length=g,n.sunShadowMatrix.length=_,n.sunShadowCascade.length=_,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.directionalShadowMatrix.length=S,n.pointShadow.length=w,n.pointShadowMap.length=w,n.pointShadowMatrix.length=w,n.spotShadow.length=E,n.spotShadowMap.length=E,n.spotLightMatrix.length=E+y-R,n.spotLightMap.length=y,n.numSpotLightShadowsWithMaps=R,n.numLightProbes=P,I.sunLength=f,I.directionalLength=p,I.pointLength=m,I.spotLength=M,I.rectAreaLength=T,I.hemiLength=x,I.numSunShadows=g,I.numDirectionalShadows=S,I.numPointShadows=w,I.numSpotShadows=E,I.numSpotMaps=y,I.numLightProbes=P,n.version=LM++)}function l(c,h){let u=0,d=0,f=0,g=0,_=0,p=0;const m=h.matrixWorldInverse;for(let M=0,T=c.length;M<T;M++){const x=c[M];if(x.isSunLight){const S=n.sun[u];S.direction.setFromMatrixPosition(x.matrixWorld),S.direction.transformDirection(m),u++}else if(x.isDirectionalLight){const S=n.directional[d];S.direction.setFromMatrixPosition(x.matrixWorld),s.setFromMatrixPosition(x.target.matrixWorld),S.direction.sub(s),S.direction.transformDirection(m),d++}else if(x.isSpotLight){const S=n.spot[g];S.position.setFromMatrixPosition(x.matrixWorld),S.position.applyMatrix4(m),S.direction.setFromMatrixPosition(x.matrixWorld),s.setFromMatrixPosition(x.target.matrixWorld),S.direction.sub(s),S.direction.transformDirection(m),g++}else if(x.isRectAreaLight){const S=n.rectArea[_];S.position.setFromMatrixPosition(x.matrixWorld),S.position.applyMatrix4(m),o.identity(),r.copy(x.matrixWorld),r.premultiply(m),o.extractRotation(r),S.halfWidth.set(x.width*.5,0,0),S.halfHeight.set(0,x.height*.5,0),S.halfWidth.applyMatrix4(o),S.halfHeight.applyMatrix4(o),_++}else if(x.isPointLight){const S=n.point[f];S.position.setFromMatrixPosition(x.matrixWorld),S.position.applyMatrix4(m),f++}else if(x.isHemisphereLight){const S=n.hemi[p];S.direction.setFromMatrixPosition(x.matrixWorld),S.direction.transformDirection(m),p++}}}return{setup:a,setupView:l,state:n}}function Ed(i){const e=new DM(i),t=[],n=[],s=[];function r(d){u.camera=d,t.length=0,n.length=0,s.length=0}function o(d){t.push(d)}function a(d){n.push(d)}function l(d){s.push(d)}function c(){e.setup(t)}function h(d){e.setupView(t,d)}const u={lightsArray:t,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:u,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function NM(i){let e=new WeakMap;function t(s,r=0){const o=e.get(s);let a;return o===void 0?(a=new Ed(i),e.set(s,[a])):r>=o.length?(a=new Ed(i),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const UM=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,FM=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,OM=[new A(1,0,0),new A(-1,0,0),new A(0,1,0),new A(0,-1,0),new A(0,0,1),new A(0,0,-1)],BM=[new A(0,-1,0),new A(0,-1,0),new A(0,0,1),new A(0,0,-1),new A(0,-1,0),new A(0,-1,0)],Ad=new Xe,Sr=new A,Ml=new A;function zM(i,e,t){let n=new _h;const s=new ne,r=new ne,o=new ft,a=new g0,l=new _0,c={},h=t.maxTextureSize,u={[Bi]:sn,[sn]:Bi,[pn]:pn},d=new Ht({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ne},radius:{value:4}},vertexShader:UM,fragmentShader:FM}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const g=new yt;g.setAttribute("position",new Dt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new Re(g,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Jo;let m=this.type;this.render=function(w,E,y){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||w.length===0)return;this.type===nm&&(Ne("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Jo);const R=i.getRenderTarget(),P=i.getActiveCubeFace(),I=i.getActiveMipmapLevel(),F=i.state;F.setBlending(ei),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);const V=m!==this.type;V&&E.traverse(function(U){U.material&&(Array.isArray(U.material)?U.material.forEach(B=>B.needsUpdate=!0):U.material.needsUpdate=!0)});for(let U=0,B=w.length;U<B;U++){const K=w[U],W=K.shadow;if(W===void 0){Ne("WebGLShadowMap:",K,"has no shadow.");continue}if(W.autoUpdate===!1&&W.needsUpdate===!1)continue;s.copy(W.mapSize);const ie=W.getFrameExtents();s.multiply(ie),r.copy(W.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/ie.x),s.x=r.x*ie.x,W.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/ie.y),s.y=r.y*ie.y,W.mapSize.y=r.y));const q=i.state.buffers.depth.getReversed();if(W.camera._reversedDepth=q,W.map===null||V===!0){if(W.map!==null&&(W.map.depthTexture!==null&&(W.map.depthTexture.dispose(),W.map.depthTexture=null),W.map.dispose()),this.type===Er){if(K.isPointLight){Ne("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}W.map=new Wt(s.x,s.y,{format:ns,type:Zt,minFilter:Ft,magFilter:Ft,generateMipmaps:!1}),W.map.texture.name=K.name+".shadowMap",W.map.depthTexture=new qr(s.x,s.y,wn),W.map.depthTexture.name=K.name+".shadowMapDepth",W.map.depthTexture.format=vi,W.map.depthTexture.compareFunction=null,W.map.depthTexture.minFilter=Ut,W.map.depthTexture.magFilter=Ut}else K.isPointLight?(W.map=new ep(s.x),W.map.depthTexture=new Ig(s.x,ii)):(W.map=new Wt(s.x,s.y),W.map.depthTexture=new qr(s.x,s.y,ii)),W.map.depthTexture.name=K.name+".shadowMap",W.map.depthTexture.format=vi,this.type===Jo?(W.map.depthTexture.compareFunction=q?uh:hh,W.map.depthTexture.minFilter=Ft,W.map.depthTexture.magFilter=Ft):(W.map.depthTexture.compareFunction=null,W.map.depthTexture.minFilter=Ut,W.map.depthTexture.magFilter=Ut);W.camera.updateProjectionMatrix()}W.map.isWebGLCubeRenderTarget!==!0&&(W.map.width!==s.x||W.map.height!==s.y)&&W.map.setSize(s.x,s.y);const Q=W.map.isWebGLCubeRenderTarget?6:W.getViewportCount();K.isPointLight!==!0&&W.updateMatrices(K,y);for(let O=0;O<Q;O++){const re=W.getCamera(O);if(K.isPointLight){const ae=W.camera,Ie=W.matrix,ze=K.distance||ae.far;ze!==ae.far&&(ae.far=ze,ae.updateProjectionMatrix()),Sr.setFromMatrixPosition(K.matrixWorld),ae.position.copy(Sr),Ml.copy(ae.position),Ml.add(OM[O]),ae.up.copy(BM[O]),ae.lookAt(Ml),ae.updateMatrixWorld(),Ie.makeTranslation(-Sr.x,-Sr.y,-Sr.z),Ad.multiplyMatrices(ae.projectionMatrix,ae.matrixWorldInverse),W._frustum.setFromProjectionMatrix(Ad,ae.coordinateSystem,ae.reversedDepth)}if(W.map.isWebGLCubeRenderTarget)i.setRenderTarget(W.map,O),i.clear();else{O===0&&(i.setRenderTarget(W.map),i.clear());const ae=W.getViewport(O);o.set(r.x*ae.x,r.y*ae.y,r.x*ae.z,r.y*ae.w),F.viewport(o)}n=W.getFrustum(O),x(E,y,re,K,this.type)}W.isPointLightShadow!==!0&&this.type===Er&&M(W,y),W.needsUpdate=!1}m=this.type,p.needsUpdate=!1,i.setRenderTarget(R,P,I)};function M(w,E){const y=e.update(_);d.defines.VSM_SAMPLES!==w.blurSamples&&(d.defines.VSM_SAMPLES=w.blurSamples,f.defines.VSM_SAMPLES=w.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),w.mapPass===null?w.mapPass=new Wt(s.x,s.y,{format:ns,type:Zt}):(w.mapPass.width!==w.map.width||w.mapPass.height!==w.map.height)&&w.mapPass.setSize(w.map.width,w.map.height),d.uniforms.shadow_pass.value=w.map.depthTexture,d.uniforms.resolution.value.set(w.map.width,w.map.height),d.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(E,null,y,d,_,null),f.uniforms.shadow_pass.value=w.mapPass.texture,f.uniforms.resolution.value.set(w.map.width,w.map.height),f.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(E,null,y,f,_,null)}function T(w,E,y,R){let P=null;const I=y.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(I!==void 0)P=I;else if(P=y.isPointLight===!0?l:a,i.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0||E.alphaToCoverage===!0){const F=P.uuid,V=E.uuid;let U=c[F];U===void 0&&(U={},c[F]=U);let B=U[V];B===void 0&&(B=P.clone(),U[V]=B,E.addEventListener("dispose",S)),P=B}if(P.visible=E.visible,P.wireframe=E.wireframe,R===Er?P.side=E.shadowSide!==null?E.shadowSide:E.side:P.side=E.shadowSide!==null?E.shadowSide:u[E.side],P.alphaMap=E.alphaMap,P.alphaTest=E.alphaToCoverage===!0?.5:E.alphaTest,P.map=E.map,P.clipShadows=E.clipShadows,P.clippingPlanes=E.clippingPlanes,P.clipIntersection=E.clipIntersection,P.displacementMap=E.displacementMap,P.displacementScale=E.displacementScale,P.displacementBias=E.displacementBias,P.wireframeLinewidth=E.wireframeLinewidth,P.linewidth=E.linewidth,y.isPointLight===!0&&P.isMeshDistanceMaterial===!0){const F=i.properties.get(P);F.light=y}return P}function x(w,E,y,R,P){if(w.visible===!1)return;if(w.layers.test(E.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&P===Er)&&(!w.frustumCulled||w.intersectsFrustum(n))){w.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,w.matrixWorld);const V=e.update(w),U=w.material;if(Array.isArray(U)){const B=V.groups;for(let K=0,W=B.length;K<W;K++){const ie=B[K],q=U[ie.materialIndex];if(q&&q.visible){const Q=T(w,q,R,P);w.onBeforeShadow(i,w,E,y,V,Q,ie),i.renderBufferDirect(y,null,V,Q,w,ie),w.onAfterShadow(i,w,E,y,V,Q,ie)}}}else if(U.visible){const B=T(w,U,R,P);w.onBeforeShadow(i,w,E,y,V,B,null),i.renderBufferDirect(y,null,V,B,w,null),w.onAfterShadow(i,w,E,y,V,B,null)}}const F=w.children;for(let V=0,U=F.length;V<U;V++)x(F[V],E,y,R,P)}function S(w){w.target.removeEventListener("dispose",S);for(const y in c){const R=c[y],P=w.target.uuid;P in R&&(R[P].dispose(),delete R[P])}}}function kM(i,e){function t(){let N=!1;const xe=new ft;let j=null;const ve=new ft(0,0,0,0);return{setMask:function(Te){j!==Te&&!N&&(i.colorMask(Te,Te,Te,Te),j=Te)},setLocked:function(Te){N=Te},setClear:function(Te,se,Oe,Le,Mt){Mt===!0&&(Te*=Le,se*=Le,Oe*=Le),xe.set(Te,se,Oe,Le),ve.equals(xe)===!1&&(i.clearColor(Te,se,Oe,Le),ve.copy(xe))},reset:function(){N=!1,j=null,ve.set(-1,0,0,0)}}}function n(){let N=!1,xe=!1,j=null,ve=null,Te=null;return{setReversed:function(se){if(xe!==se){const Oe=e.get("EXT_clip_control");se?Oe.clipControlEXT(Oe.LOWER_LEFT_EXT,Oe.ZERO_TO_ONE_EXT):Oe.clipControlEXT(Oe.LOWER_LEFT_EXT,Oe.NEGATIVE_ONE_TO_ONE_EXT),xe=se;const Le=Te;Te=null,this.setClear(Le)}},getReversed:function(){return xe},setTest:function(se){se?J(i.DEPTH_TEST):me(i.DEPTH_TEST)},setMask:function(se){j!==se&&!N&&(i.depthMask(se),j=se)},setFunc:function(se){if(xe&&(se=Vm[se]),ve!==se){switch(se){case Hl:i.depthFunc(i.NEVER);break;case Vl:i.depthFunc(i.ALWAYS);break;case Gl:i.depthFunc(i.LESS);break;case zr:i.depthFunc(i.LEQUAL);break;case Wl:i.depthFunc(i.EQUAL);break;case Xl:i.depthFunc(i.GEQUAL);break;case Yl:i.depthFunc(i.GREATER);break;case ql:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ve=se}},setLocked:function(se){N=se},setClear:function(se){Te!==se&&(Te=se,xe&&(se=1-se),i.clearDepth(se))},reset:function(){N=!1,j=null,ve=null,Te=null,xe=!1}}}function s(){let N=!1,xe=null,j=null,ve=null,Te=null,se=null,Oe=null,Le=null,Mt=null;return{setTest:function(ht){N||(ht?J(i.STENCIL_TEST):me(i.STENCIL_TEST))},setMask:function(ht){xe!==ht&&!N&&(i.stencilMask(ht),xe=ht)},setFunc:function(ht,Pn,Hn){(j!==ht||ve!==Pn||Te!==Hn)&&(i.stencilFunc(ht,Pn,Hn),j=ht,ve=Pn,Te=Hn)},setOp:function(ht,Pn,Hn){(se!==ht||Oe!==Pn||Le!==Hn)&&(i.stencilOp(ht,Pn,Hn),se=ht,Oe=Pn,Le=Hn)},setLocked:function(ht){N=ht},setClear:function(ht){Mt!==ht&&(i.clearStencil(ht),Mt=ht)},reset:function(){N=!1,xe=null,j=null,ve=null,Te=null,se=null,Oe=null,Le=null,Mt=null}}}const r=new t,o=new n,a=new s,l=new WeakMap,c=new WeakMap;let h={},u={},d={},f=new WeakMap,g=[],_=null,p=!1,m=null,M=null,T=null,x=null,S=null,w=null,E=null,y=new de(0,0,0),R=0,P=!1,I=null,F=null,V=null,U=null,B=null;const K=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,ie=0;const q=i.getParameter(i.VERSION);q.indexOf("WebGL")!==-1?(ie=parseFloat(/^WebGL (\d)/.exec(q)[1]),W=ie>=1):q.indexOf("OpenGL ES")!==-1&&(ie=parseFloat(/^OpenGL ES (\d)/.exec(q)[1]),W=ie>=2);let Q=null,O={};const re=i.getParameter(i.SCISSOR_BOX),ae=i.getParameter(i.VIEWPORT),Ie=new ft().fromArray(re),ze=new ft().fromArray(ae);function qe(N,xe,j,ve){const Te=new Uint8Array(4),se=i.createTexture();i.bindTexture(N,se),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Oe=0;Oe<j;Oe++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(xe,0,i.RGBA,1,1,ve,0,i.RGBA,i.UNSIGNED_BYTE,Te):i.texImage2D(xe+Oe,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Te);return se}const Y={};Y[i.TEXTURE_2D]=qe(i.TEXTURE_2D,i.TEXTURE_2D,1),Y[i.TEXTURE_CUBE_MAP]=qe(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Y[i.TEXTURE_2D_ARRAY]=qe(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Y[i.TEXTURE_3D]=qe(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),J(i.DEPTH_TEST),o.setFunc(zr),ce(!1),pe(ou),J(i.CULL_FACE),oe(ei);function J(N){h[N]!==!0&&(i.enable(N),h[N]=!0)}function me(N){h[N]!==!1&&(i.disable(N),h[N]=!1)}function ke(N,xe){return d[N]!==xe?(i.bindFramebuffer(N,xe),d[N]=xe,N===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=xe),N===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=xe),!0):!1}function we(N,xe){let j=g,ve=!1;if(N){j=f.get(xe),j===void 0&&(j=[],f.set(xe,j));const Te=N.textures;if(j.length!==Te.length||j[0]!==i.COLOR_ATTACHMENT0){for(let se=0,Oe=Te.length;se<Oe;se++)j[se]=i.COLOR_ATTACHMENT0+se;j.length=Te.length,ve=!0}}else j[0]!==i.BACK&&(j[0]=i.BACK,ve=!0);ve&&i.drawBuffers(j)}function He(N){return _!==N?(i.useProgram(N),_=N,!0):!1}const at={[Ns]:i.FUNC_ADD,[sm]:i.FUNC_SUBTRACT,[rm]:i.FUNC_REVERSE_SUBTRACT};at[om]=i.MIN,at[am]=i.MAX;const te={[lm]:i.ZERO,[cm]:i.ONE,[hm]:i.SRC_COLOR,[df]:i.SRC_ALPHA,[gm]:i.SRC_ALPHA_SATURATE,[pm]:i.DST_COLOR,[dm]:i.DST_ALPHA,[um]:i.ONE_MINUS_SRC_COLOR,[ff]:i.ONE_MINUS_SRC_ALPHA,[mm]:i.ONE_MINUS_DST_COLOR,[fm]:i.ONE_MINUS_DST_ALPHA,[_m]:i.CONSTANT_COLOR,[xm]:i.ONE_MINUS_CONSTANT_COLOR,[vm]:i.CONSTANT_ALPHA,[ym]:i.ONE_MINUS_CONSTANT_ALPHA};function oe(N,xe,j,ve,Te,se,Oe,Le,Mt,ht){if(N===ei){p===!0&&(me(i.BLEND),p=!1);return}if(p===!1&&(J(i.BLEND),p=!0),N!==im){if(N!==m||ht!==P){if((M!==Ns||S!==Ns)&&(i.blendEquation(i.FUNC_ADD),M=Ns,S=Ns),ht)switch(N){case Pr:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Qi:i.blendFunc(i.ONE,i.ONE);break;case au:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case lu:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:We("WebGLState: Invalid blending: ",N);break}else switch(N){case Pr:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Qi:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case au:We("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case lu:We("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:We("WebGLState: Invalid blending: ",N);break}T=null,x=null,w=null,E=null,y.set(0,0,0),R=0,m=N,P=ht}return}Te=Te||xe,se=se||j,Oe=Oe||ve,(xe!==M||Te!==S)&&(i.blendEquationSeparate(at[xe],at[Te]),M=xe,S=Te),(j!==T||ve!==x||se!==w||Oe!==E)&&(i.blendFuncSeparate(te[j],te[ve],te[se],te[Oe]),T=j,x=ve,w=se,E=Oe),(Le.equals(y)===!1||Mt!==R)&&(i.blendColor(Le.r,Le.g,Le.b,Mt),y.copy(Le),R=Mt),m=N,P=!1}function le(N,xe){N.side===pn?me(i.CULL_FACE):J(i.CULL_FACE);let j=N.side===sn;xe&&(j=!j),ce(j),N.blending===Pr&&N.transparent===!1?oe(ei):oe(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),r.setMask(N.colorWrite);const ve=N.stencilWrite;a.setTest(ve),ve&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),Be(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?J(i.SAMPLE_ALPHA_TO_COVERAGE):me(i.SAMPLE_ALPHA_TO_COVERAGE)}function ce(N){I!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),I=N)}function pe(N){N!==em?(J(i.CULL_FACE),N!==F&&(N===ou?i.cullFace(i.BACK):N===tm?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):me(i.CULL_FACE),F=N}function Ve(N){N!==V&&(W&&i.lineWidth(N),V=N)}function Be(N,xe,j){N?(J(i.POLYGON_OFFSET_FILL),(U!==xe||B!==j)&&(U=xe,B=j,o.getReversed()&&(xe=-xe),i.polygonOffset(xe,j))):me(i.POLYGON_OFFSET_FILL)}function Ye(N){N?J(i.SCISSOR_TEST):me(i.SCISSOR_TEST)}function $e(N){N===void 0&&(N=i.TEXTURE0+K-1),Q!==N&&(i.activeTexture(N),Q=N)}function L(N,xe,j){j===void 0&&(Q===null?j=i.TEXTURE0+K-1:j=Q);let ve=O[j];ve===void 0&&(ve={type:void 0,texture:void 0},O[j]=ve),(ve.type!==N||ve.texture!==xe)&&(Q!==j&&(i.activeTexture(j),Q=j),i.bindTexture(N,xe||Y[N]),ve.type=N,ve.texture=xe)}function ct(){const N=O[Q];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function nt(){try{i.compressedTexImage2D(...arguments)}catch(N){We("WebGLState:",N)}}function C(){try{i.compressedTexImage3D(...arguments)}catch(N){We("WebGLState:",N)}}function v(){try{i.texSubImage2D(...arguments)}catch(N){We("WebGLState:",N)}}function z(){try{i.texSubImage3D(...arguments)}catch(N){We("WebGLState:",N)}}function G(){try{i.compressedTexSubImage2D(...arguments)}catch(N){We("WebGLState:",N)}}function $(){try{i.compressedTexSubImage3D(...arguments)}catch(N){We("WebGLState:",N)}}function ue(){try{i.texStorage2D(...arguments)}catch(N){We("WebGLState:",N)}}function fe(){try{i.texStorage3D(...arguments)}catch(N){We("WebGLState:",N)}}function Z(){try{i.texImage2D(...arguments)}catch(N){We("WebGLState:",N)}}function ee(){try{i.texImage3D(...arguments)}catch(N){We("WebGLState:",N)}}function ge(N){return u[N]!==void 0?u[N]:i.getParameter(N)}function Ue(N,xe){u[N]!==xe&&(i.pixelStorei(N,xe),u[N]=xe)}function ye(N){Ie.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),Ie.copy(N))}function _e(N){ze.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),ze.copy(N))}function Fe(N,xe){let j=c.get(xe);j===void 0&&(j=new WeakMap,c.set(xe,j));let ve=j.get(N);ve===void 0&&(ve=i.getUniformBlockIndex(xe,N.name),j.set(N,ve))}function Ge(N,xe){const ve=c.get(xe).get(N);l.get(xe)!==ve&&(i.uniformBlockBinding(xe,ve,N.__bindingPointIndex),l.set(xe,ve))}function Ze(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},u={},Q=null,O={},d={},f=new WeakMap,g=[],_=null,p=!1,m=null,M=null,T=null,x=null,S=null,w=null,E=null,y=new de(0,0,0),R=0,P=!1,I=null,F=null,V=null,U=null,B=null,Ie.set(0,0,i.canvas.width,i.canvas.height),ze.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:J,disable:me,bindFramebuffer:ke,drawBuffers:we,useProgram:He,setBlending:oe,setMaterial:le,setFlipSided:ce,setCullFace:pe,setLineWidth:Ve,setPolygonOffset:Be,setScissorTest:Ye,activeTexture:$e,bindTexture:L,unbindTexture:ct,compressedTexImage2D:nt,compressedTexImage3D:C,texImage2D:Z,texImage3D:ee,pixelStorei:Ue,getParameter:ge,updateUBOMapping:Fe,uniformBlockBinding:Ge,texStorage2D:ue,texStorage3D:fe,texSubImage2D:v,texSubImage3D:z,compressedTexSubImage2D:G,compressedTexSubImage3D:$,scissor:ye,viewport:_e,reset:Ze}}function HM(i,e,t,n,s,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ne,h=new WeakMap,u=new Set;let d;const f=new WeakMap;let g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(C,v){return g?new OffscreenCanvas(C,v):Xr("canvas")}function p(C,v,z){let G=1;const $=nt(C);if(($.width>z||$.height>z)&&(G=z/Math.max($.width,$.height)),G<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){const ue=Math.floor(G*$.width),fe=Math.floor(G*$.height);d===void 0&&(d=_(ue,fe));const Z=v?_(ue,fe):d;return Z.width=ue,Z.height=fe,Z.getContext("2d").drawImage(C,0,0,ue,fe),Ne("WebGLRenderer: Texture has been resized from ("+$.width+"x"+$.height+") to ("+ue+"x"+fe+")."),Z}else return"data"in C&&Ne("WebGLRenderer: Image in DataTexture is too big ("+$.width+"x"+$.height+")."),C;return C}function m(C){return C.generateMipmaps}function M(C){i.generateMipmap(C)}function T(C){return C.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?i.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function x(C,v,z,G,$,ue=!1){if(C!==null){if(i[C]!==void 0)return i[C];Ne("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let fe;G&&(fe=e.get("EXT_texture_norm16"),fe||Ne("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Z=v;if(v===i.RED&&(z===i.FLOAT&&(Z=i.R32F),z===i.HALF_FLOAT&&(Z=i.R16F),z===i.UNSIGNED_BYTE&&(Z=i.R8),z===i.UNSIGNED_SHORT&&fe&&(Z=fe.R16_EXT),z===i.SHORT&&fe&&(Z=fe.R16_SNORM_EXT)),v===i.RED_INTEGER&&(z===i.UNSIGNED_BYTE&&(Z=i.R8UI),z===i.UNSIGNED_SHORT&&(Z=i.R16UI),z===i.UNSIGNED_INT&&(Z=i.R32UI),z===i.BYTE&&(Z=i.R8I),z===i.SHORT&&(Z=i.R16I),z===i.INT&&(Z=i.R32I)),v===i.RG&&(z===i.FLOAT&&(Z=i.RG32F),z===i.HALF_FLOAT&&(Z=i.RG16F),z===i.UNSIGNED_BYTE&&(Z=i.RG8),z===i.UNSIGNED_SHORT&&fe&&(Z=fe.RG16_EXT),z===i.SHORT&&fe&&(Z=fe.RG16_SNORM_EXT)),v===i.RG_INTEGER&&(z===i.UNSIGNED_BYTE&&(Z=i.RG8UI),z===i.UNSIGNED_SHORT&&(Z=i.RG16UI),z===i.UNSIGNED_INT&&(Z=i.RG32UI),z===i.BYTE&&(Z=i.RG8I),z===i.SHORT&&(Z=i.RG16I),z===i.INT&&(Z=i.RG32I)),v===i.RGB_INTEGER&&(z===i.UNSIGNED_BYTE&&(Z=i.RGB8UI),z===i.UNSIGNED_SHORT&&(Z=i.RGB16UI),z===i.UNSIGNED_INT&&(Z=i.RGB32UI),z===i.BYTE&&(Z=i.RGB8I),z===i.SHORT&&(Z=i.RGB16I),z===i.INT&&(Z=i.RGB32I)),v===i.RGBA_INTEGER&&(z===i.UNSIGNED_BYTE&&(Z=i.RGBA8UI),z===i.UNSIGNED_SHORT&&(Z=i.RGBA16UI),z===i.UNSIGNED_INT&&(Z=i.RGBA32UI),z===i.BYTE&&(Z=i.RGBA8I),z===i.SHORT&&(Z=i.RGBA16I),z===i.INT&&(Z=i.RGBA32I)),v===i.RGB&&(z===i.UNSIGNED_SHORT&&fe&&(Z=fe.RGB16_EXT),z===i.SHORT&&fe&&(Z=fe.RGB16_SNORM_EXT),z===i.UNSIGNED_INT_5_9_9_9_REV&&(Z=i.RGB9_E5),z===i.UNSIGNED_INT_10F_11F_11F_REV&&(Z=i.R11F_G11F_B10F)),v===i.RGBA){const ee=ue?ua:et.getTransfer($);z===i.FLOAT&&(Z=i.RGBA32F),z===i.HALF_FLOAT&&(Z=i.RGBA16F),z===i.UNSIGNED_BYTE&&(Z=ee===dt?i.SRGB8_ALPHA8:i.RGBA8),z===i.UNSIGNED_SHORT&&fe&&(Z=fe.RGBA16_EXT),z===i.SHORT&&fe&&(Z=fe.RGBA16_SNORM_EXT),z===i.UNSIGNED_SHORT_4_4_4_4&&(Z=i.RGBA4),z===i.UNSIGNED_SHORT_5_5_5_1&&(Z=i.RGB5_A1)}return(Z===i.R16F||Z===i.R32F||Z===i.RG16F||Z===i.RG32F||Z===i.RGBA16F||Z===i.RGBA32F)&&e.get("EXT_color_buffer_float"),Z}function S(C,v){let z;return C?v===null||v===ii||v===Hr?z=i.DEPTH24_STENCIL8:v===wn?z=i.DEPTH32F_STENCIL8:v===kr&&(z=i.DEPTH24_STENCIL8,Ne("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===ii||v===Hr?z=i.DEPTH_COMPONENT24:v===wn?z=i.DEPTH_COMPONENT32F:v===kr&&(z=i.DEPTH_COMPONENT16),z}function w(C,v){return m(C)===!0||C.isFramebufferTexture&&C.minFilter!==Ut&&C.minFilter!==Ft?Math.log2(Math.max(v.width,v.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?v.mipmaps.length:1}function E(C){const v=C.target;v.removeEventListener("dispose",E),R(v),v.isVideoTexture&&h.delete(v),v.isHTMLTexture&&u.delete(v)}function y(C){const v=C.target;v.removeEventListener("dispose",y),I(v)}function R(C){const v=n.get(C);if(v.__webglInit===void 0)return;const z=C.source,G=f.get(z);if(G){const $=G[v.__cacheKey];$.usedTimes--,$.usedTimes===0&&P(C),Object.keys(G).length===0&&f.delete(z)}n.remove(C)}function P(C){const v=n.get(C);i.deleteTexture(v.__webglTexture);const z=C.source,G=f.get(z);delete G[v.__cacheKey],o.memory.textures--}function I(C){const v=n.get(C);if(C.depthTexture&&(C.depthTexture.dispose(),n.remove(C.depthTexture)),C.isWebGLCubeRenderTarget)for(let G=0;G<6;G++){if(Array.isArray(v.__webglFramebuffer[G]))for(let $=0;$<v.__webglFramebuffer[G].length;$++)i.deleteFramebuffer(v.__webglFramebuffer[G][$]);else i.deleteFramebuffer(v.__webglFramebuffer[G]);v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer[G])}else{if(Array.isArray(v.__webglFramebuffer))for(let G=0;G<v.__webglFramebuffer.length;G++)i.deleteFramebuffer(v.__webglFramebuffer[G]);else i.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&i.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let G=0;G<v.__webglColorRenderbuffer.length;G++)v.__webglColorRenderbuffer[G]&&i.deleteRenderbuffer(v.__webglColorRenderbuffer[G]);v.__webglDepthRenderbuffer&&i.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const z=C.textures;for(let G=0,$=z.length;G<$;G++){const ue=n.get(z[G]);ue.__webglTexture&&(i.deleteTexture(ue.__webglTexture),o.memory.textures--),n.remove(z[G])}n.remove(C)}let F=0;function V(){F=0}function U(){return F}function B(C){F=C}function K(){const C=F;return C>=s.maxTextures&&Ne("WebGLTextures: Trying to use "+(C+1)+" texture units while this GPU supports only "+s.maxTextures),F+=1,C}function W(C){const v=[];return v.push(C.wrapS),v.push(C.wrapT),v.push(C.wrapR||0),v.push(C.magFilter),v.push(C.minFilter),v.push(C.anisotropy),v.push(C.internalFormat),v.push(C.format),v.push(C.type),v.push(C.generateMipmaps),v.push(C.premultiplyAlpha),v.push(C.flipY),v.push(C.unpackAlignment),v.push(C.colorSpace),v.join()}function ie(C,v){const z=n.get(C);if(C.isVideoTexture&&L(C),C.isRenderTargetTexture===!1&&C.isExternalTexture!==!0&&C.version>0&&z.__version!==C.version){const G=C.image;if(G===null)Ne("WebGLRenderer: Texture marked for update but no image data found.");else if(G.complete===!1)Ne("WebGLRenderer: Texture marked for update but image is incomplete");else{me(z,C,v);return}}else C.isExternalTexture&&(z.__webglTexture=C.sourceTexture?C.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,z.__webglTexture,i.TEXTURE0+v)}function q(C,v){const z=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&z.__version!==C.version){me(z,C,v);return}else C.isExternalTexture&&(z.__webglTexture=C.sourceTexture?C.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,z.__webglTexture,i.TEXTURE0+v)}function Q(C,v){const z=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&z.__version!==C.version){me(z,C,v);return}t.bindTexture(i.TEXTURE_3D,z.__webglTexture,i.TEXTURE0+v)}function O(C,v){const z=n.get(C);if(C.isCubeDepthTexture!==!0&&C.version>0&&z.__version!==C.version){ke(z,C,v);return}t.bindTexture(i.TEXTURE_CUBE_MAP,z.__webglTexture,i.TEXTURE0+v)}const re={[ts]:i.REPEAT,[Zn]:i.CLAMP_TO_EDGE,[oa]:i.MIRRORED_REPEAT},ae={[Ut]:i.NEAREST,[mf]:i.NEAREST_MIPMAP_NEAREST,[Ar]:i.NEAREST_MIPMAP_LINEAR,[Ft]:i.LINEAR,[jo]:i.LINEAR_MIPMAP_NEAREST,[Jn]:i.LINEAR_MIPMAP_LINEAR},Ie={[Im]:i.NEVER,[Om]:i.ALWAYS,[Dm]:i.LESS,[hh]:i.LEQUAL,[Nm]:i.EQUAL,[uh]:i.GEQUAL,[Um]:i.GREATER,[Fm]:i.NOTEQUAL};function ze(C,v){if(v.type===wn&&e.has("OES_texture_float_linear")===!1&&(v.magFilter===Ft||v.magFilter===jo||v.magFilter===Ar||v.magFilter===Jn||v.minFilter===Ft||v.minFilter===jo||v.minFilter===Ar||v.minFilter===Jn)&&Ne("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(C,i.TEXTURE_WRAP_S,re[v.wrapS]),i.texParameteri(C,i.TEXTURE_WRAP_T,re[v.wrapT]),(C===i.TEXTURE_3D||C===i.TEXTURE_2D_ARRAY)&&i.texParameteri(C,i.TEXTURE_WRAP_R,re[v.wrapR]),i.texParameteri(C,i.TEXTURE_MAG_FILTER,ae[v.magFilter]),i.texParameteri(C,i.TEXTURE_MIN_FILTER,ae[v.minFilter]),v.compareFunction&&(i.texParameteri(C,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(C,i.TEXTURE_COMPARE_FUNC,Ie[v.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===Ut||v.minFilter!==Ar&&v.minFilter!==Jn||v.type===wn&&e.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||n.get(v).__currentAnisotropy){const z=e.get("EXT_texture_filter_anisotropic");i.texParameterf(C,z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,s.getMaxAnisotropy())),n.get(v).__currentAnisotropy=v.anisotropy}}}function qe(C,v){let z=!1;C.__webglInit===void 0&&(C.__webglInit=!0,v.addEventListener("dispose",E));const G=v.source;let $=f.get(G);$===void 0&&($={},f.set(G,$));const ue=W(v);if(ue!==C.__cacheKey){$[ue]===void 0&&($[ue]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,z=!0),$[ue].usedTimes++;const fe=$[C.__cacheKey];fe!==void 0&&($[C.__cacheKey].usedTimes--,fe.usedTimes===0&&P(v)),C.__cacheKey=ue,C.__webglTexture=$[ue].texture}return z}function Y(C,v,z){return Math.floor(Math.floor(C/z)/v)}function J(C,v,z,G){const ue=C.updateRanges;if(ue.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,v.width,v.height,z,G,v.data);else{ue.sort((Ue,ye)=>Ue.start-ye.start);let fe=0;for(let Ue=1;Ue<ue.length;Ue++){const ye=ue[fe],_e=ue[Ue],Fe=ye.start+ye.count,Ge=Y(_e.start,v.width,4),Ze=Y(ye.start,v.width,4);_e.start<=Fe+1&&Ge===Ze&&Y(_e.start+_e.count-1,v.width,4)===Ge?ye.count=Math.max(ye.count,_e.start+_e.count-ye.start):(++fe,ue[fe]=_e)}ue.length=fe+1;const Z=t.getParameter(i.UNPACK_ROW_LENGTH),ee=t.getParameter(i.UNPACK_SKIP_PIXELS),ge=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,v.width);for(let Ue=0,ye=ue.length;Ue<ye;Ue++){const _e=ue[Ue],Fe=Math.floor(_e.start/4),Ge=Math.ceil(_e.count/4),Ze=Fe%v.width,N=Math.floor(Fe/v.width),xe=Ge,j=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,Ze),t.pixelStorei(i.UNPACK_SKIP_ROWS,N),t.texSubImage2D(i.TEXTURE_2D,0,Ze,N,xe,j,z,G,v.data)}C.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,Z),t.pixelStorei(i.UNPACK_SKIP_PIXELS,ee),t.pixelStorei(i.UNPACK_SKIP_ROWS,ge)}}function me(C,v,z){let G=i.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(G=i.TEXTURE_2D_ARRAY),v.isData3DTexture&&(G=i.TEXTURE_3D);const $=qe(C,v),ue=v.source;t.bindTexture(G,C.__webglTexture,i.TEXTURE0+z);const fe=n.get(ue);if(ue.version!==fe.__version||$===!0){if(t.activeTexture(i.TEXTURE0+z),(typeof ImageBitmap<"u"&&v.image instanceof ImageBitmap)===!1){const j=et.getPrimaries(et.workingColorSpace),ve=v.colorSpace===Fi?null:et.getPrimaries(v.colorSpace),Te=v.colorSpace===Fi||j===ve?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Te)}t.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment);let ee=p(v.image,!1,s.maxTextureSize);ee=ct(v,ee);const ge=r.convert(v.format,v.colorSpace),Ue=r.convert(v.type);let ye=x(v.internalFormat,ge,Ue,v.normalized,v.colorSpace,v.isVideoTexture);ze(G,v);let _e;const Fe=v.mipmaps,Ge=v.isVideoTexture!==!0,Ze=fe.__version===void 0||$===!0,N=ue.dataReady,xe=w(v,ee);if(v.isDepthTexture)ye=S(v.format===$i,v.type),Ze&&(Ge?t.texStorage2D(i.TEXTURE_2D,1,ye,ee.width,ee.height):t.texImage2D(i.TEXTURE_2D,0,ye,ee.width,ee.height,0,ge,Ue,null));else if(v.isDataTexture)if(Fe.length>0){Ge&&Ze&&t.texStorage2D(i.TEXTURE_2D,xe,ye,Fe[0].width,Fe[0].height);for(let j=0,ve=Fe.length;j<ve;j++)_e=Fe[j],Ge?N&&t.texSubImage2D(i.TEXTURE_2D,j,0,0,_e.width,_e.height,ge,Ue,_e.data):t.texImage2D(i.TEXTURE_2D,j,ye,_e.width,_e.height,0,ge,Ue,_e.data);v.generateMipmaps=!1}else Ge?(Ze&&t.texStorage2D(i.TEXTURE_2D,xe,ye,ee.width,ee.height),N&&J(v,ee,ge,Ue)):t.texImage2D(i.TEXTURE_2D,0,ye,ee.width,ee.height,0,ge,Ue,ee.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){Ge&&Ze&&t.texStorage3D(i.TEXTURE_2D_ARRAY,xe,ye,Fe[0].width,Fe[0].height,ee.depth);for(let j=0,ve=Fe.length;j<ve;j++)if(_e=Fe[j],v.format!==En)if(ge!==null)if(Ge){if(N)if(v.layerUpdates.size>0){const Te=od(_e.width,_e.height,v.format,v.type);for(const se of v.layerUpdates){const Oe=_e.data.subarray(se*Te/_e.data.BYTES_PER_ELEMENT,(se+1)*Te/_e.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,j,0,0,se,_e.width,_e.height,1,ge,Oe)}}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,j,0,0,0,_e.width,_e.height,ee.depth,ge,_e.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,j,ye,_e.width,_e.height,ee.depth,0,_e.data,0,0);else Ne("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Ge?N&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,j,0,0,0,_e.width,_e.height,ee.depth,ge,Ue,_e.data):t.texImage3D(i.TEXTURE_2D_ARRAY,j,ye,_e.width,_e.height,ee.depth,0,ge,Ue,_e.data);v.layerUpdates.size>0&&v.clearLayerUpdates()}else{Ge&&Ze&&t.texStorage2D(i.TEXTURE_2D,xe,ye,Fe[0].width,Fe[0].height);for(let j=0,ve=Fe.length;j<ve;j++)_e=Fe[j],v.format!==En?ge!==null?Ge?N&&t.compressedTexSubImage2D(i.TEXTURE_2D,j,0,0,_e.width,_e.height,ge,_e.data):t.compressedTexImage2D(i.TEXTURE_2D,j,ye,_e.width,_e.height,0,_e.data):Ne("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ge?N&&t.texSubImage2D(i.TEXTURE_2D,j,0,0,_e.width,_e.height,ge,Ue,_e.data):t.texImage2D(i.TEXTURE_2D,j,ye,_e.width,_e.height,0,ge,Ue,_e.data)}else if(v.isDataArrayTexture)if(Ge){if(Ze&&t.texStorage3D(i.TEXTURE_2D_ARRAY,xe,ye,ee.width,ee.height,ee.depth),N)if(v.layerUpdates.size>0){const j=od(ee.width,ee.height,v.format,v.type);for(const ve of v.layerUpdates){const Te=ee.data.subarray(ve*j/ee.data.BYTES_PER_ELEMENT,(ve+1)*j/ee.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ve,ee.width,ee.height,1,ge,Ue,Te)}v.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ee.width,ee.height,ee.depth,ge,Ue,ee.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,ye,ee.width,ee.height,ee.depth,0,ge,Ue,ee.data);else if(v.isData3DTexture)Ge?(Ze&&t.texStorage3D(i.TEXTURE_3D,xe,ye,ee.width,ee.height,ee.depth),N&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ee.width,ee.height,ee.depth,ge,Ue,ee.data)):t.texImage3D(i.TEXTURE_3D,0,ye,ee.width,ee.height,ee.depth,0,ge,Ue,ee.data);else if(v.isFramebufferTexture){if(Ze)if(Ge)t.texStorage2D(i.TEXTURE_2D,xe,ye,ee.width,ee.height);else{let j=ee.width,ve=ee.height;for(let Te=0;Te<xe;Te++)t.texImage2D(i.TEXTURE_2D,Te,ye,j,ve,0,ge,Ue,null),j>>=1,ve>>=1}}else if(v.isHTMLTexture){if("texElementImage2D"in i){const j=i.canvas;if(j.hasAttribute("layoutsubtree")||j.setAttribute("layoutsubtree","true"),ee.parentNode!==j){j.appendChild(ee),u.add(v),j.onpaint=ve=>{const Te=ve.changedElements;for(const se of u)Te.includes(se.image)&&(se.needsUpdate=!0)},j.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,ee);else{const Te=i.RGBA,se=i.RGBA,Oe=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Te,se,Oe,ee)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Fe.length>0){if(Ge&&Ze){const j=nt(Fe[0]);t.texStorage2D(i.TEXTURE_2D,xe,ye,j.width,j.height)}for(let j=0,ve=Fe.length;j<ve;j++)_e=Fe[j],Ge?N&&t.texSubImage2D(i.TEXTURE_2D,j,0,0,ge,Ue,_e):t.texImage2D(i.TEXTURE_2D,j,ye,ge,Ue,_e);v.generateMipmaps=!1}else if(Ge){if(Ze){const j=nt(ee);t.texStorage2D(i.TEXTURE_2D,xe,ye,j.width,j.height)}N&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ge,Ue,ee)}else t.texImage2D(i.TEXTURE_2D,0,ye,ge,Ue,ee);m(v)&&M(G),fe.__version=ue.version,v.onUpdate&&v.onUpdate(v)}C.__version=v.version}function ke(C,v,z){if(v.image.length!==6)return;const G=qe(C,v),$=v.source;t.bindTexture(i.TEXTURE_CUBE_MAP,C.__webglTexture,i.TEXTURE0+z);const ue=n.get($);if($.version!==ue.__version||G===!0){t.activeTexture(i.TEXTURE0+z);const fe=et.getPrimaries(et.workingColorSpace),Z=v.colorSpace===Fi?null:et.getPrimaries(v.colorSpace),ee=v.colorSpace===Fi||fe===Z?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ee);const ge=v.isCompressedTexture||v.image[0].isCompressedTexture,Ue=v.image[0]&&v.image[0].isDataTexture,ye=[];for(let se=0;se<6;se++)!ge&&!Ue?ye[se]=p(v.image[se],!0,s.maxCubemapSize):ye[se]=Ue?v.image[se].image:v.image[se],ye[se]=ct(v,ye[se]);const _e=ye[0],Fe=r.convert(v.format,v.colorSpace),Ge=r.convert(v.type),Ze=x(v.internalFormat,Fe,Ge,v.normalized,v.colorSpace),N=v.isVideoTexture!==!0,xe=ue.__version===void 0||G===!0,j=$.dataReady;let ve=w(v,_e);ze(i.TEXTURE_CUBE_MAP,v);let Te;if(ge){N&&xe&&t.texStorage2D(i.TEXTURE_CUBE_MAP,ve,Ze,_e.width,_e.height);for(let se=0;se<6;se++){Te=ye[se].mipmaps;for(let Oe=0;Oe<Te.length;Oe++){const Le=Te[Oe];v.format!==En?Fe!==null?N?j&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,Oe,0,0,Le.width,Le.height,Fe,Le.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,Oe,Ze,Le.width,Le.height,0,Le.data):Ne("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?j&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,Oe,0,0,Le.width,Le.height,Fe,Ge,Le.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,Oe,Ze,Le.width,Le.height,0,Fe,Ge,Le.data)}}}else{if(Te=v.mipmaps,N&&xe){Te.length>0&&ve++;const se=nt(ye[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,ve,Ze,se.width,se.height)}for(let se=0;se<6;se++)if(Ue){N?j&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,0,0,0,ye[se].width,ye[se].height,Fe,Ge,ye[se].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,0,Ze,ye[se].width,ye[se].height,0,Fe,Ge,ye[se].data);for(let Oe=0;Oe<Te.length;Oe++){const Mt=Te[Oe].image[se].image;N?j&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,Oe+1,0,0,Mt.width,Mt.height,Fe,Ge,Mt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,Oe+1,Ze,Mt.width,Mt.height,0,Fe,Ge,Mt.data)}}else{N?j&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,0,0,0,Fe,Ge,ye[se]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,0,Ze,Fe,Ge,ye[se]);for(let Oe=0;Oe<Te.length;Oe++){const Le=Te[Oe];N?j&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,Oe+1,0,0,Fe,Ge,Le.image[se]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+se,Oe+1,Ze,Fe,Ge,Le.image[se])}}}m(v)&&M(i.TEXTURE_CUBE_MAP),ue.__version=$.version,v.onUpdate&&v.onUpdate(v)}C.__version=v.version}function we(C,v,z,G,$,ue){const fe=r.convert(z.format,z.colorSpace),Z=r.convert(z.type),ee=x(z.internalFormat,fe,Z,z.normalized,z.colorSpace),ge=n.get(v),Ue=n.get(z);if(Ue.__renderTarget=v,!ge.__hasExternalTextures){const ye=Math.max(1,v.width>>ue),_e=Math.max(1,v.height>>ue);$===i.TEXTURE_3D||$===i.TEXTURE_2D_ARRAY?t.texImage3D($,ue,ee,ye,_e,v.depth,0,fe,Z,null):t.texImage2D($,ue,ee,ye,_e,0,fe,Z,null)}t.bindFramebuffer(i.FRAMEBUFFER,C),$e(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,G,$,Ue.__webglTexture,0,Ye(v)):($===i.TEXTURE_2D||$>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&$<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,G,$,Ue.__webglTexture,ue),t.bindFramebuffer(i.FRAMEBUFFER,null)}function He(C,v,z){if(i.bindRenderbuffer(i.RENDERBUFFER,C),v.depthBuffer){const G=v.depthTexture,$=G&&G.isDepthTexture?G.type:null,ue=S(v.stencilBuffer,$),fe=v.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;$e(v)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ye(v),ue,v.width,v.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ye(v),ue,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,ue,v.width,v.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,fe,i.RENDERBUFFER,C)}else{const G=v.textures;for(let $=0;$<G.length;$++){const ue=G[$],fe=r.convert(ue.format,ue.colorSpace),Z=r.convert(ue.type),ee=x(ue.internalFormat,fe,Z,ue.normalized,ue.colorSpace);$e(v)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ye(v),ee,v.width,v.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ye(v),ee,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,ee,v.width,v.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function at(C,v,z){const G=v.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,C),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const $=n.get(v.depthTexture);if($.__renderTarget=v,(!$.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),G){if($.__webglInit===void 0&&($.__webglInit=!0,v.depthTexture.addEventListener("dispose",E)),$.__webglTexture===void 0){$.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,$.__webglTexture),ze(i.TEXTURE_CUBE_MAP,v.depthTexture);const ge=r.convert(v.depthTexture.format),Ue=r.convert(v.depthTexture.type);let ye;v.depthTexture.format===vi?ye=i.DEPTH_COMPONENT24:v.depthTexture.format===$i&&(ye=i.DEPTH24_STENCIL8);for(let _e=0;_e<6;_e++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0,ye,v.width,v.height,0,ge,Ue,null)}}else ie(v.depthTexture,0);const ue=$.__webglTexture,fe=Ye(v),Z=G?i.TEXTURE_CUBE_MAP_POSITIVE_X+z:i.TEXTURE_2D,ee=v.depthTexture.format===$i?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(v.depthTexture.format===vi)$e(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ee,Z,ue,0,fe):i.framebufferTexture2D(i.FRAMEBUFFER,ee,Z,ue,0);else if(v.depthTexture.format===$i)$e(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ee,Z,ue,0,fe):i.framebufferTexture2D(i.FRAMEBUFFER,ee,Z,ue,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function te(C){const v=n.get(C),z=C.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==C.depthTexture){const G=C.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),G){const $=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,G.removeEventListener("dispose",$)};G.addEventListener("dispose",$),v.__depthDisposeCallback=$}v.__boundDepthTexture=G}if(C.depthTexture&&!v.__autoAllocateDepthBuffer)if(z)for(let G=0;G<6;G++)at(v.__webglFramebuffer[G],C,G);else{const G=C.texture.mipmaps;G&&G.length>0?at(v.__webglFramebuffer[0],C,0):at(v.__webglFramebuffer,C,0)}else if(z){v.__webglDepthbuffer=[];for(let G=0;G<6;G++)if(t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[G]),v.__webglDepthbuffer[G]===void 0)v.__webglDepthbuffer[G]=i.createRenderbuffer(),He(v.__webglDepthbuffer[G],C,!1);else{const $=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ue=v.__webglDepthbuffer[G];i.bindRenderbuffer(i.RENDERBUFFER,ue),i.framebufferRenderbuffer(i.FRAMEBUFFER,$,i.RENDERBUFFER,ue)}}else{const G=C.texture.mipmaps;if(G&&G.length>0?t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=i.createRenderbuffer(),He(v.__webglDepthbuffer,C,!1);else{const $=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ue=v.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ue),i.framebufferRenderbuffer(i.FRAMEBUFFER,$,i.RENDERBUFFER,ue)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function oe(C,v,z){const G=n.get(C);v!==void 0&&we(G.__webglFramebuffer,C,C.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),z!==void 0&&te(C)}function le(C){const v=C.texture,z=n.get(C),G=n.get(v);C.addEventListener("dispose",y);const $=C.textures,ue=C.isWebGLCubeRenderTarget===!0,fe=$.length>1;if(fe||(G.__webglTexture===void 0&&(G.__webglTexture=i.createTexture()),G.__version=v.version,o.memory.textures++),ue){z.__webglFramebuffer=[];for(let Z=0;Z<6;Z++)if(v.mipmaps&&v.mipmaps.length>0){z.__webglFramebuffer[Z]=[];for(let ee=0;ee<v.mipmaps.length;ee++)z.__webglFramebuffer[Z][ee]=i.createFramebuffer()}else z.__webglFramebuffer[Z]=i.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){z.__webglFramebuffer=[];for(let Z=0;Z<v.mipmaps.length;Z++)z.__webglFramebuffer[Z]=i.createFramebuffer()}else z.__webglFramebuffer=i.createFramebuffer();if(fe)for(let Z=0,ee=$.length;Z<ee;Z++){const ge=n.get($[Z]);ge.__webglTexture===void 0&&(ge.__webglTexture=i.createTexture(),o.memory.textures++)}if(C.samples>0&&$e(C)===!1){z.__webglMultisampledFramebuffer=i.createFramebuffer(),z.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,z.__webglMultisampledFramebuffer);for(let Z=0;Z<$.length;Z++){const ee=$[Z];z.__webglColorRenderbuffer[Z]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,z.__webglColorRenderbuffer[Z]);const ge=r.convert(ee.format,ee.colorSpace),Ue=r.convert(ee.type),ye=x(ee.internalFormat,ge,Ue,ee.normalized,ee.colorSpace,C.isXRRenderTarget===!0),_e=Ye(C);i.renderbufferStorageMultisample(i.RENDERBUFFER,_e,ye,C.width,C.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Z,i.RENDERBUFFER,z.__webglColorRenderbuffer[Z])}i.bindRenderbuffer(i.RENDERBUFFER,null),C.depthBuffer&&(z.__webglDepthRenderbuffer=i.createRenderbuffer(),He(z.__webglDepthRenderbuffer,C,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ue){t.bindTexture(i.TEXTURE_CUBE_MAP,G.__webglTexture),ze(i.TEXTURE_CUBE_MAP,v);for(let Z=0;Z<6;Z++)if(v.mipmaps&&v.mipmaps.length>0)for(let ee=0;ee<v.mipmaps.length;ee++)we(z.__webglFramebuffer[Z][ee],C,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,ee);else we(z.__webglFramebuffer[Z],C,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0);m(v)&&M(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(fe){for(let Z=0,ee=$.length;Z<ee;Z++){const ge=$[Z],Ue=n.get(ge);let ye=i.TEXTURE_2D;(C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(ye=C.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ye,Ue.__webglTexture),ze(ye,ge),we(z.__webglFramebuffer,C,ge,i.COLOR_ATTACHMENT0+Z,ye,0),m(ge)&&M(ye)}t.unbindTexture()}else{let Z=i.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(Z=C.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(Z,G.__webglTexture),ze(Z,v),v.mipmaps&&v.mipmaps.length>0)for(let ee=0;ee<v.mipmaps.length;ee++)we(z.__webglFramebuffer[ee],C,v,i.COLOR_ATTACHMENT0,Z,ee);else we(z.__webglFramebuffer,C,v,i.COLOR_ATTACHMENT0,Z,0);m(v)&&M(Z),t.unbindTexture()}C.depthBuffer&&te(C)}function ce(C){const v=C.textures;for(let z=0,G=v.length;z<G;z++){const $=v[z];if(m($)){const ue=T(C),fe=n.get($).__webglTexture;t.bindTexture(ue,fe),M(ue),t.unbindTexture()}}}const pe=[],Ve=[];function Be(C){if(C.samples>0){if($e(C)===!1){const v=C.textures,z=C.width,G=C.height;let $=i.COLOR_BUFFER_BIT;const ue=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,fe=n.get(C),Z=v.length>1;if(Z)for(let ge=0;ge<v.length;ge++)t.bindFramebuffer(i.FRAMEBUFFER,fe.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ge,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,fe.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ge,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,fe.__webglMultisampledFramebuffer);const ee=C.texture.mipmaps;ee&&ee.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,fe.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,fe.__webglFramebuffer);for(let ge=0;ge<v.length;ge++){if(C.resolveDepthBuffer&&(C.depthBuffer&&($|=i.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&($|=i.STENCIL_BUFFER_BIT)),Z){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,fe.__webglColorRenderbuffer[ge]);const Ue=n.get(v[ge]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ue,0)}i.blitFramebuffer(0,0,z,G,0,0,z,G,$,i.NEAREST),l===!0&&(pe.length=0,Ve.length=0,pe.push(i.COLOR_ATTACHMENT0+ge),C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&(pe.push(ue),Ve.push(ue),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ve)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,pe))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),Z)for(let ge=0;ge<v.length;ge++){t.bindFramebuffer(i.FRAMEBUFFER,fe.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ge,i.RENDERBUFFER,fe.__webglColorRenderbuffer[ge]);const Ue=n.get(v[ge]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,fe.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ge,i.TEXTURE_2D,Ue,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,fe.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&l){const v=C.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[v])}}}function Ye(C){return Math.min(s.maxSamples,C.samples)}function $e(C){const v=n.get(C);return C.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function L(C){const v=o.render.frame;h.get(C)!==v&&(h.set(C,v),C.update())}function ct(C,v){const z=C.colorSpace,G=C.format,$=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||z!==_n&&z!==Fi&&(et.getTransfer(z)===dt?(G!==En||$!==mn)&&Ne("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):We("WebGLTextures: Unsupported texture color space:",z)),v}function nt(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(c.width=C.naturalWidth||C.width,c.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(c.width=C.displayWidth,c.height=C.displayHeight):(c.width=C.width,c.height=C.height),c}this.allocateTextureUnit=K,this.resetTextureUnits=V,this.getTextureUnits=U,this.setTextureUnits=B,this.setTexture2D=ie,this.setTexture2DArray=q,this.setTexture3D=Q,this.setTextureCube=O,this.rebindTextures=oe,this.setupRenderTarget=le,this.updateRenderTargetMipmap=ce,this.updateMultisampleRenderTarget=Be,this.setupDepthRenderbuffer=te,this.setupFrameBufferTexture=we,this.useMultisampledRTT=$e,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function VM(i,e){function t(n,s=Fi){let r;const o=et.getTransfer(s);if(n===mn)return i.UNSIGNED_BYTE;if(n===ih)return i.UNSIGNED_SHORT_4_4_4_4;if(n===sh)return i.UNSIGNED_SHORT_5_5_5_1;if(n===xf)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===vf)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===gf)return i.BYTE;if(n===_f)return i.SHORT;if(n===kr)return i.UNSIGNED_SHORT;if(n===nh)return i.INT;if(n===ii)return i.UNSIGNED_INT;if(n===wn)return i.FLOAT;if(n===Zt)return i.HALF_FLOAT;if(n===yf)return i.ALPHA;if(n===Mf)return i.RGB;if(n===En)return i.RGBA;if(n===vi)return i.DEPTH_COMPONENT;if(n===$i)return i.DEPTH_STENCIL;if(n===rh)return i.RED;if(n===oh)return i.RED_INTEGER;if(n===ns)return i.RG;if(n===ah)return i.RG_INTEGER;if(n===lh)return i.RGBA_INTEGER;if(n===Qo||n===ea||n===ta||n===na)if(o===dt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Qo)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ea)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ta)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===na)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Qo)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ea)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ta)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===na)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Kl||n===$l||n===Zl||n===Jl)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Kl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===$l)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Zl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Jl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===jl||n===Ql||n===ec||n===tc||n===nc||n===aa||n===ic)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===jl||n===Ql)return o===dt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===ec)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===tc)return r.COMPRESSED_R11_EAC;if(n===nc)return r.COMPRESSED_SIGNED_R11_EAC;if(n===aa)return r.COMPRESSED_RG11_EAC;if(n===ic)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===sc||n===rc||n===oc||n===ac||n===lc||n===cc||n===hc||n===uc||n===dc||n===fc||n===pc||n===mc||n===gc||n===_c)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===sc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===rc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===oc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ac)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===lc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===cc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===hc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===uc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===dc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===fc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===pc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===mc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===gc)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===_c)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===xc||n===vc||n===yc)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===xc)return o===dt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===vc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===yc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Mc||n===Sc||n===la||n===bc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Mc)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Sc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===la)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===bc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Hr?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const GM=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,WM=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class XM{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Uf(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Ht({vertexShader:GM,fragmentShader:WM,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Re(new Si(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class YM extends Mi{constructor(e,t){super();const n=this;let s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,g=null;const _=typeof XRWebGLBinding<"u",p=new XM,m={},M=t.getContextAttributes();let T=null,x=null;const S=[],w=[],E=new ne;let y=null,R=null;const P=new nn;P.viewport=new ft;const I=new nn;I.viewport=new ft;const F=[P,I],V=new B0;let U=null,B=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let J=S[Y];return J===void 0&&(J=new Ya,S[Y]=J),J.getTargetRaySpace()},this.getControllerGrip=function(Y){let J=S[Y];return J===void 0&&(J=new Ya,S[Y]=J),J.getGripSpace()},this.getHand=function(Y){let J=S[Y];return J===void 0&&(J=new Ya,S[Y]=J),J.getHandSpace()};function K(Y){const J=w.indexOf(Y.inputSource);if(J===-1)return;const me=S[J];me!==void 0&&(me.update(Y.inputSource,Y.frame,c||o),me.dispatchEvent({type:Y.type,data:Y.inputSource}))}function W(){s.removeEventListener("select",K),s.removeEventListener("selectstart",K),s.removeEventListener("selectend",K),s.removeEventListener("squeeze",K),s.removeEventListener("squeezestart",K),s.removeEventListener("squeezeend",K),s.removeEventListener("end",W),s.removeEventListener("inputsourceschange",ie);for(let Y=0;Y<S.length;Y++){const J=w[Y];J!==null&&(w[Y]=null,S[Y].disconnect(J))}U=null,B=null,p.reset();for(const Y in m)delete m[Y];if(e.setRenderTarget(T),f=null,d=null,u=null,s=null,x=null,qe.stop(),n.isPresenting=!1,e.setPixelRatio(y),e.setSize(E.width,E.height,!1),R!==null){const Y=R.camera;Y.fov=R.fov,Y.zoom=R.zoom,Y.updateProjectionMatrix(),R=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){r=Y,n.isPresenting===!0&&Ne("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){a=Y,n.isPresenting===!0&&Ne("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(Y){c=Y},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&_&&(u=new XRWebGLBinding(s,t)),u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(Y){if(s=Y,s!==null){if(T=e.getRenderTarget(),s.addEventListener("select",K),s.addEventListener("selectstart",K),s.addEventListener("selectend",K),s.addEventListener("squeeze",K),s.addEventListener("squeezestart",K),s.addEventListener("squeezeend",K),s.addEventListener("end",W),s.addEventListener("inputsourceschange",ie),M.xrCompatible!==!0&&await t.makeXRCompatible(),y=e.getPixelRatio(),e.getSize(E),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let me=null,ke=null,we=null;M.depth&&(we=M.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,me=M.stencil?$i:vi,ke=M.stencil?Hr:ii);const He={colorFormat:t.RGBA8,depthFormat:we,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(He),s.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),x=new Wt(d.textureWidth,d.textureHeight,{format:En,type:mn,depthTexture:new qr(d.textureWidth,d.textureHeight,ke,void 0,void 0,void 0,void 0,void 0,void 0,me),stencilBuffer:M.stencil,colorSpace:e.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{const me={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,me),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),x=new Wt(f.framebufferWidth,f.framebufferHeight,{format:En,type:mn,colorSpace:e.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),qe.setContext(s),qe.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function ie(Y){for(let J=0;J<Y.removed.length;J++){const me=Y.removed[J],ke=w.indexOf(me);ke>=0&&(w[ke]=null,S[ke].disconnect(me))}for(let J=0;J<Y.added.length;J++){const me=Y.added[J];let ke=w.indexOf(me);if(ke===-1){for(let He=0;He<S.length;He++)if(He>=w.length){w.push(me),ke=He;break}else if(w[He]===null){w[He]=me,ke=He;break}if(ke===-1)break}const we=S[ke];we&&we.connect(me)}}const q=new A,Q=new A;function O(Y,J,me){q.setFromMatrixPosition(J.matrixWorld),Q.setFromMatrixPosition(me.matrixWorld);const ke=q.distanceTo(Q),we=J.projectionMatrix.elements,He=me.projectionMatrix.elements,at=we[14]/(we[10]-1),te=we[14]/(we[10]+1),oe=(we[9]+1)/we[5],le=(we[9]-1)/we[5],ce=(we[8]-1)/we[0],pe=(He[8]+1)/He[0],Ve=at*ce,Be=at*pe,Ye=ke/(-ce+pe),$e=Ye*-ce;if(J.matrixWorld.decompose(Y.position,Y.quaternion,Y.scale),Y.translateX($e),Y.translateZ(Ye),Y.matrixWorld.compose(Y.position,Y.quaternion,Y.scale),Y.matrixWorldInverse.copy(Y.matrixWorld).invert(),we[10]===-1)Y.projectionMatrix.copy(J.projectionMatrix),Y.projectionMatrixInverse.copy(J.projectionMatrixInverse);else{const L=at+Ye,ct=te+Ye,nt=Ve-$e,C=Be+(ke-$e),v=oe*te/ct*L,z=le*te/ct*L;Y.projectionMatrix.makePerspective(nt,C,v,z,L,ct),Y.projectionMatrixInverse.copy(Y.projectionMatrix).invert()}}function re(Y,J){J===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(J.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(s===null)return;let J=Y.near,me=Y.far;p.texture!==null&&(p.depthNear>0&&(J=p.depthNear),p.depthFar>0&&(me=p.depthFar)),V.near=I.near=P.near=J,V.far=I.far=P.far=me,(U!==V.near||B!==V.far)&&(s.updateRenderState({depthNear:V.near,depthFar:V.far}),U=V.near,B=V.far),V.layers.mask=Y.layers.mask|6,P.layers.mask=V.layers.mask&-5,I.layers.mask=V.layers.mask&-3;const ke=Y.parent,we=V.cameras;re(V,ke);for(let He=0;He<we.length;He++)re(we[He],ke);we.length===2?O(V,P,I):V.projectionMatrix.copy(P.projectionMatrix),R===null&&Y.isPerspectiveCamera&&(R={camera:Y,fov:Y.fov,zoom:Y.zoom}),ae(Y,V,ke)};function ae(Y,J,me){me===null?Y.matrix.copy(J.matrixWorld):(Y.matrix.copy(me.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(J.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(J.projectionMatrix),Y.projectionMatrixInverse.copy(J.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=$s*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return V},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(Y){l=Y,d!==null&&(d.fixedFoveation=Y),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Y)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(V)},this.getCameraTexture=function(Y){return m[Y]};let Ie=null;function ze(Y,J){if(h=J.getViewerPose(c||o),g=J,h!==null){const me=h.views;f!==null&&(e.setRenderTargetFramebuffer(x,f.framebuffer),e.setRenderTarget(x));let ke=!1;me.length!==V.cameras.length&&(V.cameras.length=0,ke=!0);for(let te=0;te<me.length;te++){const oe=me[te];let le=null;if(f!==null)le=f.getViewport(oe);else{const pe=u.getViewSubImage(d,oe);le=pe.viewport,te===0&&(e.setRenderTargetTextures(x,pe.colorTexture,pe.depthStencilTexture),e.setRenderTarget(x))}let ce=F[te];ce===void 0&&(ce=new nn,ce.layers.enable(te),ce.viewport=new ft,F[te]=ce),ce.matrix.fromArray(oe.transform.matrix),ce.matrix.decompose(ce.position,ce.quaternion,ce.scale),ce.projectionMatrix.fromArray(oe.projectionMatrix),ce.projectionMatrixInverse.copy(ce.projectionMatrix).invert(),ce.viewport.set(le.x,le.y,le.width,le.height),te===0&&(V.matrix.copy(ce.matrix),V.matrix.decompose(V.position,V.quaternion,V.scale)),ke===!0&&V.cameras.push(ce)}const we=s.enabledFeatures;if(we&&we.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&_){u=n.getBinding();const te=u.getDepthInformation(me[0]);te&&te.isValid&&te.texture&&p.init(te,s.renderState)}if(we&&we.includes("camera-access")&&_){e.state.unbindTexture(),u=n.getBinding();for(let te=0;te<me.length;te++){const oe=me[te].camera;if(oe){let le=m[oe];le||(le=new Uf,m[oe]=le);const ce=u.getCameraImage(oe);le.sourceTexture=ce}}}}for(let me=0;me<S.length;me++){const ke=w[me],we=S[me];ke!==null&&we!==void 0&&we.update(ke,J,c||o)}Ie&&Ie(Y,J),J.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:J}),g=null}const qe=new jf;qe.setAnimationLoop(ze),this.setAnimationLoop=function(Y){Ie=Y},this.dispose=function(){}}}const qM=new Xe,rp=new Ke;rp.set(-1,0,0,0,1,0,0,0,1);function KM(i,e){function t(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function n(p,m){m.color.getRGB(p.fogColor.value,Wf(i)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function s(p,m,M,T,x){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(p,m):m.isMeshLambertMaterial?(r(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(p,m),u(p,m)):m.isMeshPhongMaterial?(r(p,m),h(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(p,m),d(p,m),m.isMeshPhysicalMaterial&&f(p,m,x)):m.isMeshMatcapMaterial?(r(p,m),g(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),_(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(o(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?l(p,m,M,T):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,t(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===sn&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,t(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===sn&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,t(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,t(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);const M=e.get(m),T=M.envMap,x=M.envMapRotation;T&&(p.envMap.value=T,p.envMapRotation.value.setFromMatrix4(qM.makeRotationFromEuler(x)).transpose(),T.isCubeTexture&&T.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(rp),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,p.aoMapTransform))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,M,T){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*M,p.scale.value=T*.5,m.map&&(p.map.value=m.map,t(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function h(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function u(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function d(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function f(p,m,M){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===sn&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.retroreflectivity>0&&(p.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=M.texture,p.transmissionSamplerSize.value.set(M.width,M.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,m){m.matcap&&(p.matcap.value=m.matcap)}function _(p,m){const M=e.get(m).light;p.referencePosition.value.setFromMatrixPosition(M.matrixWorld),p.nearDistance.value=M.shadow.camera.near,p.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function $M(i,e,t,n){let s={},r={},o=[];const a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(x,S){const w=S.program;n.uniformBlockBinding(x,w)}function c(x,S){let w=s[x.id];w===void 0&&(p(x),w=h(x),s[x.id]=w,x.addEventListener("dispose",M));const E=S.program;n.updateUBOMapping(x,E);const y=e.render.frame;r[x.id]!==y&&(d(x),r[x.id]=y)}function h(x){const S=u();x.__bindingPointIndex=S;const w=i.createBuffer(),E=x.__size,y=x.usage;return i.bindBuffer(i.UNIFORM_BUFFER,w),i.bufferData(i.UNIFORM_BUFFER,E,y),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,S,w),w}function u(){for(let x=0;x<a;x++)if(o.indexOf(x)===-1)return o.push(x),x;return We("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(x){const S=s[x.id],w=x.uniforms,E=x.__cache;i.bindBuffer(i.UNIFORM_BUFFER,S);for(let y=0,R=w.length;y<R;y++){const P=w[y];if(Array.isArray(P))for(let I=0,F=P.length;I<F;I++)f(P[I],y,I,E);else f(P,y,0,E)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(x,S,w,E){if(_(x,S,w,E)===!0){const y=x.__offset,R=x.value;if(Array.isArray(R)){let P=0;for(let I=0;I<R.length;I++){const F=R[I],V=m(F);g(F,x.__data,P),typeof F!="number"&&typeof F!="boolean"&&!F.isMatrix3&&!ArrayBuffer.isView(F)&&(P+=V.storage/Float32Array.BYTES_PER_ELEMENT)}}else g(R,x.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,y,x.__data)}}function g(x,S,w){typeof x=="number"||typeof x=="boolean"?S[0]=x:x.isMatrix3?(S[0]=x.elements[0],S[1]=x.elements[1],S[2]=x.elements[2],S[3]=0,S[4]=x.elements[3],S[5]=x.elements[4],S[6]=x.elements[5],S[7]=0,S[8]=x.elements[6],S[9]=x.elements[7],S[10]=x.elements[8],S[11]=0):ArrayBuffer.isView(x)?S.set(new x.constructor(x.buffer,x.byteOffset,S.length)):x.toArray(S,w)}function _(x,S,w,E){const y=x.value,R=S+"_"+w;if(E[R]===void 0)return typeof y=="number"||typeof y=="boolean"?E[R]=y:ArrayBuffer.isView(y)?E[R]=y.slice():E[R]=y.clone(),!0;{const P=E[R];if(typeof y=="number"||typeof y=="boolean"){if(P!==y)return E[R]=y,!0}else{if(ArrayBuffer.isView(y))return!0;if(P.equals(y)===!1)return P.copy(y),!0}}return!1}function p(x){const S=x.uniforms;let w=0;const E=16;for(let R=0,P=S.length;R<P;R++){const I=Array.isArray(S[R])?S[R]:[S[R]];for(let F=0,V=I.length;F<V;F++){const U=I[F],B=Array.isArray(U.value)?U.value:[U.value];for(let K=0,W=B.length;K<W;K++){const ie=B[K],q=m(ie),Q=w%E,O=Q%q.boundary,re=Q+O;w+=O,re!==0&&E-re<q.storage&&(w+=E-re),U.__data=new Float32Array(q.storage/Float32Array.BYTES_PER_ELEMENT),U.__offset=w,w+=q.storage}}}const y=w%E;return y>0&&(w+=E-y),x.__size=w,x.__cache={},this}function m(x){const S={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(S.boundary=4,S.storage=4):x.isVector2?(S.boundary=8,S.storage=8):x.isVector3||x.isColor?(S.boundary=16,S.storage=12):x.isVector4?(S.boundary=16,S.storage=16):x.isMatrix3?(S.boundary=48,S.storage=48):x.isMatrix4?(S.boundary=64,S.storage=64):x.isTexture?Ne("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(S.boundary=16,S.storage=x.byteLength):Ne("WebGLRenderer: Unsupported uniform value type.",x),S}function M(x){const S=x.target;S.removeEventListener("dispose",M);const w=o.indexOf(S.__bindingPointIndex);o.splice(w,1),i.deleteBuffer(s[S.id]),delete s[S.id],delete r[S.id]}function T(){for(const x in s)i.deleteBuffer(s[x]);o=[],s={},r={}}return{bind:l,update:c,dispose:T}}const ZM=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let Wn=null;function JM(){return Wn===null&&(Wn=new mh(ZM,16,16,ns,Zt),Wn.name="DFG_LUT",Wn.minFilter=Ft,Wn.magFilter=Ft,Wn.wrapS=Zn,Wn.wrapT=Zn,Wn.generateMipmaps=!1,Wn.needsUpdate=!0),Wn}class jM{constructor(e={}){const{canvas:t=km(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=mn}=e;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=o;const _=f,p=new Set([lh,ah,oh]),m=new Set([mn,ii,kr,Hr,ih,sh]),M=new Uint32Array(4),T=new Int32Array(4),x=new A;let S=null,w=null;const E=[],y=[];let R=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=ti,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const P=this;let I=!1,F=null,V=null,U=null,B=null;this._outputColorSpace=wt;let K=0,W=0,ie=null,q=-1,Q=null;const O=new ft,re=new ft;let ae=null;const Ie=new de(0);let ze=0,qe=t.width,Y=t.height,J=1,me=null,ke=null;const we=new ft(0,0,qe,Y),He=new ft(0,0,qe,Y);let at=!1;const te=new _h;let oe=!1,le=!1;const ce=new Xe,pe=new A,Ve=new ft,Be={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ye=!1;function $e(){return ie===null?J:1}let L=n;function ct(b,D){return t.getContext(b,D)}let nt,C,v,z,G,$,ue,fe,Z,ee,ge,Ue,ye,_e,Fe,Ge,Ze,N,xe,j,ve,Te,se;try{const b={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Kc}`),t.addEventListener("webglcontextlost",Mt,!1),t.addEventListener("webglcontextrestored",ht,!1),t.addEventListener("webglcontextcreationerror",Pn,!1),L===null){const D="webgl2";if(L=ct(D,b),L===null)throw ct(D)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Oe()}catch(b){throw t.removeEventListener("webglcontextlost",Mt,!1),t.removeEventListener("webglcontextrestored",ht,!1),t.removeEventListener("webglcontextcreationerror",Pn,!1),We("WebGLRenderer: "+b.message),b}function Oe(){nt=new Jv(L),nt.init(),ve=new VM(L,nt),C=new Hv(L,nt,e,ve),v=new kM(L,nt),C.reversedDepthBuffer&&d&&v.buffers.depth.setReversed(!0),V=L.createFramebuffer(),U=L.createFramebuffer(),B=L.createFramebuffer(),z=new ey(L),G=new EM,$=new HM(L,nt,v,G,C,ve,z),ue=new Zv(P),fe=new n_(L),Te=new zv(L,fe),Z=new jv(L,fe,z,Te),ee=new ny(L,Z,fe,Te,z),N=new ty(L,C,$),Fe=new Vv(G),ge=new wM(P,ue,nt,C,Te,Fe),Ue=new KM(P,G),ye=new RM,_e=new NM(nt),Ze=new Bv(P,ue,v,ee,g,l),Ge=new zM(P,ee,C),se=new $M(L,z,C,v),xe=new kv(L,nt,z),j=new Qv(L,nt,z),z.programs=ge.programs,P.capabilities=C,P.extensions=nt,P.properties=G,P.renderLists=ye,P.shadowMap=Ge,P.state=v,P.info=z}_!==mn&&(R=new sy(_,t.width,t.height,a,s,r));const Le=new YM(P,L);this.xr=Le,this.getContext=function(){return L},this.getContextAttributes=function(){return L.getContextAttributes()},this.forceContextLoss=function(){const b=nt.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){const b=nt.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return J},this.setPixelRatio=function(b){b!==void 0&&(J=b,this.setSize(qe,Y,!1))},this.getSize=function(b){return b.set(qe,Y)},this.setSize=function(b,D,X=!0){if(Le.isPresenting){Ne("WebGLRenderer: Can't change size while VR device is presenting.");return}qe=b,Y=D,t.width=Math.floor(b*J),t.height=Math.floor(D*J),X===!0&&(t.style.width=b+"px",t.style.height=D+"px"),R!==null&&R.setSize(t.width,t.height),this.setViewport(0,0,b,D)},this.getDrawingBufferSize=function(b){return b.set(qe*J,Y*J).floor()},this.setDrawingBufferSize=function(b,D,X){qe=b,Y=D,J=X,t.width=Math.floor(b*X),t.height=Math.floor(D*X),this.setViewport(0,0,b,D)},this.setEffects=function(b){if(_===mn){We("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(b){for(let D=0;D<b.length;D++)if(b[D].isOutputPass===!0){Ne("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}R.setEffects(b||[])},this.getCurrentViewport=function(b){return b.copy(O)},this.getViewport=function(b){return b.copy(we)},this.setViewport=function(b,D,X,k){b.isVector4?we.set(b.x,b.y,b.z,b.w):we.set(b,D,X,k),v.viewport(O.copy(we).multiplyScalar(J).round())},this.getScissor=function(b){return b.copy(He)},this.setScissor=function(b,D,X,k){b.isVector4?He.set(b.x,b.y,b.z,b.w):He.set(b,D,X,k),v.scissor(re.copy(He).multiplyScalar(J).round())},this.getScissorTest=function(){return at},this.setScissorTest=function(b){v.setScissorTest(at=b)},this.setOpaqueSort=function(b){me=b},this.setTransparentSort=function(b){ke=b},this.getClearColor=function(b){return b.copy(Ze.getClearColor())},this.setClearColor=function(){Ze.setClearColor(...arguments)},this.getClearAlpha=function(){return Ze.getClearAlpha()},this.setClearAlpha=function(){Ze.setClearAlpha(...arguments)},this.clear=function(b=!0,D=!0,X=!0){let k=0;if(b){let H=!1;if(ie!==null){const be=ie.texture.format;H=p.has(be)}if(H){const be=ie.texture.type,Ae=m.has(be),Se=Ze.getClearColor(),Ce=Ze.getClearAlpha(),De=Se.r,je=Se.g,it=Se.b;Ae?(M[0]=De,M[1]=je,M[2]=it,M[3]=Ce,L.clearBufferuiv(L.COLOR,0,M)):(T[0]=De,T[1]=je,T[2]=it,T[3]=Ce,L.clearBufferiv(L.COLOR,0,T))}else k|=L.COLOR_BUFFER_BIT}D&&(k|=L.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),X&&(k|=L.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),k!==0&&L.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(b){b.setRenderer(this),F=b},this.dispose=function(){t.removeEventListener("webglcontextlost",Mt,!1),t.removeEventListener("webglcontextrestored",ht,!1),t.removeEventListener("webglcontextcreationerror",Pn,!1),Ze.dispose(),ye.dispose(),_e.dispose(),G.dispose(),ue.dispose(),ee.dispose(),Te.dispose(),se.dispose(),ge.dispose(),Le.dispose(),Le.removeEventListener("sessionstart",Xh),Le.removeEventListener("sessionend",Yh),Hi.stop()};function Mt(b){b.preventDefault(),da("WebGLRenderer: Context Lost."),I=!0}function ht(){da("WebGLRenderer: Context Restored."),I=!1;const b=z.autoReset,D=Ge.enabled,X=Ge.autoUpdate,k=Ge.needsUpdate,H=Ge.type;Oe(),z.autoReset=b,Ge.enabled=D,Ge.autoUpdate=X,Ge.needsUpdate=k,Ge.type=H}function Pn(b){We("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function Hn(b){const D=b.target;D.removeEventListener("dispose",Hn),Np(D)}function Np(b){Up(b),G.remove(b)}function Up(b){const D=G.get(b).programs;D!==void 0&&(D.forEach(function(X){ge.releaseProgram(X)}),b.isShaderMaterial&&ge.releaseShaderCache(b))}this.renderBufferDirect=function(b,D,X,k,H,be){D===null&&(D=Be);const Ae=H.isMesh&&H.matrixWorld.determinantAffine()<0,Se=Bp(b,D,X,k,H);v.setMaterial(k,Ae);let Ce=X.index,De=1;if(k.wireframe===!0){if(Ce=Z.getWireframeAttribute(X),Ce===void 0)return;De=2}const je=X.drawRange,it=X.attributes.position;let Pe=je.start*De,ut=(je.start+je.count)*De;be!==null&&(Pe=Math.max(Pe,be.start*De),ut=Math.min(ut,(be.start+be.count)*De)),Ce!==null?(Pe=Math.max(Pe,0),ut=Math.min(ut,Ce.count)):it!=null&&(Pe=Math.max(Pe,0),ut=Math.min(ut,it.count));const Lt=ut-Pe;if(Lt<0||Lt===1/0)return;Te.setup(H,k,Se,X,Ce);let bt,xt=xe;if(Ce!==null&&(bt=fe.get(Ce),xt=j,xt.setIndex(bt)),H.isMesh)k.wireframe===!0?(v.setLineWidth(k.wireframeLinewidth*$e()),xt.setMode(L.LINES)):xt.setMode(L.TRIANGLES);else if(H.isLine){let Xt=k.linewidth;Xt===void 0&&(Xt=1),v.setLineWidth(Xt*$e()),H.isLineSegments?xt.setMode(L.LINES):H.isLineLoop?xt.setMode(L.LINE_LOOP):xt.setMode(L.LINE_STRIP)}else H.isPoints?xt.setMode(L.POINTS):H.isSprite&&xt.setMode(L.TRIANGLES);if(H.isBatchedMesh)if(nt.get("WEBGL_multi_draw"))xt.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{const Xt=H._multiDrawStarts,Ee=H._multiDrawCounts,jt=H._multiDrawCount,rt=Ce?fe.get(Ce).bytesPerElement:1,yn=G.get(k).currentProgram.getUniforms();for(let Vn=0;Vn<jt;Vn++)yn.setValue(L,"_gl_DrawID",Vn),xt.render(Xt[Vn]/rt,Ee[Vn])}else if(H.isInstancedMesh)xt.renderInstances(Pe,Lt,H.count);else if(X.isInstancedBufferGeometry){const Xt=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,Ee=Math.min(X.instanceCount,Xt);xt.renderInstances(Pe,Lt,Ee)}else xt.render(Pe,Lt)};function Wh(b,D,X,k){F!==null&&b.isNodeMaterial&&F.setObject(k,b),oe===!0&&Fe.setState(b,X,!1),b.transparent===!0&&b.side===pn&&b.forceSinglePass===!1?(b.side=sn,b.needsUpdate=!0,oo(b,D,k),b.side=Bi,b.needsUpdate=!0,oo(b,D,k),b.side=pn):oo(b,D,k)}this.compile=function(b,D,X=null){X===null&&(X=b),F!==null&&F.renderStart(b,D,X),w=_e.get(X),w.init(D),y.push(w),X.traverseVisible(function(H){H.isLight&&H.layers.test(D.layers)&&(w.pushLight(H),H.castShadow&&w.pushShadow(H))}),b!==X&&b.traverseVisible(function(H){H.isLight&&H.layers.test(D.layers)&&(w.pushLight(H),H.castShadow&&w.pushShadow(H))}),w.setupLights(),F!==null&&F.updateLights(w.state.lightsArray),le=this.localClippingEnabled,oe=Fe.init(this.clippingPlanes,le),oe===!0&&Fe.setGlobalState(this.clippingPlanes,D),F!==null&&Ge.render(w.state.shadowsArray,X,D);const k=new Set;return b.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;const be=H.material;if(be)if(Array.isArray(be))for(let Ae=0;Ae<be.length;Ae++){const Se=be[Ae];Wh(Se,X,D,H),k.add(Se)}else Wh(be,X,D,H),k.add(be)}),w=y.pop(),F!==null&&F.renderEnd(),k},this.compileAsync=function(b,D,X=null){const k=this.compile(b,D,X);return new Promise(H=>{function be(){if(k.forEach(function(Ae){const Ce=G.get(Ae).currentProgram;(Ce===void 0||Ce.isReady())&&k.delete(Ae)}),k.size===0){H(b);return}setTimeout(be,10)}nt.get("KHR_parallel_shader_compile")!==null?be():setTimeout(be,10)})};let Na=null;function Fp(b){Na&&Na(b)}function Xh(){Hi.stop()}function Yh(){Hi.start()}const Hi=new jf;Hi.setAnimationLoop(Fp),typeof self<"u"&&Hi.setContext(self),this.setAnimationLoop=function(b){Na=b,Le.setAnimationLoop(b),b===null?Hi.stop():Hi.start()},Le.addEventListener("sessionstart",Xh),Le.addEventListener("sessionend",Yh),this.render=function(b,D){if(D!==void 0&&D.isCamera!==!0){We("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;F!==null&&F.renderStart(b,D);const X=Le.enabled===!0&&Le.isPresenting===!0,k=R!==null&&(ie===null||X)&&R.begin(P,ie);if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),D.parent===null&&D.matrixWorldAutoUpdate===!0&&D.updateMatrixWorld(),Le.enabled===!0&&Le.isPresenting===!0&&(R===null||R.isCompositing()===!1)&&(Le.cameraAutoUpdate===!0&&Le.updateCamera(D),D=Le.getCamera()),b.isScene===!0&&b.onBeforeRender(P,b,D,ie),w=_e.get(b,y.length),w.init(D),w.state.textureUnits=$.getTextureUnits(),y.push(w),ce.multiplyMatrices(D.projectionMatrix,D.matrixWorldInverse),te.setFromProjectionMatrix(ce,jn,D.reversedDepth),le=this.localClippingEnabled,oe=Fe.init(this.clippingPlanes,le),S=ye.get(b,E.length),S.init(),E.push(S),Le.enabled===!0&&Le.isPresenting===!0){const Ae=P.xr.getDepthSensingMesh();Ae!==null&&Ua(Ae,D,-1/0,P.sortObjects)}Ua(b,D,0,P.sortObjects),S.finish(),F!==null&&F.updateLights(w.state.lightsArray),P.sortObjects===!0&&S.sort(me,ke),Ye=Le.enabled===!1||Le.isPresenting===!1||Le.hasDepthSensing()===!1,Ye&&Ze.addToRenderList(S,b),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),oe===!0&&Fe.beginShadows();const H=w.state.shadowsArray;if(Ge.render(H,b,D),oe===!0&&Fe.endShadows(),(k&&R.hasRenderPass())===!1){const Ae=S.opaque,Se=S.transmissive;if(w.setupLights(),D.isArrayCamera){const Ce=D.cameras;if(Se.length>0)for(let De=0,je=Ce.length;De<je;De++){const it=Ce[De];Kh(Ae,Se,b,it)}Ye&&Ze.render(b);for(let De=0,je=Ce.length;De<je;De++){const it=Ce[De];qh(S,b,it,it.viewport)}}else Se.length>0&&Kh(Ae,Se,b,D),Ye&&Ze.render(b),qh(S,b,D)}ie!==null&&W===0&&($.updateMultisampleRenderTarget(ie),$.updateRenderTargetMipmap(ie)),k&&R.end(P),b.isScene===!0&&b.onAfterRender(P,b,D),Te.resetDefaultState(),q=-1,Q=null,y.pop(),y.length>0?(w=y[y.length-1],$.setTextureUnits(w.state.textureUnits),oe===!0&&Fe.setGlobalState(P.clippingPlanes,w.state.camera)):w=null,E.pop(),E.length>0?S=E[E.length-1]:S=null,F!==null&&F.renderEnd()};function Ua(b,D,X,k){if(b.visible===!1)return;if(b.layers.test(D.layers)){if(b.isGroup)X=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(D);else if(b.isLightProbeGrid)w.pushLightProbeGrid(b);else if(b.isLight)w.pushLight(b),b.castShadow&&w.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||b.intersectsFrustum(te)){k&&Ve.setFromMatrixPosition(b.matrixWorld).applyMatrix4(ce);const Ae=ee.update(b),Se=b.material;Se.visible&&S.push(b,Ae,Se,X,Ve.z,null,D)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||b.intersectsFrustum(te))){const Ae=ee.update(b),Se=b.material;if(k&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),Ve.copy(b.boundingSphere.center)):(Ae.boundingSphere===null&&Ae.computeBoundingSphere(),Ve.copy(Ae.boundingSphere.center)),Ve.applyMatrix4(b.matrixWorld).applyMatrix4(ce)),Array.isArray(Se)){const Ce=Ae.groups;for(let De=0,je=Ce.length;De<je;De++){const it=Ce[De],Pe=Se[it.materialIndex];Pe&&Pe.visible&&S.push(b,Ae,Pe,X,Ve.z,it,D)}}else Se.visible&&S.push(b,Ae,Se,X,Ve.z,null,D)}}const be=b.children;for(let Ae=0,Se=be.length;Ae<Se;Ae++)Ua(be[Ae],D,X,k)}function qh(b,D,X,k){const{opaque:H,transmissive:be,transparent:Ae}=b;w.setupLightsView(X),oe===!0&&Fe.setGlobalState(P.clippingPlanes,X),k&&v.viewport(O.copy(k)),H.length>0&&ro(H,D,X),be.length>0&&ro(be,D,X),Ae.length>0&&ro(Ae,D,X),v.buffers.depth.setTest(!0),v.buffers.depth.setMask(!0),v.buffers.color.setMask(!0),v.setPolygonOffset(!1)}function Kh(b,D,X,k){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[k.id]===void 0){const Pe=nt.has("EXT_color_buffer_half_float")||nt.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[k.id]=new Wt(1,1,{generateMipmaps:!0,type:Pe?Zt:mn,minFilter:Jn,samples:Math.max(4,C.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:et.workingColorSpace})}const be=w.state.transmissionRenderTarget[k.id],Ae=k.viewport||O;be.setSize(Ae.z*P.transmissionResolutionScale,Ae.w*P.transmissionResolutionScale);const Se=P.getRenderTarget(),Ce=P.getActiveCubeFace(),De=P.getActiveMipmapLevel();P.setRenderTarget(be),P.getClearColor(Ie),ze=P.getClearAlpha(),ze<1&&P.setClearColor(16777215,.5),P.clear(),Ye&&Ze.render(X);const je=P.toneMapping;P.toneMapping=ti;const it=k.viewport;if(k.viewport!==void 0&&(k.viewport=void 0),w.setupLightsView(k),oe===!0&&Fe.setGlobalState(P.clippingPlanes,k),ro(b,X,k),$.updateMultisampleRenderTarget(be),$.updateRenderTargetMipmap(be),nt.has("WEBGL_multisampled_render_to_texture")===!1){let Pe=!1;for(let ut=0,Lt=D.length;ut<Lt;ut++){const bt=D[ut],{object:xt,geometry:Xt,material:Ee,group:jt}=bt;if(Ee.side===pn&&xt.layers.test(k.layers)){const rt=Ee.side;Ee.side=sn,Ee.needsUpdate=!0,$h(xt,X,k,Xt,Ee,jt),Ee.side=rt,Ee.needsUpdate=!0,Pe=!0}}Pe===!0&&($.updateMultisampleRenderTarget(be),$.updateRenderTargetMipmap(be))}P.setRenderTarget(Se,Ce,De),P.setClearColor(Ie,ze),it!==void 0&&(k.viewport=it),P.toneMapping=je}function ro(b,D,X){const k=D.isScene===!0?D.overrideMaterial:null;for(let H=0,be=b.length;H<be;H++){const Ae=b[H],{object:Se,geometry:Ce,group:De}=Ae;let je=Ae.material;je.allowOverride===!0&&k!==null&&(je=k),Se.layers.test(X.layers)&&$h(Se,D,X,Ce,je,De)}}function $h(b,D,X,k,H,be){F!==null&&H.isNodeMaterial&&F.setObject(b,H),b.onBeforeRender(P,D,X,k,H,be),b.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),H.onBeforeRender(P,D,X,k,b,be),H.transparent===!0&&H.side===pn&&H.forceSinglePass===!1?(H.side=sn,H.needsUpdate=!0,P.renderBufferDirect(X,D,k,H,b,be),H.side=Bi,H.needsUpdate=!0,P.renderBufferDirect(X,D,k,H,b,be),H.side=pn):P.renderBufferDirect(X,D,k,H,b,be),b.onAfterRender(P,D,X,k,H,be)}function oo(b,D,X){D.isScene!==!0&&(D=Be);const k=G.get(b),H=w.state.lights,be=w.state.shadowsArray,Ae=H.state.version,Se=ge.getParameters(b,H.state,be,D,X,w.state.lightProbeGridArray),Ce=ge.getProgramCacheKey(Se);let De=k.programs;k.environment=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?D.environment:null,k.fog=D.fog;const je=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap;k.envMap=ue.get(b.envMap||k.environment,je),k.envMapRotation=k.environment!==null&&b.envMap===null?D.environmentRotation:b.envMapRotation,De===void 0&&(b.addEventListener("dispose",Hn),De=new Map,k.programs=De);let it=De.get(Ce);if(it!==void 0){if(k.currentProgram===it&&k.lightsStateVersion===Ae)return Jh(b,Se),it}else Se.uniforms=ge.getUniforms(b),F!==null&&b.isNodeMaterial&&F.build(b,X,Se),b.onBeforeCompile(Se,P),it=ge.acquireProgram(Se,Ce),De.set(Ce,it),k.uniforms=Se.uniforms;const Pe=k.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(Pe.clippingPlanes=Fe.uniform),Jh(b,Se),k.needsLights=kp(b),k.lightsStateVersion=Ae,k.needsLights&&(Pe.ambientLightColor.value=H.state.ambient,Pe.lightProbe.value=H.state.probe,Pe.sunLights.value=H.state.sun,Pe.sunLightShadows.value=H.state.sunShadow,Pe.directionalLights.value=H.state.directional,Pe.directionalLightShadows.value=H.state.directionalShadow,Pe.spotLights.value=H.state.spot,Pe.spotLightShadows.value=H.state.spotShadow,Pe.rectAreaLights.value=H.state.rectArea,Pe.ltc_1.value=H.state.rectAreaLTC1,Pe.ltc_2.value=H.state.rectAreaLTC2,Pe.pointLights.value=H.state.point,Pe.pointLightShadows.value=H.state.pointShadow,Pe.hemisphereLights.value=H.state.hemi,Pe.sunShadowMatrix.value=H.state.sunShadowMatrix,Pe.sunShadowCascade.value=H.state.sunShadowCascade,Pe.directionalShadowMatrix.value=H.state.directionalShadowMatrix,Pe.spotLightMatrix.value=H.state.spotLightMatrix,Pe.spotLightMap.value=H.state.spotLightMap,Pe.pointShadowMatrix.value=H.state.pointShadowMatrix),k.lightProbeGrid=w.state.lightProbeGridArray.length>0,k.currentProgram=it,k.uniformsList=null,it}function Zh(b){if(b.uniformsList===null){const D=b.currentProgram.getUniforms();b.uniformsList=sa.seqWithValue(D.seq,b.uniforms)}return b.uniformsList}function Jh(b,D){const X=G.get(b);X.outputColorSpace=D.outputColorSpace,X.batching=D.batching,X.batchingColor=D.batchingColor,X.instancing=D.instancing,X.instancingColor=D.instancingColor,X.instancingMorph=D.instancingMorph,X.skinning=D.skinning,X.morphTargets=D.morphTargets,X.morphNormals=D.morphNormals,X.morphColors=D.morphColors,X.morphTargetsCount=D.morphTargetsCount,X.numClippingPlanes=D.numClippingPlanes,X.numIntersection=D.numClipIntersection,X.vertexAlphas=D.vertexAlphas,X.vertexTangents=D.vertexTangents,X.toneMapping=D.toneMapping}function Op(b,D){if(b.length===0)return null;if(b.length===1)return b[0].texture!==null?b[0]:null;x.setFromMatrixPosition(D.matrixWorld);for(let X=0,k=b.length;X<k;X++){const H=b[X];if(H.texture!==null&&H.boundingBox.containsPoint(x))return H}return null}function Bp(b,D,X,k,H){D.isScene!==!0&&(D=Be),$.resetTextureUnits();const be=D.fog,Ae=k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial?D.environment:null,Se=ie===null?P.outputColorSpace:ie.isXRRenderTarget===!0?ie.texture.colorSpace:et.workingColorSpace,Ce=k.isMeshStandardMaterial||k.isMeshLambertMaterial&&!k.envMap||k.isMeshPhongMaterial&&!k.envMap,De=ue.get(k.envMap||Ae,Ce),je=k.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,it=!!X.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),Pe=!!X.morphAttributes.position,ut=!!X.morphAttributes.normal,Lt=!!X.morphAttributes.color;let bt=ti;k.toneMapped&&(ie===null||ie.isXRRenderTarget===!0)&&(bt=P.toneMapping);const xt=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,Xt=xt!==void 0?xt.length:0,Ee=G.get(k),jt=w.state.lights;if(oe===!0&&(le===!0||b!==Q)){const St=b===Q&&k.id===q;Fe.setState(k,b,St)}let rt=!1;k.version===Ee.__version?(Ee.needsLights&&Ee.lightsStateVersion!==jt.state.version||Ee.outputColorSpace!==Se||H.isBatchedMesh&&Ee.batching===!1||!H.isBatchedMesh&&Ee.batching===!0||H.isBatchedMesh&&Ee.batchingColor===!0&&H._colorsTexture===null||H.isBatchedMesh&&Ee.batchingColor===!1&&H._colorsTexture!==null||H.isInstancedMesh&&Ee.instancing===!1||!H.isInstancedMesh&&Ee.instancing===!0||H.isSkinnedMesh&&Ee.skinning===!1||!H.isSkinnedMesh&&Ee.skinning===!0||H.isInstancedMesh&&Ee.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&Ee.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&Ee.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&Ee.instancingMorph===!1&&H.morphTexture!==null||Ee.envMap!==De||k.fog===!0&&Ee.fog!==be||Ee.numClippingPlanes!==void 0&&(Ee.numClippingPlanes!==Fe.numPlanes||Ee.numIntersection!==Fe.numIntersection)||Ee.vertexAlphas!==je||Ee.vertexTangents!==it||Ee.morphTargets!==Pe||Ee.morphNormals!==ut||Ee.morphColors!==Lt||Ee.toneMapping!==bt||Ee.morphTargetsCount!==Xt||!!Ee.lightProbeGrid!=w.state.lightProbeGridArray.length>0)&&(rt=!0):(rt=!0,Ee.__version=k.version);let yn=Ee.currentProgram;rt===!0&&(yn=oo(k,D,H),F&&k.isNodeMaterial&&F.onUpdateProgram(k,yn,Ee));let Vn=!1,bi=!1,hs=!1;const gt=yn.getUniforms(),Rt=Ee.uniforms;if(v.useProgram(yn.program)&&(Vn=!0,bi=!0,hs=!0),k.id!==q&&(q=k.id,bi=!0),Ee.needsLights){const St=Op(w.state.lightProbeGridArray,H);Ee.lightProbeGrid!==St&&(Ee.lightProbeGrid=St,bi=!0)}if(Vn||Q!==b){v.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),gt.setValue(L,"projectionMatrix",b.projectionMatrix),gt.setValue(L,"viewMatrix",b.matrixWorldInverse);const wi=gt.map.cameraPosition;wi!==void 0&&wi.setValue(L,pe.setFromMatrixPosition(b.matrixWorld)),C.logarithmicDepthBuffer&&gt.setValue(L,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&gt.setValue(L,"isOrthographic",b.isOrthographicCamera===!0),Q!==b&&(Q=b,bi=!0,hs=!0)}if(Ee.needsLights&&(jt.state.sunShadowMap.length>0&&gt.setValue(L,"sunShadowMap",jt.state.sunShadowMap,$),jt.state.directionalShadowMap.length>0&&gt.setValue(L,"directionalShadowMap",jt.state.directionalShadowMap,$),jt.state.spotShadowMap.length>0&&gt.setValue(L,"spotShadowMap",jt.state.spotShadowMap,$),jt.state.pointShadowMap.length>0&&gt.setValue(L,"pointShadowMap",jt.state.pointShadowMap,$)),H.isSkinnedMesh){gt.setOptional(L,H,"bindMatrix"),gt.setOptional(L,H,"bindMatrixInverse");const St=H.skeleton;St&&(St.boneTexture===null&&St.computeBoneTexture(),gt.setValue(L,"boneTexture",St.boneTexture,$))}H.isBatchedMesh&&(gt.setOptional(L,H,"batchingTexture"),gt.setValue(L,"batchingTexture",H._matricesTexture,$),gt.setOptional(L,H,"batchingIdTexture"),gt.setValue(L,"batchingIdTexture",H._indirectTexture,$),gt.setOptional(L,H,"batchingColorTexture"),H._colorsTexture!==null&&gt.setValue(L,"batchingColorTexture",H._colorsTexture,$));const Ti=X.morphAttributes;if((Ti.position!==void 0||Ti.normal!==void 0||Ti.color!==void 0)&&N.update(H,X,yn),(bi||Ee.receiveShadow!==H.receiveShadow)&&(Ee.receiveShadow=H.receiveShadow,gt.setValue(L,"receiveShadow",H.receiveShadow)),(k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial)&&k.envMap===null&&D.environment!==null&&(Rt.envMapIntensity.value=D.environmentIntensity),Rt.dfgLUT!==void 0&&(Rt.dfgLUT.value=JM()),bi){if(gt.setValue(L,"toneMappingExposure",P.toneMappingExposure),Ee.needsLights&&zp(Rt,hs),be&&k.fog===!0&&Ue.refreshFogUniforms(Rt,be),Ue.refreshMaterialUniforms(Rt,k,J,Y,w.state.transmissionRenderTarget[b.id]),Ee.needsLights&&Ee.lightProbeGrid){const St=Ee.lightProbeGrid;Rt.probesSH.value=St.texture,Rt.probesMin.value.copy(St.boundingBox.min),Rt.probesMax.value.copy(St.boundingBox.max),Rt.probesResolution.value.copy(St.resolution)}sa.upload(L,Zh(Ee),Rt,$)}if(k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(sa.upload(L,Zh(Ee),Rt,$),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&gt.setValue(L,"center",H.center),gt.setValue(L,"modelViewMatrix",H.modelViewMatrix),gt.setValue(L,"normalMatrix",H.normalMatrix),gt.setValue(L,"modelMatrix",H.matrixWorld),k.uniformsGroups!==void 0){const St=k.uniformsGroups;for(let wi=0,us=St.length;wi<us;wi++){const Qh=St[wi];se.update(Qh,yn),se.bind(Qh,yn)}}return yn}function zp(b,D){b.ambientLightColor.needsUpdate=D,b.lightProbe.needsUpdate=D,b.sunLights.needsUpdate=D,b.sunLightShadows.needsUpdate=D,b.directionalLights.needsUpdate=D,b.directionalLightShadows.needsUpdate=D,b.pointLights.needsUpdate=D,b.pointLightShadows.needsUpdate=D,b.spotLights.needsUpdate=D,b.spotLightShadows.needsUpdate=D,b.rectAreaLights.needsUpdate=D,b.hemisphereLights.needsUpdate=D}function kp(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return K},this.getActiveMipmapLevel=function(){return W},this.getRenderTarget=function(){return ie},this.setRenderTargetTextures=function(b,D,X){const k=G.get(b);k.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,k.__autoAllocateDepthBuffer===!1&&(k.__useRenderToTexture=!1),G.get(b.texture).__webglTexture=D,G.get(b.depthTexture).__webglTexture=k.__autoAllocateDepthBuffer?void 0:X,k.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,D){const X=G.get(b);X.__webglFramebuffer=D,X.__useDefaultFramebuffer=D===void 0},this.setRenderTarget=function(b,D=0,X=0){ie=b,K=D,W=X;let k=null,H=!1,be=!1;if(b){const Se=G.get(b);if(Se.__useDefaultFramebuffer!==void 0){v.bindFramebuffer(L.FRAMEBUFFER,Se.__webglFramebuffer),O.copy(b.viewport),re.copy(b.scissor),ae=b.scissorTest,v.viewport(O),v.scissor(re),v.setScissorTest(ae),q=-1;return}else if(Se.__webglFramebuffer===void 0)$.setupRenderTarget(b);else if(Se.__hasExternalTextures)$.rebindTextures(b,G.get(b.texture).__webglTexture,G.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){const je=b.depthTexture;if(Se.__boundDepthTexture!==je){if(je!==null&&G.has(je)&&(b.width!==je.image.width||b.height!==je.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");$.setupDepthRenderbuffer(b)}}const Ce=b.texture;(Ce.isData3DTexture||Ce.isDataArrayTexture||Ce.isCompressedArrayTexture)&&(be=!0);const De=G.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(De[D])?k=De[D][X]:k=De[D],H=!0):b.samples>0&&$.useMultisampledRTT(b)===!1?k=G.get(b).__webglMultisampledFramebuffer:Array.isArray(De)?k=De[X]:k=De,O.copy(b.viewport),re.copy(b.scissor),ae=b.scissorTest}else O.copy(we).multiplyScalar(J).floor(),re.copy(He).multiplyScalar(J).floor(),ae=at;if(X!==0&&(k=V),v.bindFramebuffer(L.FRAMEBUFFER,k)&&v.drawBuffers(b,k),v.viewport(O),v.scissor(re),v.setScissorTest(ae),H){const Se=G.get(b.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_CUBE_MAP_POSITIVE_X+D,Se.__webglTexture,X)}else if(be){const Se=D;for(let Ce=0;Ce<b.textures.length;Ce++){const De=G.get(b.textures[Ce]);L.framebufferTextureLayer(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0+Ce,De.__webglTexture,X,Se)}}else if(b!==null&&X!==0){const Se=G.get(b.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,Se.__webglTexture,X)}q=-1};function jh(b){const D=G.get(b);return(D.__readFormat!==b.format||D.__readType!==b.type)&&(D.__readFormat=b.format,D.__readType=b.type,D.__formatReadable=C.textureFormatReadable(b.format),D.__typeReadable=C.textureTypeReadable(b.type)),D}this.readRenderTargetPixels=function(b,D,X,k,H,be,Ae,Se=0){if(!(b&&b.isWebGLRenderTarget)){We("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ce=G.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Ae!==void 0&&(Ce=Ce[Ae]),Ce){v.bindFramebuffer(L.FRAMEBUFFER,Ce);try{const De=b.textures[Se],je=De.format,it=De.type;b.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+Se);const Pe=jh(De);if(Pe.__formatReadable===!1){We("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Pe.__typeReadable===!1){We("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}D>=0&&D<=b.width-k&&X>=0&&X<=b.height-H&&L.readPixels(D,X,k,H,ve.convert(je),ve.convert(it),be)}finally{const De=ie!==null?G.get(ie).__webglFramebuffer:null;v.bindFramebuffer(L.FRAMEBUFFER,De)}}},this.readRenderTargetPixelsAsync=async function(b,D,X,k,H,be,Ae,Se=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ce=G.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&Ae!==void 0&&(Ce=Ce[Ae]),Ce)if(D>=0&&D<=b.width-k&&X>=0&&X<=b.height-H){v.bindFramebuffer(L.FRAMEBUFFER,Ce);const De=b.textures[Se],je=De.format,it=De.type;b.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+Se);const Pe=jh(De);if(Pe.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Pe.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const ut=L.createBuffer();L.bindBuffer(L.PIXEL_PACK_BUFFER,ut),L.bufferData(L.PIXEL_PACK_BUFFER,be.byteLength,L.STREAM_READ),L.readPixels(D,X,k,H,ve.convert(je),ve.convert(it),0),L.bindBuffer(L.PIXEL_PACK_BUFFER,null);const Lt=ie!==null?G.get(ie).__webglFramebuffer:null;v.bindFramebuffer(L.FRAMEBUFFER,Lt);const bt=L.fenceSync(L.SYNC_GPU_COMMANDS_COMPLETE,0);return L.flush(),await Hm(L,bt,4),L.bindBuffer(L.PIXEL_PACK_BUFFER,ut),L.getBufferSubData(L.PIXEL_PACK_BUFFER,0,be),L.bindBuffer(L.PIXEL_PACK_BUFFER,null),L.deleteBuffer(ut),L.deleteSync(bt),be}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,D=null,X=0){const k=Math.pow(2,-X),H=Math.floor(b.image.width*k),be=Math.floor(b.image.height*k),Ae=D!==null?D.x:0,Se=D!==null?D.y:0;$.setTexture2D(b,0),L.copyTexSubImage2D(L.TEXTURE_2D,X,0,0,Ae,Se,H,be),v.unbindTexture()},this.copyTextureToTexture=function(b,D,X=null,k=null,H=0,be=0){let Ae,Se,Ce,De,je,it,Pe,ut,Lt;const bt=b.isCompressedTexture?b.mipmaps[be]:b.image;if(X!==null)Ae=X.max.x-X.min.x,Se=X.max.y-X.min.y,Ce=X.isBox3?X.max.z-X.min.z:1,De=X.min.x,je=X.min.y,it=X.isBox3?X.min.z:0;else{const Rt=Math.pow(2,-H);Ae=Math.floor(bt.width*Rt),Se=Math.floor(bt.height*Rt),b.isDataArrayTexture?Ce=bt.depth:b.isData3DTexture?Ce=Math.floor(bt.depth*Rt):Ce=1,De=0,je=0,it=0}k!==null?(Pe=k.x,ut=k.y,Lt=k.z):(Pe=0,ut=0,Lt=0);const xt=ve.convert(D.format),Xt=ve.convert(D.type);let Ee;D.isData3DTexture?($.setTexture3D(D,0),Ee=L.TEXTURE_3D):D.isDataArrayTexture||D.isCompressedArrayTexture?($.setTexture2DArray(D,0),Ee=L.TEXTURE_2D_ARRAY):($.setTexture2D(D,0),Ee=L.TEXTURE_2D),v.activeTexture(L.TEXTURE0),v.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,D.flipY),v.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,D.premultiplyAlpha),v.pixelStorei(L.UNPACK_ALIGNMENT,D.unpackAlignment);const jt=v.getParameter(L.UNPACK_ROW_LENGTH),rt=v.getParameter(L.UNPACK_IMAGE_HEIGHT),yn=v.getParameter(L.UNPACK_SKIP_PIXELS),Vn=v.getParameter(L.UNPACK_SKIP_ROWS),bi=v.getParameter(L.UNPACK_SKIP_IMAGES);v.pixelStorei(L.UNPACK_ROW_LENGTH,bt.width),v.pixelStorei(L.UNPACK_IMAGE_HEIGHT,bt.height),v.pixelStorei(L.UNPACK_SKIP_PIXELS,De),v.pixelStorei(L.UNPACK_SKIP_ROWS,je),v.pixelStorei(L.UNPACK_SKIP_IMAGES,it);const hs=b.isDataArrayTexture||b.isData3DTexture,gt=D.isDataArrayTexture||D.isData3DTexture;if(b.isDepthTexture){const Rt=G.get(b),Ti=G.get(D),St=G.get(Rt.__renderTarget),wi=G.get(Ti.__renderTarget);v.bindFramebuffer(L.READ_FRAMEBUFFER,St.__webglFramebuffer),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,wi.__webglFramebuffer);for(let us=0;us<Ce;us++)hs&&(L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,G.get(b).__webglTexture,H,it+us),L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,G.get(D).__webglTexture,be,Lt+us)),L.blitFramebuffer(De,je,Ae,Se,Pe,ut,Ae,Se,L.DEPTH_BUFFER_BIT,L.NEAREST);v.bindFramebuffer(L.READ_FRAMEBUFFER,null),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else if(H!==0||b.isRenderTargetTexture||G.has(b)){const Rt=G.get(b),Ti=G.get(D);v.bindFramebuffer(L.READ_FRAMEBUFFER,U),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,B);for(let St=0;St<Ce;St++)hs?L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,Rt.__webglTexture,H,it+St):L.framebufferTexture2D(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,Rt.__webglTexture,H),gt?L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,Ti.__webglTexture,be,Lt+St):L.framebufferTexture2D(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,Ti.__webglTexture,be),H!==0?L.blitFramebuffer(De,je,Ae,Se,Pe,ut,Ae,Se,L.COLOR_BUFFER_BIT,L.NEAREST):gt?L.copyTexSubImage3D(Ee,be,Pe,ut,Lt+St,De,je,Ae,Se):L.copyTexSubImage2D(Ee,be,Pe,ut,De,je,Ae,Se);v.bindFramebuffer(L.READ_FRAMEBUFFER,null),v.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else gt?b.isDataTexture||b.isData3DTexture?L.texSubImage3D(Ee,be,Pe,ut,Lt,Ae,Se,Ce,xt,Xt,bt.data):D.isCompressedArrayTexture?L.compressedTexSubImage3D(Ee,be,Pe,ut,Lt,Ae,Se,Ce,xt,bt.data):L.texSubImage3D(Ee,be,Pe,ut,Lt,Ae,Se,Ce,xt,Xt,bt):b.isDataTexture?L.texSubImage2D(L.TEXTURE_2D,be,Pe,ut,Ae,Se,xt,Xt,bt.data):b.isCompressedTexture?L.compressedTexSubImage2D(L.TEXTURE_2D,be,Pe,ut,bt.width,bt.height,xt,bt.data):L.texSubImage2D(L.TEXTURE_2D,be,Pe,ut,Ae,Se,xt,Xt,bt);v.pixelStorei(L.UNPACK_ROW_LENGTH,jt),v.pixelStorei(L.UNPACK_IMAGE_HEIGHT,rt),v.pixelStorei(L.UNPACK_SKIP_PIXELS,yn),v.pixelStorei(L.UNPACK_SKIP_ROWS,Vn),v.pixelStorei(L.UNPACK_SKIP_IMAGES,bi),be===0&&D.generateMipmaps&&L.generateMipmap(Ee),v.unbindTexture()},this.initRenderTarget=function(b){G.get(b).__webglFramebuffer===void 0&&$.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?$.setTextureCube(b,0):b.isData3DTexture?$.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?$.setTexture2DArray(b,0):$.setTexture2D(b,0),v.unbindTexture()},this.resetState=function(){K=0,W=0,ie=null,v.reset(),Te.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return jn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=et._getDrawingBufferColorSpace(e),t.unpackColorSpace=et._getUnpackColorSpace()}}const QM=/^[og]\s*(.+)?/,eS=/^mtllib /,tS=/^usemtl /,nS=/^usemap /,Rd=/\s+/,Cd=new A,Sl=new A,Pd=new A,Ld=new A,Sn=new A,Go=new de;function iS(){const i={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}const n=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:e||"",fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(s,r){const o=this._finalize(!1);o&&(o.inherited||o.groupCount<=0)&&this.materials.splice(o.index,1);const a={index:this.materials.length,name:s||"",mtllib:Array.isArray(r)&&r.length>0?r[r.length-1]:"",smooth:o!==void 0?o.smooth:this.smooth,groupStart:o!==void 0?o.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(l){const c={index:typeof l=="number"?l:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return c.clone=this.clone.bind(c),c}};return this.materials.push(a),a},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(s){const r=this.currentMaterial();if(r&&r.groupEnd===-1&&(r.groupEnd=this.geometry.vertices.length/3,r.groupCount=r.groupEnd-r.groupStart,r.inherited=!1),s&&this.materials.length>1)for(let o=this.materials.length-1;o>=0;o--)this.materials[o].groupCount<=0&&this.materials.splice(o,1);return s&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),r}},n&&n.name&&typeof n.clone=="function"){const s=n.clone(0);s.inherited=!0,this.object.materials.push(s)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(e,t){const n=parseInt(e,10);return(n>=0?n-1:n+t/3)*3},parseNormalIndex:function(e,t){const n=parseInt(e,10);return(n>=0?n-1:n+t/3)*3},parseUVIndex:function(e,t){const n=parseInt(e,10);return(n>=0?n-1:n+t/2)*2},addVertex:function(e,t,n){const s=this.vertices,r=this.object.geometry.vertices;r.push(s[e+0],s[e+1],s[e+2]),r.push(s[t+0],s[t+1],s[t+2]),r.push(s[n+0],s[n+1],s[n+2])},addVertexPoint:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,n){const s=this.normals,r=this.object.geometry.normals;r.push(s[e+0],s[e+1],s[e+2]),r.push(s[t+0],s[t+1],s[t+2]),r.push(s[n+0],s[n+1],s[n+2])},addFaceNormal:function(e,t,n){const s=this.vertices,r=this.object.geometry.normals;Cd.fromArray(s,e),Sl.fromArray(s,t),Pd.fromArray(s,n),Sn.subVectors(Pd,Sl),Ld.subVectors(Cd,Sl),Sn.cross(Ld),Sn.normalize(),r.push(Sn.x,Sn.y,Sn.z),r.push(Sn.x,Sn.y,Sn.z),r.push(Sn.x,Sn.y,Sn.z)},addColor:function(e,t,n){const s=this.colors,r=this.object.geometry.colors;s[e]!==void 0&&r.push(s[e+0],s[e+1],s[e+2]),s[t]!==void 0&&r.push(s[t+0],s[t+1],s[t+2]),s[n]!==void 0&&r.push(s[n+0],s[n+1],s[n+2])},addUV:function(e,t,n){const s=this.uvs,r=this.object.geometry.uvs;r.push(s[e+0],s[e+1]),r.push(s[t+0],s[t+1]),r.push(s[n+0],s[n+1])},addDefaultUV:function(){const e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){const t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,n,s,r,o,a,l,c){const h=this.vertices.length;let u=this.parseVertexIndex(e,h),d=this.parseVertexIndex(t,h),f=this.parseVertexIndex(n,h);if(this.addVertex(u,d,f),this.addColor(u,d,f),a!==void 0&&a!==""){const g=this.normals.length;u=this.parseNormalIndex(a,g),d=this.parseNormalIndex(l,g),f=this.parseNormalIndex(c,g),this.addNormal(u,d,f)}else this.addFaceNormal(u,d,f);if(s!==void 0&&s!==""){const g=this.uvs.length;u=this.parseUVIndex(s,g),d=this.parseUVIndex(r,g),f=this.parseUVIndex(o,g),this.addUV(u,d,f),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type="Points";const t=this.vertices.length;for(let n=0,s=e.length;n<s;n++){const r=this.parseVertexIndex(e[n],t);this.addVertexPoint(r),this.addColor(r)}},addLineGeometry:function(e,t){this.object.geometry.type="Line";const n=this.vertices.length,s=this.uvs.length;for(let r=0,o=e.length;r<o;r++)this.addVertexLine(this.parseVertexIndex(e[r],n));for(let r=0,o=t.length;r<o;r++)this.addUVLine(this.parseUVIndex(t[r],s))}};return i.startObject("",!1),i}class sS extends ls{constructor(e){super(e),this.materials=null}load(e,t,n,s){const r=this,o=new Sh(this.manager);o.setPath(this.path),o.setRequestHeader(this.requestHeader),o.setWithCredentials(this.withCredentials),o.load(e,function(a){try{t(r.parse(a))}catch(l){s?s(l):console.error(l),r.manager.itemError(e)}},n,s)}setMaterials(e){return this.materials=e,this}parse(e){const t=new iS;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,""));const n=e.split(`
`);let s=[];for(let a=0,l=n.length;a<l;a++){const c=n[a].trimStart();if(c.length===0)continue;const h=c.charAt(0);if(h!=="#")if(h==="v"){const u=c.split(Rd);switch(u[0]){case"v":t.vertices.push(parseFloat(u[1]),parseFloat(u[2]),parseFloat(u[3])),u.length>=7?(Go.setRGB(parseFloat(u[4]),parseFloat(u[5]),parseFloat(u[6]),wt),t.colors.push(Go.r,Go.g,Go.b)):t.colors.push(void 0,void 0,void 0);break;case"vn":t.normals.push(parseFloat(u[1]),parseFloat(u[2]),parseFloat(u[3]));break;case"vt":t.uvs.push(parseFloat(u[1]),parseFloat(u[2]));break}}else if(h==="f"){const d=c.slice(1).trim().split(Rd),f=[];for(let _=0,p=d.length;_<p;_++){const m=d[_];if(m.length>0){const M=m.split("/");f.push(M)}}const g=f[0];for(let _=1,p=f.length-1;_<p;_++){const m=f[_],M=f[_+1];t.addFace(g[0],m[0],M[0],g[1],m[1],M[1],g[2],m[2],M[2])}}else if(h==="l"){const u=c.substring(1).trim().split(" ");let d=[];const f=[];if(c.indexOf("/")===-1)d=u;else for(let g=0,_=u.length;g<_;g++){const p=u[g].split("/");p[0]!==""&&d.push(p[0]),p[1]!==""&&f.push(p[1])}t.addLineGeometry(d,f)}else if(h==="p"){const d=c.slice(1).trim().split(" ");t.addPointGeometry(d)}else if((s=QM.exec(c))!==null){const u=(" "+s[0].slice(1).trim()).slice(1);t.startObject(u)}else if(tS.test(c))t.object.startMaterial(c.substring(7).trim(),t.materialLibraries);else if(eS.test(c))t.materialLibraries.push(c.substring(7).trim());else if(nS.test(c))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(h==="s"){if(s=c.split(" "),s.length>1){const d=s[1].trim().toLowerCase();t.object.smooth=d!=="0"&&d!=="off"}else t.object.smooth=!0;const u=t.object.currentMaterial();u&&(u.smooth=t.object.smooth)}else{if(c==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+c+'"')}}t.finalize();const r=new vt;if(r.materialLibraries=[].concat(t.materialLibraries),!(t.objects.length===1&&t.objects[0].geometry.vertices.length===0)===!0)for(let a=0,l=t.objects.length;a<l;a++){const c=t.objects[a],h=c.geometry,u=c.materials,d=h.type==="Line",f=h.type==="Points";let g=!1;if(h.vertices.length===0)continue;const _=new yt;_.setAttribute("position",new ot(h.vertices,3)),h.normals.length>0&&_.setAttribute("normal",new ot(h.normals,3)),h.colors.length>0&&(g=!0,_.setAttribute("color",new ot(h.colors,3))),h.hasUVIndices===!0&&_.setAttribute("uv",new ot(h.uvs,2));const p=[];for(let M=0,T=u.length;M<T;M++){const x=u[M],S=x.name+"_"+x.smooth+"_"+g;let w=t.materials[S];if(this.materials!==null){if(w=this.materials.create(x.name),d&&w&&!(w instanceof Dr)){const E=new Dr;un.prototype.copy.call(E,w),E.color.copy(w.color),w=E}else if(f&&w&&!(w instanceof zs)){const E=new zs({size:10,sizeAttenuation:!1});un.prototype.copy.call(E,w),E.color.copy(w.color),E.map=w.map,w=E}}w===void 0&&(d?w=new Dr:f?w=new zs({size:1,sizeAttenuation:!1}):w=new m0,w.name=x.name,w.flatShading=!x.smooth,w.vertexColors=g,t.materials[S]=w),p.push(w)}let m;if(p.length>1){for(let M=0,T=u.length;M<T;M++){const x=u[M];_.addGroup(x.groupStart,x.groupCount,M)}d?m=new Ec(_,p):f?m=new Nr(_,p):m=new Re(_,p)}else d?m=new Ec(_,p[0]):f?m=new Nr(_,p[0]):m=new Re(_,p[0]);m.name=c.name,r.add(m)}else if(t.vertices.length>0){const a=new zs({size:1,sizeAttenuation:!1}),l=new yt;l.setAttribute("position",new ot(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(l.setAttribute("color",new ot(t.colors,3)),a.vertexColors=!0);const c=new Nr(l,a);r.add(c)}return r}}function Id(i){const e=new Map;for(const t of i.matchAll(/([A-Za-z_][\w.-]*)="([^"]*)"/g))e.set(t[1],t[2]);return e}const Kt=(i,e,t=0)=>{const n=Number(i.get(e));return Number.isFinite(n)&&i.has(e)?n:t};function rS(i){const e=[],t=[];for(const n of i.matchAll(/<model\b[^>]*>/g)){const s=Id(n[0]),r=/:(\d+)$/.exec(s.get("StartChannel")??"");if(!r)continue;const o=[Kt(s,"WorldPosX"),Kt(s,"WorldPosY"),Kt(s,"WorldPosZ")];e.push({name:s.get("name")??"",channel:Number(r[1]),nodes:s.get("DisplayAs")==="Custom"?1:Math.max(1,Kt(s,"parm2",1)),channelPerNode:(s.get("StringType")??"").startsWith("Node"),position:o,end:[o[0]+Kt(s,"X2"),o[1]+Kt(s,"Y2"),o[2]+Kt(s,"Z2")],displayAs:s.get("DisplayAs")??"",layoutGroup:s.get("LayoutGroup")??""})}for(const n of i.matchAll(/<view_object\b[^>]*>/g)){const s=Id(n[0]);s.get("DisplayAs")==="Mesh"&&t.push({name:s.get("name")??"",objFile:(s.get("ObjFile")??"").split(/[\\/]/).pop()??"",position:[Kt(s,"WorldPosX"),Kt(s,"WorldPosY"),Kt(s,"WorldPosZ")],scale:[Kt(s,"ScaleX",1),Kt(s,"ScaleY",1),Kt(s,"ScaleZ",1)],rotation:[Kt(s,"RotateX"),Kt(s,"RotateY"),Kt(s,"RotateZ")]})}return{models:e,meshes:t}}function oS(i,e){if(e.rotation.some(t=>Math.abs(t)>1e-6))throw new Error(`Rotated meshes aren't supported (${e.name})`);return[(i[0]-e.position[0])/e.scale[0],(i[1]-e.position[1])/e.scale[1],(i[2]-e.position[2])/e.scale[2]]}function aS(i,e,t,n=.1){const s=t.max.map((a,l)=>(a-t.min[l])*n),r=a=>a.every((l,c)=>l>=t.min[c]-s[c]&&l<=t.max[c]+s[c]),o=[];for(const a of i.models){if(a.layoutGroup==="hidden"||a.channelPerNode&&a.nodes>1)continue;const l=[];for(let c=0;c<a.nodes;c++){const h=(c+.5)/a.nodes,u=a.position.map((d,f)=>d+(a.end[f]-d)*h);l.push({name:a.name,channel:a.channel,position:oS(u,e)})}l.every(c=>r(c.position))&&o.push(...l)}return o}function lS(i,e,t){const n=Math.floor(i.length/3),s=new Int32Array(n).fill(-1),r=t*t;for(let o=0;o<n;o++){const a=i[o*3],l=i[o*3+1],c=i[o*3+2];let h=r;for(let u=0;u<e.length;u++){const d=e[u].position,f=(d[0]-a)**2+(d[1]-l)**2+(d[2]-c)**2;f<=h&&(h=f,s[o]=u)}}return s}function cS(i,e,t,n){const s=(i-e)/(t-e);return Math.min(n-1,Math.max(0,Math.floor(s*n)))}const hS={modelS:{folder:"Model_S",obj:"ModelS.obj",roles:{BodySG:"paint",BodySG1:"paint",BodySG2:"trim",BodySG3:"black",BodySG4:"redLens",LightsSG:"lens",Windows_TopSG:"glass",Arachnid21_Wheel_LFSG:"wheel",Arachnid21_Wheel_LFSG1:"tire"},maps:{BodySG:"Exterior_AO.png",BodySG1:"Exterior_AO.png",BodySG2:"Exterior_AO_Dark.png",BodySG4:"Lights_Red_AO.png",LightsSG:"Lights_AO.png",Arachnid21_Wheel_LFSG:"Arachnid_Wheel_AO.png"}},cybertruck:{folder:"Cybertruck",obj:"Cybertruck.obj",roles:{blinn3SG:"paint",lambert2SG:"trim",lambert3SG:"black",blinn5SG:"lens",blinn6SG:"redLens",phong1SG:"glass",blinn4SG:"wheel",lambert4SG:"wheel"},maps:{blinn3SG:"Paint_Red_AO.png",lambert2SG:"Exterior_AO_Dark.png",blinn5SG:"Lights_AO.png",blinn6SG:"Lights_AO_Red.png",blinn4SG:"Cybertruck_Premium_Wheel_AO_Dark.png",lambert4SG:"Cybertruck_Premium_Wheel_AO_Dark.png"}}},op="./models/";async function Eh(i,e){const t=await fetch(i);if(!t.ok)throw new Error(`${i}: HTTP ${t.status}`);const n=Number(t.headers.get("content-length"))||0;if(!t.body||!n||!e)return t.arrayBuffer();const s=t.body.getReader(),r=new Uint8Array(n);let o=0;for(;;){const{done:a,value:l}=await s.read();if(a)break;if(o+l.length>r.length){const c=new Uint8Array(Math.max(r.length*2,o+l.length));return c.set(r.subarray(0,o)),uS(c,o,l,s)}r.set(l,o),o+=l.length,e(o/n)}return r.buffer.slice(0,o)}async function uS(i,e,t,n){let s=i;const r=o=>{if(e+o.length>s.length){const a=new Uint8Array((e+o.length)*2);a.set(s.subarray(0,e)),s=a}s.set(o,e),e+=o.length};for(r(t);;){const{done:o,value:a}=await n.read();if(o)break;r(a)}return s.buffer.slice(0,e)}let bl;function dS(){return bl??(bl=fetch(`${op}xlights_rgbeffects.xml`).then(i=>{if(!i.ok)throw new Error(`xlights_rgbeffects.xml: HTTP ${i.status}`);return i.text()}).then(rS)),bl}const Tl=new Map;function Dd(i,e){let t=Tl.get(i);return t||(t=fS(i,e),Tl.set(i,t),t.catch(()=>Tl.delete(i))),t}async function fS(i,e){const t=hS[i],n=`${op}${t.folder}/`,s=i==="cybertruck"?"Cybertruck model":"Model S/Y model",[r,o]=await Promise.all([dS(),Eh(n+t.obj,g=>e?.(s,g*.85))]),a=r.meshes.find(g=>g.objFile===t.obj);if(!a)throw new Error(`Tesla's layout doesn't place ${t.obj}`);e?.(`${s}: parsing`,.88),await new Promise(g=>setTimeout(g,30));const c=new sS().parse(new TextDecoder().decode(o)).children.filter(g=>g instanceof Re),h=new Map;let u=1;const d=t.maps[Object.keys(t.roles).find(g=>t.roles[g]==="paint")],f=new $f;return await Promise.all([...new Set(Object.values(t.maps))].map(async g=>{const _=await f.loadAsync(n+g);_.colorSpace=wt,_.anisotropy=4,_.wrapS=_.wrapT=ts,_.needsUpdate=!0,h.set(g,_),g===d&&(u=1/pS(_.image))})),e?.(s,1),{model:i,meshes:c,roles:t.roles,textures:h,paintScale:u,layout:r,layoutMesh:a}}function pS(i){const t=document.createElement("canvas");t.width=t.height=128;const n=t.getContext("2d");if(!n)return 1;n.drawImage(i,0,0,128,128);const s=n.getImageData(0,0,128,128).data,r=[];for(let a=0;a<s.length;a+=4){const l=s[a];l>40&&l>Math.max(s[a+1],s[a+2])*1.5&&r.push(l)}if(!r.length)return 1;r.sort((a,l)=>a-l);const o=r[Math.floor(r.length*.9)]/255;return Math.max(.05,new de().setRGB(o,0,0,wt).r)}const mS={modelS:"Model S",model3:"Model 3",modelX:"Model X",modelY:"Model Y",cybertruck:"Cybertruck"};function zn(i){if(i.body.model!==i.model)throw new Error(`${i.id}: body is for ${i.body.model}`);const{rows:e,...t}=i;return{...t,name:`${mS[i.model]} ${i.variant}`,channels:e.map(([n,s,r])=>{const o=qc.get(n);if(!o)throw new Error(`Unknown channel in ${i.id} profile: ${n}`);return{id:n,group:s,kind:o.kind,...r}})}}const st=(i,e,t)=>[[`left${i}`,e,t],[`right${i}`,e,t]],ap="North America only",ki="Outside North America only",kn=i=>["Red","Green","Blue"].map(e=>[`centerFrontDisplay${e}`,"interior",i?{maybe:i}:{}]),Ra=["rightRearAccent","rightFrontAccent","centerFrontAccent","leftFrontAccent","leftRearAccent"].flatMap(i=>["Red","Green","Blue"].map(e=>[`${i}${e}`,"interior"])),Ah=()=>[...st("OuterMainBeam","front",{maybe:"Ramps on reflector headlights only"}),...st("InnerMainBeam","front"),...st("Signature","front",{kind:"boolean"}),...st("Channel4","front"),...st("Channel5","front"),...st("Channel6","front"),...st("FrontTurn","front",{kind:"boolean"}),...st("FrontFog","front"),...st("AuxPark","front"),...st("SideMarker","front",{maybe:ap}),...st("SideRepeater","front")],ai=i=>[...st("RearTurn","rear"),["brakeLights","rear"],...st("Tail","rear"),["reverseLights","rear"],["rearFog","rear",i?{maybe:i}:{}],["licensePlate","rear"]],li=i=>[...st("Mirror","closures"),["leftFrontWindow","closures"],["leftRearWindow","closures"],["rightFrontWindow","closures"],["rightRearWindow","closures"],["liftgate","closures",i?{maybe:i}:{}],["chargePort","closures"]],gS=zn({id:"modelS-2021",model:"modelS",body:{model:"modelS",fogLamps:!0},variant:"2021 – present",hint:"Refreshed interior with a horizontal center screen",years:{from:2021},channel4LeadsRamps:!0,orGroups:[{inputs:["leftSideMarker","leftAuxPark"],outputs:["leftSideMarker","leftAuxPark"]},{inputs:["rightSideMarker","rightAuxPark"],outputs:["rightSideMarker","rightAuxPark"]}],rows:[...Ah(),...ai(ki),["leftFrontDoorHandle","closures"],["leftRearDoorHandle","closures"],["rightFrontDoorHandle","closures"],["rightRearDoorHandle","closures"],...li(),...kn()]}),lp=zn({id:"modelX-2021",model:"modelX",body:{model:"modelX",fogLamps:!0},variant:"2021 – 2024",hint:"White-only interior lighting",years:{from:2021,to:2024},channel4LeadsRamps:!0,orGroups:[],rows:[...Ah(),...ai(void 0),...st("FalconDoor","closures"),...st("FrontDoor","closures"),...li(),...kn("Unverified on Model X")]}),_S=zn({id:"modelX-2025",model:"modelX",body:{model:"modelX",fogLamps:!0},variant:"2025 – present",years:{from:2025},channel4LeadsRamps:!0,orGroups:[],hint:"Colored interior light strips",rows:[...Ah(),...ai(void 0),...st("FalconDoor","closures"),...st("FrontDoor","closures"),...li(),...kn("Unverified on Model X"),...Ra.map(([i,e])=>[i,e,{maybe:"Unverified on Model X"}])]}),ar=i=>[...st("OuterMainBeam","front",{maybe:"Ramps on reflector headlights only"}),...st("InnerMainBeam","front"),...st("Signature","front"),...st("Channel4","front"),...st("Channel5","front"),...st("Channel6","front"),...st("FrontTurn","front"),...st("FrontFog","front",i?{maybe:i}:{}),...st("AuxPark","front",i?{maybe:i}:{}),...st("SideMarker","front",{maybe:ap}),...st("SideRepeater","front")],lr=i=>[{inputs:["leftChannel4","leftChannel5","leftChannel6"],outputs:["leftChannel4","leftChannel5","leftChannel6"]},{inputs:["rightChannel4","rightChannel5","rightChannel6"],outputs:["rightChannel4","rightChannel5","rightChannel6"]},{inputs:["leftSideMarker","leftAuxPark","rightSideMarker","rightAuxPark"],outputs:["leftSideMarker","leftAuxPark","rightSideMarker","rightAuxPark"]},...i?[{inputs:["leftTail","rightTail"],outputs:["leftTail","rightTail","licensePlate"]}]:[]],cp="Not on Standard Range Plus",hp="Reportedly not fitted on 2024+ Model 3 (unverified)",xS=zn({id:"model3-2017",model:"model3",body:{model:"model3",fogLamps:!0},variant:"2017 – Oct 2020",years:{from:2017,to:2020},channel4LeadsRamps:!0,orGroups:lr(!0),hint:"Built before October 2020",rows:[...ar(cp),...ai(ki).map(([i,e,t])=>i==="licensePlate"?[i,e,{...t,label:"License Plate (via tails)"}]:[i,e,t]),...li("Only with a power trunk"),...kn()]}),vS=zn({id:"model3-2020",model:"model3",body:{model:"model3",fogLamps:!0},variant:"Oct 2020 – 2023",hint:"Built October 2020 or later",years:{from:2020,to:2023},channel4LeadsRamps:!0,orGroups:lr(!1),rows:[...ar(cp),...ai(ki),...li("Only with a power trunk"),...kn()]}),yS=zn({id:"model3-2024",model:"model3",body:{model:"model3",refresh:!0},variant:"2024 – present · Premium / Performance",hint:"Refreshed design with colored interior light strips",years:{from:2024},channel4LeadsRamps:!0,orGroups:lr(!1),rows:[...ar(hp),...ai(ki),...li("Only with a power trunk"),...kn(),...Ra]}),MS=zn({id:"model3-2026-standard",model:"model3",body:{model:"model3",refresh:!0},variant:"2026 – present · Standard",hint:"Standard trim: no colored interior light strips",years:{from:2026},channel4LeadsRamps:!0,orGroups:lr(!1),rows:[...ar(hp),...ai(ki),...li("Only with a power trunk"),...kn()]}),up=zn({id:"modelY-2020",model:"modelY",body:{model:"modelY",fogLamps:!0},variant:"2020 – 2024",years:{from:2020,to:2025},channel4LeadsRamps:!0,orGroups:lr(!1),hint:"No light bar across the front",rows:[...ar(void 0),...ai(ki),...li("Only with a power liftgate"),...kn()]}),wl=(i,e,t,n)=>Array.from({length:e},(s,r)=>[`${i}${r+1}`,"front",{row:{key:i,label:t},...n?{maybe:n}:{}}]),SS="Unverified on 2025+ Model Y",bS=/(Signature|Channel5|FrontFog|AuxPark|SideMarker)$/,dp=i=>ar(void 0).filter(([e])=>!(i&&bS.test(e))).map(([e,t,n])=>[e,t,{maybe:SS,...n}]),TS=()=>[{inputs:["leftChannel4"],outputs:["barLeftEnd"]},{inputs:["rightChannel4"],outputs:["barRightEnd"]},{inputs:["leftChannel6","rightChannel6"],outputs:["barCentre"]},{inputs:[],outputs:["leftChannel4","rightChannel4","leftChannel6","rightChannel6"]}],Uc=zn({id:"modelY-2025",model:"modelY",body:{model:"modelY",refresh:!0,frontLightBar:!0,rearLightBar:!0},variant:"2025 – present · Premium / Performance",hint:"Light bars across the front and back",years:{from:2025},channel4LeadsRamps:!0,orGroups:TS(),rows:[...dp(!0),...ai(ki).filter(([i])=>i!=="rearFog").map(([i,e,t])=>i==="brakeLights"?[i,e,{...t,label:"Rear light bar (Brake)"}]:[i,e,t]),...li("Only with a power liftgate"),...kn(),...Ra]}),wS=zn({id:"modelY-2026-standard",model:"modelY",body:{model:"modelY",refresh:!0},variant:"2026 – present · Standard",hint:"Standard trim: no front light bar, single-piece headlights",years:{from:2026},channel4LeadsRamps:!0,orGroups:lr(!1),rows:[...dp(!1),...ai(ki),...li("Only with a power liftgate"),...kn()]}),Fc=zn({id:"cybertruck-2024",model:"cybertruck",body:{model:"cybertruck",frontLightBar:!0,rearLightBar:!0},variant:"2024 – present",hint:"Cybertruck",years:{from:2024},channel4LeadsRamps:!1,closureSeconds:{liftgate:[10,4]},orGroups:[],rows:[...st("OuterMainBeam","front"),...st("InnerMainBeam","front"),...st("FrontTurn","front"),...st("SideMarker","front",{kind:"ramping"}),...wl("frontLightBar",60,"Front Light Bar (60 LEDs)"),...wl("offroadLightBar",6,"Offroad Light Bar (6)","Optional upgrade"),["leftAuxPark","front",{label:"Frunk Light"}],...wl("rearLightBar",52,"Rear Light Bar (52 LEDs)").map(([i,,e])=>[i,"rear",e]),["brakeLights","rear",{kind:"dimmable"}],["leftTail","rear",{label:"Left Reverse Light"}],["rightTail","rear",{label:"Right Reverse Light"}],["leftSideRepeater","rear",{label:"Left Rear Side Marker"}],["rightSideRepeater","rear",{label:"Right Rear Side Marker"}],["reverseLights","rear",{label:"Bed Lights"}],["licensePlate","rear"],...st("Mirror","closures"),["leftFrontWindow","closures"],["leftRearWindow","closures"],["rightFrontWindow","closures"],["rightRearWindow","closures"],["liftgate","closures",{label:"Powered Frunk"}],["chargePort","closures"],...kn(),...Ra]}),ES=[gS,xS,vS,yS,MS,lp,_S,up,Uc,wS,Fc];new Map(ES.map(i=>[i.id,i]));lp.id;const xn=["left","right"],vn=i=>i==="right"?1:-1,he={white:new de("#fff4e0"),amber:new de("#ffa21a"),red:new de("#ff1a1a"),lensFront:new de("#25282d"),lensRear:new de("#3a0a0a"),lensAmber:new de("#3a2408")};class fp{constructor(e,t){this.halfWidth=e,this.taperSpec=t}widthFactor(e,t,n=!0){const s=this.taperSpec;let r=t>s.from?1-(t-s.from)*s.roof:1;const o=Math.abs(e);return n&&s.endAmount>0&&o>s.endStart&&(r*=1-((o-s.endStart)/s.endLength)**2*s.endAmount),r}taper(e,t=!0){const n=e.attributes.position;for(let s=0;s<n.count;s++)n.setZ(s,n.getZ(s)*this.widthFactor(n.getX(s),n.getY(s),t));n.needsUpdate=!0,e.computeVertexNormals()}surfaceZ(e,t){return this.halfWidth*this.widthFactor(e,t)}extrudeAcross(e,t,n,s=28){const r=t-2*n,o=new Jr(e,{depth:r,bevelEnabled:n>0,bevelThickness:n,bevelSize:n*.8,bevelSegments:n>.03?6:1,curveSegments:s});return o.translate(0,0,-r/2),o}sidePanel(e,t,n,s){const r=new Jr(e,{depth:n,bevelEnabled:!0,bevelThickness:.006,bevelSize:.006,bevelSegments:2,curveSegments:12});return r.translate(0,0,this.halfWidth+s-n),t==="left"&&r.scale(1,1,-1),this.taper(r,!1),r}}function Ca(i,e){var p;const t=i.index?i.toNonIndexed():i,n=t.attributes.position,s=n.count/3,r=new A,o=new A,a=new A,l=new A,c=new A,h=new A,u=[];for(let m=0;m<s;m++)r.fromBufferAttribute(n,m*3),o.fromBufferAttribute(n,m*3+1),a.fromBufferAttribute(n,m*3+2),c.copy(r).add(o).add(a).divideScalar(3),h.subVectors(a,o).cross(l.subVectors(r,o)).normalize(),(u[p=e(c,h)]??(u[p]=[])).push(m);const d=new yt,f=Object.entries(t.attributes),g=f.map(([,m])=>new Float32Array(m.count*m.itemSize));let _=0;return u.forEach((m,M)=>{if(m){d.addGroup(_*3,m.length*3,M);for(const T of m)f.forEach(([,x],S)=>{const w=x.itemSize;g[S].set(x.array.subarray(T*3*w,(T+1)*3*w),_*3*w)}),_++}}),f.forEach(([m,M],T)=>d.setAttribute(m,new Dt(g[T],M.itemSize))),d.computeVertexNormals(),d}function Vs(i,e,t,n,s){const r=new tr;return r.moveTo(i+s,e),r.lineTo(t-s,e),r.quadraticCurveTo(t,e,t,e+s),r.lineTo(t,n-s),r.quadraticCurveTo(t,n,t-s,n),r.lineTo(i+s,n),r.quadraticCurveTo(i,n,i,n-s),r.lineTo(i,e+s),r.quadraticCurveTo(i,e,i+s,e),r}function ln(i){const e=new tr;e.moveTo(i[0][0],i[0][1]);for(const t of i.slice(1))e.lineTo(t[0],t[1]);return e.closePath(),e}function pp(i,e,t,n,s,r,o){const a=Math.sqrt(r**2-(n-o)**2),l=Math.atan2(n-o,a);i.moveTo(e,n),i.lineTo(s.rear-a,n),i.absarc(s.rear,o,r,Math.PI-l,l,!0),i.lineTo(s.front-a,n),i.absarc(s.front,o,r,Math.PI-l,l,!0),i.lineTo(t,n)}function AS(){const i=document.createElement("canvas");i.width=256,i.height=128;const e=i.getContext("2d"),t=e.createRadialGradient(128,64,10,128,64,128);t.addColorStop(0,"rgba(0,0,0,0.75)"),t.addColorStop(1,"rgba(0,0,0,0)"),e.setTransform(1,0,0,.5,0,32),e.fillStyle=t,e.fillRect(0,0,256,256);const n=new no(i);return n.colorSpace=wt,n}const Rh=Jt.degToRad;function mp(i,e,t,n,s=.27){const r=new _t({color:"#0b0b0c",roughness:.85}),o=new _t({color:"#50545a",roughness:.3,metalness:.8});for(const a of[e.front,e.rear])for(const l of xn){const c=new vt;c.add(new Re(new Zs(t,t,s,40),r)),c.add(new Re(new Zs(t*.7,t*.7,s+.01,10),o)),c.rotation.x=Math.PI/2,c.position.set(a,t,vn(l)*n),i.car.add(c)}}function RS(i,e){const t=e.zOut-e.zIn,n=e.slim?.55:1;for(const s of xn){const r=l=>`${s}${l}`,o=new vt;o.position.set(e.x,e.y,0),o.rotation.z=e.tilt,s==="left"&&(o.scale.z=-1),i.car.add(o);const a=[["Signature",.5,1,-.035*n,.012],["OuterMainBeam",.7,.4,0,.04*n],["InnerMainBeam",.24,.4,-.005*n,.035*n],["Channel4",.79,.24,.035*n,.016*n],["Channel5",.5,.26,.037*n,.016*n],["Channel6",.21,.24,.033*n,.016*n]];for(const[l,c,h,u,d]of a)i.light(o,[r(l)],he.white,he.lensFront,[.012,d,h*t],[.018,u,e.zIn+c*t]);e.slim||i.light(o,[r("Signature")],he.white,he.lensFront,[.012,.07,.012],[.02,0,e.zOut-.01])}}function Pa(i,e,t){for(const n of xn){const s=vn(n),r=new ss("#fff3dc",0,28,.42,.65,1.3);if(r.position.set(e.x,e.y,s*e.z),r.target.position.set(e.x+12,0,s*(e.z+.9)),i.car.add(r,r.target),i.beam([`${n}OuterMainBeam`,`${n}InnerMainBeam`],r,160),t){const o=new ss("#fff3dc",0,12,.85,.8,1.6);o.position.set(t.x,t.y,s*t.z),o.target.position.set(t.x+5,0,s*(t.z+1.6)),i.car.add(o,o.target),i.beam([`${n}FrontFog`],o,40)}}}function CS(i,e){const t=e.zOut-e.zIn;for(const n of xn){const s=vn(n),r=a=>`${n}${a}`,o=a=>s*(e.zIn+a*t);i.light(i.car,[r("FrontTurn")],he.amber,he.lensAmber,[.02,.014,.68*t],[e.x,e.y+.025,o(.45)]),i.light(i.car,[r("AuxPark")],he.white,he.lensFront,[.02,.012,.72*t],[e.x,e.y,o(.45)]),i.light(i.car,[r("SideMarker")],he.amber,he.lensAmber,[.02,.02,.04],[e.x,e.y,o(.02)]),e.fog&&i.light(i.car,[r("FrontFog")],he.white,he.lensFront,[.02,.045,.06],[e.x-.01,e.y+.02,o(.95)])}}function PS(i,e,t,n){for(const s of xn)i.light(i.car,[`${s}SideRepeater`],he.amber,he.lensAmber,[.07,.02,.02],[t,n,vn(s)*(e.surfaceZ(t,n)+.005)])}function LS(i,e,t,n=new A){const s=t.zOut-t.zIn;for(const r of xn){const o=vn(r),a=h=>`${r}${h}`,l=h=>o*(t.zIn+h*s),c=(h,u)=>[t.x-n.x,t.y+u-n.y,l(h)];i.light(e,[a("Tail")],he.red,he.lensRear,[.02,.026,s],c(.5,0),2.2),i.light(e,["brakeLights"],he.red,he.lensRear,[.02,.026,.45*s],c(.72,-.03),5),i.light(e,[a("RearTurn")],he.amber,he.lensAmber,[.02,.022,.35*s],c(.78,-.06)),i.light(e,["reverseLights"],he.white,he.lensFront,[.02,.022,.35*s],c(.25,-.06))}}function IS(i,e){for(const s of xn)i.light(i.car,["rearFog"],he.red,he.lensRear,[.02,.03,.1],[e.x,e.fogY,vn(s)*e.fogZ],4);i.light(i.car,["licensePlate"],he.white,new de("#9a9a9a"),[.01,.15,.31],[e.x-.012,e.plateY,0],.6);const t=new rr("#ff2020",0,6,1.6);t.position.set(e.x-.35,.7,0),i.car.add(t),i.beam(["brakeLights","leftTail","rightTail"],t,5);const n=new ss("#ffffff",0,10,.9,.8,1.5);n.position.set(e.x-.1,.9,0),n.target.position.set(e.x-4.5,0,0),i.car.add(n,n.target),i.beam(["reverseLights"],n,30)}function DS(i,e){for(const[t,n]of[[e.leftIds,-e.halfLength/2],[e.rightIds,e.halfLength/2]]){const s=i.light(i.car,[...t],e.color,e.lens,[.02,.016,e.halfLength],[e.x,e.y,n],4);s.rotation.z=e.tilt??0}}function NS(i,e){for(const[t,n,s]of e.sections){const r=(s-n)/2*e.halfLength*2*.98,o=(n+s)/2*e.halfLength,a=i.light(i.car,t,e.color,e.lens,[.02,.016,r],[e.x,e.y,o],4);a.rotation.z=e.tilt??0}}function El(i,e,t,n,s,r){const o=vn(t),a=new vt;a.position.set(s,0,o*e.halfWidth),i.car.add(a);const l=new Re(e.sidePanel(n,t,.03,.004),i.m.paint);return l.position.set(-s,0,-o*e.halfWidth),a.add(l),r&&i.closure(r,c=>a.rotation.y=o*c*Rh(62),a),a}function Ys(i,e,t,n,s,r=i.car,o=new A,a=.3){const l=new Re(e.sidePanel(n,t,.01,-.03),i.m.sideGlass);l.position.copy(o),r.add(l),i.closure(s,c=>l.position.y=o.y-c*a,l)}function gp(i,e,t,n){for(const s of xn){const r=vn(s),o=new vt;o.position.set(t,n,r*(e.surfaceZ(t,n)-.01)),i.car.add(o);const a=new Re(new Et(.06,.04,.1),i.m.trim);a.position.set(0,0,r*.05);const l=new Re(new Et(.1,.13,.22),i.m.smallPaint);l.position.set(-.02,.02,r*.19),o.add(a,l),i.closure(`${s}Mirror`,c=>o.rotation.y=r*(1-c)*Rh(-70),o)}}function US(i,e,t){for(const n of t){const s=vn(n.side),r=new Re(new Et(.22,.03,.02),i.m.smallPaint),o=s*(e.surfaceZ(n.x,n.y)+.006);r.position.set(n.x,n.y,o),i.car.add(r),i.closure(n.id,a=>r.position.z=o+s*a*.04,r)}}function _p(i,e,t,n){const s=new _t({color:"#111",emissive:"#000"}),r=e.surfaceZ(t,n),o=new Re(new Et(.12,.1,.01),s);o.position.set(t,n,-(r+.004)),i.car.add(o);const a=new vt;a.position.set(t+.07,n,-(r+.012)),i.car.add(a);const l=new Re(new Et(.14,.12,.012),i.m.paint);l.position.set(-.07,0,0),a.add(l),i.closure("chargePort",(c,h,u)=>{a.rotation.y=c*Rh(100),h?s.emissive.setHSL(u*.6%1,1,.5):s.emissive.set(c>.05?"#4a7dff":"#000"),s.emissiveIntensity=c>.05?3:0},a)}function xp(i,e){const t=new Re(new Et(e.x1-e.x0,e.y1-e.y0,e.halfWidth*2),i.m.cabin);t.position.set((e.x0+e.x1)/2,(e.y0+e.y1)/2,0),i.car.add(t);const n=new Re(new Si(.42,.26),i.m.display);n.position.set(e.displayX,e.displayY,0),n.rotation.set(0,-Math.PI/2,0),i.car.add(n),i.cabinLight.position.set((e.x0+e.x1)/2,e.y1-.2,0),i.car.add(i.cabinLight)}function FS(i,e,t,n=.5){i.light(e,["brakeLights"],he.red,he.lensRear,[.03,.02,n],t,5)}const Ch=Jt.degToRad,Ph=.11,an=Ph*.8;function Nd(i,e){switch(e.model){case"modelS":return Wo(i,e,HS);case"model3":return Wo(i,e,VS);case"modelX":return Wo(i,e,zS);case"modelY":return Wo(i,e,kS);case"cybertruck":return GS(i)}}function Wo(i,e,t){const n=new fp(t.halfWidth,t.taper),s=new tr;pp(s,t.rearX,t.frontX,t.rockerY,t.axles,t.archRadius,t.wheelRadius+.01),t.outline(s);const r=t.beltY-.03;s.holes.push(Vs(t.frontDoor.x0,t.doorBottom,t.frontDoor.x1,r,.06),Vs(t.rearDoor.x0,t.doorBottom,t.rearDoor.x1,r,.06),ln(t.frontWindow),t.rearWindow,...t.quarterWindow?[t.quarterWindow]:[]);const o=n.extrudeAcross(s,t.halfWidth*2,Ph);n.taper(o);const a=Ca(o,(f,g)=>f.y<t.beltY+.03?0:Math.abs(g.z)>.75?f.x>t.aPillarX?0:2:f.x>t.glassTo&&f.x<t.glassFrom?1:0);i.car.add(new Re(a,[i.m.paint,i.m.glass,i.m.trim])),mp(i,t.axles,t.wheelRadius,t.halfWidth-.14),xp(i,{...t.cabin,displayX:t.cabin.display[0],displayY:t.cabin.display[1]});const l=Vs(t.frontDoor.x0-.005,t.doorBottom-.005,t.frontDoor.x1+.005,r+.005,.06);for(const f of xn){if(t.falconDoors){const g=El(i,n,f,l,t.frontDoor.x1,`${f}FrontDoor`);Ys(i,n,f,ln(t.frontWindow),`${f}FrontWindow`,g,new A(-t.frontDoor.x1,0,-vn(f)*n.halfWidth))}else El(i,n,f,l,t.frontDoor.x1),El(i,n,f,Vs(t.rearDoor.x0-.005,t.doorBottom-.005,t.rearDoor.x1+.005,r+.005,.06),t.rearDoor.x1),Ys(i,n,f,ln(t.frontWindow),`${f}FrontWindow`),Ys(i,n,f,t.rearWindow,`${f}RearWindow`,i.car,new A,.26);t.quarterWindow&&i.car.add(new Re(n.sidePanel(t.quarterWindow,f,.01,-.03),i.m.sideGlass))}if(t.falconDoors&&BS(i,n,t),t.doorHandles){const f=t.doorBottom+(r-t.doorBottom)*.72;US(i,n,xn.flatMap(g=>[{id:`${g}FrontDoorHandle`,side:g,x:t.frontDoor.x0+.3,y:f},{id:`${g}RearDoorHandle`,side:g,x:t.rearDoor.x0+.3,y:f}]))}gp(i,n,t.mirror[0],t.mirror[1]),OS(i,n,t);const c=t.headlights,h=!!e.refresh,u=h&&c.refreshY!==void 0?c.refreshY:c.y;RS(i,{x:c.x+an*Math.sin(Math.PI/2-c.tilt),y:u+an*Math.cos(Math.PI/2-c.tilt),tilt:c.tilt,zIn:c.zIn,zOut:c.zOut,slim:h});const d=t.bumper.x+an;if(CS(i,{x:d,y:t.bumper.y,zIn:t.bumper.zIn,zOut:t.bumper.zOut,fog:!!e.fogLamps}),Pa(i,{x:c.x+.2,y:u,z:(c.zIn+c.zOut)/2},e.fogLamps?{x:d,y:t.bumper.y,z:t.bumper.zOut}:void 0),PS(i,n,t.repeater[0],t.repeater[1]),e.frontLightBar&&t.frontBar){const f=t.frontBar;NS(i,{x:f.x+(an+.01)*Math.cos(f.tilt),y:f.y+(an+.01)*Math.sin(f.tilt),tilt:f.tilt,halfLength:f.halfLength,sections:[[["barLeftEnd"],-1,-.5],[["barCentre"],-.5,.5],[["barRightEnd"],.5,1]],color:he.white,lens:he.lensFront})}return LS(i,i.car,{...t.tail,x:t.tail.x-an-.012}),IS(i,{...t.rearLow,x:t.rearLow.x-an}),e.rearLightBar&&t.rearBar&&DS(i,{x:t.tail.x-an-.014,y:t.rearBar.y,halfLength:t.rearBar.halfLength,leftIds:["brakeLights"],rightIds:["brakeLights"],color:he.red,lens:he.lensRear}),_p(i,n,t.chargePort[0],t.chargePort[1]),{halfLength:t.frontX+.2,height:t.height,halfWidth:t.halfWidth+.1}}function OS(i,e,t){const n=t.rearClosure,s=new vt;s.position.set(n.hinge[0],n.hinge[1],0),i.car.add(s);const r=new tr;r.moveTo(n.hinge[0],n.hinge[1]-.01),n.curve&&r.quadraticCurveTo(...n.curve.control,...n.curve.to);for(const l of n.outline)r.lineTo(...l);r.closePath();const o=e.extrudeAcross(r,e.halfWidth*2,Ph);e.taper(o);const a=Ca(o,(l,c)=>Math.abs(c.z)>.75?l.y<t.beltY+.08?0:2:l.y>n.glassAboveY&&c.y>.25?1:0);a.translate(-n.hinge[0],-n.hinge[1],0),s.add(new Re(a,[i.m.paint,i.m.glass,i.m.trim])),FS(i,s,[n.brake[0]-n.hinge[0],n.brake[1]-n.hinge[1],0]),i.closure("liftgate",l=>s.rotation.z=-l*Ch(n.openDeg),s)}function BS(i,e,t){const{x0:n,x1:s}=t.rearDoor,r=s-n+.01,o=(n+s)/2,a=1.66+an+.012;for(const l of xn){const c=vn(l),h=new vt;h.position.set(o,a,0),i.car.add(h);const u=[];for(let M=t.doorBottom-.005;M<=1.48;M+=.04)u.push([e.surfaceZ(o,M)+.006,M]);const d=.16,f=e.surfaceZ(o,1.5)+.006;for(let M=0;M<=1.0001;M+=.125){const T=M*Math.PI/2;u.push([f-d+d*Math.cos(T),a-d+d*Math.sin(T)])}u.push([.004,a]);const g=.025,_=M=>{const T=[...M,...M.slice().reverse().map(([S,w])=>[S-g,w-g])],x=new Jr(ln(T),{depth:r,bevelEnabled:!1,curveSegments:4});return x.rotateY(-Math.PI/2),x.translate(s+.005,0,0),c<0&&x.scale(1,1,-1),x.translate(-o,-a,0),x},p=_(u.filter(([,M])=>M<=1.05)),m=Ca(_(u.filter(([,M])=>M>=1.5)),M=>M.y+a<1.6?0:1);h.add(new Re(p,i.m.paint),new Re(m,[i.m.trim,i.m.glass])),Ys(i,e,l,t.rearWindow,`${l}RearWindow`,h,new A(-o,-a,0)),i.closure(`${l}FalconDoor`,M=>h.rotation.x=-c*M*Ch(100),h)}}const zS={halfWidth:1,taper:{from:.95,roof:.3,endStart:2,endLength:.6,endAmount:.14},height:1.75,frontX:2.42,rearX:-2.4,rockerY:.22,axles:{front:1.48,rear:-1.49},wheelRadius:.37,archRadius:.47,beltY:1,outline:i=>{i.quadraticCurveTo(2.56,.26,2.56,.44),i.lineTo(2.54,.6),i.quadraticCurveTo(2.5,.71,2.3,.8),i.quadraticCurveTo(1.8,.94,1.22,.99),i.quadraticCurveTo(.45,1.44,-.1,1.64),i.quadraticCurveTo(-.85,1.71,-1.62,1.65),i.lineTo(-1.8,1.5),i.lineTo(-1.84,1.06),i.lineTo(-2.44,1.06),i.quadraticCurveTo(-2.53,1,-2.53,.8),i.quadraticCurveTo(-2.54,.52,-2.52,.38),i.quadraticCurveTo(-2.5,.22,-2.4,.22)},glassFrom:1.25,glassTo:-1.9,aPillarX:1,frontDoor:{x0:.24,x1:1.1},rearDoor:{x0:-1.05,x1:.13},doorBottom:.44,frontWindow:[[.26,1.06],[.86,1.06],[.36,1.36],[.26,1.36]],rearWindow:Vs(-1,1.07,.1,1.5,.05),quarterWindow:Vs(-1.58,1.08,-1.14,1.46,.05),falconDoors:!0,rearClosure:{hinge:[-1.62,1.66],curve:{control:[-2.2,1.52],to:[-2.42,1.14]},outline:[[-2.45,1.065],[-1.84,1.065],[-1.8,1.5]],openDeg:80,glassAboveY:1.15,brake:[-2.43-an*.6,1.14+an*.6]},headlights:{x:2.39,y:.755,tilt:.55,zIn:.47,zOut:.89},bumper:{x:2.56,y:.43,zIn:.4,zOut:.8},tail:{x:-2.535,y:.985,zIn:.41,zOut:.75},rearLow:{x:-2.52,plateY:.6,fogY:.38,fogZ:.62},repeater:[1.98,.86],mirror:[.95,1.06],chargePort:[-2.3,.9],cabin:{x0:-1.8,x1:.55,y0:.45,y1:1.37,halfWidth:.85,display:[1,1.08]}},kS={halfWidth:.96,taper:{from:.95,roof:.32,endStart:1.85,endLength:.55,endAmount:.14},height:1.64,frontX:2.18,rearX:-2.18,rockerY:.2,axles:{front:1.42,rear:-1.47},wheelRadius:.36,archRadius:.46,beltY:.98,outline:i=>{i.quadraticCurveTo(2.3,.24,2.3,.42),i.lineTo(2.28,.58),i.quadraticCurveTo(2.25,.68,2.05,.77),i.quadraticCurveTo(1.6,.9,1,.97),i.quadraticCurveTo(.35,1.32,-.15,1.52),i.quadraticCurveTo(-.8,1.57,-1.42,1.5),i.lineTo(-1.6,1.38),i.lineTo(-1.7,1.02),i.lineTo(-2.2,1.02),i.quadraticCurveTo(-2.29,.97,-2.29,.8),i.lineTo(-2.3,.38),i.quadraticCurveTo(-2.27,.2,-2.18,.2)},glassFrom:1.03,glassTo:-1.75,aPillarX:.95,frontDoor:{x0:.2,x1:1},rearDoor:{x0:-.92,x1:.15},doorBottom:.42,frontWindow:[[.22,1.03],[.78,1.03],[.3,1.29],[.22,1.29]],rearWindow:ln([[-.88,1.04],[.13,1.04],[.13,1.4],[-.7,1.4]]),quarterWindow:ln([[-1.42,1.05],[-.98,1.05],[-.98,1.36],[-1.25,1.36]]),rearClosure:{hinge:[-1.42,1.51],curve:{control:[-1.95,1.38],to:[-2.2,1.08]},outline:[[-2.22,1.025],[-1.7,1.025],[-1.6,1.38]],openDeg:82,glassAboveY:1.12,brake:[-1.5,1.5+an]},headlights:{x:2.13,y:.735,tilt:.5,zIn:.43,zOut:.83,refreshY:.7},bumper:{x:2.3,y:.4,zIn:.42,zOut:.78},frontBar:{x:2.12,y:.745,tilt:.88,halfLength:.78},rearBar:{y:.99,halfLength:.4},tail:{x:-2.29,y:.97,zIn:.42,zOut:.78},rearLow:{x:-2.3,plateY:.62,fogY:.36,fogZ:.55},repeater:[1.75,.84],mirror:[.88,1.03],chargePort:[-2,.93],cabin:{x0:-1.6,x1:.45,y0:.45,y1:1.36,halfWidth:.8,display:[.75,1.02]}},HS={halfWidth:.98,taper:{from:.86,roof:.38,endStart:1.9,endLength:.6,endAmount:.14},height:1.46,frontX:2.3,rearX:-2.3,rockerY:.19,axles:{front:1.46,rear:-1.5},wheelRadius:.36,archRadius:.45,beltY:.9,outline:i=>{i.quadraticCurveTo(2.42,.22,2.42,.38),i.lineTo(2.4,.52),i.quadraticCurveTo(2.36,.6,2.15,.67),i.quadraticCurveTo(1.6,.79,1.05,.86),i.quadraticCurveTo(.4,1.2,-.15,1.34),i.quadraticCurveTo(-.7,1.38,-1.05,1.32),i.lineTo(-1.2,1.2),i.lineTo(-1.25,.94),i.lineTo(-2.3,.94),i.quadraticCurveTo(-2.4,.9,-2.4,.7),i.lineTo(-2.41,.36),i.quadraticCurveTo(-2.38,.19,-2.3,.19)},glassFrom:1.08,glassTo:-1.1,aPillarX:.95,frontDoor:{x0:.18,x1:1},rearDoor:{x0:-.85,x1:.13},doorBottom:.4,frontWindow:[[.2,.95],[.82,.95],[.32,1.17],[.2,1.17]],rearWindow:ln([[-.8,.95],[.1,.95],[.1,1.24],[-.6,1.24]]),quarterWindow:ln([[-1.12,.96],[-.88,.96],[-.88,1.16],[-1,1.16]]),rearClosure:{hinge:[-1.05,1.33],curve:{control:[-1.9,1.1],to:[-2.33,.98]},outline:[[-2.36,.945],[-1.25,.945],[-1.2,1.2]],openDeg:70,glassAboveY:1,brake:[-1.15,1.33+an*.8]},headlights:{x:2.2,y:.66,tilt:.45,zIn:.45,zOut:.86},bumper:{x:2.42,y:.36,zIn:.42,zOut:.8},tail:{x:-2.4,y:.88,zIn:.45,zOut:.82},rearLow:{x:-2.4,plateY:.55,fogY:.32,fogZ:.55},repeater:[1.8,.75],mirror:[.95,.93],chargePort:[-2.15,.84],doorHandles:!0,cabin:{x0:-1.2,x1:.5,y0:.42,y1:1.2,halfWidth:.8,display:[.75,.92]}},VS={halfWidth:.95,taper:{from:.86,roof:.38,endStart:1.8,endLength:.6,endAmount:.14},height:1.45,frontX:2.17,rearX:-2.17,rockerY:.18,axles:{front:1.42,rear:-1.455},wheelRadius:.34,archRadius:.43,beltY:.9,outline:i=>{i.quadraticCurveTo(2.29,.21,2.29,.36),i.lineTo(2.27,.5),i.quadraticCurveTo(2.23,.58,2.03,.65),i.quadraticCurveTo(1.5,.78,.98,.85),i.quadraticCurveTo(.35,1.2,-.2,1.34),i.quadraticCurveTo(-.8,1.38,-1.45,1.12),i.lineTo(-1.75,.98),i.lineTo(-1.8,.9),i.lineTo(-2.2,.9),i.quadraticCurveTo(-2.28,.88,-2.28,.7),i.lineTo(-2.29,.34),i.quadraticCurveTo(-2.26,.18,-2.17,.18)},glassFrom:1,glassTo:-1.78,aPillarX:.92,frontDoor:{x0:.16,x1:.98},rearDoor:{x0:-.86,x1:.12},doorBottom:.39,frontWindow:[[.18,.95],[.8,.95],[.3,1.18],[.18,1.18]],rearWindow:ln([[-.82,.95],[.08,.95],[.08,1.24],[-.6,1.24]]),quarterWindow:ln([[-1.25,.96],[-.92,.96],[-.92,1.18],[-1.05,1.18]]),rearClosure:{hinge:[-1.76,.985],outline:[[-2.2,.975],[-2.27,.92],[-2.27,.905],[-1.8,.905]],openDeg:60,glassAboveY:9,brake:[-2.18,.99+an*.5]},headlights:{x:2.08,y:.64,tilt:.45,zIn:.45,zOut:.85,refreshY:.62},bumper:{x:2.29,y:.34,zIn:.42,zOut:.78},tail:{x:-2.28,y:.86,zIn:.4,zOut:.8},rearLow:{x:-2.29,plateY:.58,fogY:.32,fogZ:.5},repeater:[1.72,.74],mirror:[.9,.93],chargePort:[-2.05,.8],cabin:{x0:-1.4,x1:.45,y0:.4,y1:1.2,halfWidth:.78,display:[.72,.92]}};function GS(i){const t=new fp(1,{from:1.2,roof:.12,endStart:9,endLength:1,endAmount:0}),n=[0,1.79],s=[2.84,1.02],r=[-2.84,1.22],o=x=>x>=0?n[1]-x/s[0]*(n[1]-s[1]):n[1]-x/r[0]*(n[1]-r[1]),a={front:1.88,rear:-1.93},l=.44,c=new tr;pp(c,-2.7,2.68,.42,a,.55,l+.02),c.lineTo(2.84,.48),c.lineTo(2.86,.92),c.lineTo(...s),c.lineTo(...n),c.lineTo(...r),c.lineTo(-2.86,.6),c.lineTo(-2.78,.45),c.closePath();const h=[[.15,1.12],[1.1,1.12],[1.1,o(1.1)-.1],[.15,o(.15)-.1]],u=[[-.95,1.12],[.05,1.12],[.05,o(.05)-.1],[-.95,o(-.95)-.1]];c.holes.push(ln(h),ln(u));const d=t.extrudeAcross(c,2,.015,4);t.taper(d,!1);const f=Ca(d,(x,S)=>Math.abs(S.z)>.75?0:S.y>.5&&x.x<1.25&&x.x>-.95?1:0);i.car.add(new Re(f,[i.m.paint,i.m.glass]));for(const x of xn){const S=vn(x)*1.004;for(const w of[1.15,.1,-.95]){const E=new Re(new Et(.008,.62,.004),i.m.trim);E.position.set(w,.92,S),i.car.add(E)}Ys(i,t,x,ln(h),`${x}FrontWindow`,i.car,new A,.4),Ys(i,t,x,ln(u),`${x}RearWindow`,i.car,new A,.4)}mp(i,a,l,1-.12,.32),xp(i,{x0:-1,x1:1,y0:.7,y1:1.5,halfWidth:.85,displayX:1.05,displayY:1.3}),gp(i,t,1.15,1.2);const g=Math.atan2(s[1]-o(1.3),s[0]-1.3),_=new vt;_.position.set(1.3,o(1.3)+.012,0),i.car.add(_);const p=Math.hypot(s[0]-1.3,s[1]-o(1.3)),m=new Re(new Et(p,.02,2-.04),i.m.paint);m.position.set(p/2*Math.cos(g),p/2*Math.sin(g),0),m.rotation.z=g,_.add(m),i.closure("liftgate",x=>_.rotation.z=x*Ch(48),_);const M=new Re(new Et(p-.1,.004,2-.2),i.m.cabin);M.position.set(1.3+(p-.1)/2*Math.cos(g),o(1.3)+(p-.1)/2*Math.sin(g)+.004,0),M.rotation.z=g,i.car.add(M),i.light(i.car,["leftAuxPark"],he.white,he.lensFront,[.04,.01,.6],[1.5,o(1.5)+.01,0],3),Al(i,"frontLightBar",60,s[0]+.012,s[1]-.015,1-.04,he.white);for(const x of xn){const S=vn(x),w=E=>`${x}${E}`;i.light(i.car,[w("OuterMainBeam")],he.white,he.lensFront,[.02,.03,.12],[2.865,.965,S*.8],5),i.light(i.car,[w("InnerMainBeam")],he.white,he.lensFront,[.02,.03,.12],[2.865,.965,S*.64],5),i.light(i.car,[w("FrontTurn")],he.amber,he.lensAmber,[.02,.03,.05],[2.865,.965,S*.93],5),i.light(i.car,[w("SideMarker")],he.amber,he.lensAmber,[.08,.025,.01],[2.6,.95,S*(1+.005)],5),i.light(i.car,[w("SideRepeater")],he.red,he.lensRear,[.08,.025,.01],[-2.6,1.08,S*(1+.005)],4),i.light(i.car,[w("Tail")],he.white,he.lensFront,[.02,.04,.14],[-2.866,1,S*.75],5),i.light(i.car,["brakeLights"],he.red,he.lensRear,[.02,.06,.06],[-2.866,1.1,S*.93],5)}Al(i,"offroadLightBar",6,.18,o(.18)+.03,.6,he.white,.06),Al(i,"rearLightBar",52,r[0]-.012,r[1]-.02,1-.04,he.red),i.light(i.car,["licensePlate"],he.white,new de("#9a9a9a"),[.01,.15,.31],[-2.87,.72,0],.6),Pa(i,{x:2.9,y:.97,z:.72});const T=new rr("#ff2020",0,6,1.6);return T.position.set(-3.2,.9,0),i.car.add(T),i.beam(["brakeLights","rearLightBar26","rearLightBar27"],T,5),_p(i,t,-2.3,1),{halfLength:2.95,height:1.85,halfWidth:1+.15,paint:"#a5a9ae"}}function Al(i,e,t,n,s,r,o,a=.02){const l=r*2/t;for(let c=0;c<t;c++){const h=-r+l*(c+.5);i.light(i.car,[`${e}${c+1}`],o,he.lensFront,[.015,a,l*.85],[n,s,h],4)}}const Rl=(i,e)=>{if(e<=i[0][0])return i[0][1];for(let t=1;t<i.length;t++){const[n,s]=i[t];if(e<=n){const[r,o]=i[t-1];return o+(s-o)*(e-r)/(n-r)}}return i[i.length-1][1]},WS=(i,e,t)=>{const n=Math.min(1,Math.max(0,(t-i)/(e-i)));return n*n*(3-2*n)},mi=200,Vt={rearEnd:-2.56,rearAxle:-1.357,frontAxle:1.606,frontEnd:2.56,wheelRadius:.353,roof:[[-2.5,.66],[-2.38,1.04],[-2.12,1.08],[-1.88,1.17],[-1.62,1.25],[-1.38,1.32],[-1.12,1.37],[-.75,1.42],[-.38,1.43],[0,1.4],[.25,1.36],[.5,1.29],[.75,1.15],[1,1.06],[1.25,.97],[1.62,.91],[2.5,.63]]},Ud=.86;function Lh(i){const e=[[Vt.rearEnd,i.rearEnd],[Vt.rearAxle,i.rearAxle],[Vt.frontAxle,i.frontAxle],[Vt.frontEnd,i.frontEnd]],t=s=>s<Vt.rearEnd?i.rearEnd+(s-Vt.rearEnd):s>Vt.frontEnd?i.frontEnd+(s-Vt.frontEnd):Rl(e,s),n=i.wheelRadius/Vt.wheelRadius;return{label:i.label,apply([s,r,o],a){const l=s/mi,c=r/mi,h=o/mi;if(a==="Wheels"){const[f,g]=l>0?[Vt.frontAxle,i.frontAxle]:[Vt.rearAxle,i.rearAxle];return[(g+(l-f)*n)*mi,(i.wheelRadius+(c-Vt.wheelRadius)*n)*mi,h*i.width*mi]}const u=Rl(Vt.roof,l),d=Rl(i.roofRaise,l)*WS(Ud,Math.max(u,Ud+.05),c);return[t(l)*mi,(c+i.lift+d)*mi,h*i.width*mi]}}}const Ih="Adapted from Tesla's Model S model";Lh({label:Ih,rearEnd:Vt.rearEnd-.07,rearAxle:Vt.rearAxle,frontAxle:Vt.frontAxle,frontEnd:Vt.frontEnd+.02,wheelRadius:.375,lift:.04,width:1.018,roofRaise:[[-2.62,0],[-2.45,.08],[-2.25,.3],[-1.95,.37],[-1.5,.35],[-1,.31],[-.5,.25],[0,.26],[.3,.26],[.6,.22],[.9,.1],[1.15,0]]});const XS=Lh({label:Ih,rearEnd:-2.27,rearAxle:-1.33,frontAxle:1.56,frontEnd:2.48,wheelRadius:.362,lift:.035,width:.978,roofRaise:[[-2.62,0],[-2.45,.05],[-2.25,.16],[-1.9,.2],[-1.4,.2],[-.8,.18],[0,.16],[.5,.13],[.9,.06],[1.15,0]]});Lh({label:Ih,rearEnd:-2.27,rearAxle:-1.33,frontAxle:1.545,frontEnd:2.42,wheelRadius:.335,lift:0,width:.942,roofRaise:[[-2.4,0],[-1.6,.01],[0,0]]});const Fn=Jt.degToRad,xa=i=>i<0?"left":"right";function Fd(i,e,t,n){const s=YS(e,n),r=new Ct,o=new Ct;for(const O of s)r.expandByPoint(O.centroid),o.expandByPoint(O.source);const a={min:o.min.toArray(),max:o.max.toArray()},l=aS(e.layout,e.layoutMesh,a).map(O=>n?{...O,position:n.apply(O.position,"")}:O),c=O=>Yp.get(O.channel-1),h=l.filter(O=>{const re=c(O)?.kind;return re==="ramping"||re==="boolean"}),u=O=>l.find(re=>re.name===O)?.position,d=e.layoutMesh.scale[0]/200,f=e.model==="cybertruck",g=new Map,_=[];f?JS(s,l,u,g,_):t.model==="modelX"?ZS(s,g):$S(s,u,g,t.model==="model3");const p=s.filter(O=>O.role==="lens"||O.role==="redLens"),m=f?jS(p,h,c):[],M=p.filter(O=>!O.lights),T=lS(M.flatMap(O=>O.centroid.toArray()),h,f?26:45);M.forEach((O,re)=>{const ae=T[re];ae>=0&&(O.lights=[c(h[ae]).id])});const x=new vt;x.scale.setScalar(d),i.car.add(x);for(const O of _)x.add(O);const S=KS(i,e),w=new Map;for(const O of s){if(O.bar)continue;const re=`${O.part??""}|${O.role}|${O.lights?.join("+")??""}`;let ae=w.get(re);ae||w.set(re,ae=[]),ae.push(O)}const E=new Map,y=O=>{let re=E.get(O);if(!re){const ae=g.get(O),Ie=new vt;Ie.position.copy(ae.pivot),ae.parent&&g.has(ae.parent)?(Ie.position.sub(g.get(ae.parent).pivot),y(ae.parent).group.add(Ie)):x.add(Ie),Ie.userData.baseY=Ie.position.y,re={group:Ie,extent:new Ct},E.set(O,re)}return re};for(const[O,re]of w){const[ae,Ie,ze]=O.split("|"),qe=ze?ze.split("+"):[];let Y=S[Ie==="glass"&&ae?"sideGlass":Ie];qe.length&&(Y=Y.clone()),(Ie==="paint"||Ie==="trim"||Ie==="black")&&qS(Y);const J=new Re(Bd(re),Y);if(ae){const me=y(ae);J.position.copy(g.get(ae).pivot).negate(),me.group.add(J);for(const ke of re)me.extent.expandByPoint(ke.centroid)}else x.add(J);qe.length&&i.lightMesh(J,qe,Cl(qe,Ie),zd(qe))}for(const O of m){const re=new Re(Bd(O.tris),S[O.tris[0].role].clone()),ae=O.tris[0].part&&g.has(O.tris[0].part)?O.tris[0].part:void 0;if(ae){const Ie=y(ae);re.position.copy(g.get(ae).pivot).negate(),Ie.group.add(re)}else x.add(re);i.lightBar(re,O.pixels,O.from,O.to,Cl(O.pixels[0],O.tris[0].role))}const R=new Set(s.flatMap(O=>O.lights??[])),P=s.filter(O=>O.role!=="glass"&&O.role!=="lens"&&O.role!=="redLens"),I=(O,re)=>{let ae,Ie=1/0;for(const ze of P){if(re&&!re(ze.normal))continue;const qe=ze.centroid.distanceToSquared(O);qe<Ie&&([Ie,ae]=[qe,ze])}return ae};for(const O of h){const re=c(O).id;if(R.has(re)||/Bar\d/.test(re))continue;const ae=/Tail|brake|rearFog/i.test(re),Ie=Cl([re],ae?"redLens":"lens"),ze=re==="licensePlate"?new de("#9a9a9a"):ae?new de("#2a0c0d"):he.lensFront,qe=re==="licensePlate"?[1.5,3,12]:re==="rearFog"?[2,3,14]:[6,2.5,2.5];let Y=new A(...O.position);if(re==="rearFog"&&!f){const we=new A(Y.x,.36/d,Math.sign(Y.z||1)*.42/d),He=I(we,at=>at.x<-.5);He&&(Y=He.centroid.clone().add(He.normal.clone().multiplyScalar(.4)))}const J=I(Y),me=J?.part?y(J.part).group:x,ke=J?.part?Y.clone().sub(g.get(J.part).pivot):Y;i.light(me,[re],Ie,ze,qe,ke.toArray(),re==="licensePlate"?.6:zd([re]))}for(const[O,{group:re,extent:ae}]of E){const Ie=g.get(O);i.closure(O,ze=>Ie.apply(re,ze,ae),re)}const F=E.get("chargePort");if(F){const O=F.extent.getCenter(new A),re=O.z<0?-1:1,ae=O.clone().sub(g.get("chargePort").pivot).add(new A(0,0,re*1.5)).multiplyScalar(d),Ie=new vt;Ie.position.copy(g.get("chargePort").pivot).multiplyScalar(d),i.car.add(Ie);const ze=i.glow(Ie,ae,.12);ze.level=0,i.closure("chargePort",(qe,Y,J)=>{Y?ze.color.setHSL(J*.6%1,1,.55):ze.color.set("#3cff6a"),ze.level=qe>.05?1.2:0})}const V=O=>O&&[O[0]*d,O[1]*d,O[2]*d],U=f?"CT ":"",B=V(u(`${U}Right Outer Main Beam`)),K=V(u("Right Front Fog"));B&&Pa(i,{x:B[0]+.15,y:B[1],z:B[2]},K&&{x:K[0]+.15,y:K[1],z:K[2]});const W=Math.max(-r.min.x,r.max.x)*d,ie=new rr("#ff2020",0,6,1.6);ie.position.set(r.min.x*d-.35,.7,0),i.car.add(ie),i.beam(["brakeLights","leftTail","rightTail"],ie,5);const q=new ss("#ffffff",0,10,.9,.8,1.5);q.position.set(r.min.x*d-.1,.9,0),q.target.position.set(r.min.x*d-4.5,0,0),i.car.add(q,q.target),i.beam(["reverseLights"],q,30);const Q=V(u(`${U}Center Front Display`));return Q&&i.cabinLight.position.set(Q[0]-.3,Q[1]*.7,0),i.car.add(i.cabinLight),{halfLength:W,height:r.max.y*d,halfWidth:Math.max(-r.min.z,r.max.z)*d,paint:f?"#b9bcc0":void 0,cabinGain:1.5}}function YS(i,e){const t=[],n=new A,s=new A,r=new A;for(const o of i.meshes){const a=o.geometry,l=a.attributes.position;let c=l.array;if(e){const f=new Float32Array(l.count*3);for(let g=0;g<l.count;g++)f.set(e.apply([l.getX(g),l.getY(g),l.getZ(g)],o.name),g*3);c=f}const h=(f,g)=>f.set(c[g*3],c[g*3+1],c[g*3+2]),u=[o.material].flat(),d=a.groups.length?a.groups:[{start:0,count:l.count,materialIndex:0}];for(const f of d){const g=i.roles[u[f.materialIndex??0]?.name??""]??"black";for(let _=f.start;_+2<f.start+f.count;_+=3){n.fromBufferAttribute(l,_),s.fromBufferAttribute(l,_+1),r.fromBufferAttribute(l,_+2);const p=new A().add(n).add(s).add(r).divideScalar(3);h(n,_),h(s,_+1),h(r,_+2);const m=new A().add(n).add(s).add(r).divideScalar(3),M=new A().subVectors(r,s).cross(new A().subVectors(n,s)).normalize();t.push({geometry:a,positions:c,start:_,group:o.name,role:g,source:p,centroid:m,normal:M})}}}return t}function Od(i,e,t,n){const s=e==="x"?0:e==="y"?1:2,r=[];for(const o of i){if(!n(o)){r.push(o);continue}const a=o.positions,l=o.geometry.attributes.normal?.array,c=o.geometry.attributes.uv?.array,h=[0,1,2].map(_=>({p:[a[(o.start+_)*3],a[(o.start+_)*3+1],a[(o.start+_)*3+2]],n:l?[l[(o.start+_)*3],l[(o.start+_)*3+1],l[(o.start+_)*3+2]]:[o.normal.x,o.normal.y,o.normal.z],u:c?[c[(o.start+_)*2],c[(o.start+_)*2+1]]:[0,0]})),u=h.map(_=>_.p[s]-t);if(u.every(_=>_>=0)||u.every(_=>_<=0)){r.push(o);continue}const d=(_,p,m)=>({p:_.p.map((M,T)=>M+(p.p[T]-M)*m),n:_.n.map((M,T)=>M+(p.n[T]-M)*m),u:_.u.map((M,T)=>M+(p.u[T]-M)*m)}),f=_=>{const p=[];for(let m=0;m<3;m++){const M=h[m],T=h[(m+1)%3],x=_?u[m]:-u[m],S=_?u[(m+1)%3]:-u[(m+1)%3];x>=0&&p.push(M),x>=0!=S>=0&&p.push(d(M,T,x/(x-S)))}return p},g=_=>{for(let p=1;p+1<_.length;p++){const m=[_[0],_[p],_[p+1]],M=new yt;M.setAttribute("position",new ot(m.flatMap(x=>x.p),3)),M.setAttribute("normal",new ot(m.flatMap(x=>x.n),3)),c&&M.setAttribute("uv",new ot(m.flatMap(x=>x.u),2));const T=new A;for(const x of m)T.add(new A(...x.p));T.multiplyScalar(1/3),r.push({...o,geometry:M,positions:M.attributes.position.array,start:0,centroid:T,source:T.clone(),normal:o.normal.clone()})}};g(f(!0)),g(f(!1))}i.length=0,i.push(...r)}function Bd(i){const e=new yt,t=i[0].geometry;for(const n of["position","normal","uv"]){if(!t.attributes[n])continue;const s=t.attributes[n].itemSize,r=new Float32Array(i.length*3*s);let o=0;for(const a of i){const l=n==="position"?a.positions:a.geometry.attributes[n].array;for(let c=0;c<3;c++)for(let h=0;h<s;h++)r[o++]=l[(a.start+c)*s+h]}n==="normal"&&i.forEach((a,l)=>{for(let c=0;c<3;c++){const h=(l*3+c)*3;Math.hypot(r[h],r[h+1],r[h+2])>1e-6||a.normal.toArray(r,h)}}),e.setAttribute(n,new Dt(r,s))}return e.computeBoundingSphere(),e}function zd(i){const e=i.join("+");return/MainBeam/.test(e)?7:/Fog/.test(e)?4:/Turn/.test(e)?3:/Signature|Channel[456]/.test(e)?2.2:/SideMarker|SideRepeater|AuxPark/.test(e)?1.5:4}function Cl(i,e){const t=i[0];return/Tail|brake|rearFog|rearLightBar/i.test(t)||e==="redLens"?he.red:/Turn|SideMarker|SideRepeater/.test(t)?he.amber:he.white}function qS(i){if(i.userData.insideFaces)return;i.userData.insideFaces=!0,i.side=pn;const e=i.onBeforeCompile.bind(i),t=i.customProgramCacheKey();i.customProgramCacheKey=()=>`inside:${t}`,i.onBeforeCompile=(n,s)=>{e(n,s),n.fragmentShader=n.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
if ( !gl_FrontFacing ) diffuseColor.rgb = vec3( 0.03 );`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
if ( !gl_FrontFacing ) roughnessFactor = 0.9;`).replace("#include <metalnessmap_fragment>",`#include <metalnessmap_fragment>
if ( !gl_FrontFacing ) metalnessFactor = 0.0;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
if ( !gl_FrontFacing ) totalEmissiveRadiance = vec3( 0.0 );`).replace("#include <lights_physical_fragment>",`#include <lights_physical_fragment>
#ifdef USE_CLEARCOAT
if ( !gl_FrontFacing ) material.clearcoat = 0.0;
#endif`)},i.needsUpdate=!0}function KS(i,e){const t=s=>e.textures.get(s)??null,n=e.model==="cybertruck";return i.m.meshPaint.map=t(n?"Paint_Red_AO.png":"Exterior_AO.png"),i.m.meshPaint.userData.paintScale=e.paintScale,i.m.meshPaint.needsUpdate=!0,{paint:i.m.meshPaint,trim:new _t({map:t("Exterior_AO_Dark.png"),roughness:.5,metalness:.2}),black:new _t({color:"#060607",roughness:.6}),glass:i.m.glass,sideGlass:i.m.sideGlass,lens:new _t({map:t("Lights_AO.png"),color:"#9c9c9c",roughness:.45,metalness:0,envMapIntensity:.2}),redLens:new _t({map:t(n?"Lights_AO_Red.png":"Lights_Red_AO.png"),color:"#8a8a8a",roughness:.45,metalness:0,envMapIntensity:.2}),wheel:new _t({map:t(n?"Cybertruck_Premium_Wheel_AO_Dark.png":"Arachnid_Wheel_AO.png"),roughness:.35,metalness:.5}),tire:new _t({color:"#0b0b0c",roughness:.85})}}function $S(i,e,t,n=!1){const s={Window_LF:"leftFrontWindow",Window_LR:"leftRearWindow",Window_RF:"rightFrontWindow",Window_RR:"rightRearWindow",Door_LF_Mirror:"leftMirror",Door_RF_Mirror:"rightMirror",Trunk:"liftgate",Charge_Cap:"chargePort"},r=[["leftFrontDoorHandle","Left Front Door Handle"],["rightFrontDoorHandle","Right Front Door Handle"],["leftRearDoorHandle","Left Rear Door Handle"],["rightRearDoorHandle","Right Rear Door Handle"]];for(const a of i)if(a.part=s[a.group],n&&a.part==="liftgate"&&a.role==="glass"&&(a.part=void 0),!(!a.group.startsWith("Door_")||a.part))for(const[l,c]of r){const h=e(c);h&&a.centroid.distanceTo(new A(...h))<16&&Math.abs(a.centroid.z)>178&&(a.part=l)}const o=a=>{const l=new Ct;for(const c of i)c.part===a&&l.expandByPoint(c.centroid);return l};for(const a of new Set(i.map(l=>l.part).filter(l=>!!l))){const l=o(a),h=xa(l.getCenter(new A).z)==="right"?1:-1;if(a.endsWith("Window")){const u=(l.max.y-l.min.y)*.95;t.set(a,{pivot:new A,apply:(d,f)=>d.position.y=-f*u})}else if(a.endsWith("Mirror")){const u=new A(l.max.x-8,l.min.y,h>0?l.min.z:l.max.z);t.set(a,{pivot:u,apply:(d,f)=>d.rotation.y=-h*(1-f)*Fn(62)})}else if(a==="liftgate"){const u=new A(l.max.x,l.max.y,0),d=Fn(n?62:78);t.set(a,{pivot:u,apply:(f,g)=>f.rotation.z=-g*d})}else if(a==="chargePort"){const u=new A(l.max.x,(l.min.y+l.max.y)/2,h>0?l.max.z:l.min.z);t.set(a,{pivot:u,apply:(d,f)=>d.rotation.y=h*f*Fn(-80)})}else if(a.endsWith("DoorHandle")){const u=new A;t.set(a,{pivot:u,apply:(d,f)=>d.position.z=h*f*4})}}}function ZS(i,e){const t={Door_LF:"leftFrontDoor",Door_RF:"rightFrontDoor",Door_LR:"leftFalconDoor",Door_RR:"rightFalconDoor",Window_LF:"leftFrontWindow",Window_RF:"rightFrontWindow",Window_LR:"leftRearWindow",Window_RR:"rightRearWindow",Door_LF_Mirror:"leftMirror",Door_RF_Mirror:"rightMirror",Trunk:"liftgate",Charge_Cap:"chargePort"},n=new Ct;for(const r of i)(r.group==="Door_LR"||r.group==="Door_RR")&&n.expandByPoint(r.source);for(const r of i){r.part=t[r.group];const o=r.source;!r.part&&(r.group==="Body"||r.group==="Windows_Top")&&o.x>n.min.x+4&&o.x<n.max.x-4&&o.y>205&&Math.abs(o.z)>8&&(r.part=`${xa(o.z)}FalconDoor`)}const s=r=>{const o=new Ct;for(const a of i)a.part===r&&o.expandByPoint(a.centroid);return o};for(const r of new Set(i.map(o=>o.part).filter(o=>!!o))){const o=s(r),a=xa(o.getCenter(new A).z),l=a==="right"?1:-1;if(r.endsWith("FalconDoor")){const c=new A((o.min.x+o.max.x)/2,o.max.y,l*8);e.set(r,{pivot:c,apply:(h,u)=>h.rotation.x=-l*u*Fn(100)})}else if(r.endsWith("FrontDoor")){const c=new A(o.max.x,(o.min.y+o.max.y)/2,l>0?o.max.z:o.min.z);e.set(r,{pivot:c,apply:(h,u)=>h.rotation.y=l*u*Fn(65)})}else if(r.endsWith("Window")){const c=(o.max.y-o.min.y)*.95,h=`${a}${r.includes("Front")?"FrontDoor":"FalconDoor"}`;e.set(r,{pivot:new A,parent:h,apply:(u,d)=>u.position.y=-d*c+u.userData.baseY})}else if(r.endsWith("Mirror")){const c=new A(o.max.x-8,o.min.y,l>0?o.min.z:o.max.z);e.set(r,{pivot:c,parent:`${a}FrontDoor`,apply:(h,u)=>h.rotation.y=-l*(1-u)*Fn(62)})}else if(r==="liftgate"){const c=new A(o.max.x,o.max.y,0);e.set(r,{pivot:c,apply:(h,u)=>h.rotation.z=-u*Fn(78)})}else if(r==="chargePort"){const c=new A(o.max.x,(o.min.y+o.max.y)/2,l>0?o.max.z:o.min.z);e.set(r,{pivot:c,apply:(h,u)=>h.rotation.y=l*u*Fn(-80)})}}}const qi=204,Pl=i=>122-Math.max(0,i-210)*(26/70);function JS(i,e,t,n,s=[]){const r=d=>d?new A(...d):void 0,o=e.filter(d=>/CT (Left|Right) (Front|Rear) Window/.test(d.name)),a=d=>d.name.replace(/^CT (Left|Right) (Front|Rear) Window$/,(f,g,_)=>`${g.toLowerCase()}${_}Window`),l=[["leftMirror",r(t("CT Left Mirror"))],["rightMirror",r(t("CT Right Mirror"))]],c=r(t("CT Charge Port")),h=d=>d.role!=="glass"&&d.role!=="lens"&&d.role!=="redLens"&&d.role!=="wheel"&&d.centroid.x>190&&d.centroid.y>60&&Math.abs(d.centroid.z)<130;Od(i,"x",qi,h),Od(i,"y",84,d=>h(d)&&d.centroid.x>230);for(const d of i){const f=d.centroid;if(d.role==="glass"&&Math.abs(d.normal.z)>.55&&o.length){let g=o[0];for(const _ of o)f.distanceToSquared(new A(..._.position))<f.distanceToSquared(new A(...g.position))&&(g=_);Math.sign(g.position[2])===Math.sign(f.z)&&(d.part=a(g));continue}if(!(d.role==="glass"||d.role==="lens"||d.role==="redLens"||d.role==="wheel")){for(const[g,_]of l)_&&Math.abs(f.z)>93&&f.distanceTo(_)<24&&(d.part=g);if(c&&f.z<-95&&f.distanceTo(c)<10&&(d.part="chargePort"),!d.part&&d.role!=="tire"&&Math.abs(f.z)<103){const g=f.x>qi&&Math.abs(d.normal.z)<.7&&f.y>Pl(f.x)-14&&!(f.x>230&&f.y<84),_=f.x>230&&f.y>=84&&d.normal.x>.35;(g||_)&&(d.part="liftgate")}}}const u=d=>{const f=new Ct;for(const g of i)g.part===d&&f.expandByPoint(g.centroid);return f};for(const d of new Set(i.map(f=>f.part).filter(f=>!!f))){const f=u(d),g=xa(f.getCenter(new A).z)==="right"?1:-1;if(d.endsWith("Window")){const _=(f.max.y-f.min.y)*.95;n.set(d,{pivot:new A,apply:(p,m)=>p.position.y=-m*_})}else if(d.endsWith("Mirror")){const _=new A(f.max.x-4,f.min.y,g>0?f.min.z:f.max.z);n.set(d,{pivot:_,apply:(p,m)=>p.rotation.y=-g*(1-m)*Fn(62)})}else if(d==="liftgate"){const _=new A(qi,Pl(qi),0);n.set(d,{pivot:_,apply:(m,M)=>m.rotation.z=M*Fn(50)});const p=new Re(new Et(f.max.x-qi-8,40,Math.min(190,f.max.z-f.min.z-8)),new _t({color:"#15161a",roughness:.95,metalness:0}));p.position.set((qi+f.max.x)/2,Pl((qi+f.max.x)/2)-30,0),s.push(p)}else if(d==="chargePort"){const _=new A(f.max.x,(f.min.y+f.max.y)/2,f.min.z);n.set(d,{pivot:_,apply:(p,m)=>p.rotation.y=m*Fn(-80)})}}}function jS(i,e,t){const n=[{base:"frontLightBar",count:60,test:r=>r.x>200&&r.y>=86&&r.y<=116},{base:"rearLightBar",count:52,test:r=>r.x<-200&&r.y>=106}],s=[];for(const r of n){const o=i.filter(h=>r.test(h.centroid));if(!o.length)continue;let a=1/0,l=-1/0;for(const h of o)a=Math.min(a,h.centroid.z),l=Math.max(l,h.centroid.z);const c=Array.from({length:r.count},(h,u)=>[`${r.base}${u+1}`]);for(const h of o){const u=c[cS(h.centroid.z,a,l,r.count)];for(const d of e)if(h.centroid.distanceTo(new A(...d.position))<14){const f=t(d)?.id;f&&!u.includes(f)&&u.push(f)}h.lights=u,h.bar=r.base,r.base==="frontLightBar"&&(h.part="liftgate")}s.push({tris:o,pixels:c,from:a,to:l})}return s}function kd(i,e){if(e===Rm)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),i;if(e===Tc||e===Sf){let t=i.getIndex();if(t===null){const r=[],o=i.getAttribute("position");if(o!==void 0){for(let a=0;a<o.count;a++)r.push(a);i.setIndex(r),t=i.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),i}const n=t.count-2,s=[];if(e===Tc)for(let r=1;r<=n;r++)s.push(t.getX(0)),s.push(t.getX(r)),s.push(t.getX(r+1));else for(let r=0;r<n;r++)r%2===0?(s.push(t.getX(r)),s.push(t.getX(r+1)),s.push(t.getX(r+2))):(s.push(t.getX(r+2)),s.push(t.getX(r+1)),s.push(t.getX(r)));return s.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles."),i.setIndex(s),i.clearGroups(),i}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),i}function QS(i){const e=new Map,t=new Map,n=i.clone();return vp(i,n,function(s,r){e.set(r,s),t.set(s,r)}),n.traverse(function(s){if(!s.isSkinnedMesh)return;const r=s,o=e.get(s),a=o.skeleton.bones;r.skeleton=o.skeleton.clone(),r.bindMatrix.copy(o.bindMatrix),r.skeleton.bones=a.map(function(l){return t.get(l)}),r.bind(r.skeleton,r.bindMatrix)}),n}function vp(i,e,t){t(i,e);for(let n=0;n<i.children.length;n++)vp(i.children[n],e.children[n],t)}class eb extends ls{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new rb(t)}),this.register(function(t){return new ob(t)}),this.register(function(t){return new mb(t)}),this.register(function(t){return new gb(t)}),this.register(function(t){return new _b(t)}),this.register(function(t){return new lb(t)}),this.register(function(t){return new cb(t)}),this.register(function(t){return new hb(t)}),this.register(function(t){return new ub(t)}),this.register(function(t){return new sb(t)}),this.register(function(t){return new db(t)}),this.register(function(t){return new ab(t)}),this.register(function(t){return new pb(t)}),this.register(function(t){return new fb(t)}),this.register(function(t){return new nb(t)}),this.register(function(t){return new Hd(t,tt.EXT_MESHOPT_COMPRESSION)}),this.register(function(t){return new Hd(t,tt.KHR_MESHOPT_COMPRESSION)}),this.register(function(t){return new xb(t)})}load(e,t,n,s){const r=this;let o;if(this.resourcePath!=="")o=this.resourcePath;else if(this.path!==""){const c=Or.extractUrlBase(e);o=Or.resolveURL(c,this.path)}else o=Or.extractUrlBase(e);this.manager.itemStart(e);const a=function(c){s?s(c):console.error(c),r.manager.itemError(e),r.manager.itemEnd(e)},l=new Sh(this.manager);l.setPath(this.path),l.setResponseType("arraybuffer"),l.setRequestHeader(this.requestHeader),l.setWithCredentials(this.withCredentials),l.load(e,function(c){try{r.parse(c,o,function(h){t(h),r.manager.itemEnd(e)},a)}catch(h){a(h)}},n,a)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,s){let r;const o={},a={},l=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(l.decode(new Uint8Array(e,0,4))===yp){try{o[tt.KHR_BINARY_GLTF]=new vb(e)}catch(u){s&&s(u);return}r=JSON.parse(o[tt.KHR_BINARY_GLTF].content)}else r=JSON.parse(l.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){s&&s(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}const c=new Ib(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});c.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){const u=this.pluginCallbacks[h](c);u.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),a[u.name]=u,o[u.name]=!0}if(r.extensionsUsed)for(let h=0;h<r.extensionsUsed.length;++h){const u=r.extensionsUsed[h],d=r.extensionsRequired||[];switch(u){case tt.KHR_MATERIALS_UNLIT:o[u]=new ib;break;case tt.KHR_DRACO_MESH_COMPRESSION:o[u]=new yb(r,this.dracoLoader);break;case tt.KHR_TEXTURE_TRANSFORM:o[u]=new Mb;break;case tt.KHR_MESH_QUANTIZATION:o[u]=new Sb;break;default:d.indexOf(u)>=0&&a[u]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+u+'".')}}c.setExtensions(o),c.setPlugins(a),c.parse(n,s)}parseAsync(e,t){const n=this;return new Promise(function(s,r){n.parse(e,t,s,r)})}}function tb(){let i={};return{get:function(e){return i[e]},add:function(e,t){i[e]=t},remove:function(e){delete i[e]},removeAll:function(){i={}}}}function Pt(i,e,t){const n=i.json.materials[e];return n.extensions&&n.extensions[t]?n.extensions[t]:null}const tt={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",KHR_MESHOPT_COMPRESSION:"KHR_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class nb{constructor(e){this.parser=e,this.name=tt.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){const e=this.parser,t=this.parser.json.nodes||[];for(let n=0,s=t.length;n<s;n++){const r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){const t=this.parser,n="light:"+e;let s=t.cache.get(n);if(s)return s;const r=t.json,l=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e];let c;const h=new de(16777215);l.color!==void 0&&h.setRGB(l.color[0],l.color[1],l.color[2],_n);const u=l.range!==void 0?l.range:0;switch(l.type){case"directional":c=new Jf(h),c.target.position.set(0,0,-1),c.add(c.target);break;case"point":c=new rr(h),c.distance=u;break;case"spot":c=new ss(h),c.distance=u,l.spot=l.spot||{},l.spot.innerConeAngle=l.spot.innerConeAngle!==void 0?l.spot.innerConeAngle:0,l.spot.outerConeAngle=l.spot.outerConeAngle!==void 0?l.spot.outerConeAngle:Math.PI/4,c.angle=l.spot.outerConeAngle,c.penumbra=1-l.spot.innerConeAngle/l.spot.outerConeAngle,c.target.position.set(0,0,-1),c.add(c.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+l.type)}return c.position.set(0,0,0),Xn(c,l),l.intensity!==void 0&&(c.intensity=l.intensity),c.name=t.createUniqueName(l.name||"light_"+e),s=Promise.resolve(c),t.cache.add(n,s),s}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){const t=this,n=this.parser,r=n.json.nodes[e],a=(r.extensions&&r.extensions[this.name]||{}).light;return a===void 0?null:this._loadLight(a).then(function(l){return n._getNodeRef(t.cache,a,l)})}}class ib{constructor(){this.name=tt.KHR_MATERIALS_UNLIT}getMaterialType(){return gn}extendParams(e,t,n){const s=[];e.color=new de(1,1,1),e.opacity=1;const r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){const o=r.baseColorFactor;e.color.setRGB(o[0],o[1],o[2],_n),e.opacity=o[3]}r.baseColorTexture!==void 0&&s.push(n.assignTexture(e,"map",r.baseColorTexture,wt))}return Promise.all(s)}}class sb{constructor(e){this.parser=e,this.name=tt.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);return n===null||n.emissiveStrength!==void 0&&(t.emissiveIntensity=n.emissiveStrength),Promise.resolve()}}class rb{constructor(e){this.parser=e,this.name=tt.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?$t:null}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);if(n===null)return Promise.resolve();const s=[];if(n.clearcoatFactor!==void 0&&(t.clearcoat=n.clearcoatFactor),n.clearcoatTexture!==void 0&&s.push(this.parser.assignTexture(t,"clearcoatMap",n.clearcoatTexture)),n.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),n.clearcoatRoughnessTexture!==void 0&&s.push(this.parser.assignTexture(t,"clearcoatRoughnessMap",n.clearcoatRoughnessTexture)),n.clearcoatNormalTexture!==void 0&&(s.push(this.parser.assignTexture(t,"clearcoatNormalMap",n.clearcoatNormalTexture)),n.clearcoatNormalTexture.scale!==void 0)){const r=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new ne(r,r)}return Promise.all(s)}}class ob{constructor(e){this.parser=e,this.name=tt.KHR_MATERIALS_DISPERSION}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?$t:null}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);return n===null||(t.dispersion=n.dispersion!==void 0?n.dispersion:0),Promise.resolve()}}class ab{constructor(e){this.parser=e,this.name=tt.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?$t:null}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);if(n===null)return Promise.resolve();const s=[];return n.iridescenceFactor!==void 0&&(t.iridescence=n.iridescenceFactor),n.iridescenceTexture!==void 0&&s.push(this.parser.assignTexture(t,"iridescenceMap",n.iridescenceTexture)),n.iridescenceIor!==void 0&&(t.iridescenceIOR=n.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),n.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=n.iridescenceThicknessMinimum),n.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=n.iridescenceThicknessMaximum),n.iridescenceThicknessTexture!==void 0&&s.push(this.parser.assignTexture(t,"iridescenceThicknessMap",n.iridescenceThicknessTexture)),Promise.all(s)}}class lb{constructor(e){this.parser=e,this.name=tt.KHR_MATERIALS_SHEEN}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?$t:null}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);if(n===null)return Promise.resolve();const s=[];if(t.sheenColor=new de(0,0,0),t.sheenRoughness=0,t.sheen=1,n.sheenColorFactor!==void 0){const r=n.sheenColorFactor;t.sheenColor.setRGB(r[0],r[1],r[2],_n)}return n.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=n.sheenRoughnessFactor),n.sheenColorTexture!==void 0&&s.push(this.parser.assignTexture(t,"sheenColorMap",n.sheenColorTexture,wt)),n.sheenRoughnessTexture!==void 0&&s.push(this.parser.assignTexture(t,"sheenRoughnessMap",n.sheenRoughnessTexture)),Promise.all(s)}}class cb{constructor(e){this.parser=e,this.name=tt.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?$t:null}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);if(n===null)return Promise.resolve();const s=[];return n.transmissionFactor!==void 0&&(t.transmission=n.transmissionFactor),n.transmissionTexture!==void 0&&s.push(this.parser.assignTexture(t,"transmissionMap",n.transmissionTexture)),Promise.all(s)}}class hb{constructor(e){this.parser=e,this.name=tt.KHR_MATERIALS_VOLUME}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?$t:null}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);if(n===null)return Promise.resolve();const s=[];t.thickness=n.thicknessFactor!==void 0?n.thicknessFactor:0,n.thicknessTexture!==void 0&&s.push(this.parser.assignTexture(t,"thicknessMap",n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;const r=n.attenuationColor||[1,1,1];return t.attenuationColor=new de().setRGB(r[0],r[1],r[2],_n),Promise.all(s)}}class ub{constructor(e){this.parser=e,this.name=tt.KHR_MATERIALS_IOR}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?$t:null}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);return n===null||(t.ior=n.ior!==void 0?n.ior:1.5,t.ior===0&&(t.ior=1e3)),Promise.resolve()}}class db{constructor(e){this.parser=e,this.name=tt.KHR_MATERIALS_SPECULAR}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?$t:null}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);if(n===null)return Promise.resolve();const s=[];t.specularIntensity=n.specularFactor!==void 0?n.specularFactor:1,n.specularTexture!==void 0&&s.push(this.parser.assignTexture(t,"specularIntensityMap",n.specularTexture));const r=n.specularColorFactor||[1,1,1];return t.specularColor=new de().setRGB(r[0],r[1],r[2],_n),n.specularColorTexture!==void 0&&s.push(this.parser.assignTexture(t,"specularColorMap",n.specularColorTexture,wt)),Promise.all(s)}}class fb{constructor(e){this.parser=e,this.name=tt.EXT_MATERIALS_BUMP}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?$t:null}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);if(n===null)return Promise.resolve();const s=[];return t.bumpScale=n.bumpFactor!==void 0?n.bumpFactor:1,n.bumpTexture!==void 0&&s.push(this.parser.assignTexture(t,"bumpMap",n.bumpTexture)),Promise.all(s)}}class pb{constructor(e){this.parser=e,this.name=tt.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return Pt(this.parser,e,this.name)!==null?$t:null}extendMaterialParams(e,t){const n=Pt(this.parser,e,this.name);if(n===null)return Promise.resolve();const s=[];return n.anisotropyStrength!==void 0&&(t.anisotropy=n.anisotropyStrength),n.anisotropyRotation!==void 0&&(t.anisotropyRotation=n.anisotropyRotation),n.anisotropyTexture!==void 0&&s.push(this.parser.assignTexture(t,"anisotropyMap",n.anisotropyTexture)),Promise.all(s)}}class mb{constructor(e){this.parser=e,this.name=tt.KHR_TEXTURE_BASISU}loadTexture(e){const t=this.parser,n=t.json,s=n.textures[e];if(!s.extensions||!s.extensions[this.name])return null;const r=s.extensions[this.name],o=t.options.ktx2Loader;if(!o){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,o)}}class gb{constructor(e){this.parser=e,this.name=tt.EXT_TEXTURE_WEBP}loadTexture(e){const t=this.name,n=this.parser,s=n.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;const o=r.extensions[t],a=s.images[o.source];let l=n.textureLoader;if(a.uri){const c=n.options.manager.getHandler(a.uri);c!==null&&(l=c)}return n.loadTextureImage(e,o.source,l)}}class _b{constructor(e){this.parser=e,this.name=tt.EXT_TEXTURE_AVIF}loadTexture(e){const t=this.name,n=this.parser,s=n.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;const o=r.extensions[t],a=s.images[o.source];let l=n.textureLoader;if(a.uri){const c=n.options.manager.getHandler(a.uri);c!==null&&(l=c)}return n.loadTextureImage(e,o.source,l)}}class Hd{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){const t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){const s=n.extensions[this.name],r=this.parser.getDependency("buffer",s.buffer),o=this.parser.options.meshoptDecoder;if(!o||!o.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(a){const l=s.byteOffset||0,c=s.byteLength||0,h=s.count,u=s.byteStride,d=new Uint8Array(a,l,c);return o.decodeGltfBufferAsync?o.decodeGltfBufferAsync(h,u,d,s.mode,s.filter).then(function(f){return f.buffer}):o.ready.then(function(){const f=new ArrayBuffer(h*u);return o.decodeGltfBuffer(new Uint8Array(f),h,u,d,s.mode,s.filter),f})})}else return null}}class xb{constructor(e){this.name=tt.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){const t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;const s=t.meshes[n.mesh];for(const c of s.primitives)if(c.mode!==bn.TRIANGLES&&c.mode!==bn.TRIANGLE_STRIP&&c.mode!==bn.TRIANGLE_FAN&&c.mode!==void 0)return null;const o=n.extensions[this.name].attributes,a=[],l={};for(const c in o)a.push(this.parser.getDependency("accessor",o[c]).then(h=>(l[c]=h,l[c])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(c=>{const h=c.pop(),u=h.isGroup?h.children:[h],d=c[0].count,f=[];for(const g of u){const _=new Xe,p=new A,m=new hn,M=new A(1,1,1),T=new Cg(g.geometry,g.material,d);for(let S=0;S<d;S++)l.TRANSLATION&&p.fromBufferAttribute(l.TRANSLATION,S),l.ROTATION&&m.fromBufferAttribute(l.ROTATION,S),l.SCALE&&M.fromBufferAttribute(l.SCALE,S),T.setMatrixAt(S,_.compose(p,m,M));let x=null;for(const S in l)if(S==="_COLOR_0"){const w=l[S];T.instanceColor=new pa(w.array,w.itemSize,w.normalized)}else if(S!=="TRANSLATION"&&S!=="ROTATION"&&S!=="SCALE"){if(x===null){const E=T.geometry;x=new yt,x.name=E.name;for(const y in E.attributes)x.setAttribute(y,E.attributes[y]);for(const y in E.morphAttributes)x.morphAttributes[y]=E.morphAttributes[y];E.index!==null&&x.setIndex(E.index),x.morphTargetsRelative=E.morphTargetsRelative;for(const y of E.groups)x.addGroup(y.start,y.count,y.materialIndex);E.boundingBox!==null&&(x.boundingBox=E.boundingBox.clone()),E.boundingSphere!==null&&(x.boundingSphere=E.boundingSphere.clone()),x.drawRange.start=E.drawRange.start,x.drawRange.count=E.drawRange.count,x.userData=Object.assign({},E.userData),T.geometry=x}const w=l[S];x.setAttribute(S,new pa(w.array,w.itemSize,w.normalized))}Tt.prototype.copy.call(T,g),this.parser.assignFinalMaterial(T),f.push(T)}return h.isGroup?(h.clear(),h.add(...f),h):f[0]}))}}const yp="glTF",br=12,Vd={JSON:1313821514,BIN:5130562};class vb{constructor(e){this.name=tt.KHR_BINARY_GLTF,this.content=null,this.body=null;const t=new DataView(e,0,br),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==yp)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");const s=this.header.length-br,r=new DataView(e,br);let o=0;for(;o<s;){const a=r.getUint32(o,!0);o+=4;const l=r.getUint32(o,!0);if(o+=4,l===Vd.JSON){const c=new Uint8Array(e,br+o,a);this.content=n.decode(c)}else if(l===Vd.BIN){const c=br+o;this.body=e.slice(c,c+a)}o+=a}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}}class yb{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=tt.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){const n=this.json,s=this.dracoLoader,r=e.extensions[this.name].bufferView,o=e.extensions[this.name].attributes,a={},l={},c={};for(const h in o){const u=Oc[h]||h.toLowerCase();a[u]=o[h]}for(const h in e.attributes){const u=Oc[h]||h.toLowerCase();if(o[h]!==void 0){const d=n.accessors[e.attributes[h]],f=qs[d.componentType];c[u]=f.name,l[u]=d.normalized===!0}}return t.getDependency("bufferView",r).then(function(h){return new Promise(function(u,d){s.decodeDracoFile(h,function(f){for(const g in f.attributes){const _=f.attributes[g],p=l[g];p!==void 0&&(_.normalized=p)}u(f)},a,c,_n,d)})})}}class Mb{constructor(){this.name=tt.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){if((t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0)return e;if(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),t.rotation!==void 0){const n=Math.cos(e.rotation),s=Math.sin(e.rotation);e.matrix.set(e.repeat.x*n,e.repeat.y*s,e.offset.x,-e.repeat.x*s,e.repeat.y*n,e.offset.y,0,0,1),e.matrixAutoUpdate=!1}return e.needsUpdate=!0,e}}class Sb{constructor(){this.name=tt.KHR_MESH_QUANTIZATION}}class Mp extends nr{constructor(e,t,n,s){super(e,t,n,s)}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s*3+s;for(let o=0;o!==s;o++)t[o]=n[r+o];return t}interpolate_(e,t,n,s){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=a*2,c=a*3,h=s-t,u=(n-t)/h,d=u*u,f=d*u,g=e*c,_=g-c,p=-2*f+3*d,m=f-d,M=1-p,T=m-d+u;for(let x=0;x!==a;x++){const S=o[_+x+a],w=o[_+x+l]*h,E=o[g+x+a],y=o[g+x]*h;r[x]=M*S+T*w+p*E+m*y}return r}}const bb=new hn;class Tb extends Mp{interpolate_(e,t,n,s){const r=super.interpolate_(e,t,n,s);return bb.fromArray(r).normalize().toArray(r),r}}const bn={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},qs={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Gd={9728:Ut,9729:Ft,9984:mf,9985:jo,9986:Ar,9987:Jn},Wd={33071:Zn,33648:oa,10497:ts},Ll={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},Oc={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},Li={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},wb={CUBICSPLINE:void 0,LINEAR:Gr,STEP:Vr},Il={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function Eb(i){return i.DefaultMaterial===void 0&&(i.DefaultMaterial=new _t({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:Bi})),i.DefaultMaterial}function Ki(i,e,t){for(const n in t.extensions)i[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function Xn(i,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(i.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function Ab(i,e,t){let n=!1,s=!1,r=!1;for(let c=0,h=e.length;c<h;c++){const u=e[c];if(u.POSITION!==void 0&&(n=!0),u.NORMAL!==void 0&&(s=!0),u.COLOR_0!==void 0&&(r=!0),n&&s&&r)break}if(!n&&!s&&!r)return Promise.resolve(i);const o=[],a=[],l=[];for(let c=0,h=e.length;c<h;c++){const u=e[c];if(n){const d=u.POSITION!==void 0?t.getDependency("accessor",u.POSITION):i.attributes.position;o.push(d)}if(s){const d=u.NORMAL!==void 0?t.getDependency("accessor",u.NORMAL):i.attributes.normal;a.push(d)}if(r){const d=u.COLOR_0!==void 0?t.getDependency("accessor",u.COLOR_0):i.attributes.color;l.push(d)}}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(l)]).then(function(c){const h=c[0],u=c[1],d=c[2];return n&&(i.morphAttributes.position=h),s&&(i.morphAttributes.normal=u),r&&(i.morphAttributes.color=d),i.morphTargetsRelative=!0,i})}function Rb(i,e){if(i.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)i.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){const t=e.extras.targetNames;if(i.morphTargetInfluences.length===t.length){i.morphTargetDictionary={};for(let n=0,s=t.length;n<s;n++)i.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function Cb(i){let e;const t=i.extensions&&i.extensions[tt.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+Dl(t.attributes):e=i.indices+":"+Dl(i.attributes)+":"+i.mode,i.targets!==void 0)for(let n=0,s=i.targets.length;n<s;n++)e+=":"+Dl(i.targets[n]);return e}function Dl(i){let e="";const t=Object.keys(i).sort();for(let n=0,s=t.length;n<s;n++)e+=t[n]+":"+i[t[n]]+";";return e}function Bc(i){switch(i){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function Pb(i){return i.search(/\.jpe?g($|\?)/i)>0||i.search(/^data\:image\/jpeg/)===0?"image/jpeg":i.search(/\.webp($|\?)/i)>0||i.search(/^data\:image\/webp/)===0?"image/webp":i.search(/\.ktx2($|\?)/i)>0||i.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}const Lb=new Xe;class Ib{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new tb,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,s=-1,r=!1,o=-1;if(typeof navigator<"u"&&typeof navigator.userAgent<"u"){const a=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(a)===!0;const l=a.match(/Version\/(\d+)/);s=n&&l?parseInt(l[1],10):-1,r=a.indexOf("Firefox")>-1,o=r?a.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&s<17||r&&o<98?this.textureLoader=new $f(this.options.manager):this.textureLoader=new F0(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Sh(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){const n=this,s=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(o){return o._markDefs&&o._markDefs()}),Promise.all(this._invokeAll(function(o){return o.beforeRoot&&o.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(o){const a={scene:o[0][s.scene||0],scenes:o[0],animations:o[1],cameras:o[2],asset:s.asset,parser:n,userData:{}};return Ki(r,a,s),Xn(a,s),Promise.all(n._invokeAll(function(l){return l.afterRoot&&l.afterRoot(a)})).then(function(){for(const l of a.scenes)l.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){const e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let s=0,r=t.length;s<r;s++){const o=t[s].joints;for(let a=0,l=o.length;a<l;a++)e[o[a]].isBone=!0}for(let s=0,r=e.length;s<r;s++){const o=e[s];o.mesh!==void 0&&(this._addNodeRef(this.meshCache,o.mesh),o.skin!==void 0&&(n[o.mesh].isSkinnedMesh=!0)),o.camera!==void 0&&this._addNodeRef(this.cameraCache,o.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;const s=n.clone(),r=(o,a)=>{const l=this.associations.get(o);l!=null&&this.associations.set(a,l);for(const[c,h]of o.children.entries())r(h,a.children[c])};return r(n,s),s.name+="_instance_"+e.uses[t]++,s}_invokeOne(e){const t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){const s=e(t[n]);if(s)return s}return null}_invokeAll(e){const t=Object.values(this.plugins);t.unshift(this);const n=[];for(let s=0;s<t.length;s++){const r=e(t[s]);r&&n.push(r)}return n}getDependency(e,t){const n=e+":"+t;let s=this.cache.get(n);if(!s){switch(e){case"scene":s=this.loadScene(t);break;case"node":s=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":s=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":s=this.loadAccessor(t);break;case"bufferView":s=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":s=this.loadBuffer(t);break;case"material":s=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":s=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":s=this.loadSkin(t);break;case"animation":s=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":s=this.loadCamera(t);break;default:if(s=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!s)throw new Error("Unknown type: "+e);break}this.cache.add(n,s)}return s}getDependencies(e){let t=this.cache.get(e);if(!t){const n=this,s=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(s.map(function(r,o){return n.getDependency(e,o)})),this.cache.add(e,t)}return t}loadBuffer(e){const t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[tt.KHR_BINARY_GLTF].body);const s=this.options;return new Promise(function(r,o){n.load(Or.resolveURL(t.uri,s.path),r,void 0,function(){o(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){const t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){const s=t.byteLength||0,r=t.byteOffset||0;return n.slice(r,r+s)})}loadAccessor(e){const t=this,n=this.json,s=this.json.accessors[e];if(s.bufferView===void 0&&s.sparse===void 0){const o=Ll[s.type],a=qs[s.componentType],l=s.normalized===!0,c=new a(s.count*o);return Promise.resolve(new Dt(c,o,l))}const r=[];return s.bufferView!==void 0?r.push(this.getDependency("bufferView",s.bufferView)):r.push(null),s.sparse!==void 0&&(r.push(this.getDependency("bufferView",s.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",s.sparse.values.bufferView))),Promise.all(r).then(function(o){const a=o[0],l=Ll[s.type],c=qs[s.componentType],h=c.BYTES_PER_ELEMENT,u=h*l,d=s.byteOffset||0,f=s.bufferView!==void 0?n.bufferViews[s.bufferView].byteStride:void 0,g=s.normalized===!0;let _,p;if(f&&f!==u){const m=Math.floor(d/f),M="InterleavedBuffer:"+s.bufferView+":"+s.componentType+":"+m+":"+s.count;let T=t.cache.get(M);T||(_=new c(a,m*f,s.count*f/h),T=new Lf(_,f/h),t.cache.add(M,T)),p=new Yr(T,l,d%f/h,g)}else a===null?_=new c(s.count*l):_=new c(a,d,s.count*l),p=new Dt(_,l,g);if(s.sparse!==void 0){const m=Ll.SCALAR,M=qs[s.sparse.indices.componentType],T=s.sparse.indices.byteOffset||0,x=s.sparse.values.byteOffset||0,S=new M(o[1],T,s.sparse.count*m),w=new c(o[2],x,s.sparse.count*l);a!==null&&(p=new Dt(p.array.slice(),p.itemSize,p.normalized)),p.normalized=!1;for(let E=0,y=S.length;E<y;E++){const R=S[E];if(p.setX(R,w[E*l]),l>=2&&p.setY(R,w[E*l+1]),l>=3&&p.setZ(R,w[E*l+2]),l>=4&&p.setW(R,w[E*l+3]),l>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}p.normalized=g}return p})}loadTexture(e){const t=this.json,n=this.options,r=t.textures[e].source,o=t.images[r];let a=this.textureLoader;if(o.uri){const l=n.manager.getHandler(o.uri);l!==null&&(a=l)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,n){const s=this,r=this.json,o=r.textures[e],a=r.images[t],l=(a.uri||a.bufferView)+":"+o.sampler;if(this.textureCache[l])return this.textureCache[l];const c=this.loadImageSource(t,n).then(function(h){h.flipY=!1,h.name=o.name||a.name||"",h.name===""&&typeof a.uri=="string"&&a.uri.startsWith("data:image/")===!1&&(h.name=a.uri);const d=(r.samplers||{})[o.sampler]||{};return h.magFilter=Gd[d.magFilter]||Ft,h.minFilter=Gd[d.minFilter]||Jn,h.wrapS=Wd[d.wrapS]||ts,h.wrapT=Wd[d.wrapT]||ts,h.generateMipmaps=!h.isCompressedTexture&&h.minFilter!==Ut&&h.minFilter!==Ft,s.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[l]=c,c}loadImageSource(e,t){const n=this,s=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());const o=s.images[e],a=self.URL||self.webkitURL;let l=o.uri||"",c=!1;if(o.bufferView!==void 0)l=n.getDependency("bufferView",o.bufferView).then(function(u){c=!0;const d=new Blob([u],{type:o.mimeType});return l=a.createObjectURL(d),l});else if(o.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");const h=Promise.resolve(l).then(function(u){return new Promise(function(d,f){let g=d;t.isImageBitmapLoader===!0&&(g=function(_){const p=new Ot(_);p.needsUpdate=!0,d(p)}),t.load(Or.resolveURL(u,r.path),g,void 0,f)})}).then(function(u){return c===!0&&a.revokeObjectURL(l),Xn(u,o),u.userData.mimeType=o.mimeType||Pb(o.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",l),u});return this.sourceCache[e]=h,h}assignTexture(e,t,n,s){const r=this;return this.getDependency("texture",n.index).then(function(o){if(!o)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(o=o.clone(),o.channel=n.texCoord),r.extensions[tt.KHR_TEXTURE_TRANSFORM]){const a=n.extensions!==void 0?n.extensions[tt.KHR_TEXTURE_TRANSFORM]:void 0;if(a){const l=r.associations.get(o);o=r.extensions[tt.KHR_TEXTURE_TRANSFORM].extendTexture(o,a),r.associations.set(o,l)}}return s!==void 0&&(o.colorSpace=s),e[t]=o,o})}assignFinalMaterial(e){const t=e.geometry;let n=e.material;const s=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,o=t.attributes.normal===void 0;if(e.isPoints){const a="PointsMaterial:"+n.uuid;let l=this.cache.get(a);l||(l=new zs,un.prototype.copy.call(l,n),l.color.copy(n.color),l.map=n.map,l.sizeAttenuation=!1,this.cache.add(a,l)),n=l}else if(e.isLine){const a="LineBasicMaterial:"+n.uuid;let l=this.cache.get(a);l||(l=new Dr,un.prototype.copy.call(l,n),l.color.copy(n.color),l.map=n.map,this.cache.add(a,l)),n=l}if(s||r||o){let a="ClonedMaterial:"+n.uuid+":";s&&(a+="derivative-tangents:"),r&&(a+="vertex-colors:"),o&&(a+="flat-shading:");let l=this.cache.get(a);l||(l=n.clone(),r&&(l.vertexColors=!0),o&&(l.flatShading=!0),s&&(l.normalScale&&(l.normalScale.y*=-1),l.clearcoatNormalScale&&(l.clearcoatNormalScale.y*=-1)),this.cache.add(a,l),this.associations.set(l,this.associations.get(n))),n=l}e.material=n}getMaterialType(){return _t}loadMaterial(e){const t=this,n=this.json,s=this.extensions,r=n.materials[e];let o;const a={},l=r.extensions||{},c=[];if(l[tt.KHR_MATERIALS_UNLIT]){const u=s[tt.KHR_MATERIALS_UNLIT];o=u.getMaterialType(),c.push(u.extendParams(a,r,t))}else{const u=r.pbrMetallicRoughness||{};if(a.color=new de(1,1,1),a.opacity=1,Array.isArray(u.baseColorFactor)){const d=u.baseColorFactor;a.color.setRGB(d[0],d[1],d[2],_n),a.opacity=d[3]}u.baseColorTexture!==void 0&&c.push(t.assignTexture(a,"map",u.baseColorTexture,wt)),a.metalness=u.metallicFactor!==void 0?u.metallicFactor:1,a.roughness=u.roughnessFactor!==void 0?u.roughnessFactor:1,u.metallicRoughnessTexture!==void 0&&(c.push(t.assignTexture(a,"metalnessMap",u.metallicRoughnessTexture)),c.push(t.assignTexture(a,"roughnessMap",u.metallicRoughnessTexture))),o=this._invokeOne(function(d){return d.getMaterialType&&d.getMaterialType(e)}),c.push(Promise.all(this._invokeAll(function(d){return d.extendMaterialParams&&d.extendMaterialParams(e,a)})))}r.doubleSided===!0&&(a.side=pn);const h=r.alphaMode||Il.OPAQUE;if(h===Il.BLEND?(a.transparent=!0,a.depthWrite=!1):(a.transparent=!1,h===Il.MASK&&(a.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&o!==gn&&(c.push(t.assignTexture(a,"normalMap",r.normalTexture)),a.normalScale=new ne(1,1),r.normalTexture.scale!==void 0)){const u=r.normalTexture.scale;a.normalScale.set(u,u)}if(r.occlusionTexture!==void 0&&o!==gn&&(c.push(t.assignTexture(a,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(a.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&o!==gn){const u=r.emissiveFactor;a.emissive=new de().setRGB(u[0],u[1],u[2],_n)}return r.emissiveTexture!==void 0&&o!==gn&&c.push(t.assignTexture(a,"emissiveMap",r.emissiveTexture,wt)),Promise.all(c).then(function(){const u=new o(a);return r.name&&(u.name=r.name),Xn(u,r),t.associations.set(u,{materials:e}),r.extensions&&Ki(s,u,r),u})}createUniqueName(e){const t=lt.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){const t=this,n=this.extensions,s=this.primitiveCache;function r(a){return n[tt.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a,t).then(function(l){return Xd(l,a,t)})}const o=[];for(let a=0,l=e.length;a<l;a++){const c=e[a],h=Cb(c),u=s[h];if(u)o.push(u.promise);else{let d;c.extensions&&c.extensions[tt.KHR_DRACO_MESH_COMPRESSION]?d=r(c):d=Xd(new yt,c,t),c.mode===bn.TRIANGLE_STRIP?d=d.then(f=>kd(f,Sf)):c.mode===bn.TRIANGLE_FAN&&(d=d.then(f=>kd(f,Tc))),s[h]={primitive:c,promise:d},o.push(d)}}return Promise.all(o)}loadMesh(e){const t=this,n=this.json,s=this.extensions,r=n.meshes[e],o=r.primitives,a=[];for(let l=0,c=o.length;l<c;l++){const h=o[l].material===void 0?Eb(this.cache):this.getDependency("material",o[l].material);a.push(h)}return a.push(t.loadGeometries(o)),Promise.all(a).then(async function(l){const c=l.slice(0,l.length-1),h=l[l.length-1],u=[];for(let f=0,g=h.length;f<g;f++){const _=h[f],p=o[f];let m;const M=c[f];if(p.mode===bn.TRIANGLES||p.mode===bn.TRIANGLE_STRIP||p.mode===bn.TRIANGLE_FAN||p.mode===void 0){const T=r.isSkinnedMesh===!0,x=_.hasAttribute("skinIndex")&&_.hasAttribute("skinWeight");T&&x===!1&&console.warn("THREE.GLTFLoader: Missing skinIndex or skinWeight attributes. Skinning disabled."),m=T&&x?new Eg(_,M):new Re(_,M),m.isSkinnedMesh===!0&&m.normalizeSkinWeights()}else if(p.mode===bn.LINES)m=new Ec(_,M);else if(p.mode===bn.LINE_STRIP)m=new xh(_,M);else if(p.mode===bn.LINE_LOOP)m=new Lg(_,M);else if(p.mode===bn.POINTS)m=new Nr(_,M);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+p.mode);Object.keys(m.geometry.morphAttributes).length>0&&Rb(m,r),m.name=t.createUniqueName(r.name||"mesh_"+e),Xn(m,r),p.extensions&&Ki(s,m,p),t.assignFinalMaterial(m),u.push(m)}for(let f=0,g=u.length;f<g;f++)t.associations.set(u[f],{meshes:e,primitives:f});if(u.length===1)return r.extensions&&Ki(s,u[0],r),u[0];const d=new vt;r.extensions&&Ki(s,d,r),t.associations.set(d,{meshes:e});for(let f=0,g=u.length;f<g;f++)d.add(u[f]);return d})}loadCamera(e){let t;const n=this.json.cameras[e],s=n[n.type];if(!s){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new nn(Jt.radToDeg(s.yfov),s.aspectRatio||1,s.znear||1,s.zfar||2e6):n.type==="orthographic"&&(t=new io(-s.xmag,s.xmag,s.ymag,-s.ymag,s.znear,s.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),Xn(t,n),Promise.resolve(t)}loadSkin(e){const t=this.json.skins[e],n=[];for(let s=0,r=t.joints.length;s<r;s++)n.push(this._loadNodeShallow(t.joints[s]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(s){const r=s.pop(),o=s,a=[],l=[];for(let c=0,h=o.length;c<h;c++){const u=o[c];if(u){a.push(u);const d=new Xe;r!==null&&d.fromArray(r.array,c*16),l.push(d)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[c])}return new gh(a,l)})}loadAnimation(e){const t=this.json,n=this,s=t.animations[e],r=s.name?s.name:"animation_"+e,o=[],a=[],l=[],c=[],h=[];for(let u=0,d=s.channels.length;u<d;u++){const f=s.channels[u],g=s.samplers[f.sampler],_=f.target,p=_.node,m=s.parameters!==void 0?s.parameters[g.input]:g.input,M=s.parameters!==void 0?s.parameters[g.output]:g.output;_.node!==void 0&&(o.push(this.getDependency("node",p)),a.push(this.getDependency("accessor",m)),l.push(this.getDependency("accessor",M)),c.push(g),h.push(_))}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(l),Promise.all(c),Promise.all(h)]).then(function(u){const d=u[0],f=u[1],g=u[2],_=u[3],p=u[4],m=[];for(let T=0,x=d.length;T<x;T++){const S=d[T],w=f[T],E=g[T],y=_[T],R=p[T];if(S===void 0)continue;S.updateMatrix&&S.updateMatrix();const P=n._createAnimationTracks(S,w,E,y,R);if(P)for(let I=0;I<P.length;I++)m.push(P[I])}const M=new Lc(r,void 0,m);return Xn(M,s),M})}createNodeMesh(e){const t=this.json,n=this,s=t.nodes[e];return s.mesh===void 0?null:n.getDependency("mesh",s.mesh).then(function(r){const o=n._getNodeRef(n.meshCache,s.mesh,r);return s.weights!==void 0&&o.traverse(function(a){if(a.isMesh)for(let l=0,c=s.weights.length;l<c;l++)a.morphTargetInfluences[l]=s.weights[l]}),o})}loadNode(e){const t=this.json,n=this,s=t.nodes[e],r=n._loadNodeShallow(e),o=[],a=s.children||[];for(let c=0,h=a.length;c<h;c++)o.push(n.getDependency("node",a[c]));const l=s.skin===void 0?Promise.resolve(null):n.getDependency("skin",s.skin);return Promise.all([r,Promise.all(o),l]).then(function(c){const h=c[0],u=c[1],d=c[2];d!==null&&h.traverse(function(f){f.isSkinnedMesh&&f.bind(d,Lb)});for(let f=0,g=u.length;f<g;f++)h.add(u[f]);if(h.userData.pivot!==void 0&&u.length>0){const f=h.userData.pivot,g=u[0];h.pivot=new A().fromArray(f),h.position.x-=f[0],h.position.y-=f[1],h.position.z-=f[2],g.position.set(0,0,0),delete h.userData.pivot}return h})}_loadNodeShallow(e){const t=this.json,n=this.extensions,s=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];const r=t.nodes[e],o=r.name?s.createUniqueName(r.name):"",a=[],l=s._invokeOne(function(c){return c.createNodeMesh&&c.createNodeMesh(e)});return l&&a.push(l),r.camera!==void 0&&a.push(s.getDependency("camera",r.camera).then(function(c){return s._getNodeRef(s.cameraCache,r.camera,c)})),s._invokeAll(function(c){return c.createNodeAttachment&&c.createNodeAttachment(e)}).forEach(function(c){a.push(c)}),this.nodeCache[e]=Promise.all(a).then(function(c){let h;if(r.isBone===!0?h=new Df:c.length>1?h=new vt:c.length===1?h=c[0]:h=new Tt,h!==c[0])for(let u=0,d=c.length;u<d;u++)h.add(c[u]);if(r.name&&(h.userData.name=r.name,h.name=o),Xn(h,r),r.extensions&&Ki(n,h,r),r.matrix!==void 0){const u=new Xe;u.fromArray(r.matrix),h.applyMatrix4(u)}else r.translation!==void 0&&h.position.fromArray(r.translation),r.rotation!==void 0&&h.quaternion.fromArray(r.rotation),r.scale!==void 0&&h.scale.fromArray(r.scale);if(!s.associations.has(h))s.associations.set(h,{});else if(r.mesh!==void 0&&s.meshCache.refs[r.mesh]>1){const u=s.associations.get(h);s.associations.set(h,{...u})}return s.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){const t=this.extensions,n=this.json.scenes[e],s=this,r=new vt;n.name&&(r.name=s.createUniqueName(n.name)),Xn(r,n),n.extensions&&Ki(t,r,n);const o=n.nodes||[],a=[];for(let l=0,c=o.length;l<c;l++)a.push(s.getDependency("node",o[l]));return Promise.all(a).then(function(l){for(let h=0,u=l.length;h<u;h++){const d=l[h];d.parent!==null?r.add(QS(d)):r.add(d)}const c=h=>{const u=new Map;for(const[d,f]of s.associations)(d instanceof un||d instanceof Ot)&&u.set(d,f);return h.traverse(d=>{const f=s.associations.get(d);f!=null&&u.set(d,f)}),u};return s.associations=c(r),r})}_createAnimationTracks(e,t,n,s,r){const o=[],a=e.name?e.name:e.uuid,l=[];function c(f){f.morphTargetInfluences&&l.push(f.name?f.name:f.uuid)}Li[r.path]===Li.weights?(c(e),e.isGroup&&e.children.forEach(c)):l.push(a);let h;switch(Li[r.path]){case Li.weights:h=jr;break;case Li.rotation:h=Qr;break;case Li.translation:case Li.scale:h=_a;break;default:n.itemSize===1?h=jr:h=_a;break}const u=s.interpolation!==void 0?wb[s.interpolation]:Gr,d=this._getArrayFromAccessor(n);for(let f=0,g=l.length;f<g;f++){const _=new h(l[f]+"."+Li[r.path],t.array,d,u);s.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(_),o.push(_)}return o}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){const n=Bc(t.constructor),s=new Float32Array(t.length);for(let r=0,o=t.length;r<o;r++)s[r]=t[r]*n;t=s}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){const s=this instanceof Qr?Tb:Mp;return new s(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function Db(i,e,t){const n=e.attributes,s=new Ct;if(n.POSITION!==void 0){const a=t.json.accessors[n.POSITION],l=a.min,c=a.max;if(l!==void 0&&c!==void 0){if(s.set(new A(l[0],l[1],l[2]),new A(c[0],c[1],c[2])),a.normalized){const h=Bc(qs[a.componentType]);s.min.multiplyScalar(h),s.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;const r=e.targets;if(r!==void 0){const a=new A,l=new A;for(let c=0,h=r.length;c<h;c++){const u=r[c];if(u.POSITION!==void 0){const d=t.json.accessors[u.POSITION],f=d.min,g=d.max;if(f!==void 0&&g!==void 0){if(l.setX(Math.max(Math.abs(f[0]),Math.abs(g[0]))),l.setY(Math.max(Math.abs(f[1]),Math.abs(g[1]))),l.setZ(Math.max(Math.abs(f[2]),Math.abs(g[2]))),d.normalized){const _=Bc(qs[d.componentType]);l.multiplyScalar(_)}a.max(l)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}s.expandByVector(a)}i.boundingBox=s;const o=new ri;s.getCenter(o.center),o.radius=s.min.distanceTo(s.max)/2,i.boundingSphere=o}function Xd(i,e,t){const n=e.attributes,s=[];function r(o,a){return t.getDependency("accessor",o).then(function(l){i.setAttribute(a,l)})}for(const o in n){const a=Oc[o]||o.toLowerCase();a in i.attributes||s.push(r(n[o],a))}if(e.indices!==void 0&&!i.index){const o=t.getDependency("accessor",e.indices).then(function(a){i.setIndex(a)});s.push(o)}return et.workingColorSpace!==_n&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${et.workingColorSpace}" not supported.`),Xn(i,e),Db(i,e,t),Promise.all(s).then(function(){return e.targets!==void 0?Ab(i,e.targets,t):i})}const Nb={bayberry:"bayberry/Bayberry.glb",y_high:"y_high/Y_High.glb",cybertruck:"cybertruck/Cybertruck.glb"},Yd="./models/tesla-app/";async function Ub(i,e){const t=Yd+Nb[i],n=await fetch(t,{method:"HEAD"}).catch(()=>{});if(!n?.ok||!/gltf|octet|model/.test(n.headers.get("content-type")??"model"))return;const s=await Eh(t,e);return new eb().parseAsync(s,Yd)}const on=he.white,Ii=he.amber,Nn=he.red,ji=i=>i.z<0?"left":"right",qd=i=>e=>[`${ji(e)}${i}`],en=(...i)=>()=>i,Nl=(i,e)=>(t,n)=>[`${ji(t)}${Math.abs(t.z)>n.midAbs[ji(t)]?i:e}`],Ul={leftFrontWindow:"LFWindowAnimation",rightFrontWindow:"RFWindowAnimation",leftRearWindow:"LRWindowAnimation",rightRearWindow:"RRWindowAnimation"},Fb={bayberry:{lamps:[{node:"Headlights_On",ids:Nl("OuterMainBeam","InnerMainBeam"),color:on,lens:he.lensFront},{node:"DRL",ids:(i,e)=>[Math.abs(i.z)<.5*Math.max(-e.minZ,e.maxZ)?"barCentre":i.z<0?"barLeftEnd":"barRightEnd"],color:on,lens:he.lensFront},{node:"Left_Turn_Signal_On",ids:i=>[i.x>1.9?"leftFrontTurn":"leftSideRepeater"],color:Ii,lens:he.lensAmber},{node:"Right_Turn_Signal_On",ids:i=>[i.x>1.9?"rightFrontTurn":"rightSideRepeater"],color:Ii,lens:he.lensAmber},{node:"Back_Left_Turn_Signal_On",ids:en("leftRearTurn"),color:Ii,lens:he.lensAmber},{node:"Back_Right_Turn_Signal_On",ids:en("rightRearTurn"),color:Ii,lens:he.lensAmber},{node:"Brake_Lights_On",ids:i=>i.y>1.3?["brakeLights"]:[`${ji(i)}Tail`],color:Nn,lens:he.lensRear,gain:3},{node:"Parking_Lights_On",ids:en("brakeLights"),color:Nn,lens:he.lensRear,gain:8,proud:.015},{node:"Reverse Light On",ids:en("reverseLights"),color:on,lens:he.lensFront},{node:"Fog_Light_On",ids:en("rearFog"),color:Nn,lens:he.lensRear}],bars:[],closures:{liftgate:"TrunkAnimation",chargePort:"ChargeportAnimation",...Ul},portLed:"Charge_Port_Cover",foldMirrors:{nodes:/^(Skullcap_[LR]F_Paint|Front_(Left|Right)_Door)/,x:[.56,.88],y:[.98,1.25],absZ:.945,deg:62},beamFrom:"Headlights_On"},y_high:{lamps:[{node:"Headlights",ids:(i,e)=>i.x>1.5?Nl("OuterMainBeam","InnerMainBeam")(i,e):void 0,color:on,lens:he.lensFront},{node:"DRL",ids:i=>["Signature","Channel4","Channel5","Channel6"].map(e=>`${ji(i)}${e}`),color:on,lens:he.lensFront},{node:"Fog_Lights_Front",ids:qd("FrontFog"),color:on,lens:he.lensFront},{node:"Left_Turn_Signal",ids:i=>i.x>1.5?["leftFrontTurn","leftSideMarker"]:[i.x<-1.5?"leftRearTurn":"leftSideRepeater"],color:Ii,lens:he.lensAmber},{node:"Right_Turn_Signal",ids:i=>i.x>1.5?["rightFrontTurn","rightSideMarker"]:[i.x<-1.5?"rightRearTurn":"rightSideRepeater"],color:Ii,lens:he.lensAmber},{node:"Brake_Lights_Left",ids:en("leftTail","brakeLights","leftRearTurn"),color:Nn,lens:he.lensRear,gain:3},{node:"Brake_Lights_Right",ids:en("rightTail","brakeLights","rightRearTurn"),color:Nn,lens:he.lensRear,gain:3},{node:"Brake_Lights_Center",ids:en("brakeLights"),color:Nn,lens:he.lensRear},{node:"Reverse_Lights",ids:en("reverseLights"),color:on,lens:he.lensFront}],bars:[],closures:{liftgate:"TrunkAnimation",chargePort:"ChargeportAnimation",leftMirror:"LFDoorMirrorAnimation",rightMirror:"RFDoorMirrorAnimation",...Ul},portLed:"Charge_Cap",beamFrom:"Headlights"},cybertruck:{lamps:[{node:"Headlights2",ids:Nl("OuterMainBeam","InnerMainBeam"),color:on,lens:he.lensFront},{node:"Left_Turn_Signal_Front2",ids:en("leftFrontTurn","leftSideMarker"),color:Ii,lens:he.lensAmber},{node:"Right_Turn_Signal_Front2",ids:en("rightFrontTurn","rightSideMarker"),color:Ii,lens:he.lensAmber},{node:"Park_Lights2",ids:i=>i.x<0?[`${ji(i)}SideRepeater`]:void 0,color:Nn,lens:he.lensRear},{node:"Brake_Lights_Trunk2",ids:en("brakeLights"),color:Nn,lens:he.lensRear,gain:4},{node:"Brake_Lights_Left2",ids:en("brakeLights"),color:Nn,lens:he.lensRear,gain:4},{node:"Brake_Lights_Right2",ids:en("brakeLights"),color:Nn,lens:he.lensRear,gain:4},{node:"Reverse_Lights2",ids:qd("Tail"),color:on,lens:he.lensFront},{node:"Bed_Light2",ids:en("reverseLights"),color:on,lens:he.lensFront,gain:2}],bars:[{node:"DRL2",base:"frontLightBar",count:60,color:on},{node:"Headlights_Trunk2",base:"rearLightBar",count:52,color:Nn}],closures:{liftgate:"HoodAnimation",leftMirror:"LFDoorMirrorAnimation",rightMirror:"RFDoorMirrorAnimation",...Ul},portLed:"Chargeport_Light2",portDoor:"Charge_Cap_Spatial",beamFrom:"Headlights2"}},Ob=/Projection|Beam|Ground|Floor|Shadow|Marker|Defrost|Badge|_GLOBAL|Door_LED|Headlights_Side/i;function Bb(i,e,t){const n=Fb[t],s=e.scene.clone(!0),r=new vt;r.rotation.y=-Math.PI/2,r.add(s),i.car.add(r),s.traverse(p=>{if((p.userData.visible===!1||Ob.test(p.name))&&(p.visible=!1),p instanceof Re){p.frustumCulled=!1;for(const m of[p.material].flat())kb(m),m.name==="Paint"&&m instanceof _t&&m.color.copy(i.m.paint.color)}}),i.car.updateMatrixWorld(!0);const o=new Xe().copy(i.car.matrixWorld).invert(),a=p=>{const m=lt.sanitizeNodeName(p),M=new RegExp(`^${Hb(m)}(_\\d+)?$`),T=[];return s.traverse(x=>{x instanceof Re&&(M.test(x.name)||x.parent?.name===m)&&T.push(x)}),T};for(const p of n.lamps)for(const m of a(p.node)){const M=$d(m,o),T=Zd(M),x=new Map;for(const S of M){const w=p.ids(S.c,T);if(!w)continue;const E=w.join("+");let y=x.get(E);y||x.set(E,y=[]),y.push(...S.p)}for(const[S,w]of x){const E=Jd(m,w,i.car,jd(p.lens),p.proud);i.lightMesh(E,S.split("+"),p.color,p.gain??5)}m.visible=!1}for(const p of n.bars)for(const m of a(p.node)){const M=$d(m,o),{minZ:T,maxZ:x}=Zd(M),S=Jd(m,M.flatMap(E=>E.p),i.car,jd(he.lensFront)),w=Array.from({length:p.count},(E,y)=>[`${p.base}${y+1}`]);i.lightBar(S,w,T,x,p.color),m.visible=!1}const l=new Q0(s);for(const[p,m]of Object.entries(n.closures)){const M=e.animations.find(x=>x.name===m);if(!M)continue;const T=l.clipAction(M);T.play(),T.paused=!0,i.closure(p,x=>{T.time=Jt.clamp(x,0,1)*M.duration,l.update(0)})}if(n.foldMirrors&&zb(i,s,o,n.foldMirrors),n.portDoor){const p=s.getObjectByName(n.portDoor);if(p){const m=p.rotation.y;i.closure("chargePort",M=>p.rotation.y=m-M*Jt.degToRad(100))}}const c=n.portLed?a(n.portLed)[0]:void 0;if(c){const m=new Ct().setFromObject(c).applyMatrix4(o).getCenter(new A);m.z+=Math.sign(m.z||-1)*.02;const M=i.glow(i.car,m,.12);i.closure("chargePort",(T,x,S)=>{x?M.color.setHSL(S*.6%1,1,.55):M.color.set("#3cff6a"),M.level=T>.05?1.2:0})}const h=new Ct;s.traverse(p=>{p instanceof Re&&p.visible&&h.union(new Ct().setFromObject(p).applyMatrix4(o))});const u=a(n.beamFrom).map(p=>new Ct().setFromObject(p).applyMatrix4(o));if(u.length){const p=u.reduce((m,M)=>m.union(M));Pa(i,{x:p.max.x+.15,y:(p.min.y+p.max.y)/2,z:p.max.z*.8})}const d=new rr("#ff2020",0,6,1.6);d.position.set(h.min.x-.35,.7,0),i.car.add(d),i.beam(["brakeLights","leftTail","rightTail"],d,5);const f=new ss("#ffffff",0,10,.9,.8,1.5);f.position.set(h.min.x-.1,.9,0),f.target.position.set(h.min.x-4.5,0,0),i.car.add(f,f.target),i.beam(["reverseLights"],f,30);const g=[...a("Plate_US"),...a("Plate_US2")].filter(p=>p.material instanceof _t);for(const p of g)p.material=p.material.clone(),i.lightMesh(p,["licensePlate"],on,.6);const _=g.length?void 0:s.getObjectByName("Plate_Marker");if(_){const p=_.getWorldPosition(new A).applyMatrix4(o);p.x<0&&i.light(i.car,["licensePlate"],on,new de("#9a9a9a"),[.01,.13,.3],[p.x-.012,p.y,p.z],.6)}return t==="cybertruck"&&i.light(i.car,["leftAuxPark"],on,he.lensFront,[.4,.01,.08],[h.max.x-.55,.95,0],3),i.cabinLight.position.set(h.max.x*.25,h.max.y*.6,0),i.car.add(i.cabinLight),{halfLength:Math.max(-h.min.x,h.max.x),height:h.max.y,halfWidth:Math.max(-h.min.z,h.max.z),cabinGain:1.5}}function zb(i,e,t,n){const s=[];e.traverse(r=>{r instanceof Re&&r.visible&&(n.nodes.test(r.name)||n.nodes.test(r.parent?.name??""))&&s.push(r)});for(const r of["left","right"]){const o=r==="left"?-1:1,a=[];let l=new A,c=0,h=1/0;for(const f of s){const g=new Xe().multiplyMatrices(t,f.matrixWorld),_=f.geometry.index?f.geometry.toNonIndexed():f.geometry,p=_.getAttribute("position"),m=[],M=new A;for(let T=0;T+2<p.count;T+=3){const x=new A;for(let w=0;w<3;w++)x.add(M.fromBufferAttribute(p,T+w).applyMatrix4(g));x.divideScalar(3);const S=x.z*o>n.absZ&&x.x>=n.x[0]&&x.x<=n.x[1]&&x.y>=n.y[0]&&x.y<=n.y[1];m.push(S),S&&(h=Math.min(h,Math.abs(x.z)),Math.abs(x.z)<n.absZ+.03&&(l.add(x),c++))}m.some(Boolean)&&(a.push({geometry:Kd(_,g,m,!0),material:f.material}),f.geometry=Kd(_,new Xe,m,!1))}if(!a.length)continue;l=c?l.divideScalar(c):new A((n.x[0]+n.x[1])/2,(n.y[0]+n.y[1])/2,o*h),l.z=o*h;const u=new vt;u.position.copy(l),i.car.add(u);for(const f of a){f.geometry.translate(-l.x,-l.y,-l.z);const g=new Re(f.geometry,f.material);g.frustumCulled=!1,u.add(g)}const d=Jt.degToRad(n.deg);i.closure(`${r}Mirror`,f=>u.rotation.y=(r==="right"?-1:1)*(1-Jt.clamp(f,0,1))*d,u)}}function Kd(i,e,t,n){const s=new yt,r=new Ke().getNormalMatrix(e),o=new A;for(const[a,l]of Object.entries(i.attributes)){const c=l,h=[];for(let u=0;u<t.length;u++)if(t[u]===n)for(let d=0;d<3;d++){const f=u*3+d;if(a==="position")h.push(...o.fromBufferAttribute(c,f).applyMatrix4(e).toArray());else if(a==="normal")h.push(...o.fromBufferAttribute(c,f).applyMatrix3(r).normalize().toArray());else for(let g=0;g<c.itemSize;g++)h.push(c.getComponent(f,g))}s.setAttribute(a,new ot(h,c.itemSize,c.normalized))}return s}function $d(i,e){const t=new Xe().multiplyMatrices(e,i.matrixWorld),s=(i.geometry.index?i.geometry.toNonIndexed():i.geometry).getAttribute("position"),r=[],o=new A;for(let a=0;a+2<s.count;a+=3){const l=[],c=new A;for(let h=0;h<3;h++)o.fromBufferAttribute(s,a+h).applyMatrix4(t),l.push(o.x,o.y,o.z),c.add(o);r.push({c:c.divideScalar(3),p:l})}return r}function Zd(i){let e=1/0,t=-1/0;const n={left:[],right:[]};for(const r of i)e=Math.min(e,r.c.z),t=Math.max(t,r.c.z),n[ji(r.c)].push(Math.abs(r.c.z));const s=r=>r.length?r.sort((o,a)=>o-a)[Math.floor(r.length/2)]:0;return{minZ:e,maxZ:t,midAbs:{left:s(n.left),right:s(n.right)}}}function Jd(i,e,t,n,s=0){const r=new yt;if(r.setAttribute("position",new ot(e,3)),r.computeVertexNormals(),s){const l=r.getAttribute("position"),c=r.getAttribute("normal"),h=new A,u=new A;for(let d=0;d<l.count;d++)h.fromBufferAttribute(l,d),u.fromBufferAttribute(c,d),u.dot(h.clone().setY(0))<0&&u.negate(),l.setXYZ(d,h.x+u.x*s,h.y+u.y*s,h.z+u.z*s)}const o=new Re(r,n);let a=i.parent??t;for(;!a.visible&&a.parent;)a=a.parent;return o.matrixAutoUpdate=!1,o.matrix.copy(a.matrixWorld).invert().multiply(t.matrixWorld),o.frustumCulled=!1,a.add(o),o.updateMatrixWorld(!0),o}function kb(i){!(i instanceof _t)||i.userData.lot||(i.userData.lot=!0,i.metalness>.4&&(i.metalness=.35,i.roughness=Math.max(i.roughness,.35),!i.map&&i.color.getHSL({h:0,s:0,l:0}).l<.35&&i.color.set("#b9bcc0")),i instanceof $t&&i.clearcoat>0&&(i.clearcoat=Math.min(i.clearcoat,.3),i.clearcoatRoughness=Math.max(i.clearcoatRoughness,.5)),i.roughness=Math.max(i.roughness,i.transparent?.45:.5))}function jd(i){return new _t({color:i,roughness:.25,metalness:.1,side:pn,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2})}function Hb(i){return i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}const Vb=i=>[`${i}Red`,`${i}Green`,`${i}Blue`],Gb=.4,Wb=.7;class Xb{constructor(e,t,n,s,r,o){this.kind=e,this.name=t,this.yBody=n,this.app=o,this.group=new vt,this.glowEntries=[],this.bounds={halfLength:2.4,height:1.6,halfWidth:1},this.car=new vt,this.lights=[],this.bars=[],this.closures=[],this.pools=[],this.freeGlows=[],this.cabin=[],this.cabinLight=new rr("#fff",0,4,1.5),this.frame=0,this.profile=e==="cybertruck"?Fc:n==="mesh"?up:Uc,this.m=Yb(r,e),this.cabinLight.visible=!1,this.group.add(this.car),this.build(s)}build(e){const t=this.car,n={car:t,m:this.m,cabinLight:this.cabinLight,light:(s,r,o,a,l,c,h=5)=>{const u=new _t({color:a,roughness:.2,metalness:.1}),d=new Re(new Et(...l),u);return d.position.set(...c),s.add(d),this.lights.push({ids:r,material:u,color:o,gain:h,mesh:d,glows:[]}),d},lightMesh:(s,r,o,a=5)=>{this.lights.push({ids:r,material:s.material,color:o,gain:a,mesh:s,glows:[]})},lightBar:(s,r,o,a,l,c=3)=>{const h=new Float32Array(r.length);$b(s.material,h,o,a,l,c),this.bars.push({pixels:r,levels:h,mesh:s,color:l,glows:[]}),s.userData.ledRange=[o,a]},closure:(s,r)=>this.closures.push({id:s,apply:r}),beam:(s,r,o)=>this.addPool(s,r,o),glow:(s,r,o)=>{const a={color:new de("#fff"),level:0},l={object:s,local:r.clone(),size:o,color:new de(0,0,0)};return this.freeGlows.push({handle:a,entry:l}),this.glowEntries.push(l),a}};if(this.app)this.bounds=Bb(n,this.app.gltf,this.app.id);else if(this.kind==="cybertruck"){const s=Fc.body;this.bounds=e?Fd(n,e,s):Nd(n,s)}else this.yBody==="mesh"&&e?this.bounds=Fd(n,e,{model:"modelY"},XS):this.bounds=Nd(n,Uc.body);this.cabinLight.visible=!1,t.updateMatrixWorld(!0),this.placeGlows(),this.placeCabin(),this.apply()}addPool(e,t,n){t.visible=!1,t.intensity=0;const s=t.position.clone(),r=t.color.clone();let o,a,l,c=0,h;if(t instanceof ss){t.target.visible=!1;const g=t.target.position.clone().clone().sub(s).setY(0),_=g.length()||1;g.divideScalar(_),c=Math.atan2(-g.z,g.x),t.distance>20?(a=6.5,l=3.2,h=.3):t.distance>11?(a=4,l=3.4,h=.2):(a=3.5,l=2.8,h=.25),o=s.clone().setY(0).addScaledVector(g,a*.5+.1)}else a=2.6,l=3,h=.3,o=s.clone().setY(0);const u=new gn({map:Kb(),color:r,transparent:!0,opacity:0,blending:Qi,depthWrite:!1}),d=new Re(new Si(1,1),u);d.rotation.set(-Math.PI/2,0,c),d.scale.set(a,l,1),d.position.set(o.x,.015,o.z),d.renderOrder=2,d.visible=!1,this.car.add(d),this.pools.push({ids:e,mesh:d,material:u,max:h*Math.min(1,n/40+.5)})}placeGlows(){for(const e of this.lights){const t=e.mesh.matrixWorld.getMaxScaleOnAxis()||1;for(const n of qb(e.mesh.geometry,.14/t,10)){const s=Jt.clamp(Math.sqrt(n.area)*t*2.4,.14,.5),r=n.center.clone();n.normal&&r.addScaledVector(n.normal,.03/t);const o={object:e.mesh,local:r,normal:n.normal,size:s,color:new de(0,0,0)};e.glows.push({entry:o,gain:Gb*Math.min(1.4,Math.sqrt(e.gain/4))}),this.glowEntries.push(o)}}for(const e of this.bars){const[t,n]=e.mesh.userData.ledRange,s=e.mesh.matrixWorld.getMaxScaleOnAxis()||1,r=e.pixels.length,o=Array.from({length:r},()=>({p:new A,nrm:new A,w:0}));Sp(e.mesh.geometry,(l,c,h)=>{const u=Jt.clamp((l.z-t)/(n-t),0,.99999),d=o[Math.floor(u*r)];d.p.addScaledVector(l,h),d.nrm.addScaledVector(c,h),d.w+=h});const a=Math.abs(n-t)/r*s;e.glows=o.map(l=>{if(l.w<=0)return;const c=l.p.divideScalar(l.w),h=l.nrm.lengthSq()>1e-12?l.nrm.normalize():void 0;h&&c.addScaledVector(h,.02/s);const u={object:e.mesh,local:c,normal:h,size:Jt.clamp(a*2.6,.06,.16),color:new de(0,0,0)};return this.glowEntries.push(u),u})}}placeCabin(){const e=new Ct;this.car.traverse(h=>{h instanceof Re&&(h.material===this.m.glass||h.material===this.m.sideGlass)&&e.expandByObject(h)}),e.isEmpty()&&e.set(new A(-1,.9,-.7),new A(.8,1.4,.7));const t=new Xe().copy(this.car.matrixWorld).invert();e.applyMatrix4(t);const n=e.getSize(new A),s=this.kind==="cybertruck",r=e.min.x+n.x*(s?.3:.2),o=e.max.x-n.x*(s?.22:.25),a=e.min.y+n.y*.3,l=Math.min(.62,n.z*.33),c=[[["centerFrontDisplay","centerFrontAccent"],o,a,0],[["leftFrontAccent"],o-.25,a,-l],[["rightFrontAccent"],o-.25,a,l],[["leftRearAccent"],r+.2,a,-l],[["rightRearAccent"],r+.2,a,l]];for(const[h,u,d,f]of c){const g={object:this.car,local:new A(u,d,f),size:.9,color:new de(0,0,0)};this.cabin.push({ids:h.map(Vb),entry:g}),this.glowEntries.push(g)}}setSimulation(e){this.sim=e,this.apply()}setFrame(e,t){const n=(this.sim?.frameCount??1)-1;this.frame=Math.max(0,Math.min(n,e)),this.apply(t)}level(e){return this.sim?.levels.get(e)?.[this.frame]??0}maxLevel(e){let t=0;for(const n of e){const s=this.level(n);s>t&&(t=s)}return t}apply(e=0){for(const l of this.lights){const c=this.maxLevel(l.ids);l.material.emissive.copy(l.color),l.material.emissiveIntensity=c*l.gain;for(const h of l.glows)h.entry.color.copy(l.color).multiplyScalar(c*h.gain)}for(const l of this.bars)l.pixels.forEach((c,h)=>{const u=this.maxLevel(c);l.levels[h]=u,l.glows[h]?.color.copy(l.color).multiplyScalar(u*Wb)});for(const l of this.pools){const c=this.maxLevel(l.ids);l.material.opacity=c*l.max,l.mesh.visible=c>.005}for(const l of this.closures){const c=this.sim?.closures.get(l.id);l.apply(c?.position[this.frame]??(l.id.endsWith("Mirror")?1:0),!!c?.dancing[this.frame],e)}for(const{handle:l,entry:c}of this.freeGlows)c.color.copy(l.color).multiplyScalar(l.level);let t=0,n=0,s=0;for(const l of this.cabin){let c=0,h=0,u=0;for(const[d,f,g]of l.ids)c=Math.max(c,this.level(d)),h=Math.max(h,this.level(f)),u=Math.max(u,this.level(g));l.entry.color.setRGB(c,h,u).multiplyScalar(.32),t=Math.max(t,c),n=Math.max(n,h),s=Math.max(s,u)}const r=this.level("centerFrontDisplayRed"),o=this.level("centerFrontDisplayGreen"),a=this.level("centerFrontDisplayBlue");this.m.display.emissive.setRGB(r,o,a),this.m.display.emissiveIntensity=2.5,this.m.glass.emissive.setRGB(t,n,s),this.m.glass.emissiveIntensity=.015,this.m.sideGlass.emissive.setRGB(t,n,s),this.m.sideGlass.emissiveIntensity=.025}dispose(){this.group.removeFromParent(),this.group.traverse(e=>{if(e instanceof Re){e.geometry.dispose();for(const t of[e.material].flat())t.dispose()}})}}function Yb(i,e){const t=e==="cybertruck"?{color:i,metalness:.3,roughness:.55,clearcoat:0}:{color:i,metalness:.15,roughness:.6,clearcoat:0};return{paint:new $t(t),meshPaint:Zb(new $t(t)),glass:new $t({color:"#06080b",metalness:0,roughness:.5}),sideGlass:new $t({color:"#06080b",transparent:!0,opacity:.9,metalness:0,roughness:.5}),smallPaint:new _t({color:"#d9dadc",roughness:.55}),trim:new _t({color:"#0a0b0d",metalness:.05,roughness:.7}),cabin:new _t({color:"#1b1c20",roughness:.9}),display:new _t({color:"#000",emissive:"#000"})}}const Xo=new A,Yo=new A,qo=new A,gi=new A,Qd=new A;function Sp(i,e){const t=i.attributes.position,n=i.attributes.normal,s=i.index,r=s?s.count:t.count,o=a=>s?s.getX(a):a;for(let a=0;a+2<r;a+=3){const l=o(a),c=o(a+1),h=o(a+2);Xo.fromBufferAttribute(t,l),Yo.fromBufferAttribute(t,c),qo.fromBufferAttribute(t,h),Qd.copy(Xo).add(Yo).add(qo).divideScalar(3),Yo.sub(Xo),qo.sub(Xo);const u=Yo.cross(qo),d=u.length()/2;d>0&&(n?(gi.fromBufferAttribute(n,l),gi.x+=n.getX(c)+n.getX(h),gi.y+=n.getY(c)+n.getY(h),gi.z+=n.getZ(c)+n.getZ(h),gi.lengthSq()<1e-12&&gi.copy(u),gi.normalize()):gi.copy(u).normalize(),e(Qd,gi,d))}}function qb(i,e,t){for(let n=0;n<6;n++){const s=new Map;if(Sp(i,(r,o,a)=>{const l=`${Math.floor(r.x/e)},${Math.floor(r.y/e)},${Math.floor(r.z/e)}`;let c=s.get(l);c||s.set(l,c={p:new A,n:new A,w:0}),c.p.addScaledVector(r,a),c.n.addScaledVector(o,a),c.w+=a}),s.size<=t||n===5){const r=[...s.values()],o=Math.max(...r.map(a=>a.w));return r.filter(a=>a.w>=o*.04).map(a=>{const l=a.n.length()>a.w*.35?a.n.clone().normalize():void 0;return{center:a.p.divideScalar(a.w),normal:l,area:a.w}})}e*=1.6}return[]}let Tr;function Kb(){if(Tr)return Tr;const i=document.createElement("canvas");i.width=128,i.height=64;const e=i.getContext("2d"),t=e.createImageData(128,64);for(let n=0;n<64;n++)for(let s=0;s<128;s++){const r=(s+.5)/128,o=(n+.5)/64,a=r<.33?(r-.33)/.33:(r-.33)/.67,l=(o-.5)/.5,c=Math.sqrt(a*a+l*l),h=Math.max(0,1-c)**1.8,u=(n*128+s)*4;t.data[u]=t.data[u+1]=t.data[u+2]=255,t.data[u+3]=Math.round(h*255)}return e.putImageData(t,0,0),Tr=new no(i),Tr.colorSpace=wt,Tr}function $b(i,e,t,n,s,r){i.emissive.copy(s),i.emissiveIntensity=r,i.customProgramCacheKey=()=>`led:${e.length}`,i.onBeforeCompile=o=>{o.uniforms.ledLevels={value:e},o.uniforms.ledRange={value:new ne(t,n)},o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
varying float vLedZ;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vLedZ = position.z;`),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
varying float vLedZ;
uniform float ledLevels[${e.length}];
uniform vec2 ledRange;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        float ledT = clamp( ( vLedZ - ledRange.x ) / ( ledRange.y - ledRange.x ), 0.0, 0.99999 ) * ${e.length}.0;
        float ledF = fract( ledT );
        float ledSeam = smoothstep( 0.0, 0.16, ledF ) * smoothstep( 1.0, 0.84, ledF );
        totalEmissiveRadiance *= ledLevels[ int( ledT ) ] * mix( 0.12, 1.0, ledSeam );`)},i.needsUpdate=!0}function Zb(i){return i.userData.paintScale=1,i.onBeforeCompile=e=>{e.uniforms.paintScale={get value(){return i.userData.paintScale}},e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
uniform float paintScale;`).replace("#include <map_fragment>",`#ifdef USE_MAP
          vec4 bake = texture2D( map, vMapUv );
          float paintMask = clamp( ( bake.r - max( bake.g, bake.b ) ) / max( bake.r, 1e-3 ) * 1.6, 0.0, 1.0 );
          float shade = clamp( bake.r * paintScale, 0.0, 1.0 );
          diffuseColor.rgb = mix( bake.rgb, diffuseColor.rgb * shade, paintMask );
        #endif`)},i}const Di=["#ff2bd6","#2bd7ff","#7cff2b","#ff8a1f","#b14dff"].map(i=>new de(i));function Fl(i){const e=document.createElement("canvas");e.width=e.height=128;const t=e.getContext("2d");let n=i;const s=()=>(n=(n*9301+49297)%233280)/233280;for(let o=0;o<7;o++){const a=64+(s()-.5)*60,l=64+(s()-.5)*60,c=26+s()*30,h=t.createRadialGradient(a,l,0,a,l,c);h.addColorStop(0,"rgba(255,255,255,0.55)"),h.addColorStop(.5,"rgba(255,255,255,0.18)"),h.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=h,t.fillRect(0,0,128,128)}const r=new no(e);return r.colorSpace=wt,r}function Jb(){const i=document.createElement("canvas");i.width=i.height=64;const e=i.getContext("2d"),t=e.createRadialGradient(32,32,0,32,32,32);t.addColorStop(0,"rgba(255,255,255,1)"),t.addColorStop(.3,"rgba(255,255,255,0.4)"),t.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=t,e.fillRect(0,0,64,64);const n=new no(i);return n.colorSpace=wt,n}class jb{constructor(e=260){this.group=new vt,this.puffs=[],this.lamps=[],this.lampColor=new de,this.t=0,this.W=.62,this.D=.42,this.H=.4,this.textures=[Fl(1),Fl(2),Fl(3)],this.buildCooler();for(let n=0;n<e;n++){const s=this.spawn(Math.random()*6);this.puffs.push(s),this.group.add(s.sprite)}const t=Jb();for(let n=0;n<3;n++){const s=new wc(new fa({map:t,transparent:!0,depthWrite:!1,blending:Qi,opacity:.9}));s.position.set(0,this.H*.45,(n-1)*.18),s.scale.setScalar(.5),this.lamps.push(s),this.group.add(s)}this.update(0)}buildCooler(){const e=new _t({color:"#b9bcc0",metalness:.85,roughness:.32}),t=new _t({color:"#0d0e12",roughness:.9}),{W:n,D:s,H:r}=this,o=new Re(new Et(s,r,n),e);o.position.y=r/2;const a=new Re(new Et(s-.06,r-.03,n-.06),t);a.position.y=r/2+.02;const l=new vt;l.position.set(-s/2,r,0);const c=new Re(new Et(s,.05,n+.02),e);c.position.set(s/2,.025,0),l.add(c),l.rotation.z=Jt.degToRad(105);const h=new Re(new Et(s-.08,.02,n-.08),t);h.position.y=.01,this.group.add(o,a,l,h)}spawn(e=0){const{W:t,D:n,H:s}=this,r=new wc(new fa({map:this.textures[Math.floor(Math.random()*this.textures.length)],transparent:!0,depthWrite:!1,opacity:0,color:16777215})),o=(Math.random()-.5)*Math.PI*1.4,a=Math.cos(o),l=Math.sin(o),c={sprite:r,x:(Math.random()-.5)*n*.6,y:s*.55+Math.random()*.2,z:(Math.random()-.5)*t*.6,dirX:a,dirZ:l,speed:.18+Math.random()*.22,age:e,life:4.5+Math.random()*3.5,size:.22+Math.random()*.18,alpha:.16+Math.random()*.14,phase:Math.random()*Math.PI*2};return r.position.set(c.x,c.y,c.z),c}update(e){this.t+=e;const{W:t,D:n,H:s}=this,r=this.t*.25%Di.length,o=Math.floor(r);this.lampColor.copy(Di[o]).lerp(Di[(o+1)%Di.length],r-o),this.lamps.forEach((l,c)=>{l.material.color.copy(Di[(o+c*2)%Di.length]).lerp(Di[(o+c*2+1)%Di.length],r-o).multiplyScalar(.8+.2*Math.sin(this.t*2+c)),l.scale.setScalar(.7+.1*Math.sin(this.t*3+c*2))});const a=new de;for(const l of this.puffs){if(l.age+=e,l.age>=l.life){const p=this.spawn();this.group.remove(l.sprite),l.sprite.material.dispose(),Object.assign(l,p),this.group.add(l.sprite)}const c=l.age/l.life,h=s+.05,u=Math.abs(l.x)>n/2-.05||Math.abs(l.z)>t/2-.05;if(!u)l.y+=.12*e,l.y>=h?(l.x+=l.dirX*l.speed*e*1.6,l.z+=l.dirZ*l.speed*e*1.6):(l.x+=l.dirX*l.speed*e*.4,l.z+=l.dirZ*l.speed*e*.4);else{const p=.06+.05*Math.sin(l.phase+this.t*.8);l.y+=(p-l.y)*Math.min(1,1.6*e);const m=l.speed*(.9+.5*c);l.x+=(l.dirX*m+.04*Math.sin(this.t*.9+l.phase))*e,l.z+=(l.dirZ*m+.04*Math.cos(this.t*.7+l.phase))*e}const d=1+3.2*c,f=l.alpha*Math.sin(Math.PI*Math.min(1,c*1.15))*(u?1:.8),g=Math.hypot(l.x,l.z),_=Math.exp(-g/1)*.95;a.setRGB(.86,.88,.92).lerp(this.lampColor,_),l.sprite.position.set(l.x,l.y,l.z),l.sprite.scale.setScalar(l.size*d),l.sprite.material.opacity=f,l.sprite.material.color.copy(a),l.sprite.material.rotation=l.phase+this.t*.1}}}const ef={type:"change"},Dh={type:"start"},bp={type:"end"},Ko=new to,tf=new Yn,Qb=Math.cos(70*Jt.DEG2RAD),Nt=new A,rn=2*Math.PI,mt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Ol=1e-6;class eT extends e_{constructor(e,t=null){super(e,t),this.state=mt.NONE,this.target=new A,this.cursor=new A,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Gs.ROTATE,MIDDLE:Gs.DOLLY,RIGHT:Gs.PAN},this.touches={ONE:Fs.ROTATE,TWO:Fs.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new A,this._lastQuaternion=new hn,this._lastTargetPosition=new A,this._quat=new hn().setFromUnitVectors(e.up,new A(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new sd,this._sphericalDelta=new sd,this._scale=1,this._panOffset=new A,this._rotateStart=new ne,this._rotateEnd=new ne,this._rotateDelta=new ne,this._panStart=new ne,this._panEnd=new ne,this._panDelta=new ne,this._dollyStart=new ne,this._dollyEnd=new ne,this._dollyDelta=new ne,this._dollyDirection=new A,this._mouse=new ne,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=nT.bind(this),this._onPointerDown=tT.bind(this),this._onPointerUp=iT.bind(this),this._onContextMenu=hT.bind(this),this._onMouseWheel=oT.bind(this),this._onKeyDown=aT.bind(this),this._onTouchStart=lT.bind(this),this._onTouchMove=cT.bind(this),this._onMouseDown=sT.bind(this),this._onMouseMove=rT.bind(this),this._interceptControlDown=uT.bind(this),this._interceptControlUp=dT.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=mt.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents();const e=this.domElement.getRootNode();e.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),e.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(ef),this.update(),this.state=mt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;Nt.copy(t).sub(this.target),Nt.applyQuaternion(this._quat),this._spherical.setFromVector3(Nt),this.autoRotate&&this.state===mt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=rn:n>Math.PI&&(n-=rn),s<-Math.PI?s+=rn:s>Math.PI&&(s-=rn),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(Nt.setFromSpherical(this._spherical),Nt.applyQuaternion(this._quatInverse),t.copy(this.target).add(Nt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){const a=Nt.length();o=this._clampDistance(a*this._scale);const l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){const a=new A(this._mouse.x,this._mouse.y,0);a.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;const c=new A(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=Nt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(Ko.origin.copy(this.object.position),Ko.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Ko.direction))<Qb?this.object.lookAt(this.target):(tf.setFromNormalAndCoplanarPoint(this.object.up,this.target),Ko.intersectPlane(tf,this.target))))}else if(this.object.isOrthographicCamera){const o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Ol||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Ol||this._lastTargetPosition.distanceToSquared(this.target)>Ol?(this.dispatchEvent(ef),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?rn/60*this.autoRotateSpeed*e:rn/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Nt.setFromMatrixColumn(t,0),Nt.multiplyScalar(-e),this._panOffset.add(Nt)}_panUp(e,t){this.screenSpacePanning===!0?Nt.setFromMatrixColumn(t,1):(Nt.setFromMatrixColumn(t,0),Nt.crossVectors(this.object.up,Nt)),Nt.multiplyScalar(e),this._panOffset.add(Nt)}_pan(e,t){const n=this.domElement;if(this.object.isPerspectiveCamera){const s=this.object.position;Nt.copy(s).sub(this.target);let r=Nt.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/n.clientHeight,this.object.matrix),this._panUp(2*t*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const n=this.domElement.getBoundingClientRect(),s=e-n.left,r=t-n.top,o=n.width,a=n.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(rn*this._rotateDelta.x/t.clientHeight),this._rotateUp(rn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(rn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-rn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(rn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-rn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panStart.set(n,s)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const n=this._getSecondPointerPosition(e),s=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(rn*this._rotateDelta.x/t.clientHeight),this._rotateUp(rn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const o=(e.pageX+t.x)*.5,a=(e.pageY+t.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new ne,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}}function tT(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function nT(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function iT(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(bp),this.state=mt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function sT(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Gs.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=mt.DOLLY;break;case Gs.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=mt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=mt.ROTATE}break;case Gs.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=mt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=mt.PAN}break;default:this.state=mt.NONE}this.state!==mt.NONE&&this.dispatchEvent(Dh)}function rT(i){switch(this.state){case mt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case mt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case mt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function oT(i){this.enabled===!1||this.enableZoom===!1||this.state!==mt.NONE||(i.preventDefault(),this.dispatchEvent(Dh),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(bp))}function aT(i){this.enabled!==!1&&this._handleKeyDown(i)}function lT(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Fs.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=mt.TOUCH_ROTATE;break;case Fs.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=mt.TOUCH_PAN;break;default:this.state=mt.NONE}break;case 2:switch(this.touches.TWO){case Fs.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=mt.TOUCH_DOLLY_PAN;break;case Fs.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=mt.TOUCH_DOLLY_ROTATE;break;default:this.state=mt.NONE}break;default:this.state=mt.NONE}this.state!==mt.NONE&&this.dispatchEvent(Dh)}function cT(i){switch(this._trackPointer(i),this.state){case mt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case mt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case mt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case mt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=mt.NONE}}function hT(i){this.enabled!==!1&&i.preventDefault()}function uT(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function dT(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const ra={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class cr{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const fT=new io(-1,1,1,-1,0,1);class pT extends yt{constructor(){super(),this.setAttribute("position",new ot([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ot([0,2,0,0,2,0],2))}}const mT=new pT;class Nh{constructor(e){this._mesh=new Re(mT,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,fT)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class gT extends cr{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Ht?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Qs.clone(e.uniforms),this.material=new Ht({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new Nh(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class nf extends cr{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){const s=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}}class _T extends cr{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class xT{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const n=e.getSize(new ne);this._width=n.width,this._height=n.height,t=new Wt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Zt}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new gT(ra),this.copyPass.material.blending=ei,this.timer=new z0}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());const t=this.renderer.getRenderTarget();let n=!1;for(let s=0,r=this.passes.length;s<r;s++){const o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),o.needsSwap){if(n){const a=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}nf!==void 0&&(o instanceof nf?n=!0:o instanceof _T&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new ne);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}const $o={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class vT extends cr{constructor(){super(),this.isOutputPass=!0,this.uniforms=Qs.clone($o.uniforms),this.material=new Xf({name:$o.name,uniforms:this.uniforms,vertexShader:$o.vertexShader,fragmentShader:$o.fragmentShader}),this._fsQuad=new Nh(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},et.getTransfer(this._outputColorSpace)===dt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===Zc?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Jc?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===jc?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ba?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===eh?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===th?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===Qc&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class yT extends cr{constructor(e,t,n=null,s=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new de}render(e,t,n){const s=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=s}}const MT={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new de(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class er extends cr{constructor(e,t=1,n,s){super(),this.strength=t,this.radius=n,this.threshold=s,this.resolution=e!==void 0?new ne(e.x,e.y):new ne(256,256),this.clearColor=new de(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Wt(r,o,{type:Zt,depthBuffer:!1}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const u=new Wt(r,o,{type:Zt,depthBuffer:!1});u.texture.name="UnrealBloomPass.h"+h,u.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(u);const d=new Wt(r,o,{type:Zt,depthBuffer:!1});d.texture.name="UnrealBloomPass.v"+h,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),r=Math.round(r/2),o=Math.round(o/2)}const a=MT;this.highPassUniforms=Qs.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Ht({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];const l=[6,10,14,18,22];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new ne(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new A(1,1,1),new A(1,1,1),new A(1,1,1),new A(1,1,1),new A(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Qs.clone(ra.uniforms),this.blendMaterial=new Ht({uniforms:this.copyUniforms,vertexShader:ra.vertexShader,fragmentShader:ra.fragmentShader,premultipliedAlpha:!0,blending:Qi,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new de,this._oldClearAlpha=1,this._basic=new gn,this._fsQuad=new Nh(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new ne(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(e,t,n,s,r){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let a=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this._fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[l].uniforms.direction.value=er.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=er.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this._fsQuad.render(e),a=this.renderTargetsVertical[l];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){const t=[],n=e/3;for(let o=0;o<e;o++)t.push(.39894*Math.exp(-.5*o*o/(n*n))/n);const s=[],r=[];for(let o=1;o<e;o+=2){const a=t[o],l=o+1<e?t[o+1]:0,c=a+l;s.push((o*a+(o+1)*l)/c),r.push(c)}return new Ht({defines:{KERNEL_PAIRS:s.length},uniforms:{colorTexture:{value:null},invSize:{value:new ne(.5,.5)},direction:{value:new ne(.5,.5)},centerWeight:{value:t[0]},gaussianOffsets:{value:s},gaussianWeights:{value:r}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new Ht({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}}er.BlurDirectionX=new ne(1,0);er.BlurDirectionY=new ne(0,1);class La extends Re{constructor(e,t={}){super(e),this.isReflector=!0,this.type="Reflector",this.forceUpdate=!1,this._reflectionCameras=new WeakMap;const n=this,s=t.color!==void 0?new de(t.color):new de(8355711),r=t.textureWidth||512,o=t.textureHeight||512,a=t.clipBias||0,l=t.shader||La.ReflectorShader,c=t.multisample!==void 0?t.multisample:4,h=new Yn,u=new A,d=new A,f=new A,g=new Xe,_=new A(0,0,-1),p=new ft,m=new A,M=new A,T=new ft,x=new Xe,S=new Wt(r,o,{samples:c,type:Zt}),w=new Ht({name:l.name!==void 0?l.name:"unspecified",uniforms:Qs.clone(l.uniforms),fragmentShader:l.fragmentShader,vertexShader:l.vertexShader});w.uniforms.tDiffuse.value=S.texture,w.uniforms.color.value=s,w.uniforms.textureMatrix.value=x,this.material=w,this.onBeforeRender=function(E,y,R){const P=this.getReflectionCamera(R);if(d.setFromMatrixPosition(n.matrixWorld),f.setFromMatrixPosition(R.matrixWorld),g.extractRotation(n.matrixWorld),u.set(0,0,1),u.applyMatrix4(g),m.subVectors(d,f),m.dot(u)>0===!0&&this.forceUpdate===!1)return;m.reflect(u).negate(),m.add(d),g.extractRotation(R.matrixWorld),_.set(0,0,-1),_.applyMatrix4(g),_.add(f),M.subVectors(d,_),M.reflect(u).negate(),M.add(d),P.position.copy(m),P.up.set(0,1,0),P.up.applyMatrix4(g),P.up.reflect(u),P.lookAt(M),P.far=R.far,P.updateMatrixWorld(),P.projectionMatrix.copy(R.projectionMatrix),x.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),x.multiply(P.projectionMatrix),x.multiply(P.matrixWorldInverse),x.multiply(n.matrixWorld),h.setFromNormalAndCoplanarPoint(u,d),h.applyMatrix4(P.matrixWorldInverse),p.set(h.normal.x,h.normal.y,h.normal.z,h.constant);const F=P.projectionMatrix;P.isOrthographicCamera?(T.x=(Math.sign(p.x)+F.elements[8])/F.elements[0],T.y=(Math.sign(p.y)+F.elements[9])/F.elements[5],T.z=-R.far,T.w=1):(T.x=(Math.sign(p.x)+F.elements[8])/F.elements[0],T.y=(Math.sign(p.y)+F.elements[9])/F.elements[5],T.z=-1,T.w=(1+F.elements[10])/F.elements[14]),p.multiplyScalar(2/p.dot(T)),F.elements[2]=p.x,F.elements[6]=p.y,P.isOrthographicCamera?(F.elements[10]=p.z-a,F.elements[14]=p.w-1):(F.elements[10]=p.z+1-a,F.elements[14]=p.w),n.visible=!1;const V=E.getRenderTarget(),U=E.xr.enabled,B=E.shadowMap.autoUpdate;E.xr.enabled=!1,E.shadowMap.autoUpdate=!1,E.setRenderTarget(S),E.state.buffers.depth.setMask(!0),E.autoClear===!1&&E.clear(),E.render(y,P),E.xr.enabled=U,E.shadowMap.autoUpdate=B,E.setRenderTarget(V);const K=R.viewport;K!==void 0&&E.state.viewport(K),n.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return S},this.dispose=function(){S.dispose(),n.material.dispose()},this.getReflectionCamera=function(E){let y=this._reflectionCameras.get(E);return y===void 0&&(y=E.clone(),this._reflectionCameras.set(E,y)),y}}}La.ReflectorShader={name:"ReflectorShader",uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
		uniform mat4 textureMatrix;
		varying vec4 vUv;

		#include <common>
		#include <logdepthbuf_pars_vertex>

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			#include <logdepthbuf_vertex>

		}`,fragmentShader:`
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		varying vec4 vUv;

		#include <logdepthbuf_pars_fragment>

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			#include <logdepthbuf_fragment>

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};const Uh=-11.3,Oi=2,zc=5.8,Bl=2.7,Tp=7,Fh=Oi+2*zc+Tp,Ds=.15,wp=[-13.5,13.5,-40.5,40.5],zl=8,Ep=new de("#ffe0b5"),Ni=i=>i.toFixed(3),kl=[0,-1].flatMap(i=>wp.slice(0,2).map(e=>[-(Uh+Oi/2+i*Fh),e])),Ap=`
  float st_hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float st_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(st_hash(i), st_hash(i + vec2(1.0, 0.0)), u.x),
               mix(st_hash(i + vec2(0.0, 1.0)), st_hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float st_fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * st_noise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v;
  }
  /** 1 in standing water, 0 on merely damp asphalt. */
  float st_puddle(vec2 p) {
    return smoothstep(0.5, 0.62, st_fbm(p * 0.32 + vec2(3.7, 1.3)));
  }
  /** Stall lines: 1 on a line. They run along x, between stalls, in both rows of each module. */
  vec3 st_paint(vec2 p) {
    float u = mod(-p.x - (${Ni(Uh)}), ${Ni(Fh)});
    float inRow = step(${Ni(Oi)}, u) * step(u, ${Ni(Oi+zc)}) + step(${Ni(Oi+zc+Tp)}, u);
    float w = (p.y - ${Ni(Bl/2)}) / ${Ni(Bl)};
    float d = abs(w - floor(w + 0.5)) * ${Ni(Bl)};
    float line = (1.0 - smoothstep(0.05, 0.07, d)) * inRow;
    // Worn paint: break it up a little.
    float wear = 0.55 + 0.45 * smoothstep(0.2, 0.6, st_noise(p * 7.0));
    return vec3(line, 0.0, 0.0) * wear;
  }
`,ST={name:"WetLotMirror",uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},fadeNear:{value:14},fadeFar:{value:42},strength:{value:1.2}},vertexShader:`
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    varying float vDepth;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      vec4 mv = viewMatrix * world;
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float fadeNear;
    uniform float fadeFar;
    uniform float strength;
    varying vec4 vUv;
    varying vec3 vWorld;
    varying float vDepth;
    ${Ap}
    void main() {
      vec2 p = vWorld.xz;
      float puddle = st_puddle(p);
      float paint = max(st_paint(p).r, st_paint(p).g);
      // Ripples and grain bend the reflection; less so in standing water.
      vec2 grain = vec2(st_noise(p * 11.0), st_noise(p * 11.0 + 9.1)) - 0.5;
      vec2 uv = vUv.xy / vUv.w + grain * mix(0.018, 0.003, puddle);
      // Wet asphalt smears lights into vertical streaks; puddles keep them sharp.
      float spread = mix(0.016, 0.0025, puddle);
      float lod = mix(4.0, 0.6, puddle);
      vec3 sum = vec3(0.0);
      float total = 0.0;
      for (int i = -2; i <= 4; i++) {
        float w = exp(-float(i * i) * 0.18);
        sum += w * textureLod(tDiffuse, uv + vec2(0.0, float(i) * spread), lod).rgb;
        total += w;
      }
      vec3 reflection = sum / total;
      // Lights reflect at full strength; lit paint and the lot only faintly,
      // so the wet ground never glows when every lamp on the car is off.
      float lum = dot(reflection, vec3(0.2126, 0.7152, 0.0722));
      reflection *= mix(0.22, 1.0, smoothstep(0.7, 1.8, lum));
      vec3 v = normalize(cameraPosition - vWorld);
      float fresnel = 0.02 + 0.98 * pow(1.0 - max(v.y, 0.0), 5.0);
      float amount = (0.4 + 0.6 * fresnel) * mix(0.5, 1.0, puddle) * mix(1.0, 0.55, paint);
      float fade = 1.0 - smoothstep(fadeNear, fadeFar, vDepth);
      gl_FragColor = vec4(reflection * amount * fade * strength, 1.0);
    }
  `};function bT(i){const e=new vt;e.name="lot",i.add(e);const t=[],n=T=>(t.push(T),T),s=n(new $t({color:"#16181c",roughness:.6,metalness:0,envMapIntensity:0,specularIntensity:.12}));s.onBeforeCompile=T=>{T.vertexShader=T.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vStreetWorld;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vStreetWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`),T.fragmentShader=T.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vStreetWorld;
${Ap}`).replace("#include <color_fragment>",`#include <color_fragment>
        vec2 sp = vStreetWorld.xz;
        float sPuddle = st_puddle(sp);
        vec3 sPaint = st_paint(sp);
        float sGrain = st_noise(sp * 38.0) * 0.6 + st_noise(sp * 4.0) * 0.4;
        diffuseColor.rgb *= mix(0.55, 1.25, sGrain);
        // Water darkens asphalt.
        diffuseColor.rgb *= mix(1.0, 0.45, sPuddle);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55), sPaint.r * 0.85);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.45, 0.08), sPaint.g * 0.85);`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.08, sPuddle);`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        float sPool = 0.0;
        for (int i = 0; i < ${kl.length}; i++) {
          vec2 dp = sp - uPools[i];
          sPool += exp(-dot(dp, dp) / 70.0);
        }
        totalEmissiveRadiance += vec3(1.0, 0.86, 0.66) * diffuseColor.rgb * sPool * 0.9;`).replace("#include <common>",`#include <common>
uniform vec2 uPools[${kl.length}];`),T.uniforms.uPools={value:kl.map(([x,S])=>new ne(x,S))}};const r=n(new Si(120,120)),o=new Re(r,s);o.rotation.x=-Math.PI/2,o.name="ground",e.add(o);const a=new La(r,{textureWidth:512,textureHeight:512,multisample:0,shader:ST});a.name="groundMirror",a.rotation.x=-Math.PI/2,a.position.y=.002,a.visible=!1;const l=a.material;l.transparent=!0,l.blending=Qi,l.depthWrite=!1;const c=a.getRenderTarget();c.texture.generateMipmaps=!0,c.texture.minFilter=Jn,e.add(a);const h=n(new _t({color:"#3a3c40",roughness:.6})),u=n(new _t({color:"#121410",roughness:.95,envMapIntensity:.2})),d=n(new Et(Oi,Ds,120)),f=n(new Et(Oi-.3,.01,120)),g=n(new _t({color:"#2a2c30",roughness:.5,metalness:.4})),_=n(new _t({color:"#000",emissive:Ep,emissiveIntensity:2.2})),p=n(new Zs(.07,.1,zl,10)),m=n(new Et(.7,.12,.7)),M=n(new Zs(.25,.25,.5,12));for(let T=-2;T<=2;T++){const x=-(Uh+Oi/2+T*Fh),S=new Re(d,h);S.position.set(x,Ds/2,0);const w=new Re(f,u);w.position.set(x,Ds+.005,0),e.add(S,w);for(const E of wp){const y=new Re(M,h);y.position.set(x,Ds+.25,E);const R=new Re(p,g);R.position.set(x,Ds+zl/2,E);const P=new Re(m,_);P.position.set(x,Ds+zl,E),e.add(y,R,P)}}return{setReflections(T){a.visible=T},setSize(T,x){c.setSize(Math.max(64,Math.round(T/2)),Math.max(64,Math.round(x/2)))},dispose(){a.dispose();for(const T of t)T.dispose();i.remove(e)}}}function TT(){const i=new Rf,e=new Mh(50,32,16),t=[],n=e.attributes.position,s=new de("#06080c"),r=new de("#2a3446"),o=new de("#0a0b0d"),a=new de;for(let h=0;h<n.count;h++){const u=n.getY(h)/50;u>=0?a.lerpColors(r,s,Math.pow(u,.6)):a.lerpColors(r,o,Math.min(1,-u*4)),t.push(a.r,a.g,a.b)}e.setAttribute("color",new ot(t,3)),i.add(new Re(e,new gn({vertexColors:!0,side:sn})));const l=new gn({color:Ep.clone().multiplyScalar(.5)});for(const[h,u,d]of[[-20,-8,1],[22,-8,1],[-6,25,.7],[30,18,.6],[-35,12,.6]]){const f=new Re(new Et(6*d,1.5*d,4*d),l);f.position.set(h,9,u),i.add(f)}const c=new Re(new Si(40,40),new gn({color:"#1b2230",side:pn}));return c.rotation.x=Math.PI/2,c.position.y=30,i.add(c),i}const wT=`
  attribute vec3 color;
  attribute float size;
  attribute vec4 facing;
  uniform float scale;
  uniform float maxSize;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float f = 1.0;
    if (facing.w > 0.5) {
      vec3 toCam = normalize(cameraPosition - position);
      f = smoothstep(-0.15, 0.55, dot(toCam, facing.xyz));
    }
    vColor = color * f;
    float lum = max(vColor.r, max(vColor.g, vColor.b));
    // Brighter lamps throw a slightly bigger halo.
    float s = size * (0.75 + 0.25 * min(lum, 2.0));
    gl_PointSize = lum < 0.003 ? 0.0 : min(maxSize, s * scale / max(0.1, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`,ET=`
  varying vec3 vColor;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float halo = pow(1.0 - r, 2.2);
    float core = 1.0 - smoothstep(0.0, 0.32, r);
    gl_FragColor = vec4(vColor * (halo * 0.5 + core * 1.1), 1.0);
  }
`;class AT{constructor(){this.entries=[],this.capacity=0,this.v=new A,this.n=new A,this.nm=new Ke,this.material=new Ht({vertexShader:wT,fragmentShader:ET,uniforms:{scale:{value:500},maxSize:{value:256}},blending:Qi,depthWrite:!1,depthTest:!0,transparent:!0}),this.points=new Nr(new yt,this.material),this.points.frustumCulled=!1,this.points.renderOrder=10}setEntries(e){if(this.entries=e,e.length>this.capacity){this.capacity=Math.ceil(e.length*1.25);const t=new yt;t.setAttribute("position",new Dt(new Float32Array(this.capacity*3),3).setUsage(co)),t.setAttribute("color",new Dt(new Float32Array(this.capacity*3),3).setUsage(co)),t.setAttribute("size",new Dt(new Float32Array(this.capacity),1).setUsage(co)),t.setAttribute("facing",new Dt(new Float32Array(this.capacity*4),4).setUsage(co)),this.points.geometry.dispose(),this.points.geometry=t}this.points.geometry.setDrawRange(0,e.length)}setView(e,t,n){this.material.uniforms.scale.value=e/(2*Math.tan(Jt.degToRad(t.fov)/2)),this.material.uniforms.maxSize.value=n}update(){if(!this.entries.length)return;const e=this.points.geometry,t=e.attributes.position,n=e.attributes.color,s=e.attributes.size,r=e.attributes.facing,o=t.array,a=n.array,l=s.array,c=r.array;for(let h=0;h<this.entries.length;h++){const u=this.entries[h],d=u.color;a[h*3]=d.r,a[h*3+1]=d.g,a[h*3+2]=d.b,l[h]=u.size,!(d.r+d.g+d.b<.002)&&(this.v.copy(u.local).applyMatrix4(u.object.matrixWorld),o[h*3]=this.v.x,o[h*3+1]=this.v.y,o[h*3+2]=this.v.z,u.normal?(this.nm.getNormalMatrix(u.object.matrixWorld),this.n.copy(u.normal).applyMatrix3(this.nm).normalize(),c[h*4]=this.n.x,c[h*4+1]=this.n.y,c[h*4+2]=this.n.z,c[h*4+3]=1):c[h*4+3]=0)}t.needsUpdate=n.needsUpdate=s.needsUpdate=r.needsUpdate=!0}}const kc=[{name:"3/4",position:[10.5,4.2,9.5],target:[0,.8,0]},{name:"Front",position:[15.5,2.1,0],target:[0,.9,0]},{name:"Rear",position:[-14.5,3.4,0],target:[0,.9,0]},{name:"Top",position:[.01,21,0],target:[0,0,0]}],RT=1.5;class CT{constructor(e){this.container=e,this.scene=new Rf,this.camera=new nn(36,1,.1,250),this.glow=new AT,this.lineup=new vt,this.cars=[],this.bloomOn=!0,this.size={w:0,h:0},this.raf=0,this.dpr=Math.min(window.devicePixelRatio||1,RT),this.perf={frames:0,time:0,armed:!1,checked:!1},this.fps=0,this.fpsAcc={frames:0,since:performance.now()},this.labels=[],this.labelsOn=new URLSearchParams(location.search).get("labels")==="1",this.halfSpan=5.2,this.last=performance.now(),this.renderer=new jM({antialias:!0,powerPreference:"high-performance"}),this.renderer.setPixelRatio(this.dpr),this.renderer.toneMapping=ba,this.renderer.toneMappingExposure=1.15,e.appendChild(this.renderer.domElement),this.scene.background=new de("#05070a"),this.scene.fog=new ph("#05070a",28,70);const t=new Ic(this.renderer);this.scene.environment=t.fromScene(TT(),.02).texture,this.scene.environmentIntensity=.25,t.dispose(),this.scene.add(new I0("#9aa6bd","#262626",1.1));const n=new Jf("#c9d4ff",.9);n.position.set(-4,8,5),this.scene.add(n),this.lot=bT(this.scene),this.scene.add(this.lineup),this.scene.add(this.glow.points),this.controls=new eT(this.camera,this.renderer.domElement),this.controls.enableDamping=!0,this.controls.minDistance=2.5,this.controls.maxDistance=45,this.controls.maxPolarAngle=Math.PI*.495,this.controls.addEventListener("start",()=>this.tween=void 0);const s=kc[0];this.camera.position.set(...s.position),this.controls.target.set(...s.target);const r=new Wt(1,1,{type:Zt,samples:4});this.composer=new xT(this.renderer,r),this.composer.addPass(new yT(this.scene,this.camera)),this.bloom=new er(new ne(256,256),.38,.05,.95),this.composer.addPass(this.bloom),this.composer.addPass(new vT),this.resize();const o=()=>{this.raf=requestAnimationFrame(o),this.frame()};o()}get hasCars(){return this.cars.length>0}get carCount(){return this.cars.length}setCars(e){for(const c of this.cars)c.dispose();this.cars=e;const t=e.length,n=1.9,s=.85,r=e.map(c=>c.bounds.halfWidth);let o=0;const a=[];for(let c=0;c<t;c++)c>0&&(o-=r[c-1]+r[c]+s),a.push(o);const l=(a[0]+a[t-1])/2;this.halfSpan=Math.max(3,(a[0]-a[t-1])/2+Math.max(...r)+1.35),e.forEach((c,h)=>{const u=(h-(t-1)/2)/Math.max(1,(t-1)/2),d=1-Math.abs(u);c.group.position.set(n+d*1-c.bounds.halfLength,0,a[h]-l),c.group.rotation.y=-u*Jt.degToRad(6),this.lineup.add(c.group);const f=new Re(new Si(c.bounds.halfLength*2.3,c.bounds.halfWidth*2.4),new gn({map:AS(),transparent:!0,depthWrite:!1}));f.rotation.x=-Math.PI/2,f.position.y=.006,c.group.add(f)}),this.lineup.updateMatrixWorld(!0),this.glow.setEntries(e.flatMap(c=>c.glowEntries)),this.labels=[],e.forEach(c=>{const h=(u,d,f,g,_,p=2.2)=>{const m=document.createElement("canvas");m.width=512,m.height=128;const M=m.getContext("2d");M.fillStyle="rgba(0,0,0,0.55)",M.fillRect(0,0,512,128),M.fillStyle=d,M.textAlign="center",M.textBaseline="middle";let T=64;do M.font=`bold ${T--}px sans-serif`;while(M.measureText(u).width>490&&T>24);M.fillText(u,256,64);const x=new no(m),S=new wc(new fa({map:x,depthTest:!1,transparent:!0}));S.position.set(f,g,_),S.scale.set(p,p/4,1),S.renderOrder=20,S.visible=this.labelsOn,c.group.add(S),this.labels.push(S)};h(PT(c.name),"#ffffff",c.bounds.halfLength*.2,c.bounds.height+.9,0),h("VEH LEFT","#ff6a6a",c.bounds.halfLength+.3,.9,-c.bounds.halfWidth*.9,1.2),h("VEH RIGHT","#6ab4ff",c.bounds.halfLength+.3,.9,c.bounds.halfWidth*.9,1.2)})}setBloom(e){this.bloomOn=e}setLabels(e){this.labelsOn=e;for(const t of this.labels)t.visible=e}get bloomEnabled(){return this.bloomOn}setReflections(e){this.lot.setReflections(e)}flyTo(e,t=!1){const n=kc.find(o=>o.name===e);if(!n)return;const s=this.fitted(n),r=new A(...n.target);if(t){this.tween=void 0,this.camera.position.copy(s),this.controls.target.copy(r);return}this.tween={from:this.camera.position.clone(),to:s,tFrom:this.controls.target.clone(),tTo:r,start:performance.now()}}fitted(e){const t=new A(...e.position),n=new A(...e.target),s=t.clone().sub(n),r=Jt.degToRad(this.camera.fov/2),o=Math.atan(Math.tan(r)*this.camera.aspect),a=this.halfSpan/Math.tan(Math.min(o,r*1.6))+2.5;return s.length()<a&&s.setLength(a),n.add(s)}armPerfCheck(){this.perf.checked||(this.perf={frames:0,time:0,armed:!0,checked:!1})}frame(){(this.container.clientWidth!==this.size.w||this.container.clientHeight!==this.size.h)&&this.resize();const e=performance.now(),t=Math.min(.25,(e-this.last)/1e3);if(this.last=e,this.trackPerf(t,e),this.onTick?.(),this.tween){const n=Math.min(1,(e-this.tween.start)/800),s=n<.5?2*n*n:1-(-2*n+2)**2/2;this.camera.position.lerpVectors(this.tween.from,this.tween.to,s),this.controls.target.lerpVectors(this.tween.tFrom,this.tween.tTo,s),n===1&&(this.tween=void 0)}this.controls.update(t),this.scene.updateMatrixWorld(),this.glow.update(),this.bloomOn?this.composer.render(t):this.renderer.render(this.scene,this.camera)}trackPerf(e,t){this.fpsAcc.frames++,t-this.fpsAcc.since>1e3&&(this.fps=this.fpsAcc.frames*1e3/(t-this.fpsAcc.since),this.fpsAcc={frames:0,since:t}),!(!this.perf.armed||this.perf.checked)&&(this.perf.frames++,!(this.perf.frames<60)&&(this.perf.time+=e,this.perf.frames>=240&&(this.perf.checked=!0,this.perf.time/(this.perf.frames-60)>1/28&&this.bloomOn&&(this.bloomOn=!1,this.onAutoBloomOff?.()))))}resize(){this.size={w:this.container.clientWidth,h:this.container.clientHeight};const e=Math.max(1,this.size.w),t=Math.max(1,this.size.h);this.renderer.setSize(e,t,!1),this.composer.setPixelRatio(this.dpr),this.composer.setSize(e,t),this.bloom.setSize(e,t),this.lot.setSize(e*this.dpr,t*this.dpr),this.camera.aspect=e/t,this.camera.updateProjectionMatrix();const n=this.renderer.getContext(),s=n.getParameter(n.ALIASED_POINT_SIZE_RANGE),r=s?Math.min(256,Number(s[1])):64;this.glow.setView(t*this.dpr,this.camera,r)}dispose(){cancelAnimationFrame(this.raf);for(const e of this.cars)e.dispose();this.lot.dispose(),this.controls.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}function PT(i){const e=/^Car(\d+)_([A-Za-z]+)_([A-Za-z]+)$/.exec(i);if(!e)return i.replace(/_/g," ");const t=n=>n.replace(/([a-z])([A-Z])/g,"$1 $2");return`${e[1]} · ${t(e[2])} · ${t(e[3]).toLowerCase()}`}const si=new URLSearchParams(location.search),Rp=(si.get("root")??document.querySelector('meta[name="show-root"]')?.getAttribute("content")??"../../").replace(/\/?$/,"/"),Hc=new URL(si.get("manifest")??Rp+"preview/shows.json",location.href),LT=si.get("manifest")?Hc:new URL(Rp,location.href),Cp=i=>new URL(i,LT).href,IT={modely:"#e9eaec",cybertruck:"#b9bcc0"},Cn=i=>document.getElementById(i),DT=Cn("stage"),va=Cn("show"),eo=Cn("play"),zi=Cn("scrub"),NT=Cn("time"),sf=Cn("status"),UT=Cn("statusText"),rf=Cn("progressBar"),Ia=Cn("ybody"),FT=Cn("cams"),OT=Cn("fps"),Gt=new CT(DT),cn=new Audio;cn.preload="auto";let Zi={},Da="",Qn=[],Us,Vc="",An=0,Gc=20,wr,rs=!1,On=!1,ni=0,ya=0,Br=-1,of=0,$n=0,Oh=!1,Zo=0;function Kn(i,e){if(i===void 0){sf.hidden=!0;return}sf.hidden=!1,UT.textContent=i,rf.style.width=e===void 0?"0":`${Math.round(e*100)}%`,rf.parentElement.hidden=e===void 0}function Ma(){if(!On)return ni;const i=performance.now();if(rs&&!cn.paused){const e=cn.currentTime;return e!==Br&&(Br=e,of=i),Br+Math.min(.3,(i-of)/1e3)}return rs?cn.currentTime:ni+(i-ya)/1e3}function af(i){const e=Math.floor(i/60),t=i-e*60;return`${e}:${t.toFixed(1).padStart(4,"0")}`}function so(i){for(const e of Qn)e.setFrame(Math.floor(i*1e3/Gc),i);NT.textContent=`${af(i)} / ${af(An)}`,Oh||(zi.value=String(i))}let lf=performance.now();Gt.onTick=()=>{const i=performance.now(),e=Math.min(.1,(i-lf)/1e3);lf=i,Us?.update(e);let t=Ma();On&&t<$n&&$n-t<.12&&(t=$n),On&&t>=An&&An>0&&(cs(),t=An,ni=An),(t!==$n||On)&&($n=t,so(t)),OT.textContent=Gt.fps?`${Math.round(Gt.fps)} fps`:""};async function Bh(){if(!(!Da||!Qn.length))if(ni>=An-.05&&(ni=0),On=!0,eo.textContent="Pause",eo.classList.add("on"),Gt.armPerfCheck(),rs){cn.currentTime=ni,Br=-1;try{await cn.play()}catch(i){console.warn("Audio would not play",i),rs=!1,ya=performance.now()}}else ya=performance.now()}function cs(){On&&(ni=Ma(),On=!1,cn.pause(),eo.textContent="Play",eo.classList.remove("on"))}function os(i){i=Math.max(0,Math.min(An,i)),ni=i,$n=i,On&&(rs?(cn.currentTime=i,Br=-1):ya=performance.now()),so(i)}eo.addEventListener("click",()=>{On?cs():Bh()});zi.addEventListener("input",()=>{Oh=!0,os(Number(zi.value))});zi.addEventListener("change",()=>{Oh=!1,os(Number(zi.value))});cn.addEventListener("ended",()=>{On&&(cs(),ni=An)});window.addEventListener("keydown",i=>{(i.target instanceof HTMLSelectElement||i.target instanceof HTMLInputElement)&&i.target!==zi||(i.code==="Space"?(i.preventDefault(),On?cs():Bh()):i.code==="ArrowLeft"?os(Ma()-(i.shiftKey?1:5)):i.code==="ArrowRight"&&os(Ma()+(i.shiftKey?1:5)))});for(const i of kc){const e=document.createElement("button");e.textContent=i.name,e.addEventListener("click",()=>Gt.flyTo(i.name)),FT.appendChild(e)}Gt.setBloom(!0);const Wc=Cn("labels");Wc.checked=si.get("labels")==="1";Wc.addEventListener("change",()=>Gt.setLabels(Wc.checked));Gt.onAutoBloomOff=()=>console.info("Bloom switched off: frames were slow");const BT=si.get("ybody")==="mesh"?"mesh":"refresh";Ia.value=BT;Ia.addEventListener("change",async()=>{Vc="",await Pp(Zi[Da]),so($n),Lp()});async function zT(i){const e=await fetch(Cp(i),{cache:"no-cache"});if(!e.ok)throw new Error(`${i}: HTTP ${e.status}`);if(!i.endsWith(".gz.b64.txt"))return new Uint8Array(await e.arrayBuffer());const t=Uint8Array.from(atob((await e.text()).trim()),s=>s.charCodeAt(0)),n=new Blob([t]).stream().pipeThrough(new DecompressionStream("gzip"));return new Uint8Array(await new Response(n).arrayBuffer())}let Ji={app:{}};function Xc(i){return i.body==="modely2020"?"mesh":i.body==="modely2025"?"refresh":Ia.value}function kT(i){return i.kind==="cybertruck"?"cybertruck":Xc(i)==="mesh"?"y_high":"bayberry"}async function HT(){const i=new Map,e=(r,o)=>{i.set(r.split(":")[0],o);const a=[...i.values()].reduce((l,c)=>l+c,0)/Math.max(1,i.size);Kn(`Loading ${r}…`,a)};if(si.get("models")!=="classic"){const r=["bayberry","y_high","cybertruck"],o=await Promise.all(r.map(a=>Ub(a,l=>e(`car models: ${a}`,l)).catch(()=>{})));r.forEach((a,l)=>{o[l]&&(Ji.app[a]=o[l])})}const t=r=>!Ji.app[r],[n,s]=await Promise.all([t("bayberry")||t("y_high")?Dd("modelS",e):void 0,t("cybertruck")?Dd("cybertruck",e):void 0]);Ji={...Ji,modelS:n,cybertruck:s}}async function Pp(i){Ia.hidden=!i.cars.some(s=>s.kind==="modely"&&!s.body);const e=i.cars.map(s=>`${s.kind}:${Xc(s)}`).join(",");if(e===Vc)return;Kn("Building cars…"),await new Promise(s=>setTimeout(s,30)),Vc=e,Qn=i.cars.map(s=>{const r=kT(s),o=Ji.app[r];return new Xb(s.kind,s.name,Xc(s),s.kind==="cybertruck"?Ji.cybertruck:Ji.modelS,IT[s.kind],o&&{id:r,gltf:o})});const t=!Gt.hasCars,n=Qn.length!==Gt.carCount;Gt.setCars(Qn),!Us&&si.get("cooler")==="1"&&(Us=new jb,Gt.scene.add(Us.group),Us.group.position.set(4.6,0,1.1),Us.group.rotation.y=0),n&&Gt.flyTo(si.get("cam")??"3/4",t),window.__rigs=Qn}let Yc=new Map;async function Lp(){const i=Zi[Da];i&&(i.cars.forEach((e,t)=>{const n=Yc.get(e.fseq);n&&Qn[t]&&Qn[t].setSimulation(Jp(n,Qn[t].profile))}),so($n))}async function Ip(i){const e=++Zo,t=Zi[i];if(!t)return;cs(),Da=i,rs=!1,cn.removeAttribute("src"),cn.load(),wr&&URL.revokeObjectURL(wr),wr=void 0;const n=new URL(location.href);n.searchParams.set("show",i),history.replaceState(null,"",n),await Pp(t),Kn("Loading light show…"),Yc=new Map;const s=await Promise.all(t.cars.map(async r=>{const o=Gp(await zT(r.fseq));return Yc.set(r.fseq,o),o}));if(e===Zo){Gc=s[0].stepTimeMs,An=Math.max(...s.map(r=>r.frameCount*r.stepTimeMs/1e3)),await Lp(),zi.max=String(An),zi.step=String(Gc/1e3),ni=0,$n=0,so(0),Kn("Loading audio…",0);try{const r=await Eh(Cp(t.audio),o=>e===Zo&&Kn("Loading audio…",o));if(e!==Zo)return;wr=URL.createObjectURL(new Blob([r],{type:"audio/wav"})),cn.src=wr,cn.load(),rs=!0,Kn(void 0)}catch(r){console.warn(r),Kn(`Audio unavailable (${r.message}); playing silently.`),setTimeout(()=>Kn(void 0),4e3)}}}va.addEventListener("change",()=>{Ip(va.value).catch(Dp)});function Dp(i){console.error(i),Kn(`Error: ${i.message??i}`)}async function VT(){Kn("Loading show list…");const i=await fetch(Hc.href,{cache:"no-cache"});if(!i.ok)throw new Error(`${Hc.pathname}: HTTP ${i.status}`);Zi=await i.json();for(const s of Object.keys(Zi)){const r=document.createElement("option");r.value=s,r.textContent=s.replace(/^(\d+)_/,"$1 · ").replace(/_/g," "),va.appendChild(r)}const e=si.get("show"),t=e&&Zi[e]?e:Object.keys(Zi)[0];if(!t)throw new Error("shows.json lists no shows");va.value=t,await HT(),await Ip(t);const n=Number(si.get("t"));n>0&&os(n)}const GT={state:{done:0,total:0,running:!1,err:""},pose:void 0,out:void 0,size:{w:0,h:0},async setup(i=.8){const e=Gt;e.container={clientWidth:1280,clientHeight:720},e.resize(),Gt.flyTo("Front",!0),e.tween=void 0;const t=e.camera,n=e.controls.target;t.position.sub(n).multiplyScalar(i).add(n),n.y+=.15,e.controls.update(0),e.controls.enabled=!1,this.pose={p:t.position.clone(),t:n.clone()},cs();const s=document.querySelector("canvas");this.size={w:s.width,h:s.height},this.out=document.createElement("canvas"),this.out.width=1280,this.out.height=720},async grab(i,e,t="http://127.0.0.1:8767/"){const n=Gt,s=document.querySelector("canvas");if(s.width!==this.size.w||s.height!==this.size.h)throw new Error(`canvas resized to ${s.width}x${s.height}`);n.tween=void 0,n.camera.position.copy(this.pose.p),n.controls.target.copy(this.pose.t),n.camera.lookAt(this.pose.t),os(e),n.frame(),this.out.getContext("2d").drawImage(s,0,0,1280,720);const r=await new Promise(o=>this.out.toBlob(o,"image/jpeg",.82));await fetch(t+i,{method:"POST",body:r})},async shoot(i,e){for(let t=0;t<e.length;t++)await this.grab(`${i}/${String(t).padStart(5,"0")}.jpg`,e[t]);return e.length},async record(i,e,t=0){const n=Math.floor(An*e);this.state={done:t,total:n,running:!0,err:""};try{for(let s=t;s<n&&this.state.running;s++)await this.grab(`${i}/${String(s).padStart(5,"0")}.jpg`,s/e),this.state.done=s+1}catch(s){this.state.err=String(s)}this.state.running=!1}};window.__viewer={viewer:Gt,audio:cn,seek:os,play:Bh,pause:cs,recorder:GT,time:()=>$n,get duration(){return An},get rigs(){return Qn}};VT().catch(Dp);
