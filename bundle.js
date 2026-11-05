(() => {
  // node_modules/asciify-engine/dist/field.js
  var e = { none: 3, flow: 1, orb: 2, drift: 4, swell: 5, caustics: 6, contour: 7, aurora: 8, ripple: 9, halo: 10, interference: 11, mesh: 12, cascade: 13, constellation: 14 };
  var t = (e2) => e2 ? "\nconst float VSCALE=6.;\nvec4 decodeFluid(vec4 t){return vec4((t.xy*2.-1.)*VSCALE,t.z,t.w);}\nvec4 encodeFluid(vec4 v){return vec4(clamp(v.xy/VSCALE*.5+.5,0.,1.),clamp(v.z,0.,1.),1.);}" : "\nvec4 decodeFluid(vec4 t){return t;}\nvec4 encodeFluid(vec4 v){return vec4(v.xyz,1.);}";
  var n = (e2) => `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uSource, uFluid;
uniform vec2 uResolution, uCell;
uniform float uCount, uBlend;
const float BAYER[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
uniform vec3 uRamp[6];
uniform float uRampCount;
// The gradient map: the tone run through the ramp's stops, evenly spaced, faintest first.
vec3 rampAt(float t){
  float x=clamp(t,0.,1.)*(uRampCount-1.);
  int i=int(min(floor(x),uRampCount-2.));
  vec3 a=uRamp[0],b=uRamp[1];
  for(int k=1;k<5;k++)if(k==i){a=uRamp[k];b=uRamp[k+1];}
  return mix(a,b,clamp(x-float(i),0.,1.));
}
uniform vec4 uSourceMap;
uniform int uScene;
uniform vec3 uInk, uHighlight;
uniform vec4 uBackground;
uniform float uBrightness, uContrast, uGamma, uInvert, uVignette, uSourceColor;
uniform float uRefraction, uGlow, uTime, uDrift, uFluidOn, uLod, uSaturation, uBackdrop, uShade, uHighlightAuto, uFluidMode;
uniform vec2 uFluidTexel;
uniform int uHoverMode;
uniform vec3 uLight;
uniform vec3 uTrail[12];
uniform float uLightRadius, uLightGain, uClock, uFlicker, uTrailAmount;
uniform sampler2D uTrailMap, uScope;
uniform float uScopeMode;
uniform vec2 uLevels;
uniform int uMark;
uniform float uScale, uClearFeather, uClearShape, uOrder;
// Text order by rows: each word's first glyph index and length, and how many words there are (0 reads the charset as one stream).
uniform vec2 uWords[8];
uniform float uWordCount;
uniform vec4 uClear;
uniform vec4 uPulse[4];
uniform sampler2D uTapMap;
uniform float uTapOn;
uniform sampler2D uClearMap;
uniform float uClearMapOn, uClearBend;
uniform vec2 uClearTexel;
layout(location=0) out vec4 outInk;
layout(location=1) out vec4 outUnder;
${t(e2)}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
vec3 generated(vec2 uv,float aspect){
  vec2 p=(uv-.5)*vec2(aspect,1.)*uScale;
  if(uScene==1){
    float t=uTime*.08;
    vec2 q=vec2(fbm(p*1.6+t),fbm(p*1.6-t+3.1));
    return vec3(smoothstep(.28,.86,fbm(p*1.8+q*1.6+vec2(t*.6,-t*.4))));
  }
  if(uScene==2){
    float r=.36,d=length(p),a=uTime*.25;
    vec3 l=normalize(vec3(cos(a)*.8,.55,sin(a)*.6+.6));
    if(d<r){
      vec3 n=normalize(vec3(p.x,-p.y,sqrt(r*r-d*d)));
      float diffuse=max(dot(n,l),0.),rim=pow(1.-n.z,2.5);
      float lon=atan(n.x,n.z)+uTime*.35,lat=asin(clamp(n.y,-1.,1.));
      float bands=.5+.25*sin(lat*14.)+.25*sin(lon*6.);
      return vec3(clamp(diffuse*.85+rim*.5+bands*.12,0.,1.));
    }
    return vec3(exp(-pow((d-r)*9.,2.))*.35);
  }
  if(uScene==4){
    // Drift: a few broad lobes that wander slowly. Built for halftone, where large soft shapes read best.
    float t=uTime*.045;
    vec2 q=p*1.15;
    vec2 w=vec2(fbm(q*.7+vec2(t,-t*.7)),fbm(q*.7+vec2(4.3-t*.8,t+1.7)));
    float n=fbm(q+w*1.3+vec2(t*.4,t*.25));
    return vec3(smoothstep(.36,.74,n));
  }
  if(uScene==5){
    // Swell: three crossing swells, the second bent by the first, so crests roll diagonally instead of pooling.
    float t=uTime;
    float s=sin((dot(p,vec2(.94,.33))/.95-t/9.)*6.2831853);
    float c=sin((dot(p,vec2(.6,-.8))/.58-t/13.)*6.2831853+s*.9);
    float k=sin((dot(p,vec2(-.29,.96))/.36+t/17.)*6.2831853);
    return vec3(smoothstep(.3,.9,.5+.5*(s*.5+c*.35+k*.15)));
  }
  // The kit's background scenes. Each starts a little way in, so a reduced-motion still is already composed.
  float t=uTime+40.,px=uCell.y/uResolution.y*uScale;
  if(uScene==6){
    // Caustics: light focused by a moving water surface. Two layers of warped sine waves drift against each other; each draws
    // smooth filaments along its zero line, about a character wide. Where they cross the light lifts a little, never to a blot.
    float tt=t*.12,a=0.,b=0.;
    for(int l=0;l<2;l++){
      float f=float(l),sc=5.4+f*2.4;
      vec2 q=(l==0?p:mat2(.8,-.6,.6,.8)*p)*sc;
      q+=vec2(sin(q.y*.45+tt*(1.+f*.3)),cos(q.x*.4-tt*(.8+f*.4)))*1.3;
      float v=sin(q.x+1.4*sin(q.y*.7+tt))+sin(q.y*1.1+1.2*sin(q.x*.8-tt*1.3))*.9;
      float wv=max(fwidth(v),1e-4);
      float line=(1.-smoothstep(.2,1.5,abs(v)/wv))*(l==0?.78:.62)+exp(-abs(v)/(wv*5.))*.16;
      if(l==0)a=line;else b=line;
    }
    float pulse=.85+.15*sin(tt*3.+p.x*1.7-p.y*1.1);
    float light=max(a,b)+.3*min(a,b);
    return vec3(clamp(light*light*pulse,0.,.78));
  }
  if(uScene==7){
    // Contour: a slow terrain read as survey lines about a character wide at any size; every fifth is an index line.
    float tt=t*.02;
    vec2 q=p*1.15+vec2(tt,-tt*.6);
    float h=noise(q)*.62+noise(q*2.07+3.1)*.27+noise(q*4.3-tt+7.)*.11;
    h+=.08*sin(tt*2.+p.x*.8);
    float k=h*13.,w=max(fwidth(k),1e-4),d=abs(fract(k+.5)-.5)/w;
    float major=mod(floor(k+.5),5.)<.5?1.:0.;
    return vec3((1.-smoothstep(.35,1.25-major*.25,d))*mix(.55,1.,major));
  }
  if(uScene==8){
    // Aurora: three curtains at different distances hang from the top. Far ones sit higher and dimmer; the nearest is tallest
    // and brightest. Each folds slowly and is brightest along its lower hem, fading upward. The rays are set per character
    // column, so the curtains read as vertical strokes at any stage size, from a small card to a phone.
    float tt=t*.05,a=0.,cw=uCell.x/uResolution.x;
    float col=floor(uv.x/cw+.5);
    for(int n=0;n<3;n++){
      float f=float(n),near=f/2.;
      float x=p.x*(1.3-near*.4)+f*3.7;
      float hem=-.28+near*.3+.16*sin(x*1.3+tt*(.9+f*.25)+f*2.)+.045*sin(x*3.4-tt*1.5+f);
      float d=hem-p.y;
      float body=d>0.?exp(-d/(.14+near*.26))*(.45+.55*exp(-d/.03)):exp(-d*d/.0002);
      float fold=.5+.5*sin(x*2.1+tt*.9+f*1.7+.7*sin(x*.8-tt*.6));
      float ray=mix(hash(vec2(col,f*7.1)),noise(vec2(col*.18+f*9.,tt*.7+f)),.55);
      float layer=clamp(body*(.1+.9*fold*fold)*(.2+.8*ray)*(.4+near*.6)*4.2,0.,1.);
      a=1.-(1.-a)*(1.-layer);
    }
    return vec3(smoothstep(.12,.9,a));
  }
  if(uScene==9){
    // Ripple: still water. Drops land here and there, each a few rings that widen and fade; the pointer drops its own.
    float tone=0.,g=.72;
    vec2 q=p/g,id=floor(q);
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
      vec2 c=id+vec2(i,j),h=vec2(hash(c),hash(c+7.3));
      float period=5.+h.x*5.,age=fract(t*.3/period*4.+h.y);
      vec2 at=(c+.2+.6*h)*g;
      float d=length(p-at),r=age*.62;
      float rings=max(0.,cos((d-r)*34.))*exp(-pow((d-r)/.11,2.));
      tone+=rings*pow(1.-age,1.8)*smoothstep(0.,.06,age)*(.7+.3*h.x);
    }
    return vec3(clamp(tone*1.25,0.,1.));
  }
  if(uScene==10){
    // Halo: a slow breathing corona that frames the content, its rays turning. The ring fits the stage: wide on a desktop
    // hero, tall on a phone, so the whole halo stays on screen; the middle stays empty for a headline.
    vec2 r=vec2(min(.46,aspect*.4),min(.34,.36/max(aspect,.01)*.5+.2));
    vec2 e=p/r;
    float d=length(e),a=atan(e.y,e.x),tt=t*.07,k=min(r.x,r.y);
    float breathe=1.+.04*sin(tt*3.1);
    float rays=.5+.5*noise(vec2(a*3.2+tt,tt*.5))*(.6+.4*noise(vec2(a*7.-tt*1.2,3.+tt*.4)));
    float s=(d-breathe)*k;
    float rim=exp(-pow(s/.03,2.));
    float corona=exp(-max(0.,s)/(.1+.08*rays))*smoothstep(-.04,.015,s)*rays*smoothstep(.36,.12,s);
    return vec3(clamp(rim*(.55+.45*rays)+corona*.85,0.,1.));
  }
  if(uScene==11){
    // Interference: two ring grids from slowly orbiting centres. Where they cross, broad moire bands open and close.
    float tt=t*.05;
    vec2 a=vec2(-.3+.12*sin(tt),.07*cos(tt*1.3)),b=vec2(.3+.1*cos(tt*.8),-.06*sin(tt*1.1));
    float f=6.2831853/max(px*4.6,.004);
    float m=cos(length(p-a)*f)+cos(length(p-b)*f);
    return vec3(smoothstep(.7,2.,m));
  }
  if(uScene==12){
    // Mesh: four soft lights on slow Lissajous paths, a gradient mesh written in characters.
    float tt=t*.07,m=0.;
    for(int n=0;n<4;n++){
      float f=float(n)*1.7;
      vec2 c=vec2(.66*sin(tt*(.7+f*.13)+f),.34*cos(tt*(.9-f*.07)+f*1.3));
      float s=.3+.07*sin(tt+f);
      m+=exp(-dot(p-c,p-c)/(s*s))*(.8-float(n)*.1);
    }
    return vec3(smoothstep(.06,1.1,m));
  }
  if(uScene==13){
    // Cascade: streaks fall in three depths. Far ones are frequent, faint, short and slow; near ones rare, long, bright and
    // quick. Each has a bright head and a tail that fades behind it, and a column can carry two streaks at once.
    float tone=0.,cw=uCell.x/uResolution.x,ch=uCell.y/uResolution.y;
    float col=floor(uv.x/cw+.5);
    for(int n=0;n<3;n++){
      float f=float(n);
      for(int k=0;k<2;k++){
        float seed=f*13.1+float(k)*41.7,h=hash(vec2(col,seed));
        if(h<1.-(.5-f*.15))continue;
        float speed=(.045+f*.07)*(.75+.5*hash(vec2(col,seed+2.)));
        float tail=.12+f*.16,y=fract(t*speed+hash(vec2(col,seed+5.)))*(1.+tail*2.)-tail;
        float d=y-uv.y;
        if(d<0.||d>tail)continue;
        float head=d<ch*1.2?1.:0.;
        tone=max(tone,max(head*(.55+f*.22),pow(1.-d/tail,1.7)*(.28+f*.3)));
      }
    }
    return vec3(clamp(tone,0.,1.));
  }
  if(uScene==14){
    // Constellation: points wander in their own cells; neighbours close enough are linked by fine lines. Each point is a
    // bright core in a soft halo, so it reads at card size as well as full width.
    float g=.23,tt=t*.18;
    vec2 q=p/g,id=floor(q);
    vec2 pts[9];
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
      vec2 c=id+vec2(i,j);
      float h=hash(c),k=hash(c+3.7);
      pts[(j+1)*3+i+1]=c+.5+.36*vec2(sin(tt*(.6+h)+h*6.28),cos(tt*(.5+k)+k*6.28));
    }
    float line=0.,star=0.,lw=max(px/g,.02);
    for(int n=0;n<9;n++){
      vec2 e=q-pts[n];
      float d2=dot(e,e),tw=.8+.2*sin(tt*3.+float(n)*1.7);
      star=max(star,max(exp(-d2/(lw*lw*1.6)),.38*exp(-d2/(lw*lw*7.)))*tw);
      for(int m=n+1;m<9;m++){
        vec2 a=pts[n],ba=pts[m]-a;
        float len=length(ba);
        if(len>1.35)continue;
        float hh=clamp(dot(q-a,ba)/dot(ba,ba),0.,1.);
        float d=length(q-a-ba*hh);
        line=max(line,(1.-smoothstep(lw*.3,lw*.75,d))*smoothstep(1.35,.6,len)*.72);
      }
    }
    return vec3(clamp(max(line,star),0.,1.));
  }
  return vec3(0.);
}
// Hover scope: 1 where the pointer response may act. The map holds the source's soft subject coverage in alpha.
float hoverScope(vec2 uv){
  if(uScopeMode<.5||uScene!=0)return 1.;
  vec2 s=uv*uSourceMap.xy+uSourceMap.zw;
  float c=(s.x<0.||s.y<0.||s.x>1.||s.y>1.)?0.:texture(uScope,s).a;
  return uScopeMode<1.5?c:1.-c;
}
void main(){
  vec2 cell=floor(gl_FragCoord.xy);
  vec2 uv=(cell+.5)*uCell/uResolution;
  float aspect=uResolution.x/uResolution.y;
  float hs=hoverScope(uv);
  vec4 fluid=vec4(0.);
  // lift: signed tone change. The solver's flow brightens one side of each eddy and opens the other into gaps.
  float lift=0.,wake=0.,bend=1.,swirl=0.,speed=0.;
  if(uFluidOn>.5){
    vec4 raw=texture(uFluid,vec2(uv.x,1.-uv.y));
    if(uFluidMode>.5){
      vec2 v=raw.xy*uFluidTexel*vec2(aspect,1.)*hs;
      fluid=vec4(v,0.,1.);
      swirl=clamp(dot(v,vec2(.4,.65))*uGlow*.32,-.65,.65);
      speed=clamp(length(v)*uGlow*.055,0.,.38);
      bend=.4;
    } else {
      fluid=decodeFluid(raw);
      fluid.xyz*=hs;
      wake=clamp(fluid.z*uGlow,0.,1.);
      lift=wake*.55;
    }
  }
  vec2 drift=uDrift*.006*vec2(sin(uv.y*5.3+uTime*.6),cos(uv.x*4.1-uTime*.5));
  vec2 sampleAt=uv-vec2(fluid.x/aspect,-fluid.y)*uRefraction*bend+drift;
  float keep=0.;
  if(uClearMapOn>0.){
    // Text-shaped clear map: quiet right behind the content, and the field leans away from its edges so it flows round them.
    keep=texture(uClearMap,uv).r;
    vec2 t=uClearTexel*1.5;
    vec2 g=vec2(texture(uClearMap,uv+vec2(t.x,0.)).r-texture(uClearMap,uv-vec2(t.x,0.)).r,texture(uClearMap,uv+vec2(0.,t.y)).r-texture(uClearMap,uv-vec2(0.,t.y)).r);
    sampleAt+=g*vec2(1./aspect,1.)*uClearBend;
  }
  float spot=0.;
  if(uHoverMode==4||uHoverMode==5){
    vec2 d=(uv-uLight.xy)*vec2(aspect,1.);
    float q2=dot(d,d)/(uLightRadius*uLightRadius*2.2);
    // Loupe: flat-topped zoom with a soft rim. Reveal: a soft spot in the source's colours.
    if(uHoverMode==4) sampleAt-=(uv-uLight.xy)*exp(-q2*q2)*.45*uLight.z*min(1.,uLightGain*1.6)*hs;
    else spot=exp(-q2*1.6)*uLight.z*min(1.,uLightGain*1.6)*hs;
  }
  vec3 rgb,glow=vec3(0.);
  if(uScene==0){
    vec2 s=sampleAt*uSourceMap.xy+uSourceMap.zw;
    bool inside=!(s.x<0.||s.y<0.||s.x>1.||s.y>1.);
    rgb=inside?textureLod(uSource,s,uLod).rgb:vec3(0.);
    if(uBackdrop>0.){
      vec2 b=(uv-vec2(fluid.x/aspect,-fluid.y)*uRefraction*bend*.5)*uSourceMap.xy+uSourceMap.zw;
      glow=(b.x<0.||b.y<0.||b.x>1.||b.y>1.)?vec3(0.):textureLod(uSource,b,uLod+3.).rgb*uBackdrop;
    }
  } else rgb=generated(sampleAt,aspect);
  float tone=dot(rgb,vec3(.2126,.7152,.0722));
  tone=clamp((tone-uLevels.x)/max(uLevels.y-uLevels.x,.01),0.,1.);
  tone=clamp((tone-.5)*uContrast+.5+uBrightness,0.,1.);
  tone=pow(tone,1./uGamma);
  if(uInvert>.5)tone=1.-tone;
  float flick=0.,trailFold=0.;
  // Reveal: under the spot the characters take the source's own colour and a little more ink.
  if(spot>0.)lift=spot*.22;
  if(uHoverMode==2){
    // Lantern: a soft light and its fading tail lift the characters they pass. Nothing moves the image.
    vec2 ap=vec2(aspect,1.),d=(uv-uLight.xy)*ap;
    float r2=uLightRadius*uLightRadius,glowL=uLight.z*exp(-dot(d,d)/r2);
    for(int i=0;i<12;i++){vec2 e=(uv-uTrail[i].xy)*ap;glowL+=uTrail[i].z*exp(-dot(e,e)/(r2*.55));}
    glowL=min(glowL,1.)*hs;
    float grain=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
    lift=glowL*uLightGain*(.7+.6*grain);
    wake=glowL*.4;
    // A few letters at the light's rim step up the ramp and back, as if being retyped.
    flick=uFlicker*step(.9,fract(grain*13.7+floor(uClock*7.+grain*5.)*.37))*glowL*(1.-glowL)*4.;
  }
  if(uHoverMode==3){
    // Trail: the studio's ink field, as a 16-bit density. Sparse marks fill in, dense marks open up.
    vec4 ink=texture(uTrailMap,uv);
    float density=(ink.r*65280.+ink.g*255.)/65535.*uTrailAmount;
    float t=clamp(density/.38,0.,1.);
    trailFold=t*t*(3.-2.*t)*hs;
  }
  if(uFluidMode>.5&&uHoverMode==1){
    // Dark ground: any motion lights the characters. Lit ground: the flow lights one side of each eddy and opens the other.
    // A little cell-to-cell grain keeps the lit area a shimmer of letters rather than a solid block.
    float grain=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
    lift=mix(abs(swirl)*.5+speed,swirl+speed*.35,smoothstep(.12,.55,tone))*(.65+.7*grain);
    wake=clamp(lift*1.6,0.,1.);
  }
  tone=clamp(tone+lift,0.,1.);
  tone+=(1.-2.*tone)*trailFold;
  // Pulses: rings sent by the interface (field.pulse()), e.g. on a save or a notification.
  for(int i=0;i<4;i++){
    if(uPulse[i].w<=0.)continue;
    float dist=length((uv-uPulse[i].xy)*vec2(aspect,1.)),front=uPulse[i].z*.95;
    float ring=exp(-pow((dist-front)/.1,2.))*uPulse[i].w*exp(-uPulse[i].z*.85);
    tone=clamp(tone+ring*.85,0.,1.);
  }
  if(uTapOn>0.){
    // A surface tap: a signed lift (16 bits) and a glint, worked out on the CPU over the photo's own medium.
    vec4 tap=texture(uTapMap,uv);
    float lift=(tap.r*65280.+tap.g*255.)/65535.*2.-1.;
    tone=clamp(tone+(lift*1.25+tap.b)*uTapOn,0.,1.);
  }
  tone*=1.-uVignette*smoothstep(.35,1.05,length((uv-.5)*vec2(min(aspect,1.8),1.)*2.));
  if(uClearMapOn>0.)tone*=1.-uClearMapOn*smoothstep(0.,1.,keep);
  if(uClear.z>0.){
    // Clear zone: the field fades out around content so text above it stays readable.
    vec2 half_=uClear.zw*.5*vec2(aspect,1.),q=(uv-uClear.xy-uClear.zw*.5)*vec2(aspect,1.);
    float dz;
    if(uClearShape>.5){vec2 e=abs(q)-half_;dz=length(max(e,0.))+min(max(e.x,e.y),0.);}
    else dz=(length(q/max(half_,vec2(1e-4)))-1.)*min(half_.x,half_.y);
    tone*=smoothstep(0.,uClearFeather,dz);
  }
  // Blend: a shade between two characters takes the upper one in the share of cells a 4x4 Bayer pattern gives it.
  float level=tone*(uCount-1.),upper=fract(level)>=.5?1.:0.;
  if(uBlend>.5&&tone>.02&&tone<.98){
    ivec2 q=ivec2(mod(gl_FragCoord.xy,4.));
    upper=fract(level)>(BAYER[q.y*4+q.x]+.5)/16.?1.:0.;
  }
  float index=min(uCount-1.,floor(level)+upper+(flick>.5&&tone>.02?1.:0.));
  if(uOrder>1.5){
    // Scatter order: each cell keeps one character picked from the charset by a hash of its place, and the tone sets how
    // strongly it shows rather than which character it is, so a field of letters brightens and fades like a lit screen.
    index=tone>.008?1.+min(uCount-2.,floor(hash(cell*.731+vec2(19.17,3.71))*(uCount-1.))):0.;
  } else if(uOrder>.5){
    // Text order: the charset after its blank is read in sequence along each row, each row a few letters on, so words stay
    // legible. Every letter is there; the tone sets how strongly it shows, so the words fade out toward the field's quiet edges.
    float n=max(1.,uCount-1.);
    index=tone>.015?1.+mod(cell.x+cell.y*(floor(n*.38)+1.),n):0.;
    if(uWordCount>.5&&tone>.015){
      // One word a row, repeated with a space between, rows taking the words in turn and each a few letters along.
      int k=int(mod(cell.y,uWordCount));
      vec2 word=uWords[0];
      for(int i=1;i<8;i++)if(i==k)word=uWords[i];
      float at=mod(cell.x+cell.y*3.,word.y+1.);
      index=at<word.y?word.x+at:0.;
    }
  }
  vec3 hue=rgb/max(max(rgb.r,rgb.g),max(rgb.b,.03));
  hue=mix(vec3(dot(hue,vec3(.2126,.7152,.0722))),hue,uSaturation);
  vec3 base=uRampCount>1.5?rampAt(tone):uInk;
  vec3 ink=mix(base*mix(1.,.3+.7*tone,uRampCount>1.5?0.:uShade),clamp(hue*(.38+.62*tone),0.,1.),uSourceColor);
  // Scatter, text and inlay carry the tone in the ink's strength, which the pixel pass reads back as opacity or tile shade.
  if(uOrder>1.5||(uOrder>.5&&uMark==0)||uMark==17)ink=mix(uInk,hue,uSourceColor)*tone;
  vec3 lifted=uHighlightAuto>.5?ink/max(max(ink.r,ink.g),max(ink.b,.06)):uHighlight;
  ink=mix(ink,lifted,wake*.7);
  if(spot>0.)ink=mix(ink,clamp(rgb/max(max(rgb.r,rgb.g),max(rgb.b,.08))*(.45+.55*tone),0.,1.),spot);
  float underAlpha=max(uBackground.a,min(1.,max(glow.r,max(glow.g,glow.b))));
  vec3 under=min(uBackground.rgb*uBackground.a+glow,vec3(underAlpha));
  // Glyphs keep their atlas index, exact in 8 bits; the other marks keep the tone, and empty where the charset is blank.
  outInk=vec4(ink,uMark==0||uMark==17?index/255.:uMark==1?(tone>.003?tone:0.):index>0.?max(tone,1./255.):0.);
  outUnder=vec4(under,underAlpha);
}`;
  var a = "#version 300 es\nprecision highp float;\nprecision highp sampler2D;\nuniform sampler2D uAtlas, uCells, uUnder;\nuniform vec2 uResolution, uCell, uPitch;\nuniform float uColumns, uDotScale, uSourceColor;\nuniform vec2 uDir;\nuniform int uMark;\n// Inlay accents: share of tiles, letter shuffle span, a seed that steps a few times a second, charset length.\nuniform vec4 uInlay;\n// Line marks: pitch in cell heights, weight, the share of cells that sparkle.\nuniform vec4 uLine;\nuniform vec4 uFade;\nout vec4 outColor;\nconst float BAYER[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);\nuniform vec3 uRamp[6];\nuniform float uRampCount;\n// The gradient map: the tone run through the ramp's stops, evenly spaced, faintest first.\nvec3 rampAt(float t){\n  float x=clamp(t,0.,1.)*(uRampCount-1.);\n  int i=int(min(floor(x),uRampCount-2.));\n  vec3 a=uRamp[0],b=uRamp[1];\n  for(int k=1;k<5;k++)if(k==i){a=uRamp[k];b=uRamp[k+1];}\n  return mix(a,b,clamp(x-float(i),0.,1.));\n}\n// The Studio's print defaults: roughness .35, seed 7, registration .2 and its coral second ink. The screen angle is uDir (-35deg).\nconst float ROUGH=.35,SEED=7.;\nconst vec3 SECOND=vec3(.925,.404,.322);\nfloat hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n// Coverage of a signed distance given in device pixels.\nfloat cover(float d){return clamp(.5-d,0.,1.);}\nfloat box(vec2 p,vec2 lo,vec2 hi){vec2 a=clamp(p-lo,0.,1.)*clamp(hi-p,0.,1.);return a.x*a.y;}\nfloat disc(vec2 p,vec2 c,float r){return r>.05?cover(length(p-c)-r):0.;}\nfloat ellipse(vec2 p,vec2 c,vec2 r,float a){vec2 d=p-c;d=vec2(cos(a)*d.x+sin(a)*d.y,-sin(a)*d.x+cos(a)*d.y);float k=length(d/r);return cover((k-1.)*min(r.x,r.y));}\n// World-anchored parallel cuts across direction d: period and width in cell heights, so lines run on from cell to cell.\nfloat cuts(vec2 w,vec2 d,float period,float width,float px){\n  if(width<=0.)return 0.;\n  float proj=dot(vec2(-d.y,d.x),w);\n  return cover((abs(fract(proj/period+.5)-.5)*period-width*.5)*px);\n}\n// Lays an ink over what is already down, multiplying where they overlap, as transparent inks do on paper.\nvoid lay(inout vec3 rgb,inout float a,vec3 c,float k){\n  float next=a+k*(1.-a);\n  rgb=next>0.?(rgb*a*(1.-k)+mix(c,rgb*c,a)*k)/next:c;\n  a=next;\n}\nvoid main(){\n  vec2 DIR=uDir;\n  vec2 frag=vec2(gl_FragCoord.x,uResolution.y-gl_FragCoord.y);\n  // The pitch is the atlas cell, or a fractional one under cellFit 'fill', where each glyph sits centred in its stretched cell.\n  vec2 cell=floor(frag/uPitch);\n  vec4 ink=texelFetch(uCells,ivec2(cell),0),under=texelFetch(uUnder,ivec2(cell),0);\n  vec2 local=frag-cell*uPitch;\n  float coverage;\n  vec3 rgb=ink.rgb;\n  // Scatter and inlay: the cell's strength, read back from its ink, and the ink itself at full strength.\n  float strength=1.;\n  if(uFade.w>.5){\n    float top=max(rgb.r,max(rgb.g,rgb.b));\n    strength=uSourceColor>.5?top:clamp(top/max(max(uFade.r,max(uFade.g,uFade.b)),.004),0.,1.);\n    rgb=uSourceColor>.5?rgb/max(top,.004):uFade.rgb;\n  }\n  if(uMark==0||uMark==17){\n    float index=floor(ink.a*255.+.5);\n    // Inlay shuffle: every tiled cell takes a letter from the upper charset, traded for a neighbour a few times a second, so a\n    // tiled body flickers through its letters rather than banding by tone; the tile's shade still carries the tone.\n    float hs=hash(cell*.917+uInlay.z*1.37);\n    if(uMark==17&&uInlay.y>0.&&index>0.&&(index>=uInlay.w*.62||strength>=.2))index=clamp(max(index,ceil(uInlay.w*.62)+1.)+floor((hs-.5)*(2.*uInlay.y+1.)),ceil(uInlay.w*.62),uInlay.w-1.);\n    ivec2 tile=ivec2(int(mod(index,uColumns)),int(floor(index/uColumns)));\n    vec2 texel=floor(local-floor((uPitch-uCell)*.5));\n    coverage=all(greaterThanEqual(texel,vec2(0.)))&&all(lessThan(texel,uCell))?texelFetch(uAtlas,tile*ivec2(uCell)+ivec2(texel),0).a:0.;\n    if(uMark==17){\n      // Inlay: a gapped tile in the ink, lighter the denser the cell, with its character set into it in a darker shade. Faint\n      // cells keep only the character, so a shape's edge frays into specks; empty cells show a hairline grid.\n      vec2 p=local+.5;\n      float gap=max(1.,floor(min(uPitch.x,uPitch.y)*.08+.5));\n      float plate=index>0.?smoothstep(.2,.32,strength)*box(p,vec2(0.),uPitch-gap):0.;\n      // Tile and letter are the ink at two strengths over whatever ground lies below, so the inlay reads on light and dark pages:\n      // the tile strengthens with the tone and the letter is cut back toward the ground.\n      float face=(.18+.8*smoothstep(.05,.8,strength))*plate;\n      // With shuffle on, tiles also vary a little in shade, as worn inlay does.\n      if(uInlay.y>0.)face*=.8+.34*hs;\n      float speck=coverage*min(1.,strength*6.)*(1.-plate);\n      float grid=index>0.?0.:(1.-box(p,vec2(0.),uPitch-1.))*.035;\n      float a=mix(face,face*.22,coverage*plate)+speck;\n      // Accents: a few lit tiles carry a coloured letter, a tinted tile or a white glint, picked afresh with the seed.\n      float ha=hash(cell*1.31+uInlay.z*.71+vec2(7.3,1.9));\n      if(plate>0.&&ha<uInlay.x){\n        float pick=hash(cell+uInlay.z*2.11+vec2(3.1,8.7));\n        vec3 hue=pick<.16?vec3(.86,.27,.27):pick<.3?vec3(.92,.55,.2):pick<.42?vec3(.9,.78,.25):pick<.58?vec3(.35,.72,.38):pick<.72?vec3(.3,.72,.8):pick<.84?vec3(.32,.42,.92):vec3(.66,.42,.86);\n        float kind=ha/uInlay.x;\n        if(kind<.55){float k=coverage*plate;rgb=mix(rgb,hue,k);a=mix(a,1.,k);}\n        else if(kind<.88){rgb=mix(rgb,hue,.55);}\n        else{float k=coverage*plate;rgb=mix(rgb,vec3(1.),1.-k);a=mix(max(a,.96),face*.3,k);}\n      }\n      coverage=a>0.?a:grid;\n    } else coverage*=strength;\n  } else if(uMark==1){\n    // Halftone: dot area follows tone, so midtones read true; edges are antialiased to one device pixel.\n    float r=sqrt(ink.a)*min(uPitch.x,uPitch.y)*.5*uDotScale;\n    coverage=ink.a>.003?clamp(r-length(local-uPitch*.5)+.5,0.,1.):0.;\n  } else if(ink.a<=0.){\n    coverage=0.;\n  } else {\n    float tone=ink.a,side=min(uPitch.x,uPitch.y);\n    vec2 q=local/uPitch,c=uPitch*.5,p=local+.5;\n    // Tiles fade with the tone in one ink, as the Studio's do; in source colour the colour already carries it.\n    float fade=uSourceColor>.5?1.:tone,gap=max(.5,uPitch.x*.06),grain=hash(cell+SEED);\n    vec2 w=(cell+q)*uPitch/uPitch.y;\n    if(uMark==2)coverage=fade;\n    else if(uMark==3)coverage=box(p,vec2(0.),uPitch-gap)*fade;\n    else if(uMark==4){\n      // Lego: a gapped brick, lit from above, with a raised stud ringed by its shadow.\n      coverage=box(p,vec2(0.),uPitch-gap)*fade;\n      rgb*=1.06-.14*q.y;\n      float r=side*.28,d=length(local-c)-r,lit=clamp(dot(c-local,vec2(.6,.8))/r,-1.,1.);\n      rgb=mix(rgb,mix(rgb,vec3(1.),.2+.12*lit),cover(d));\n      rgb=mix(rgb,rgb*.72,cover(abs(d)-max(.5,side*.04)));\n    } else if(uMark==5){\n      // Voxel: an isometric cube; top, left and right faces at full, .72 and .42 strength.\n      float h=.5*abs(q.x-.5);\n      coverage=cover(-min(q.y-h,1.-h-q.y)*uPitch.y)*cover(-min(q.x,1.-q.x)*uPitch.x);\n      coverage*=mix(q.x<.5?.72:.42,1.,cover((q.y-(.5-h))*uPitch.y))*fade;\n    } else if(uMark==6){\n      // Disco: a gapped mirror tile, its upper facet catching light and its lower in shade.\n      coverage=box(p,vec2(0.),uPitch-gap)*fade;\n      rgb=q.y<.35?mix(rgb,vec3(1.),.1+grain*.25):q.y>.65?rgb*.75:rgb;\n    } else if(uMark==18){\n      // Tick: a printed glow. A smooth wash carries the light; over it every cell holds one short upright tick whose strength\n      // steps through four levels by a 4x4 ordered threshold, so the mid tones read as a crisp dither of ticks that brightens\n      // toward the light and melts into the wash at its core. With a ramp the wash runs through it and the ticks sit a step up.\n      ivec2 b=ivec2(mod(cell,4.));\n      float th=(BAYER[b.y*4+b.x]+.5)/16.;\n      float tw=max(1.,floor(uPitch.x*.28+.5)),tl=max(2.,floor(uPitch.y*.46+.5));\n      vec2 lo=floor(c-vec2(tw,tl)*.5);\n      float bar=box(p,lo,lo+vec2(tw,tl));\n      float lvl=clamp(floor(tone*4.+th)/4.,0.,1.);\n      float melt=1.-smoothstep(.7,.96,tone);\n      float at=bar*melt*(.42+.58*lvl);\n      bool ramped=uRampCount>1.5&&uSourceColor<.5;\n      float aw=ramped?pow(smoothstep(.08,.88,tone),1.4):tone*tone*.92;\n      vec3 W=ramped?rampAt(tone):rgb,T=ramped?rampAt(min(1.,lvl+.38)):rgb;\n      float a=at+aw*(1.-at);\n      rgb=a>0.?(T*at+W*aw*(1.-at))/a:W;\n      coverage=a;\n    } else if(uMark==19){\n      // Bayer: one gapped square a cell, on or off by a 4x4 ordered threshold at two strengths, so a picture steps through\n      // empty, half and full squares in the brand's tones, as pixel-dithered art does.\n      ivec2 b=ivec2(mod(cell,4.));\n      float th=(BAYER[b.y*4+b.x]+.5)/16.,g=max(1.,floor(min(uPitch.x,uPitch.y)*(1.-uDotScale)+.5));\n      float lvl=tone>.5+th*.5?1.:tone>th*.5?.5:0.;\n      // An empty cell keeps a small faint square, so the ground reads as a dot grid that the picture fills.\n      vec2 d=floor(c-max(1.,floor(min(uPitch.x,uPitch.y)*.3))*.5);\n      coverage=lvl>0.?box(p,vec2(0.),uPitch-g)*lvl:box(p,d,d+max(1.,floor(min(uPitch.x,uPitch.y)*.3)))*.35;\n    } else if(uMark==7){\n      // Dither: an ordered 4x4 Bayer screen at about five dots a cell, lit where the cell's tone passes the threshold.\n      ivec2 b=ivec2(mod(floor(frag/max(1.,floor(side/5.))),4.));\n      coverage=tone>(BAYER[b.y*4+b.x]+.5)/16.?1.:0.;\n    } else if(uMark==8){\n      // Hex: a flat-topped hexagon filling the cell.\n      vec2 h=abs((local-c)/(uPitch*.49));\n      coverage=cover(max(h.y-.866,h.x*.866+h.y*.5-.866)*side*.49)*fade;\n    } else if(uMark==9){\n      // LED: a round lamp with a soft halo and a specular glint, separated by an unlit matrix.\n      float r=side*.39,d=length(local-c);\n      coverage=max(cover(d-r),.3*exp(-pow(max(0.,d-r)/(side*.12),2.)))*fade;\n      rgb=mix(rgb,vec3(1.),.35*disc(local,uPitch*vec2(.43,.4),side*.11));\n    } else if(uMark==10){\n      // CMYK: the cell's hue separated into offset cyan, magenta and yellow dots, each sized by its share of the tone. The\n      // key screen carries the neutral share in the ink's own lightness, since a light ink on a dark page has no black.\n      float top=max(rgb.r,max(rgb.g,rgb.b)),low=min(rgb.r,min(rgb.g,rgb.b));\n      vec3 cmy=(top-rgb)/max(top,.001);\n      float a=0.;vec3 col=vec3(1.);\n      lay(col,a,vec3(top),disc(local,c,side*.48*sqrt(tone*low/max(top,.001))));\n      lay(col,a,vec3(0.,1.,1.),disc(local,uPitch*vec2(.36,.36),side*.48*sqrt(tone*cmy.x)));\n      lay(col,a,vec3(1.,0.,1.),disc(local,uPitch*vec2(.64,.36),side*.48*sqrt(tone*cmy.y)));\n      lay(col,a,vec3(1.,1.,0.),disc(local,uPitch*vec2(.5,.66),side*.48*sqrt(tone*cmy.z)));\n      rgb=col;coverage=a;\n    } else if(uMark==11||uMark==16){\n      // Stipple and pointillism: four jittered marks a cell, their size following the tone.\n      coverage=0.;vec3 col=rgb;\n      for(int m=0;m<4;m++){\n        vec2 o=vec2(float(m%2),float(m/2));\n        float j=hash(cell*2.+o+SEED),jy=hash(cell+o*11.+SEED+1.);\n        vec2 at=((o+.5)/2.+(vec2(j,jy)-.5)*ROUGH*.28)*uPitch;\n        float r=min(min(min(at.x,uPitch.x-at.x),min(at.y,uPitch.y-at.y)),side*min(.245,.21*sqrt(tone)*(1.-ROUGH*j*.35)));\n        float k=uMark==11?disc(local,at,r):ellipse(local,at,vec2(r,r*.64),j*3.14159);\n        if(uMark==16&&k>coverage)col=uSourceColor>.5?clamp(rgb+(j-.5)*ROUGH*.25*vec3(1.,-.4,-1.),0.,1.):rgb*(1.+(j-.5)*ROUGH*.5);\n        coverage=max(coverage,k);\n      }\n      rgb=col;\n    } else if(uMark==12||uMark==13){\n      // Engraving and crosshatch: parallel cuts whose weight follows the tone; crossings join only in the darker tones.\n      float cv=tone*(1.-ROUGH*grain*.3),px=uPitch.y,P=uLine.x,W=uLine.y*.72*P;\n      coverage=cuts(w,DIR,P,min(.94*P,W*cv),px);\n      if(uMark==13){\n        coverage=max(coverage,cuts(w,vec2(-DIR.y,DIR.x),P,min(.94*P,W*max(0.,cv*1.5-.3)),px)*step(.2,cv));\n        coverage=max(coverage,cuts(w,normalize(DIR+vec2(-DIR.y,DIR.x)),P,min(.94*P,W*max(0.,cv*2.-1.2)),px)*step(.6,cv));\n      }\n      // Sparkle: now and then a lit cell catches a small bright square, picked afresh a few times a second.\n      if(uLine.z>0.&&tone>.2&&hash(cell*1.7+uInlay.z*.53)<uLine.z){float sq=max(1.,floor(side*.3+.5));vec2 lo=floor(c-sq*.5);float k=box(p,lo,lo+sq);coverage=max(coverage,k);rgb=mix(rgb,vec3(1.),k*.6);}\n    } else if(uMark==14){\n      // Woodblock: broad carved bands in five stepped weights, their edges wavering along the grain.\n      float cv=ceil(tone*(1.-ROUGH*grain*.3)*5.)/5.,width=min(.94,.72*cv);\n      float proj=dot(vec2(-DIR.y,DIR.x),w),line=floor(proj+.5),along=dot(DIR,w);\n      float cut=sin(along*5.3+line*1.9+SEED)*.5+sin(along*13.1+line)*.25;\n      coverage=cover((abs(proj-line)-width*.5*(1.+ROUGH*cut*.5))*uPitch.y);\n    } else if(uMark==15){\n      // Risograph: two offset screens, the main ink and the coral second ink, misregistered along the screen angle.\n      float split=uSourceColor>.5?clamp(.5+(rgb.r-rgb.b)*.5,0.,1.):.5,r=side*min(.48,.44*sqrt(tone));\n      float a=0.;vec3 col=rgb;\n      lay(col,a,rgb,disc(local,c,r*sqrt(.35+(1.-split)*.65)));\n      lay(col,a,SECOND,disc(local,c+DIR*.2*.38*side,r*sqrt(.3+split*.7)*(1.-ROUGH*hash(cell+SEED+13.)*.3)));\n      rgb=col;coverage=a;\n    } else coverage=0.;\n  }\n  outColor=vec4(rgb*coverage+under.rgb*(1.-coverage),coverage+under.a*(1.-coverage));\n}";
  var r = "#version 300 es\nprecision highp float;\nprecision highp sampler2D;\nuniform vec2 uTexel;\nout vec4 outColor;\nvec2 here(){return gl_FragCoord.xy*uTexel;}\n";
  var o = r + "\nuniform sampler2D uVelocity;\nuniform vec2 uFrom, uTo, uForce;\nuniform float uAspect, uRadius;\nfloat segment(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-8),0.,1.);return length(pa-ba*h);}\nvoid main(){\n  vec2 uv=here(),scale=vec2(uAspect,1.);\n  float d=segment(uv*scale,uFrom*scale,uTo*scale);\n  outColor=vec4(texture(uVelocity,uv).xy+uForce*exp(-d*d/(uRadius*uRadius)),0.,1.);\n}";
  var i = r + "\nuniform sampler2D uVelocity;\nvoid main(){\n  vec2 uv=here();\n  float l=texture(uVelocity,uv-vec2(uTexel.x,0.)).y,r=texture(uVelocity,uv+vec2(uTexel.x,0.)).y;\n  float t=texture(uVelocity,uv+vec2(0.,uTexel.y)).x,b=texture(uVelocity,uv-vec2(0.,uTexel.y)).x;\n  outColor=vec4(.5*(r-l-t+b),0.,0.,1.);\n}";
  var l = r + "\nuniform sampler2D uVelocity, uCurl;\nuniform float uStrength, uDt;\nvoid main(){\n  vec2 uv=here();\n  float l=texture(uCurl,uv-vec2(uTexel.x,0.)).x,r=texture(uCurl,uv+vec2(uTexel.x,0.)).x;\n  float t=texture(uCurl,uv+vec2(0.,uTexel.y)).x,b=texture(uCurl,uv-vec2(0.,uTexel.y)).x,c=texture(uCurl,uv).x;\n  vec2 force=.5*vec2(abs(t)-abs(b),abs(r)-abs(l));\n  force=force/(length(force)+1e-4)*uStrength*c;\n  force.y=-force.y;\n  outColor=vec4(clamp(texture(uVelocity,uv).xy+force*uDt,-1000.,1000.),0.,1.);\n}";
  var s = r + "\nuniform sampler2D uVelocity;\nvoid main(){\n  vec2 uv=here(),c=texture(uVelocity,uv).xy;\n  float l=texture(uVelocity,uv-vec2(uTexel.x,0.)).x,r=texture(uVelocity,uv+vec2(uTexel.x,0.)).x;\n  float t=texture(uVelocity,uv+vec2(0.,uTexel.y)).y,b=texture(uVelocity,uv-vec2(0.,uTexel.y)).y;\n  if(uv.x-uTexel.x<0.)l=-c.x;\n  if(uv.x+uTexel.x>1.)r=-c.x;\n  if(uv.y+uTexel.y>1.)t=-c.y;\n  if(uv.y-uTexel.y<0.)b=-c.y;\n  outColor=vec4(.5*(r-l+t-b),0.,0.,1.);\n}";
  var c = r + "\nuniform sampler2D uSource;\nuniform float uAmount;\nvoid main(){outColor=vec4(texture(uSource,here()).x*uAmount,0.,0.,1.);}";
  var u = r + "\nuniform sampler2D uPressure, uDivergence;\nvoid main(){\n  vec2 uv=here();\n  float l=texture(uPressure,uv-vec2(uTexel.x,0.)).x,r=texture(uPressure,uv+vec2(uTexel.x,0.)).x;\n  float t=texture(uPressure,uv+vec2(0.,uTexel.y)).x,b=texture(uPressure,uv-vec2(0.,uTexel.y)).x;\n  outColor=vec4((l+r+b+t-texture(uDivergence,uv).x)*.25,0.,0.,1.);\n}";
  var h = r + "\nuniform sampler2D uPressure, uVelocity;\nvoid main(){\n  vec2 uv=here();\n  float l=texture(uPressure,uv-vec2(uTexel.x,0.)).x,r=texture(uPressure,uv+vec2(uTexel.x,0.)).x;\n  float t=texture(uPressure,uv+vec2(0.,uTexel.y)).x,b=texture(uPressure,uv-vec2(0.,uTexel.y)).x;\n  outColor=vec4(texture(uVelocity,uv).xy-vec2(r-l,t-b),0.,1.);\n}";
  var f = r + "\nuniform sampler2D uVelocity;\nuniform float uDt, uDissipation;\nvoid main(){\n  vec2 uv=here();\n  vec2 back=uv-uDt*texture(uVelocity,uv).xy*uTexel;\n  outColor=vec4(texture(uVelocity,back).xy/(1.+uDissipation*uDt),0.,1.);\n}";
  var d = /* @__PURE__ */ new Set();
  var m = 0;
  var p = 0;
  var g = null;
  var v = [];
  var x = 0;
  var M = 1;
  var y = 0;
  var w = 0;
  function b(e2) {
    m = 0, x && e2 > x && (v.push(e2 - x), v.length > 120 && v.shift()), x = e2, p = performance.now();
    const t3 = [...d];
    d.clear();
    for (const n5 of t3) try {
      n5(e2);
    } catch (e3) {
      "undefined" != typeof console && console.error(e3);
    }
    oe?.endFrame(e2);
    const n4 = performance.now() - p;
    if (y = 0.9 * y + 0.1 * n4, e2 - w > 500) {
      w = e2;
      const t4 = R(), n5 = !!oe?.overloaded;
      (y > 0.5 * t4 || n5) && M < 3 ? M++ : y < 0.2 * t4 && !n5 && M > 1 && M--;
    }
    d.size || (x = 0);
  }
  var E = () => M;
  function T(e2) {
    d.add(e2), m && g !== requestAnimationFrame && (m = 0), m || (g = requestAnimationFrame, m = requestAnimationFrame(b));
  }
  function k(e2) {
    d.delete(e2), !d.size && m && (cancelAnimationFrame(m), m = 0, x = 0);
  }
  function R() {
    if (v.length < 20) return 1e3 / 60;
    const e2 = [...v].sort((e3, t3) => e3 - t3);
    return Math.min(1e3 / 60, Math.max(1e3 / 360, e2[Math.floor(0.2 * e2.length)]));
  }
  var A = /* @__PURE__ */ new Set();
  var F = /* @__PURE__ */ new Set();
  var S = /* @__PURE__ */ new Set();
  var _ = /* @__PURE__ */ new Set();
  var L = /* @__PURE__ */ new Set();
  var C = false;
  var P = null;
  var D = null;
  var U = null;
  var I = null;
  var B = (e2) => {
    let t3 = null;
    for (const n4 of A) {
      if (n4.target === window) {
        (!n4.near || n4.near() || n4.inside) && n4.move(e2);
        continue;
      }
      t3 ?? (t3 = e2.composedPath());
      t3.includes(n4.target) ? (n4.inside = true, n4.move(e2)) : n4.inside && (n4.inside = false, n4.leave());
    }
  };
  var N = () => {
    for (const e2 of A) e2.inside = false, e2.leave();
  };
  var G = () => {
    for (const e2 of [...F]) e2();
  };
  var X = () => {
    for (const e2 of [...S]) e2();
  };
  var q = () => {
    for (const e2 of [..._]) e2();
  };
  var O = (e2) => {
    for (const t3 of [...L]) t3(e2);
  };
  function H() {
    const e2 = A.size + F.size + S.size + _.size + L.size > 0;
    if ("undefined" == typeof document) return;
    if (P !== document && (C = false, P = document, D = U = null, I = null), e2 === C) return;
    C = e2;
    const t3 = e2 ? "addEventListener" : "removeEventListener";
    if ("undefined" != typeof window && (window[t3]?.("pointermove", B, { capture: true, passive: true }), window[t3]?.("pointerdown", B, { capture: true, passive: true })), document[t3]?.("pointerleave", N), document[t3]?.("visibilitychange", G), ("undefined" == typeof document ? void 0 : document.fonts)?.[t3]?.("loadingdone", O), D ?? (D = "function" == typeof matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null), U ?? (U = "function" == typeof matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null), D?.[t3]?.("change", X), U?.[t3]?.("change", q), e2) {
      I ?? (I = "function" == typeof MutationObserver ? new MutationObserver(q) : null);
      for (const e3 of [document.documentElement, document.body]) e3 && I?.observe(e3, { attributes: true, attributeFilter: ["class", "data-theme", "data-mode", "style"] });
    } else I?.disconnect();
  }
  var z = (e2, t3) => (e2.add(t3), H(), () => {
    e2.delete(t3) && H();
  });
  function W(e2) {
    const t3 = e2.target;
    if ("undefined" == typeof window || t3 === window || "undefined" == typeof document) return z(A, e2);
    const n4 = t3, a5 = n4.getRootNode?.();
    if (n4.ownerDocument === document && (!a5 || a5 === document)) return z(A, e2);
    const r2 = e2.move, o3 = () => e2.leave();
    return n4.addEventListener("pointermove", r2, { passive: true }), n4.addEventListener("pointerdown", r2, { passive: true }), n4.addEventListener("pointerleave", o3), () => {
      n4.removeEventListener("pointermove", r2), n4.removeEventListener("pointerdown", r2), n4.removeEventListener("pointerleave", o3);
    };
  }
  var V = (e2) => z(F, e2);
  var j = (e2) => z(S, e2);
  var Y = (e2) => z(_, e2);
  var K = /* @__PURE__ */ new Map();
  var $ = null;
  var Q = /* @__PURE__ */ new Map();
  var J = (e2) => (t3) => {
    for (const n4 of t3) for (const t4 of [...e2.get(n4.target) ?? []]) t4(n4);
  };
  var Z = (e2, t3, n4) => {
    const a5 = e2.get(t3);
    return a5 ? (a5.add(n4), false) : (e2.set(t3, /* @__PURE__ */ new Set([n4])), true);
  };
  var ee = (e2, t3, n4) => {
    const a5 = e2.get(t3);
    return !(!a5?.delete(n4) || a5.size) && (e2.delete(t3), true);
  };
  function te(e2, t3) {
    return "function" != typeof ResizeObserver ? () => {
    } : ($ ?? ($ = new ResizeObserver(J(K))), Z(K, e2, t3) ? $.observe(e2) : queueMicrotask(() => {
      K.get(e2)?.has(t3) && t3({ target: e2 });
    }), () => {
      ee(K, e2, t3) && $?.unobserve(e2), K.size || ($?.disconnect(), $ = null);
    });
  }
  var ne = 268435456;
  var ae = [1, 0.85, 0.7, 0.58, 0.5];
  var re = class {
    constructor() {
      this.lost = false, this.level = 0, this.programs = /* @__PURE__ */ new Map(), this.atlases = /* @__PURE__ */ new Map(), this.vertex = null, this.vao = null, this.clients = /* @__PURE__ */ new Set(), this.parallel = null, this.timer = null, this.queries = [], this.open = null, this.drew = false, this.gpuMs = [], this.cpuMs = [], this.changedAt = 0, this.lostTimer = 0, this.renderer = "", this.overloaded = false, this.onLost = (e2) => {
        e2.preventDefault(), this.lost = true, this.reset();
        for (const e3 of [...this.clients]) e3.lost();
        clearTimeout(this.lostTimer), this.lostTimer = setTimeout(() => {
          if (this.lost) {
            this.canvas.removeEventListener?.("webglcontextlost", this.onLost), this.canvas.removeEventListener?.("webglcontextrestored", this.onRestored);
            try {
              this.create();
            } catch {
              return;
            }
            this.restored();
          }
        }, 1e3);
      }, this.onRestored = () => {
        clearTimeout(this.lostTimer), this.lost = false, this.restored();
      }, this.idleTimer = 0, this.create();
    }
    create() {
      let e2 = null, t3 = null;
      const r2 = { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" };
      if ("undefined" != typeof document && (e2 = document.createElement("canvas"), t3 = e2.getContext("webgl2", r2)), !t3 && "function" == typeof OffscreenCanvas) try {
        e2 = new OffscreenCanvas(1, 1), t3 = e2.getContext("webgl2", r2);
      } catch {
        t3 = null;
      }
      if (!t3 || !e2) throw new Error("WebGL2 is not available for the glyph field.");
      this.canvas = e2, this.gl = t3, this.lost = false, e2.width = e2.height = 1, this.parallel = t3.getExtension("KHR_parallel_shader_compile"), this.timer = t3.getExtension("EXT_disjoint_timer_query_webgl2");
      const o3 = t3.getExtension("WEBGL_debug_renderer_info");
      this.renderer = String(t3.getParameter(o3 ? o3.UNMASKED_RENDERER_WEBGL : t3.RENDERER) ?? ""), e2.addEventListener?.("webglcontextlost", this.onLost), e2.addEventListener?.("webglcontextrestored", this.onRestored);
      const i4 = !t3.getExtension("EXT_color_buffer_float") && !t3.getExtension("EXT_color_buffer_half_float");
      this.program(n(i4)), this.program(a);
    }
    restored() {
      for (const e2 of [...this.clients]) e2.restored();
    }
    reset() {
      this.programs.clear(), this.atlases.clear(), this.vertex = null, this.vao = null, this.queries = [], this.open = null, this.gpuMs = [], this.cpuMs = [];
    }
    join(e2) {
      this.clients.add(e2), clearTimeout(this.idleTimer);
    }
    leave(e2) {
      this.clients.delete(e2), this.clients.size ? this.fit() : (this.lost || (this.canvas.width = this.canvas.height = 1, this.level = 0), clearTimeout(this.idleTimer), this.idleTimer = setTimeout(() => {
        this.clients.size || this.dispose();
      }, 3e3));
    }
    dispose() {
      if (clearTimeout(this.lostTimer), this.canvas.removeEventListener?.("webglcontextlost", this.onLost), this.canvas.removeEventListener?.("webglcontextrestored", this.onRestored), !this.lost) try {
        this.gl.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
      }
      this.reset(), oe === this && (oe = null);
    }
    program(e2) {
      const t3 = this.programs.get(e2);
      if (t3) return t3;
      const n4 = this.gl, a5 = (e3, t4) => {
        const a6 = n4.createShader(e3);
        return n4.shaderSource(a6, t4), n4.compileShader(a6), a6;
      };
      this.vertex ?? (this.vertex = a5(n4.VERTEX_SHADER, "#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}"));
      const r2 = n4.createProgram(), o3 = a5(n4.FRAGMENT_SHADER, e2);
      n4.attachShader(r2, this.vertex), n4.attachShader(r2, o3), n4.linkProgram(r2);
      const i4 = { program: r2, locations: null, fragment: o3 };
      return this.programs.set(e2, i4), i4;
    }
    linked(e2, t3 = false) {
      if (e2.locations) return true;
      const n4 = this.gl;
      if (!t3 && this.parallel && !n4.getProgramParameter(e2.program, this.parallel.COMPLETION_STATUS_KHR)) return false;
      if (!n4.getProgramParameter(e2.program, n4.LINK_STATUS)) {
        if (n4.isContextLost()) return false;
        throw new Error(e2.fragment && n4.getShaderInfoLog(e2.fragment) || n4.getProgramInfoLog(e2.program) || "Glyph field program failed to link.");
      }
      const a5 = {};
      for (let t4 = n4.getProgramParameter(e2.program, n4.ACTIVE_UNIFORMS) - 1; t4 >= 0; t4--) {
        const r2 = n4.getActiveUniform(e2.program, t4).name.replace(/\[0\]$/, "");
        a5[r2] = n4.getUniformLocation(e2.program, r2);
      }
      return e2.locations = a5, true;
    }
    get canCompileInParallel() {
      return !!this.parallel;
    }
    vertexArray() {
      return this.vao ?? (this.vao = this.gl.createVertexArray());
    }
    atlas(e2, t3, n4) {
      let a5 = this.atlases.get(e2);
      if (a5) a5.refs || (this.atlases.delete(e2), this.atlases.set(e2, a5));
      else {
        const n5 = this.gl, r2 = n5.createTexture();
        n5.bindTexture(n5.TEXTURE_2D, r2);
        for (const [e3, t4] of [[n5.TEXTURE_MIN_FILTER, n5.NEAREST], [n5.TEXTURE_MAG_FILTER, n5.NEAREST], [n5.TEXTURE_WRAP_S, n5.CLAMP_TO_EDGE], [n5.TEXTURE_WRAP_T, n5.CLAMP_TO_EDGE]]) n5.texParameteri(n5.TEXTURE_2D, e3, t4);
        a5 = { key: e2, texture: r2, refs: 0, final: false, users: /* @__PURE__ */ new Set(), bytes: 0 }, this.atlases.set(e2, a5), this.paintAtlas(a5, t3);
      }
      return a5.refs++, a5.users.add(n4), a5;
    }
    hasAtlas(e2) {
      return this.atlases.has(e2);
    }
    paintAtlas(e2, t3) {
      const n4 = this.gl, { image: a5, final: r2 } = t3();
      n4.bindTexture(n4.TEXTURE_2D, e2.texture), n4.pixelStorei(n4.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false), n4.pixelStorei(n4.UNPACK_FLIP_Y_WEBGL, false), n4.texImage2D(n4.TEXTURE_2D, 0, n4.RGBA8, n4.RGBA, n4.UNSIGNED_BYTE, a5), e2.bytes = a5.width * a5.height * 4, e2.final = r2;
      for (const t4 of [...e2.users]) t4();
    }
    releaseAtlas(e2, t3) {
      e2 && e2.users.delete(t3) && (--e2.refs > 0 || this.evictAtlases());
    }
    evictAtlases() {
      const e2 = [...this.atlases.values()].filter((e3) => !e3.refs);
      let t3 = e2.length - 32;
      for (const n4 of e2) {
        if (t3 <= 0 && !this.overBudget) break;
        t3--, this.atlases.delete(n4.key), this.lost || this.gl.deleteTexture(n4.texture);
      }
    }
    fit() {
      if (this.lost) return;
      let e2 = 1, t3 = 1;
      for (const n5 of this.clients) {
        const [a6, r2] = n5.size();
        e2 = Math.max(e2, a6), t3 = Math.max(t3, r2);
      }
      const n4 = this.canvas, a5 = (e3) => 256 * Math.ceil(e3 / 256);
      n4.width * n4.height > a5(e2) * a5(t3) * 2 && (n4.width = a5(e2), n4.height = a5(t3));
    }
    get bytes() {
      let e2 = this.canvas.width * this.canvas.height * 4 * 2;
      for (const t3 of this.clients) e2 += t3.bytes();
      for (const t3 of this.atlases.values()) e2 += t3.bytes;
      return e2;
    }
    get overBudget() {
      return this.bytes > ne;
    }
    get roomy() {
      return this.bytes < 2281701376e-1;
    }
    begin(e2, t3) {
      const n4 = this.canvas;
      if (n4.width < e2 || n4.height < t3) {
        const a5 = (e3) => 256 * Math.ceil(e3 / 256);
        n4.width = Math.max(n4.width, a5(e2)), n4.height = Math.max(n4.height, a5(t3));
      }
      if (!this.drew && (this.drew = true, this.timer && !this.open && this.queries.length < 4)) {
        const e3 = this.gl.createQuery();
        e3 && (this.gl.beginQuery(this.timer.TIME_ELAPSED_EXT, e3), this.open = e3);
      }
    }
    present(e2, t3, n4) {
      e2.globalCompositeOperation = "copy", e2.imageSmoothingEnabled = false, e2.drawImage(this.canvas, 0, this.canvas.height - n4, t3, n4, 0, 0, t3, n4);
    }
    endFrame(e2) {
      if (this.lost) return void (this.drew = false);
      const t3 = this.gl, n4 = this.timer;
      if (this.drew && (this.cpuMs.push(performance.now() - p), this.cpuMs.length > 60 && this.cpuMs.shift(), n4 && this.open && (t3.endQuery(n4.TIME_ELAPSED_EXT), this.queries.push({ query: this.open, frame: e2 }), this.open = null)), this.drew = false, n4) {
        const e3 = t3.getParameter(n4.GPU_DISJOINT_EXT);
        for (; this.queries.length && t3.getQueryParameter(this.queries[0].query, t3.QUERY_RESULT_AVAILABLE); ) {
          const { query: n5 } = this.queries.shift();
          e3 || (this.gpuMs.push(t3.getQueryParameter(n5, t3.QUERY_RESULT) / 1e6), this.gpuMs.length > 60 && this.gpuMs.shift()), t3.deleteQuery(n5);
        }
      }
      this.adapt(e2);
    }
    adapt(e2) {
      const t3 = R(), n4 = this.gpuMs.length >= 5 && Math.min(...this.gpuMs.slice(-5)) > 1.5 * t3, a5 = this.gpuMs.length >= 10 || n4 ? this.gpuMs : null;
      let r2;
      if (a5) r2 = [...a5].sort((e3, t4) => e3 - t4)[Math.floor(0.75 * a5.length)] / t3;
      else {
        if (v.length < 30 || this.cpuMs.length < 10) return;
        const e3 = v.slice(-30).sort((e4, t4) => e4 - t4), n5 = [...this.cpuMs].sort((e4, t4) => e4 - t4)[this.cpuMs.length >> 1];
        r2 = e3[Math.floor(0.75 * e3.length)] / t3 > 1.6 && n5 < 0.5 * t3 ? 1 : 0.5;
      }
      if (this.overloaded = r2 > 0.8 && this.atMinimum, e2 - this.changedAt < (r2 > 0.8 ? 800 : 4e3)) return;
      let o3 = this.level;
      if (r2 > 2 ? o3 = ae.length - 1 : r2 > 0.8 && o3 < ae.length - 1 ? o3++ : r2 < 0.3 && o3 > 0 && o3--, o3 !== this.level) {
        this.level = o3, this.changedAt = e2, this.gpuMs = [], this.cpuMs = [];
        for (const e3 of [...this.clients]) e3.rescale();
      }
    }
    get scale() {
      return ae[this.level];
    }
    get atMinimum() {
      return this.level === ae.length - 1;
    }
  };
  var oe = null;
  var ie = false;
  function le() {
    if (oe || ie) return oe;
    try {
      oe = new re();
    } catch {
      ie = true;
    }
    return oe;
  }
  var se = () => oe;
  var ce = /* @__PURE__ */ new WeakSet();
  var ue = (e2) => ce.has(e2);
  var he = /^[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]|^[\u{20000}-\u{3fffd}]/u;
  var fe = (e2) => he.test(e2);
  var de = class {
    constructor(e2, t3, n4) {
      this.previous = null, this.peak = 0, this.width = e2, this.height = t3, this.span = n4 ?? Math.min(e2, t3);
      const a5 = e2 * t3;
      this.pixels = new Uint8Array(4 * a5), this.signal = new Float32Array(a5), this.offsetX = new Float32Array(a5), this.offsetY = new Float32Array(a5), this.driftX = new Float32Array(a5), this.driftY = new Float32Array(a5), this.u = new Float32Array(a5), this.v = new Float32Array(a5), this.ink = new Float32Array(a5), this.a = new Float32Array(a5), this.b = new Float32Array(a5), this.c = new Float32Array(a5), this.pressure = new Float32Array(a5), this.pressureNext = new Float32Array(a5), this.divergence = new Float32Array(a5), this.curl = new Float32Array(a5);
    }
    get active() {
      return this.peak > 2e-4;
    }
    clear() {
      for (const e2 of [this.u, this.v, this.ink, this.a, this.b, this.c, this.pressure, this.pressureNext, this.divergence, this.curl, this.signal, this.pixels, this.offsetX, this.offsetY, this.driftX, this.driftY]) e2.fill(0);
      this.previous = null, this.peak = 0;
    }
    leave() {
      this.previous = null;
    }
    move(e2, t3, n4, a5 = performance.now()) {
      if (!Number.isFinite(e2 + t3 + n4 + a5)) return;
      e2 = Math.max(0, Math.min(1, e2)), t3 = Math.max(0, Math.min(1, t3)), n4 = Math.max(0.1, Math.min(1, n4));
      const r2 = this.previous;
      if (this.previous = { x: e2, y: t3, time: a5 }, !r2) return;
      const o3 = (e2 - r2.x) * (this.width - 1), i4 = (t3 - r2.y) * (this.height - 1), l3 = Math.hypot(o3, i4);
      if (l3 < 1e-3) return;
      const s4 = this.span, c5 = a5 > r2.time ? Math.max(1 / 240, (a5 - r2.time) / 1e3) : 1 / 60, u3 = Math.min(12, l3 / s4 / c5), h4 = 1 - Math.exp(-u3 / 2.2), f3 = s4 * (0.022 + 0.075 * n4) * (0.65 + 0.95 * h4), d4 = Math.min(128, Math.max(1, Math.ceil(l3 / (0.4 * f3)))), m4 = l3 / f3 * (0.32 + 0.22 * h4) / d4, p3 = o3 / l3, g3 = i4 / l3, v4 = -g3, x2 = p3, M4 = l3 * (2 + 18 * h4) / d4;
      for (let n5 = 0; n5 < d4; n5++) {
        const a6 = (n5 + 0.5) / d4, o4 = (r2.x + (e2 - r2.x) * a6) * (this.width - 1), i5 = (r2.y + (t3 - r2.y) * a6) * (this.height - 1), l4 = Math.max(1, Math.floor(o4 - 3 * f3)), s5 = Math.min(this.width - 2, Math.ceil(o4 + 3 * f3)), c6 = Math.max(1, Math.floor(i5 - 3 * f3)), u4 = Math.min(this.height - 2, Math.ceil(i5 + 3 * f3));
        for (let e3 = c6; e3 <= u4; e3++) for (let t4 = l4; t4 <= s5; t4++) {
          const n6 = ((t4 - o4) * p3 + (e3 - i5) * g3) / f3, a7 = ((t4 - o4) * v4 + (e3 - i5) * x2) / f3, r3 = Math.exp(-n6 * n6 * 0.65 - a7 * a7 * 1.7), l5 = e3 * this.width + t4;
          this.ink[l5] = 1 - (1 - this.ink[l5]) * Math.exp(-r3 * m4);
          const s6 = 1 - a7 * a7 * 0.55, c7 = n6 * a7 * 0.7;
          this.u[l5] = Math.max(-80, Math.min(80, this.u[l5] + (p3 * s6 + v4 * c7) * r3 * M4)), this.v[l5] = Math.max(-80, Math.min(80, this.v[l5] + (g3 * s6 + x2 * c7) * r3 * M4));
        }
      }
      this.peak = 1;
    }
    read(e2, t3, n4) {
      const a5 = 0 | (t3 = Math.max(0.5, Math.min(this.width - 1.5, t3))), r2 = 0 | (n4 = Math.max(0.5, Math.min(this.height - 1.5, n4))), o3 = t3 - a5, i4 = n4 - r2, l3 = r2 * this.width + a5;
      return (e2[l3] * (1 - o3) + e2[l3 + 1] * o3) * (1 - i4) + (e2[l3 + this.width] * (1 - o3) + e2[l3 + this.width + 1] * o3) * i4;
    }
    sample(e2, t3) {
      return this.read(this.signal, e2 * (this.width - 1), t3 * (this.height - 1));
    }
    displacement(e2, t3, n4) {
      n4[0] = this.read(this.offsetX, e2 * (this.width - 1), t3 * (this.height - 1)), n4[1] = this.read(this.offsetY, e2 * (this.width - 1), t3 * (this.height - 1));
    }
    step(e2) {
      if (!this.active || !Number.isFinite(e2)) return;
      let t3 = Math.max(0, Math.min(0.05, e2));
      const n4 = this.width, a5 = this.height;
      for (; t3 > 1e-7; ) {
        const e3 = Math.min(1 / 60, t3);
        t3 -= e3;
        const r2 = Math.exp(-1.9 * e3), o3 = Math.exp(-3.2 * e3);
        for (let t4 = 1; t4 < a5 - 1; t4++) for (let i5 = 1; i5 < n4 - 1; i5++) {
          const l3 = t4 * n4 + i5, s4 = Math.max(0.5, Math.min(n4 - 1.5, i5 - this.u[l3] * e3)), c5 = Math.max(0.5, Math.min(a5 - 1.5, t4 - this.v[l3] * e3)), u3 = 0 | s4, h4 = 0 | c5, f3 = s4 - u3, d4 = c5 - h4, m4 = h4 * n4 + u3, p3 = (1 - f3) * (1 - d4), g3 = f3 * (1 - d4), v4 = (1 - f3) * d4, x2 = f3 * d4;
          this.a[l3] = (this.u[m4] * p3 + this.u[m4 + 1] * g3 + this.u[m4 + n4] * v4 + this.u[m4 + n4 + 1] * x2) * r2, this.b[l3] = (this.v[m4] * p3 + this.v[m4 + 1] * g3 + this.v[m4 + n4] * v4 + this.v[m4 + n4 + 1] * x2) * r2, this.c[l3] = (this.ink[m4] * p3 + this.ink[m4 + 1] * g3 + this.ink[m4 + n4] * v4 + this.ink[m4 + n4 + 1] * x2) * o3;
        }
        [this.u, this.a] = [this.a, this.u], [this.v, this.b] = [this.b, this.v], [this.ink, this.c] = [this.c, this.ink];
        for (let e4 = 1; e4 < a5 - 1; e4++) for (let t4 = 1; t4 < n4 - 1; t4++) {
          const a6 = e4 * n4 + t4;
          this.curl[a6] = 0.5 * (this.v[a6 + 1] - this.v[a6 - 1] - this.u[a6 + n4] + this.u[a6 - n4]);
        }
        for (let t4 = 1; t4 < a5 - 1; t4++) for (let a6 = 1; a6 < n4 - 1; a6++) {
          const r3 = t4 * n4 + a6, o4 = Math.abs(this.curl[r3 + 1]) - Math.abs(this.curl[r3 - 1]), i5 = Math.abs(this.curl[r3 + n4]) - Math.abs(this.curl[r3 - n4]), l3 = Math.hypot(o4, i5) + 1e-4, s4 = this.curl[r3] * e3 * 10, c5 = Math.hypot(this.u[r3], this.v[r3]);
          this.u[r3] += i5 / l3 * s4, this.v[r3] -= o4 / l3 * s4;
          const u3 = Math.min(1, c5 / (Math.hypot(this.u[r3], this.v[r3]) + 1e-6));
          this.u[r3] *= u3, this.v[r3] *= u3, this.divergence[r3] = -0.5 * (this.u[r3 + 1] - this.u[r3 - 1] + this.v[r3 + n4] - this.v[r3 - n4]);
        }
        this.pressure.fill(0);
        for (let e4 = 0; e4 < 4; e4++) {
          for (let e5 = 1; e5 < a5 - 1; e5++) for (let t4 = 1; t4 < n4 - 1; t4++) {
            const a6 = e5 * n4 + t4;
            this.pressureNext[a6] = 0.25 * (this.divergence[a6] + this.pressure[a6 - 1] + this.pressure[a6 + 1] + this.pressure[a6 - n4] + this.pressure[a6 + n4]);
          }
          [this.pressure, this.pressureNext] = [this.pressureNext, this.pressure];
        }
        let i4 = 0;
        for (let t4 = 1; t4 < a5 - 1; t4++) for (let a6 = 1; a6 < n4 - 1; a6++) {
          const r3 = t4 * n4 + a6;
          this.u[r3] = Math.max(-80, Math.min(80, this.u[r3] - 0.5 * (this.pressure[r3 + 1] - this.pressure[r3 - 1]))), this.v[r3] = Math.max(-80, Math.min(80, this.v[r3] - 0.5 * (this.pressure[r3 + n4] - this.pressure[r3 - n4]))), this.driftX[r3] += (3.6 * this.u[r3] - 58 * this.offsetX[r3] - 12 * this.driftX[r3]) * e3, this.driftY[r3] += (3.6 * this.v[r3] - 58 * this.offsetY[r3] - 12 * this.driftY[r3]) * e3, this.offsetX[r3] = Math.max(-2, Math.min(2, this.offsetX[r3] + this.driftX[r3] * e3)), this.offsetY[r3] = Math.max(-2, Math.min(2, this.offsetY[r3] + this.driftY[r3] * e3)), this.signal[r3] = 1 - Math.exp(0.06 * -Math.hypot(this.u[r3], this.v[r3]) - 0.16 * this.ink[r3]), i4 = Math.max(i4, this.signal[r3]);
        }
        this.peak = i4;
      }
      if (this.active) for (let e3 = 0; e3 < this.ink.length; e3++) {
        const t4 = Math.round(65535 * Math.min(1, this.signal[e3]));
        this.pixels[4 * e3] = t4 >>> 8, this.pixels[4 * e3 + 1] = 255 & t4, this.pixels[4 * e3 + 2] = Math.round(128 + 63.5 * this.offsetX[e3]), this.pixels[4 * e3 + 3] = Math.round(128 + 63.5 * this.offsetY[e3]);
      }
      else this.clear();
    }
  };
  function me(e2, t3, n4, a5, r2) {
    if (!(r2 < 1)) for (let o3 = 0; o3 < 2; o3++) {
      for (let o4 = 0; o4 < a5; o4++) {
        let a6 = 0;
        const i4 = o4 * n4;
        for (let t4 = -r2; t4 <= r2; t4++) a6 += e2[i4 + Math.max(0, Math.min(n4 - 1, t4))];
        for (let o5 = 0; o5 < n4; o5++) t3[i4 + o5] = a6 / (2 * r2 + 1), a6 += e2[i4 + Math.min(n4 - 1, o5 + r2 + 1)] - e2[i4 + Math.max(0, o5 - r2)];
      }
      for (let o4 = 0; o4 < n4; o4++) {
        let i4 = 0;
        for (let e3 = -r2; e3 <= r2; e3++) i4 += t3[Math.max(0, Math.min(a5 - 1, e3)) * n4 + o4];
        for (let l3 = 0; l3 < a5; l3++) e2[l3 * n4 + o4] = i4 / (2 * r2 + 1), i4 += t3[Math.min(a5 - 1, l3 + r2 + 1) * n4 + o4] - t3[Math.max(0, l3 - r2) * n4 + o4];
      }
    }
  }
  var pe = new Float32Array(0);
  function ge(e2, t3, n4, a5, r2) {
    const o3 = t3 * n4, i4 = r2 && r2.width === t3 && r2.height === n4 ? r2 : { width: t3, height: n4, subject: new Float32Array(o3), depth: new Float32Array(o3), key: "none" }, { subject: l3, depth: s4 } = i4;
    let c5 = 0;
    for (let t4 = 0; t4 < o3; t4++) e2[4 * t4 + 3] < 250 && c5++;
    const u3 = (t4) => (0.2126 * e2[4 * t4] + 0.7152 * e2[4 * t4 + 1] + 0.0722 * e2[4 * t4 + 2]) / 255;
    let h4 = "none", f3 = 0;
    if (c5 > 0.01 * o3) h4 = "alpha";
    else if (a5) h4 = "mask";
    else {
      let e3 = 0, a6 = 0, r3 = 0;
      const o4 = Math.max(1, Math.round(0.03 * Math.min(t3, n4)));
      for (let i5 = 0; i5 < n4; i5++) for (let l4 = 0; l4 < t3; l4++) {
        if (l4 >= o4 && i5 >= o4 && l4 < t3 - o4 && i5 < n4 - o4) continue;
        const s5 = u3(i5 * t3 + l4);
        e3 += s5, a6 += s5 * s5, r3++;
      }
      f3 = e3 / Math.max(1, r3);
      Math.sqrt(Math.max(0, a6 / Math.max(1, r3) - f3 * f3)) < 0.07 && (h4 = "ground");
    }
    for (let t4 = 0; t4 < o3; t4++) {
      const n5 = e2[4 * t4 + 3] / 255, r3 = u3(t4);
      let o4 = 1;
      if ("alpha" === h4) o4 = n5;
      else if ("ground" === h4) {
        const e3 = Math.max(0, Math.min(1, (Math.abs(r3 - f3) - 0.035) / 0.12));
        o4 = e3 * e3 * (3 - 2 * e3);
      }
      l3[t4] = o4 * (a5 ? Math.max(0, Math.min(1, a5[t4])) : 1), s4[t4] = r3 * n5;
    }
    i4.key = h4, pe.length < o3 && (pe = new Float32Array(o3));
    const d4 = pe;
    return me(l3, d4, t3, n4, Math.max(1, Math.round(0.02 * Math.min(t3, n4)))), me(s4, d4, t3, n4, Math.max(1, Math.round(0.035 * Math.min(t3, n4)))), i4;
  }
  var ve = 11;
  var xe = (e2) => Math.max(0, Math.min(1, e2));
  var Me = (e2, t3, n4) => {
    const a5 = xe((n4 - e2) / (t3 - e2));
    return a5 * a5 * (3 - 2 * a5);
  };
  function ye(e2, t3, n4 = 256) {
    let a5 = 0;
    for (let t4 = 0; t4 < e2.length; t4++) e2[t4] > a5 && (a5 = e2[t4]);
    if (a5 <= 0) return 0;
    const r2 = new Uint32Array(n4);
    for (let t4 = 0; t4 < e2.length; t4++) r2[Math.min(n4 - 1, Math.floor(Math.max(0, e2[t4]) / a5 * n4))]++;
    let o3 = 0;
    const i4 = e2.length * t3;
    for (let e3 = 0; e3 < n4; e3++) if (o3 += r2[e3], o3 >= i4) return (e3 + 1) / n4 * a5;
    return a5;
  }
  var we = class {
    constructor(e2) {
      this.n = e2, this.arrays = [], this.next = 0;
    }
    take(e2) {
      this.next === this.arrays.length && this.arrays.push(new Float32Array(this.n));
      const t3 = this.arrays[this.next++];
      return e2 ? t3.set(e2) : t3.fill(0), t3;
    }
    reset() {
      this.next = 0;
    }
  };
  var be = null;
  function Ee(e2, t3, n4, a5, r2) {
    const o3 = 2 * r2 + 1;
    for (let i4 = 0; i4 < a5; i4++) {
      const a6 = i4 * n4;
      let l3 = 0;
      for (let t4 = -r2; t4 <= r2; t4++) l3 += e2[a6 + Math.max(0, Math.min(n4 - 1, t4))];
      for (let i5 = 0; i5 < n4; i5++) t3[a6 + i5] = l3 / o3, l3 += e2[a6 + Math.min(n4 - 1, i5 + r2 + 1)] - e2[a6 + Math.max(0, i5 - r2)];
    }
    for (let i4 = 0; i4 < n4; i4++) {
      let l3 = 0;
      for (let e3 = -r2; e3 <= r2; e3++) l3 += t3[Math.max(0, Math.min(a5 - 1, e3)) * n4 + i4];
      for (let s4 = 0; s4 < a5; s4++) e2[s4 * n4 + i4] = l3 / o3, l3 += t3[Math.min(a5 - 1, s4 + r2 + 1) * n4 + i4] - t3[Math.max(0, s4 - r2) * n4 + i4];
    }
  }
  function Te(e2, t3, n4, a5, r2, o3, i4) {
    const l3 = n4 * a5, s4 = i4.take(), c5 = i4.take(t3), u3 = i4.take(e2), h4 = i4.take(), f3 = i4.take();
    for (let n5 = 0; n5 < l3; n5++) h4[n5] = t3[n5] * t3[n5], f3[n5] = t3[n5] * e2[n5];
    Ee(c5, s4, n4, a5, r2), Ee(u3, s4, n4, a5, r2), Ee(h4, s4, n4, a5, r2), Ee(f3, s4, n4, a5, r2);
    for (let e3 = 0; e3 < l3; e3++) {
      const t4 = (f3[e3] - c5[e3] * u3[e3]) / (h4[e3] - c5[e3] * c5[e3] + o3);
      h4[e3] = t4, f3[e3] = u3[e3] - t4 * c5[e3];
    }
    Ee(h4, s4, n4, a5, r2), Ee(f3, s4, n4, a5, r2);
    for (let n5 = 0; n5 < l3; n5++) e2[n5] = h4[n5] * t3[n5] + f3[n5];
  }
  function ke(e2, t3, n4, a5, r2, o3 = 2) {
    for (let i4 = 0; i4 < o3; i4++) {
      for (let o4 = 0; o4 < a5; o4++) for (let a6 = 0; a6 < n4; a6++) {
        const i5 = o4 * n4 + a6;
        let l3 = e2[i5];
        a6 > 0 && (l3 = Math.max(l3, Math.min(t3[i5], e2[i5 - 1] * r2))), o4 > 0 && (l3 = Math.max(l3, Math.min(t3[i5], e2[i5 - n4] * r2), a6 > 0 ? Math.min(t3[i5], e2[i5 - n4 - 1] * r2) : 0, a6 < n4 - 1 ? Math.min(t3[i5], e2[i5 - n4 + 1] * r2) : 0)), e2[i5] = l3;
      }
      for (let o4 = a5 - 1; o4 >= 0; o4--) for (let i5 = n4 - 1; i5 >= 0; i5--) {
        const l3 = o4 * n4 + i5;
        let s4 = e2[l3];
        i5 < n4 - 1 && (s4 = Math.max(s4, Math.min(t3[l3], e2[l3 + 1] * r2))), o4 < a5 - 1 && (s4 = Math.max(s4, Math.min(t3[l3], e2[l3 + n4] * r2), i5 > 0 ? Math.min(t3[l3], e2[l3 + n4 - 1] * r2) : 0, i5 < n4 - 1 ? Math.min(t3[l3], e2[l3 + n4 + 1] * r2) : 0)), e2[l3] = s4;
      }
    }
  }
  function Re(e2, t3, n4, a5, r2) {
    for (let o3 = 0; o3 < a5; o3++) for (let a6 = 0; a6 < n4; a6++) {
      let i4 = 1;
      for (let t4 = Math.max(0, a6 - r2); t4 <= Math.min(n4 - 1, a6 + r2); t4++) i4 = Math.min(i4, e2[o3 * n4 + t4]);
      t3[o3 * n4 + a6] = i4;
    }
    for (let o3 = 0; o3 < a5; o3++) for (let i4 = 0; i4 < n4; i4++) {
      let l3 = 1;
      for (let e3 = Math.max(0, o3 - r2); e3 <= Math.min(a5 - 1, o3 + r2); e3++) l3 = Math.min(l3, t3[e3 * n4 + i4]);
      e2[o3 * n4 + i4] = l3;
    }
  }
  function Ae(e2, t3, n4, a5, r2) {
    const o3 = n4 * a5, i4 = Math.min(n4, a5), l3 = r2.take(), s4 = r2.take(), c5 = r2.take(), u3 = r2.take(), h4 = r2.take();
    for (let n5 = 0; n5 < o3; n5++) {
      const a6 = e2[4 * n5 + 3] / 255;
      h4[n5] = a6, l3[n5] = t3[4 * n5] / 255 * a6, s4[n5] = t3[4 * n5 + 1] / 255 * a6, c5[n5] = t3[4 * n5 + 2] / 255 * a6, u3[n5] = (0.299 * e2[4 * n5] + 0.587 * e2[4 * n5 + 1] + 0.114 * e2[4 * n5 + 2]) / 255 * a6;
    }
    const f3 = r2.take(), d4 = (e3, t4) => {
      const o4 = r2.take(e3);
      return me(o4, f3, n4, a5, t4), o4;
    }, m4 = Math.max(2, Math.round(0.04 * i4)), p3 = Math.max(m4 + 2, Math.round(0.12 * i4)), g3 = Math.max(2, Math.round(0.05 * i4)), v4 = d4(u3, 1), x2 = d4(u3, m4), M4 = d4(u3, p3), y3 = r2.take(), w3 = r2.take(), b2 = r2.take(), E3 = r2.take(), T3 = r2.take();
    for (let e3 = 0; e3 < a5; e3++) for (let t4 = 0; t4 < n4; t4++) {
      const r3 = e3 * n4 + t4;
      y3[r3] = Math.abs(u3[r3] - v4[r3]), w3[r3] = Math.abs(v4[r3] - x2[r3]), b2[r3] = Math.abs(x2[r3] - M4[r3]), E3[r3] = Math.abs(u3[e3 * n4 + Math.min(n4 - 1, t4 + 1)] - u3[e3 * n4 + Math.max(0, t4 - 1)]), T3[r3] = Math.abs(u3[Math.min(a5 - 1, e3 + 1) * n4 + t4] - u3[Math.max(0, e3 - 1) * n4 + t4]);
    }
    me(y3, f3, n4, a5, g3), me(w3, f3, n4, a5, g3), me(b2, f3, n4, a5, g3), me(E3, f3, n4, a5, 2), me(T3, f3, n4, a5, 2);
    const k3 = Math.max(0.01, ye(y3, 0.9) + ye(w3, 0.9)), R4 = d4(l3, 1), A3 = d4(s4, 1), F3 = d4(c5, 1), S3 = r2.take(), _3 = r2.take(), L3 = r2.take();
    let C4 = 0;
    for (let e3 = 0; e3 < o3; e3++) {
      const t4 = R4[e3], n5 = A3[e3], a6 = F3[e3], r3 = Math.max(t4, n5, a6), o4 = r3 - Math.min(t4, n5, a6);
      L3[e3] = r3, _3[e3] = r3 > 1e-3 ? o4 / r3 : 0, C4 += o4;
      let i5 = 0;
      o4 > 1e-4 && (i5 = r3 === t4 ? ((n5 - a6) / o4 + 6) % 6 : r3 === n5 ? (a6 - t4) / o4 + 2 : (t4 - n5) / o4 + 4), S3[e3] = 60 * i5;
    }
    const P4 = Me(0.02, 0.07, C4 / o3), D3 = Math.max(2, Math.round(0.06 * a5)), U3 = new Float32Array(a5);
    for (let e3 = 0; e3 < a5; e3++) {
      let t4 = 0;
      for (let a6 = 0; a6 < n4; a6++) t4 += y3[e3 * n4 + a6] + w3[e3 * n4 + a6];
      U3[e3] = t4 / n4;
    }
    let I3 = 0.5, B2 = 0;
    for (let e3 = Math.max(D3, Math.round(0.12 * a5)); e3 <= Math.min(a5 - D3, Math.round(0.88 * a5)); e3++) {
      let t4 = 0, r3 = 0, o4 = 0, i5 = 0;
      for (let a6 = 0; a6 < n4; a6++) {
        let o5 = 0, i6 = 0, l5 = 0, s6 = 0, c7 = 0, u5 = 0;
        for (let t5 = 1; t5 <= D3; t5++) {
          const r4 = (e3 - t5) * n4 + a6, h7 = (e3 + t5 - 1) * n4 + a6;
          o5 += R4[r4], i6 += A3[r4], l5 += F3[r4], s6 += R4[h7], c7 += A3[h7], u5 += F3[h7];
        }
        const h6 = (Math.abs(o5 - s6) + Math.abs(i6 - c7) + Math.abs(l5 - u5)) / D3;
        t4 += h6, r3 += h6 > 0.12 ? 1 : 0;
      }
      const l4 = Math.max(2, Math.round(0.15 * a5)), s5 = Math.max(0, e3 - l4), c6 = Math.min(a5, e3 + l4);
      for (let t5 = s5; t5 < e3; t5++) o4 += U3[t5];
      for (let t5 = e3; t5 < c6; t5++) i5 += U3[t5];
      o4 /= e3 - s5, i5 /= c6 - e3;
      const u4 = Me(-0.05, 0.3, (i5 - o4) / (i5 + o4 + 1e-4)), h5 = Me(0.08, 0.35, t4 / n4) * (r3 / n4) * u4;
      h5 > B2 && (B2 = h5, I3 = e3 / a5);
    }
    const N3 = Me(0.15, 0.45, B2), G3 = r2.take(), X3 = r2.take(), q3 = r2.take();
    for (let e3 = 0; e3 < o3; e3++) G3[e3] = Math.min(l3[e3], s4[e3], c5[e3]);
    Re(G3, f3, n4, a5, 1), me(G3, f3, n4, a5, m4);
    for (let e3 = 0; e3 < o3; e3++) X3[e3] = w3[e3] + b2[e3];
    let O4 = 0, H4 = 0, z3 = 0;
    for (let e3 = 0; e3 < o3; e3++) O4 += R4[e3], H4 += A3[e3], z3 += F3[e3];
    O4 /= o3, H4 /= o3, z3 /= o3;
    const W4 = d4(R4, m4), V3 = d4(A3, m4), j2 = d4(F3, m4), Y3 = d4(R4, p3), K3 = d4(A3, p3), $4 = d4(F3, p3);
    for (let e3 = 0; e3 < o3; e3++) {
      const t4 = Math.hypot(W4[e3] - O4, V3[e3] - H4, j2[e3] - z3), n5 = Math.hypot(W4[e3] - Y3[e3], V3[e3] - K3[e3], j2[e3] - $4[e3]);
      q3[e3] = (t4 + 1.5 * n5) * (0.4 + 0.6 * _3[e3] * P4 + 0.4 * (1 - P4));
    }
    const Q3 = r2.take(), J3 = r2.take(), Z3 = r2.take(), ee3 = r2.take(), te3 = r2.take(), ne3 = r2.take(), ae3 = r2.take(), re3 = r2.take(), oe3 = r2.take(), ie3 = r2.take();
    for (let e3 = 0; e3 < a5; e3++) for (let t4 = 0; t4 < n4; t4++) ie3[e3 * n4 + t4] = Math.abs(u3[Math.min(a5 - 1, e3 + 1) * n4 + t4] - u3[Math.max(0, e3 - 1) * n4 + t4]);
    me(ie3, f3, n4, a5, 1);
    for (let e3 = 0; e3 < a5; e3++) for (let t4 = 0; t4 < n4; t4++) {
      const r3 = e3 * n4 + t4, o4 = (e3 + 0.5) / a5, i5 = S3[r3], l4 = _3[r3] * P4, s5 = L3[r3], c6 = y3[r3] + w3[r3], u4 = Me(175, 200, i5) * (1 - Me(250, 275, i5)) * Me(0.08, 0.25, l4), h5 = (1 - Me(45, 65, i5) + Me(290, 330, i5)) * Me(0.2, 0.45, l4) * Me(0.3, 0.55, s5), f4 = (1 - Me(0.15, 0.35, l4)) * Me(0.45, 0.7, s5) * N3, d5 = (1 - Me(0.08, 0.2, s5)) * N3, m5 = N3 > 0.3 ? 1 - Me(I3, I3 + 0.1, o4) : 1 - Me(0.4, 0.8, o4), p4 = 1 - Me(0.02, 0.06, c6), g4 = 1 - Me(0.03, 0.09, c6);
      J3[r3] = Math.max(u4 * p4, 0.7 * d5 * (1 - Me(8e-3, 0.025, c6)), h5 * g4 * 0.9) * m5, Z3[r3] = Math.max(J3[r3], f4 * p4 * m5), Q3[r3] = 0 === e3 ? J3[r3] : 0, ee3[r3] = Me(150, 172, i5) * (1 - Me(232, 250, i5)) * Me(0.25, 0.45, l4), ae3[r3] = Me(1.3, 2.2, (E3[r3] + 4e-3) / (T3[r3] + 4e-3)) * Me(0.35, 0.55, v4[r3]) * (1 - Me(0.1, 0.18, _3[r3] * P4)) * Me(0.025, 0.07, c6) * Me(0.025, 0.045, ie3[r3]);
      const x3 = 1 - Me(0.18, 0.4, l4), M5 = Me(0.55, 0.8, s5) * Me(0.05, 0.12, c6);
      te3[r3] = Math.max(ee3[r3], 0.85 * x3, 0.8 * M5);
    }
    ke(Q3, J3, n4, a5, 0.995, 1), ke(Q3, Z3, n4, a5, 0.8, 1);
    let le3 = 0;
    for (let e3 = 0; e3 < o3; e3++) le3 += Q3[e3];
    const se3 = le3 > 0.04 * o3 && N3 > 0.3;
    if (se3) for (let e3 = 0; e3 < a5; e3++) for (let t4 = 0; t4 < n4; t4++) ee3[e3 * n4 + t4] *= Me(I3, I3 + 0.05, (e3 + 0.5) / a5);
    if (se3) {
      const e3 = r2.take(), t4 = r2.take(), i5 = r2.take();
      for (let t5 = 0; t5 < o3; t5++) e3[t5] = 0.299 * W4[t5] + 0.587 * V3[t5] + 0.114 * j2[t5];
      for (let e4 = 0; e4 < a5; e4++) for (let r3 = 0; r3 < n4; r3++) t4[e4 * n4 + r3] = v4[Math.min(a5 - 1, e4 + 1) * n4 + r3] - v4[Math.max(0, e4 - 1) * n4 + r3];
      const l4 = new Uint8Array(o3);
      for (let e4 = 1; e4 < a5 - 1; e4++) for (let r3 = 0; r3 < n4; r3++) {
        const o4 = Math.abs(t4[e4 * n4 + r3]);
        let i6 = o4 > 0.03;
        for (let l5 = -3; l5 <= 3 && i6; l5++) l5 && e4 + l5 >= 0 && e4 + l5 < a5 && Math.abs(t4[(e4 + l5) * n4 + r3]) > o4 && (i6 = false);
        l4[e4 * n4 + r3] = i6 ? 1 : 0;
      }
      const s5 = (t5, n5, a6, r3 = true) => {
        const o4 = W4[n5] + V3[n5] + j2[n5] + 0.05, i6 = W4[a6] + V3[a6] + j2[a6] + 0.05, l5 = Math.abs(W4[n5] / o4 - W4[a6] / i6) + Math.abs(V3[n5] / o4 - V3[a6] / i6) + Math.abs(j2[n5] / o4 - j2[a6] / i6), s6 = Math.min(Math.abs(S3[n5] - S3[a6]), 360 - Math.abs(S3[n5] - S3[a6])), c7 = Math.max(1 - Me(0.1, 0.25, l5), (1 - Me(15, 35, s6)) * Me(0.15, 0.3, Math.min(_3[n5], _3[a6]))), u5 = Math.max(Me(2, 3, (T3[n5] + 4e-3) / (E3[n5] + 4e-3)) * Me(0.015, 0.04, y3[n5] + w3[n5]) * Me(0.4, 0.55, y3[n5] / (y3[n5] + w3[n5] + 1e-4)), 1 - Me(0.12, 0.25, e3[n5]));
        return c7 * (r3 ? u5 : 1) * (1 - Me(0.82 * e3[a6] + 0.02, 1.02 * e3[a6] + 0.05, e3[n5]));
      };
      let c6 = 0, u4 = 0;
      for (let e4 = Math.max(3, Math.round(a5 * Math.max(0.25, I3))); e4 < Math.round(0.88 * a5); e4++) {
        let t5 = 0;
        for (let a6 = 0; a6 < n4; a6++) (l4[(e4 - 1) * n4 + a6] || l4[e4 * n4 + a6] || l4[(e4 + 1) * n4 + a6]) && t5++;
        if (t5 < 0.5 * n4) continue;
        let r3 = 0;
        for (let t6 = e4 + 1; t6 < Math.min(a5, 2 * e4); t6++) for (let a6 = 0; a6 < n4; a6++) r3 += s5(e4, t6 * n4 + a6, (2 * e4 - t6) * n4 + a6);
        r3 > u4 && (u4 = r3, c6 = e4);
      }
      const h5 = Me(0.05, 0.1, u4 / o3);
      if (h5 > 0) for (let e4 = c6 + 1; e4 < Math.min(a5, 2 * c6); e4++) for (let t5 = 0; t5 < n4; t5++) {
        const a6 = e4 * n4 + t5;
        re3[a6] = s5(c6, a6, (2 * c6 - e4) * n4 + t5) * h5, oe3[a6] = s5(c6, a6, (2 * c6 - e4) * n4 + t5, false) * h5, i5[a6] = re3[a6];
      }
      me(i5, f3, n4, a5, 1);
      for (let e4 = 0; e4 < o3; e4++) re3[e4] = Math.max(re3[e4], i5[e4]), ee3[e4] = Math.max(ee3[e4], re3[e4]);
    }
    const ce3 = d4(ee3, p3);
    for (let e3 = 0; e3 < o3; e3++) ee3[e3] *= Me(0.15, 0.35, ce3[e3]);
    const ue3 = d4(ee3, m4);
    for (let e3 = 0; e3 < o3; e3++) {
      ee3[e3] *= 1 - 0.8 * J3[e3];
      const t4 = Math.min(Math.abs(S3[e3] - 200), 360 - Math.abs(S3[e3] - 200));
      ne3[e3] = Me(0.28, 0.45, _3[e3] * P4) * Me(55, 80, t4) * (1 - Me(0.3, 0.6, oe3[e3]));
    }
    const he3 = d4(ne3, m4);
    for (let e3 = 0; e3 < o3; e3++) ne3[e3] = Math.max(ne3[e3] * (1 - (1 - Me(0.15, 0.3, he3[e3])) * Me(0.55, 0.7, L3[e3]) * Me(0.5, 0.65, _3[e3])), 1 - h4[e3]), te3[e3] = Math.min(Math.max(te3[e3], 0.9 * oe3[e3]), Math.max(ee3[e3], Me(0.25, 0.6, ue3[e3]))) * (1 - Q3[e3]) * (1 - ne3[e3]);
    ke(ee3, te3, n4, a5, 0.97);
    const fe2 = r2.take(ae3), de3 = Math.max(2, Math.round(0.12 * a5));
    for (let e3 = 0; e3 < n4; e3++) {
      let t4 = 0;
      for (let r3 = -de3; r3 <= de3; r3++) t4 += ae3[Math.max(0, Math.min(a5 - 1, r3)) * n4 + e3];
      for (let r3 = 0; r3 < a5; r3++) fe2[r3 * n4 + e3] = t4 / (2 * de3 + 1), t4 += ae3[Math.min(a5 - 1, r3 + de3 + 1) * n4 + e3] - ae3[Math.max(0, r3 - de3) * n4 + e3];
    }
    me(fe2, f3, n4, a5, 1);
    for (let e3 = 0; e3 < o3; e3++) ae3[e3] = Me(0.2, 0.45, fe2[e3]) * Me(0.2, 0.5, ae3[e3] + 0.5 * fe2[e3]) * (1 - Q3[e3]);
    Te(Q3, u3, n4, a5, Math.max(2, Math.round(0.04 * i4)), 2e-3, r2), Te(ee3, u3, n4, a5, Math.max(2, Math.round(0.04 * i4)), 2e-3, r2), Te(ae3, u3, n4, a5, Math.max(2, Math.round(0.03 * i4)), 2e-3, r2), me(ne3, f3, n4, a5, 1);
    for (let e3 = 0; e3 < o3; e3++) Q3[e3] = Me(0.3, 0.7, Q3[e3]) * h4[e3], ae3[e3] = Me(0.3, 0.7, ae3[e3]) * h4[e3] * (1 - Q3[e3]), ee3[e3] = Me(0.3, 0.7, ee3[e3]) * (1 - Q3[e3]) * (1 - ae3[e3]) * (1 - Me(0.15, 0.4, ne3[e3]));
    Re(Q3, f3, n4, a5, 2), Re(ee3, f3, n4, a5, 2), Re(ae3, f3, n4, a5, 1), me(Q3, f3, n4, a5, 1), me(ee3, f3, n4, a5, 1), me(ae3, f3, n4, a5, 1);
    const pe2 = 1 / Math.max(0.02, ye(q3, 0.97)), ve2 = 1 / Math.max(0.01, ye(X3, 0.9)), we2 = ye(G3, 0.97), be2 = ye(G3, 0.1), Ae2 = Me(0.06, 0.25, we2 - be2), Fe2 = r2.take();
    for (let e3 = 0; e3 < a5; e3++) for (let t4 = 0; t4 < n4; t4++) {
      const r3 = e3 * n4 + t4, o4 = (t4 + 0.5) / n4, i5 = (e3 + 0.5) / a5, l4 = Math.max(Q3[r3], ee3[r3]), s5 = y3[r3] + w3[r3] + b2[r3], c6 = 0.6 * xe(((y3[r3] + 0.6 * w3[r3]) / (s5 + 4e-3) - 0.25) / 0.55) + 0.4 * xe((y3[r3] + w3[r3]) / k3), u4 = Me(0.04, 0.35, s5 / k3) * (1 - l4), h5 = 0.55 * xe((G3[r3] - be2) / Math.max(0.05, we2 - be2)) + 0.25 * (1 - xe(X3[r3] * ve2)) + 0.2 * xe(2 * (F3[r3] - R4[r3]) + 0.3) * P4, f4 = Ae2 * Me(0.12, 0.35, x2[r3]) * (0.4 + 0.6 * N3), d5 = N3 * (i5 < I3 ? 0.45 : 0.45 + 0.55 * Me(0, 1, (i5 - I3) / Math.max(0.15, 1 - I3))) + (1 - N3) * (0.5 + 0.4 * (i5 - 0.5)), m5 = y3[r3] / (y3[r3] + w3[r3] + 1e-4), p4 = Me(0.2, 0.7, (y3[r3] + w3[r3]) / k3) * (0.35 + 0.65 * N3) * (1 - l4), g4 = 1 - xe(1.5 * Math.hypot(1.2 * (o4 - 0.5), i5 - 0.52)), v5 = xe(q3[r3] * pe2) * (0.55 + 0.45 * g4), M5 = 0.3 * u4, E4 = 0.25 * f4, T4 = 0.12 + 0.45 * N3, A4 = 0.12 * p4, S4 = 0.35 * (1 - 0.4 * N3) * (1 - l4);
      Fe2[r3] = (M5 * c6 + E4 * (1 - h5) + T4 * d5 + A4 * xe(1.6 - 1.6 * m5) + S4 * v5 + 0.04) / (M5 + E4 + T4 + A4 + S4 + 0.08) * (1 - 0.85 * Q3[r3]) * (1 - 0.45 * ee3[r3] * (1 - N3));
    }
    const Se2 = ge(e2, n4, a5);
    if ("none" !== Se2.key) for (let e3 = 0; e3 < o3; e3++) Fe2[e3] = 0.7 * Se2.subject[e3] + 0.3 * Fe2[e3];
    return me(Fe2, f3, n4, a5, Math.max(1, Math.round(0.03 * i4))), (function(e3, t4, n5, a6, r3, o4, i5, l4, s5) {
      const c6 = r3 * o4, u4 = s5.take(), h5 = (e4) => (Ee(e4, u4, r3, o4, i5), e4), f4 = (e4, t5) => {
        const n6 = s5.take();
        for (let a7 = 0; a7 < c6; a7++) n6[a7] = e4[a7] * t5[a7];
        return h5(n6);
      }, d5 = h5(s5.take(t4)), m5 = h5(s5.take(n5)), p4 = h5(s5.take(a6)), g4 = h5(s5.take(e3)), v5 = f4(t4, t4), x3 = f4(t4, n5), M5 = f4(t4, a6), y4 = f4(n5, n5), w4 = f4(n5, a6), b3 = f4(a6, a6), E4 = f4(t4, e3), T4 = f4(n5, e3), k4 = f4(a6, e3), R5 = s5.take(), A4 = s5.take(), F4 = s5.take(), S4 = s5.take();
      for (let e4 = 0; e4 < c6; e4++) {
        const t5 = E4[e4] - d5[e4] * g4[e4], n6 = T4[e4] - m5[e4] * g4[e4], a7 = k4[e4] - p4[e4] * g4[e4], r4 = v5[e4] - d5[e4] * d5[e4] + l4, o5 = x3[e4] - d5[e4] * m5[e4], i6 = M5[e4] - d5[e4] * p4[e4], s6 = y4[e4] - m5[e4] * m5[e4] + l4, c7 = w4[e4] - m5[e4] * p4[e4], u5 = b3[e4] - p4[e4] * p4[e4] + l4, h6 = s6 * u5 - c7 * c7, f5 = i6 * c7 - o5 * u5, _4 = o5 * c7 - i6 * s6, L4 = r4 * u5 - i6 * i6, C5 = o5 * i6 - r4 * c7, P5 = r4 * s6 - o5 * o5, D4 = r4 * h6 + o5 * f5 + i6 * _4, U4 = Math.abs(D4) > 1e-12 ? 1 / D4 : 0;
        R5[e4] = (h6 * t5 + f5 * n6 + _4 * a7) * U4, A4[e4] = (f5 * t5 + L4 * n6 + C5 * a7) * U4, F4[e4] = (_4 * t5 + C5 * n6 + P5 * a7) * U4, S4[e4] = g4[e4] - R5[e4] * d5[e4] - A4[e4] * m5[e4] - F4[e4] * p4[e4];
      }
      h5(R5), h5(A4), h5(F4), h5(S4);
      for (let r4 = 0; r4 < c6; r4++) e3[r4] = R5[r4] * t4[r4] + A4[r4] * n5[r4] + F4[r4] * a6[r4] + S4[r4];
    })(Fe2, R4, A3, F3, n4, a5, Math.max(2, Math.round(0.07 * i4)), 4e-3, r2), { depth: Fe2, water: ee3, sky: Q3, falls: ae3 };
  }
  function Fe(e2, t3, n4, a5, r2, o3, i4) {
    if (t3 === o3 && n4 === i4) return e2[r2 * o3 + a5];
    const l3 = Math.max(0, Math.min(t3 - 1, (a5 + 0.5) * t3 / o3 - 0.5)), s4 = Math.max(0, Math.min(n4 - 1, (r2 + 0.5) * n4 / i4 - 0.5)), c5 = Math.min(t3 - 2, Math.floor(l3)), u3 = Math.min(n4 - 2, Math.floor(s4)), h4 = l3 - c5, f3 = s4 - u3;
    if (c5 < 0 || u3 < 0) return e2[Math.round(s4) * t3 + Math.round(l3)];
    const d4 = u3 * t3 + c5, m4 = d4 + t3;
    return (e2[d4] * (1 - h4) + e2[d4 + 1] * h4) * (1 - f3) + (e2[m4] * (1 - h4) + e2[m4 + 1] * h4) * f3;
  }
  var Se = (e2, t3, n4) => {
    const a5 = Math.max(0, Math.min(1, (n4 - e2) / (t3 - e2)));
    return a5 * a5 * (3 - 2 * a5);
  };
  var _e = class {
    constructor(e2, t3) {
      this.base = 40, this.mass = 0, this.calm = 0, this.drift = [0, 0], this.fade = 3, this.age = 0, this.peak = 0, this.front = 0, this.live = false, this.bins = new Uint32Array(64), this.spare = new Float32Array(0), this.cols = Math.max(3, 0 | e2), this.rows = Math.max(3, 0 | t3);
      const n4 = this.cols * this.rows;
      this.h = new Float32Array(n4), this.p = new Float32Array(n4), this.speed = new Float32Array(n4).fill(1), this.damp = new Float32Array(n4).fill(1), this.wall = new Float32Array(n4), this.trace = new Float32Array(n4);
    }
    clear() {
      this.h.fill(0), this.p.fill(0), this.trace.fill(0), this.live = false, this.peak = 0;
    }
    drop(e2, t3, n4 = 1, a5 = 3) {
      const { cols: r2, rows: o3, h: i4, p: l3 } = this, s4 = Math.max(1, a5), c5 = Math.ceil(3 * s4);
      for (let a6 = Math.max(1, Math.floor(t3 - c5)); a6 < Math.min(o3 - 1, Math.ceil(t3 + c5)); a6++) for (let o4 = Math.max(1, Math.floor(e2 - c5)); o4 < Math.min(r2 - 1, Math.ceil(e2 + c5)); o4++) {
        const c6 = o4 - e2, u3 = a6 - t3, h4 = (c6 * c6 + u3 * u3) / (s4 * s4), f3 = n4 * (1 - h4) * Math.exp(-h4), d4 = a6 * r2 + o4;
        i4[d4] += f3, l3[d4] += f3;
      }
      this.age = 0, this.live = true, this.peak = Math.max(this.peak, n4), this.front = Math.max(this.front, n4);
    }
    step(e2, t3 = 1) {
      if (!(this.live && e2 > 0)) return this.live;
      e2 = Math.min(0.05, e2), this.age += e2;
      const { cols: n4, rows: a5, speed: r2, damp: o3, wall: i4, trace: l3 } = this, s4 = Math.max(0, this.base * t3);
      let c5 = 0;
      for (let e3 = 0; e3 < r2.length; e3++) r2[e3] > c5 && (c5 = r2[e3]);
      const u3 = Math.max(1, Math.min(8, Math.ceil(s4 * e2 * Math.sqrt(c5) / 0.6))), h4 = this.calm, f3 = e2 / u3, d4 = s4 * f3 * (s4 * f3), m4 = this.mass * f3 * f3;
      let p3 = this.h, g3 = this.p;
      for (let e3 = 0; e3 < u3; e3++) {
        for (let e5 = 1; e5 < a5 - 1; e5++) for (let t4 = 1, a6 = e5 * n4 + 1; t4 < n4 - 1; t4++, a6++) {
          const e6 = p3[a6], t5 = p3[a6 - 1] + p3[a6 + 1] + p3[a6 - n4] + p3[a6 + n4] - 4 * e6, s5 = l3[a6], c6 = s5 > 0.02 ? Math.max(0, 1 - Math.abs(e6) / s5) : 0, u4 = h4 * c6 * c6 * f3, v5 = 1 - Math.min(0.5, o3[a6] * f3 + u4);
          g3[a6] = (e6 + (e6 - g3[a6]) * v5 + d4 * r2[a6] * t5 - m4 * e6) * (1 - i4[a6]) * (1 - Math.min(0.5, 0.5 * u4));
        }
        const e4 = p3;
        p3 = g3, g3 = e4;
      }
      this.h = p3, this.p = g3;
      const v4 = this.drift[0] * e2, x2 = this.drift[1] * e2;
      (v4 || x2) && (this.carry(p3, v4, x2), this.carry(g3, v4, x2));
      for (let e3 = 0; e3 < n4; e3++) p3[e3] = 0.5 * p3[n4 + e3], p3[(a5 - 1) * n4 + e3] = 0.5 * p3[(a5 - 2) * n4 + e3];
      for (let e3 = 0; e3 < a5; e3++) p3[e3 * n4] = 0.5 * p3[e3 * n4 + 1], p3[e3 * n4 + n4 - 1] = 0.5 * p3[e3 * n4 + n4 - 2];
      const M4 = Math.exp(-e2 * this.fade);
      let y3 = 0;
      for (let e3 = 0; e3 < p3.length; e3++) {
        const t4 = Math.abs(p3[e3]);
        t4 > y3 && (y3 = t4);
        const n5 = l3[e3] * M4;
        l3[e3] = t4 >= n5 ? t4 : n5 < 1e-4 ? 0 : n5;
      }
      this.peak = y3;
      const w3 = this.bins.fill(0), b2 = 0.05 * y3;
      let E3 = 0;
      for (let e3 = 0; e3 < p3.length; e3++) p3[e3] > b2 && (w3[Math.min(63, p3[e3] / y3 * 64 | 0)]++, E3++);
      let T3 = 0, k3 = 63;
      for (; k3 > 0 && (T3 += w3[k3], !(T3 >= 0.08 * E3)); k3--) ;
      return this.front = Math.max(0.15 * y3, (k3 + 1) / 64 * y3), !(y3 < 4e-3) || (this.clear(), false);
    }
    carry(e2, t3, n4) {
      const { cols: a5, rows: r2 } = this;
      this.spare.length !== e2.length && (this.spare = new Float32Array(e2.length));
      const o3 = this.spare;
      for (let i4 = 0, l3 = 0; i4 < r2; i4++) {
        const s4 = Math.min(r2 - 1.001, Math.max(0, i4 - n4)), c5 = 0 | s4, u3 = s4 - c5;
        for (let n5 = 0; n5 < a5; n5++, l3++) {
          const r3 = Math.min(a5 - 1.001, Math.max(0, n5 - t3)), i5 = 0 | r3, s5 = r3 - i5, h4 = c5 * a5 + i5;
          o3[l3] = (e2[h4] * (1 - s5) + e2[h4 + 1] * s5) * (1 - u3) + (e2[h4 + a5] * (1 - s5) + e2[h4 + a5 + 1] * s5) * u3;
        }
      }
      e2.set(o3);
    }
    slope(e2, t3) {
      const { h: n4, cols: a5 } = this, r2 = n4.length;
      return t3[0] = 0.5 * (n4[Math.min(r2 - 1, e2 + 1)] - n4[Math.max(0, e2 - 1)]), t3[1] = 0.5 * (n4[Math.min(r2 - 1, e2 + a5)] - n4[Math.max(0, e2 - a5)]), t3;
    }
  };
  function Le(e2, t3, n4, a5) {
    const r2 = new Float32Array(e2.length);
    for (let o3 = 0; o3 < 2; o3++) {
      const i4 = o3 ? r2 : e2, l3 = o3 ? e2 : r2;
      for (let e3 = 0; e3 < n4; e3++) for (let r3 = 0; r3 < t3; r3++) {
        let s4 = 0, c5 = 0;
        for (let l4 = -a5; l4 <= a5; l4++) {
          const a6 = o3 ? r3 : r3 + l4, u3 = o3 ? e3 + l4 : e3;
          a6 < 0 || u3 < 0 || a6 >= t3 || u3 >= n4 || (s4 += i4[u3 * t3 + a6], c5++);
        }
        l3[e3 * t3 + r3] = s4 / c5;
      }
    }
  }
  var Ce;
  var Pe = ["none", "flow", "orb", "drift", "swell", "caustics", "contour", "aurora", "ripple", "halo", "interference", "mesh", "cascade", "constellation"];
  var De = ["glyph", "dot", "pixel", "mosaic", "lego", "voxel", "disco", "dither", "hex", "led", "cmyk", "stipple", "engraving", "crosshatch", "woodblock", "risograph", "pointillism", "inlay", "tick", "bayer"];
  var Ue = [{ value: "fluid", label: "Fluid", description: "An ink-in-water wake that bends the image and swirls the characters." }, { value: "lantern", label: "Lantern", description: "A soft light follows the pointer and lifts the characters it passes, without distortion." }, { value: "trail", label: "Trail", description: "The Asciify Trail: in the wake, sparse characters fill in and dense ones open up, then settle. No distortion." }, { value: "loupe", label: "Loupe", description: "A glass loupe glides after the pointer and magnifies the characters it covers." }, { value: "reveal", label: "Reveal", description: "Under a soft spotlight the characters take the source image's own colours. Best over a photo or video in one ink." }, { value: "none", label: "Off", description: "The field stays still under the pointer." }];
  var Ie = { radius: 0.13, strength: 0.5, trail: 0.45, follow: 12 };
  var Be = { strength: 0.55, radius: 0.45 };
  var Ne = { radius: 0.075, force: 1, dissipation: 1.6, refraction: 0.03, glow: 0.55, resolution: 128, curl: 24 };
  var Ge = { charset: " .,:-=+*#%@", cellSize: 12, cellAspect: 1, cellFit: "pixel", font: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontWeight: 500, glyphScale: 0.8, mark: "glyph", dotScale: 0.9, markAngle: -35, accents: 0, shuffle: 0, sample: "area", linePitch: 0.5, lineWeight: 1, sparkle: 0, textRepeat: "flow", glyphOrder: "tone", color: "ink", ink: "#f3ba32", highlight: "auto", background: "transparent", brightness: 0, contrast: 1, gamma: 1, invert: false, levels: "auto", blend: "auto", saturation: 1.1, ramp: [], shade: 0.5, backdrop: 0, fit: "cover", focus: { x: 0.5, y: 0.5 }, vignette: 0, drift: 0, scene: "flow", scale: 1, clear: false, speed: 1, hover: "fluid", fluid: Ne, lantern: Ie, trail: Be, scope: "all", tap: "surface", maxPixelRatio: 2, respectReducedMotion: true };
  var Xe = (e2, t3, n4, a5) => "number" == typeof e2 && Number.isFinite(e2) ? Math.min(n4, Math.max(t3, e2)) : a5;
  var qe = (e2, t3) => "string" == typeof e2 && /^#([\da-f]{3}|[\da-f]{6})$/i.test(e2.trim()) ? e2.trim().toLowerCase() : t3;
  var Oe = /^[\u0020-\u007e\u00a0-\u02ff\u0370-\u0482\u048a-\u052f\u2010-\u20cf\u2100-\u2bff]*$/;
  function He(e2) {
    if (!Oe.test(e2) && void 0 === Ce) {
      const e3 = Intl.Segmenter;
      Ce = e3 ? new e3(void 0, { granularity: "grapheme" }) : null;
    }
    return (Ce && !Oe.test(e2) ? Array.from(Ce.segment(e2), (e3) => e3.segment) : Array.from(e2)).filter((e3) => "\n" !== e3 && "\r" !== e3 && "	" !== e3).slice(0, 256);
  }
  function ze(e2) {
    const t3 = He(e2).filter((e3) => e3.trim());
    return t3.length > 0 && 2 * t3.filter(fe).length > t3.length;
  }
  var We = (e2, t3, n4) => {
    const a5 = De.includes(e2) ? e2 : t3;
    return ("glyph" === a5 || "inlay" === a5) && ze(n4);
  };
  var Ve = (e2, t3) => {
    if (!Array.isArray(e2)) return t3;
    const n4 = e2.map((e3) => qe(e3, "")).filter(Boolean).slice(0, 6);
    return n4.length >= 2 ? n4 : [];
  };
  function je(e2 = {}, t3 = Ge) {
    const n4 = "string" == typeof e2.charset && He(e2.charset).length >= 2 ? e2.charset : t3.charset, a5 = t3.fluid || Ne, r2 = void 0 === e2.fluid ? t3.fluid : e2.fluid, o3 = false !== r2 && (() => {
      const e3 = true !== r2 && r2 ? { ...a5, ...r2 } : a5;
      return { radius: Xe(e3.radius, 5e-3, 0.5, Ne.radius), force: Xe(e3.force, 0, 8, Ne.force), dissipation: Xe(e3.dissipation, 0.05, 20, Ne.dissipation), refraction: Xe(e3.refraction, 0, 0.5, Ne.refraction), glow: Xe(e3.glow, 0, 2, Ne.glow), resolution: Math.round(Xe(e3.resolution, 16, 512, Ne.resolution)), curl: Xe(e3.curl, 0, 80, Ne.curl) };
    })(), i4 = Pe.includes(e2.scene) ? e2.scene : t3.scene, l3 = !!e2.clear && "object" == typeof e2.clear && ("element" in e2.clear || "nodeType" in e2.clear || "rects" in e2.clear), s4 = void 0 === e2.clear || l3 ? t3.clear : e2.clear, c5 = !!s4 && { x: Xe(s4.x, -0.5, 1.5, 0.25), y: Xe(s4.y, -0.5, 1.5, 0.3), width: Xe(s4.width, 0, 2, 0.5), height: Xe(s4.height, 0, 2, 0.4), feather: Xe(s4.feather, 5e-3, 1, 0.12), shape: "rect" === s4.shape ? "rect" : "ellipse" };
    return { charset: n4, cellSize: Xe(e2.cellSize, 1, 96, t3.cellSize), cellAspect: We(e2.mark, t3.mark, n4) ? Math.max(1, Xe(e2.cellAspect, 0.3, 2, t3.cellAspect)) : Xe(e2.cellAspect, 0.3, 2, t3.cellAspect), cellFit: "fill" === e2.cellFit || "pixel" === e2.cellFit ? e2.cellFit : t3.cellFit, font: "string" == typeof e2.font && e2.font.trim() ? e2.font : t3.font, fontWeight: Math.round(Xe(e2.fontWeight, 100, 900, t3.fontWeight)), glyphScale: Xe(e2.glyphScale, 0.3, 1.6, t3.glyphScale), mark: De.includes(e2.mark) ? e2.mark : t3.mark, dotScale: Xe(e2.dotScale, 0.1, 1.4, t3.dotScale), markAngle: Xe(e2.markAngle, -360, 360, t3.markAngle), accents: Xe(e2.accents, 0, 0.3, t3.accents), shuffle: Xe(e2.shuffle, 0, 4, t3.shuffle), sample: "point" === e2.sample || "area" === e2.sample ? e2.sample : t3.sample, linePitch: Xe(e2.linePitch, 0.2, 4, t3.linePitch), lineWeight: Xe(e2.lineWeight, 0.2, 3, t3.lineWeight), sparkle: Xe(e2.sparkle, 0, 0.05, t3.sparkle), textRepeat: "row" === e2.textRepeat || "flow" === e2.textRepeat ? e2.textRepeat : t3.textRepeat, glyphOrder: "text" === e2.glyphOrder || "tone" === e2.glyphOrder || "scatter" === e2.glyphOrder ? e2.glyphOrder : t3.glyphOrder, color: "source" === e2.color || "ink" === e2.color ? e2.color : t3.color, ink: qe(e2.ink, t3.ink), highlight: "auto" === e2.highlight ? "auto" : qe(e2.highlight, t3.highlight), ramp: Ve(e2.ramp, t3.ramp), background: "transparent" === e2.background ? "transparent" : qe(e2.background, t3.background), brightness: Xe(e2.brightness, -1, 1, t3.brightness), contrast: Xe(e2.contrast, 0, 4, t3.contrast), gamma: Xe(e2.gamma, 0.2, 5, t3.gamma), invert: "boolean" == typeof e2.invert ? e2.invert : t3.invert, levels: "none" === e2.levels || "auto" === e2.levels ? e2.levels : t3.levels, blend: "auto" === e2.blend || "coarse" === e2.blend || "on" === e2.blend || "off" === e2.blend ? e2.blend : t3.blend, saturation: Xe(e2.saturation, 0, 3, t3.saturation), shade: Xe(e2.shade, 0, 1, t3.shade), backdrop: Xe(e2.backdrop, 0, 1, t3.backdrop), fit: "contain" === e2.fit || "cover" === e2.fit ? e2.fit : t3.fit, focus: { x: Xe(e2.focus?.x, 0, 1, t3.focus.x), y: Xe(e2.focus?.y, 0, 1, t3.focus.y) }, vignette: Xe(e2.vignette, 0, 1, t3.vignette), drift: Xe(e2.drift, 0, 2, t3.drift), scene: i4, scale: Xe(e2.scale, 0.2, 6, t3.scale), clear: c5, speed: Xe(e2.speed, 0, 5, t3.speed), hover: Ue.some((t4) => t4.value === e2.hover) ? e2.hover : t3.hover, fluid: o3, lantern: { radius: Xe(e2.lantern?.radius, 0.02, 0.6, t3.lantern.radius), strength: Xe(e2.lantern?.strength, 0, 1.5, t3.lantern.strength), trail: Xe(e2.lantern?.trail, 0, 3, t3.lantern.trail), follow: Xe(e2.lantern?.follow, 1, 60, t3.lantern.follow) }, trail: { strength: Xe(e2.trail?.strength, 0, 1, t3.trail.strength), radius: Xe(e2.trail?.radius, 0.1, 1, t3.trail.radius) }, scope: void 0 === e2.scope ? t3.scope : (u3 = e2.scope, "subject" === u3 || "outside" === u3 ? u3 : "all"), tap: "ring" === e2.tap || "none" === e2.tap || "surface" === e2.tap ? e2.tap : t3.tap, maxPixelRatio: Xe(e2.maxPixelRatio, 0.5, 4, t3.maxPixelRatio), respectReducedMotion: "boolean" == typeof e2.respectReducedMotion ? e2.respectReducedMotion : t3.respectReducedMotion };
    var u3;
  }
  function Ye(e2, t3, n4, a5, r2, o3 = { x: 0.5, y: 0.5 }) {
    if (!(e2 > 0 && t3 > 0 && n4 > 0 && a5 > 0)) return { scale: [1, 1], offset: [0, 0] };
    const i4 = e2 / t3, l3 = n4 / a5, s4 = l3 > i4, c5 = "cover" === r2 ? s4 ? [i4 / l3, 1] : [1, l3 / i4] : s4 ? [1, l3 / i4] : [i4 / l3, 1];
    return { scale: c5, offset: "cover" === r2 ? [(1 - c5[0]) * o3.x, (1 - c5[1]) * o3.y] : [0.5 * (1 - c5[0]), 0.5 * (1 - c5[1])] };
  }
  function Ke(e2, t3, n4, a5) {
    const r2 = Math.max(2, Math.round(e2 * n4)), o3 = Math.max(2, Math.round(r2 * t3)), i4 = Math.min(16, Math.max(1, a5)), l3 = Math.ceil(a5 / i4);
    return { width: o3, height: r2, columns: i4, rows: l3, atlasWidth: i4 * o3, atlasHeight: l3 * r2 };
  }
  function $e(e2) {
    const t3 = e2.replace("#", ""), n4 = 3 === t3.length ? t3.split("").map((e3) => e3 + e3).join("") : t3, a5 = Number.parseInt(n4, 16);
    return Number.isFinite(a5) && 6 === n4.length ? [(a5 >> 16 & 255) / 255, (a5 >> 8 & 255) / 255, (255 & a5) / 255] : [0, 0, 0];
  }
  function Qe(e2) {
    const t3 = new Uint32Array(256);
    let n4 = 0;
    for (let a6 = 0; a6 + 3 < e2.length; a6 += 4) e2[a6 + 3] < 8 || (t3[Math.round(0.2126 * e2[a6] + 0.7152 * e2[a6 + 1] + 0.0722 * e2[a6 + 2])]++, n4++);
    if (!n4) return [0, 1];
    const a5 = (e3) => {
      let a6 = 0;
      for (let r3 = 0; r3 < 256; r3++) if (a6 += t3[r3], a6 >= n4 * e3) return r3 / 255;
      return 1;
    }, r2 = a5(0.02), o3 = a5(0.98);
    return o3 - r2 < 0.08 ? [0, 1] : [r2, o3];
  }
  var Je = (e2) => "fluid" !== e2.hover || e2.fluid ? e2.hover : "none";
  function Ze(e2, t3, n4 = 24, a5 = 0.12, r2 = "ellipse") {
    return e2.width > 0 && e2.height > 0 && { x: (t3.left - n4 - e2.left) / e2.width, y: (t3.top - n4 - e2.top) / e2.height, width: (t3.width + 2 * n4) / e2.width, height: (t3.height + 2 * n4) / e2.height, feather: a5, shape: r2 };
  }
  var et;
  var tt = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
  var nt = /swiftshader|llvmpipe|softpipe|software|basic render/i;
  function at() {
    if (et) return et;
    if ("undefined" == typeof document || void 0 === globalThis.WebGL2RenderingContext) return et = "none";
    try {
      const e2 = le();
      if (e2) return et = nt.test(e2.renderer) ? "software" : "gpu";
      const t3 = document.createElement("canvas").getContext("webgl2");
      if (!t3) return et = "none";
      const n4 = t3.getExtension("WEBGL_debug_renderer_info"), a5 = String(t3.getParameter(n4 ? n4.UNMASKED_RENDERER_WEBGL : t3.RENDERER) ?? "");
      return t3.getExtension("WEBGL_lose_context")?.loseContext(), et = nt.test(a5) ? "software" : "gpu";
    } catch {
      return et = "none";
    }
  }
  var rt = (e2, t3) => `${e2.fontWeight} ${Math.max(1, t3.height * e2.glyphScale)}px ${e2.font}`;
  var ot = (e2, t3) => `${He(e2.charset).join("")}\0${rt(e2, t3)}\0${t3.width}x${t3.height}x${t3.columns}`;
  function it(e2, t3, n4, a5) {
    const r2 = Math.min(globalThis.devicePixelRatio || 1, e2.maxPixelRatio, Math.sqrt(8294400 / Math.max(1, t3 * n4)));
    return a5 < 1 && r2 > 1 ? Math.max(1, r2 * a5) : r2;
  }
  function lt(e2, t3, n4) {
    const a5 = He(e2.charset), r2 = document.createElement("canvas");
    r2.width = t3.atlasWidth, r2.height = t3.atlasHeight;
    const o3 = r2.getContext("2d");
    o3.fillStyle = "#fff", o3.textAlign = "center", o3.textBaseline = "alphabetic";
    const i4 = rt(e2, t3), l3 = Math.max(1, t3.height * e2.glyphScale), s4 = `${e2.fontWeight} ${l3}px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", YuGothic, "Noto Sans JP", "Noto Sans CJK JP", Meiryo, sans-serif, ${e2.font}`;
    o3.font = i4;
    const c5 = o3.measureText("M"), u3 = c5.actualBoundingBoxAscent || t3.height * e2.glyphScale * 0.7, h4 = c5.actualBoundingBoxDescent || 0, f3 = (t3.height + u3 - h4) / 2;
    a5.forEach((e3, n5) => {
      const a6 = n5 % t3.columns * t3.width + t3.width / 2, r3 = Math.floor(n5 / t3.columns) * t3.height + f3, c6 = fe(e3);
      if (o3.save(), o3.beginPath(), o3.rect(a6 - t3.width / 2, r3 - f3, t3.width, t3.height), o3.clip(), c6) {
        o3.font = s4;
        const r4 = o3.measureText(e3), c7 = Math.max(r4.width, (r4.actualBoundingBoxLeft || 0) + (r4.actualBoundingBoxRight || 0)), u4 = (r4.actualBoundingBoxAscent || 0.88 * l3) + (r4.actualBoundingBoxDescent || 0.12 * l3), h5 = Math.min(1, 0.94 * t3.width / Math.max(1, c7), 0.94 * t3.height / Math.max(1, u4));
        o3.translate(a6, Math.floor(n5 / t3.columns) * t3.height + t3.height / 2), o3.scale(h5, h5), o3.translate(((r4.actualBoundingBoxLeft || 0) - (r4.actualBoundingBoxRight || 0)) / 2, ((r4.actualBoundingBoxAscent || 0.88 * l3) - (r4.actualBoundingBoxDescent || 0.12 * l3)) / 2), o3.fillText(e3, 0, 0), o3.font = i4;
      } else {
        const n6 = o3.measureText(e3).width;
        o3.translate(a6, r3), n6 > 0.96 * t3.width && o3.scale(0.96 * t3.width / n6, 1), o3.fillText(e3, 0, 0);
      }
      o3.restore();
    });
    let d4 = true;
    const m4 = document.fonts;
    try {
      d4 = !m4?.check || m4.check(i4, a5.join(""));
    } catch {
    }
    return n4 && queueMicrotask(() => {
      r2.width = r2.height = 1;
    }), { image: r2, final: d4 };
  }
  var st = () => {
  };
  function ct(e2, t3 = {}) {
    if ("undefined" == typeof document || e2.ownerDocument !== document) return false;
    const n4 = e2.clientWidth, a5 = e2.clientHeight;
    if (!n4 || !a5) return false;
    const r2 = le();
    if (!r2 || r2.lost) return false;
    const { clear: o3, source: i4, interactionTarget: l3, onError: s4, label: c5, ...u3 } = t3, h4 = je(u3), f3 = Ke(h4.cellSize, h4.cellAspect, it(h4, n4, a5, r2.scale), He(h4.charset).length), d4 = ot(h4, f3);
    if (r2.hasAtlas(d4)) return false;
    try {
      r2.releaseAtlas(r2.atlas(d4, () => lt(h4, f3, true), st), st);
    } catch {
      return false;
    }
    return true;
  }
  function ut(e2 = {}) {
    const t3 = at();
    return "gpu" === t3 || "software" === t3 && !!e2.allowSoftware;
  }
  function ht(r2, d4 = {}) {
    const m4 = (e2) => "undefined" != typeof HTMLElement && e2 instanceof HTMLElement, p3 = (e2) => {
      const t3 = e2.clear;
      return g3(t3) ? { element: null, rest: { ...e2, clear: false } } : m4(t3) ? { element: { element: t3 }, rest: { ...e2, clear: void 0 } } : t3 && "object" == typeof t3 && m4(t3.element) ? { element: t3, rest: { ...e2, clear: void 0 } } : { element: null, rest: e2 };
    }, g3 = (e2) => !!e2 && "object" == typeof e2 && "rects" in e2;
    let v4 = p3(d4).element, x2 = g3(d4.clear) ? d4.clear : null, M4 = je(p3(d4).rest);
    const y3 = d4.onError, w3 = r2.ownerDocument, b2 = w3 && "undefined" != typeof document && w3 !== document ? null : le(), R4 = b2 ? r2.getContext("2d", { alpha: true }) : null, A3 = !(!b2 || !R4), F3 = A3 ? b2.gl : r2.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!F3) throw new Error("WebGL2 is not available for the glyph field.");
    let S3 = F3;
    A3 && ((e2) => {
      ce.add(e2);
    })(r2), r2.setAttribute("role", "img"), r2.setAttribute("aria-label", d4.label ?? "ASCII artwork"), r2.dataset.renderer = "glyph-field";
    let _3 = false;
    const C4 = A3 ? null : S3.getExtension("KHR_parallel_shader_compile");
    let P4, D3, U3 = null, I3 = null, B2 = null, N3 = null, G3 = null, X3 = [], q3 = [], O4 = null, H4 = false, Y3 = null, K3 = null;
    const $4 = [];
    let ne3 = 0, ae3 = 0, re3 = 1, oe3 = 0, ie3 = Ke(M4.cellSize, M4.cellAspect, 1, 2), se3 = 2, ue3 = 0, he3 = 0, fe2 = 0, pe2 = null, Me2 = false, Ee2 = null, Te2 = 0, ke2 = 0, Re2 = 0, Ce2 = null, Pe2 = 0, Ue2 = 0, Ie2 = 0, Be2 = true, Ne2 = 0, Ge2 = [0, 1], Xe2 = -1 / 0, qe2 = -1 / 0, Oe2 = false;
    const ze2 = (() => {
      const e2 = "undefined" == typeof navigator ? void 0 : navigator;
      return 1e3 / (e2 && (e2.hardwareConcurrency > 0 && e2.hardwareConcurrency <= 2 || e2.deviceMemory && e2.deviceMemory <= 2 || e2.connection?.saveData) ? 30 : 60) - 2;
    })(), We2 = new Float32Array(16);
    let Ve2 = false, et2 = 0, nt2 = 0, at2 = true, st2 = false, ct2 = false, ut2 = false, ht2 = false, ft = true, dt = null, mt = null, pt = 1 / 60, gt = 0, vt = 0, xt = [];
    const Mt = new Float32Array(16), yt = () => {
      if (!v4) return;
      const { element: e2, padding: t3 = 32, feather: n4 = 0.16, shape: a5 = "rect" } = v4, o3 = Ze(r2.getBoundingClientRect(), e2.getBoundingClientRect(), t3, n4, a5), i4 = M4.clear;
      JSON.stringify(i4) !== JSON.stringify(o3) && (M4 = { ...M4, clear: o3 }, at2 = true);
    };
    let wt = null, bt = new Uint8Array(0), Et = 0, Tt = 0, kt = false, Rt = null, At = new Float64Array(0), Ft = true;
    const St = () => {
      if (!x2) return void (kt && (kt = false, at2 = true));
      const e2 = x2.rects, t3 = "function" == typeof e2 ? e2() : e2;
      if (t3 === Rt && !Ft) return;
      Rt = t3;
      const n4 = r2.getBoundingClientRect(), [a5, o3] = (function(e3, t4, n5 = 256) {
        const a6 = Math.min(1 / 6, n5 / Math.max(1, e3, t4));
        return [Math.max(2, Math.round(e3 * a6)), Math.max(2, Math.round(t4 * a6))];
      })(n4.width, n4.height), i4 = new Float64Array(4 * t3.length + 6);
      i4[0] = n4.left, i4[1] = n4.top, i4[2] = n4.width, i4[3] = n4.height, i4[4] = x2.padding ?? 8, i4[5] = x2.softness ?? 28, t3.forEach((e3, t4) => {
        i4[6 + 4 * t4] = e3.left, i4[7 + 4 * t4] = e3.top, i4[8 + 4 * t4] = e3.width, i4[9 + 4 * t4] = e3.height;
      });
      const l3 = !Ft && i4.length === At.length && i4.every((e3, t4) => e3 === At[t4]);
      Ft = false, l3 && kt || (At = i4, bt = (function(e3, t4, n5, a6, r3 = 8, o4 = 28, i5 = new Uint8Array(n5 * a6)) {
        const l4 = n5 * a6;
        if (i5.length !== l4 && (i5 = new Uint8Array(l4)), i5.fill(0), !(t4.width > 0 && t4.height > 0 && e3.length)) return i5;
        const s4 = n5 / t4.width, c5 = a6 / t4.height, u3 = Math.max(0, Math.round(o4 / 2.56 * s4)), h4 = r3 + 0.5 * o4;
        for (const r4 of e3) {
          if (!(r4.width > 0 && r4.height > 0)) continue;
          const e4 = Math.max(0, Math.round((r4.left - h4 - t4.left) * s4)), o5 = Math.min(n5, Math.round((r4.left + r4.width + h4 - t4.left) * s4)), l5 = Math.max(0, Math.round((r4.top - h4 - t4.top) * c5)), u4 = Math.min(a6, Math.round((r4.top + r4.height + h4 - t4.top) * c5));
          for (let t5 = l5; t5 < u4; t5++) i5.fill(255, (a6 - 1 - t5) * n5 + e4, (a6 - 1 - t5) * n5 + Math.max(e4, o5));
        }
        if (!u3) return i5;
        const f3 = new Float32Array(Math.max(n5, a6)), d5 = new Float32Array(Math.max(n5, a6) + 1), m5 = (e4, t5, n6) => {
          for (let a7 = 0; a7 < 3; a7++) {
            for (let a8 = 0; a8 < e4; a8++) f3[a8] = i5[n6 + a8 * t5];
            d5[0] = 0;
            for (let t6 = 0; t6 < e4; t6++) d5[t6 + 1] = d5[t6] + f3[t6];
            for (let a8 = 0; a8 < e4; a8++) {
              const r4 = Math.max(0, a8 - u3), o5 = Math.min(e4, a8 + u3 + 1);
              i5[n6 + a8 * t5] = Math.round((d5[o5] - d5[r4]) / (o5 - r4));
            }
          }
        };
        for (let e4 = 0; e4 < a6; e4++) m5(n5, 1, e4 * n5);
        for (let e4 = 0; e4 < n5; e4++) m5(a6, n5, e4);
        return i5;
      })(t3, n4, a5, o3, i4[4], i4[5], bt), ct2 || (wt ?? (wt = un(S3.LINEAR)), S3.bindTexture(S3.TEXTURE_2D, wt), S3.pixelStorei(S3.UNPACK_ALIGNMENT, 1), S3.pixelStorei(S3.UNPACK_FLIP_Y_WEBGL, false), S3.pixelStorei(S3.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false), a5 !== Et || o3 !== Tt ? S3.texImage2D(S3.TEXTURE_2D, 0, S3.R8, a5, o3, 0, S3.RED, S3.UNSIGNED_BYTE, bt) : S3.texSubImage2D(S3.TEXTURE_2D, 0, 0, 0, a5, o3, S3.RED, S3.UNSIGNED_BYTE, bt), S3.pixelStorei(S3.UNPACK_ALIGNMENT, 4), Et = a5, Tt = o3, kt = true, at2 = true));
    }, _t = () => {
      at2 = true, Qn();
    };
    let Lt = false;
    const Ct = () => {
      const e2 = !!x2 && "function" == typeof x2.rects && "undefined" != typeof window && "function" == typeof window.addEventListener;
      e2 !== Lt && (Lt = e2, e2 ? window.addEventListener("scroll", _t, { passive: true, capture: true }) : window.removeEventListener("scroll", _t, { capture: true }));
    }, Pt = (e2) => "lantern" === e2 || "loupe" === e2 || "reveal" === e2, Dt = { target: null, at: null, strength: 0, trail: [] }, Ut = new Float32Array(36);
    let It = null, Bt = null, Nt = false;
    const Gt = () => {
      if (!ne3 || !ae3) return null;
      const e2 = ne3 / ae3, t3 = Math.round(e2 >= 1 ? 128 : 128 * e2), n4 = Math.round(e2 >= 1 ? 128 / e2 : 128);
      return It && It.width === t3 && It.height === n4 || (It = new de(t3, n4), Bt || (Bt = un(S3.LINEAR)), S3.bindTexture(S3.TEXTURE_2D, Bt), S3.texImage2D(S3.TEXTURE_2D, 0, S3.RGBA8, t3, n4, 0, S3.RGBA, S3.UNSIGNED_BYTE, It.pixels), Nt = true), It;
    };
    let Xt = null, qt = null, Ot = new Uint8Array(0), Ht = false, zt = null, Wt = null, Vt = -1;
    const jt = [-0.5, -0.8], Yt = [0, 0], Kt = () => {
      if (Xt && pe2) try {
        if (Wt ?? (Wt = document.createElement("canvas").getContext("2d", { willReadFrequently: true })), !Wt) return;
        const e2 = pe2 instanceof HTMLVideoElement, t3 = e2 ? Xt.cols >> 1 : Xt.cols, n4 = e2 ? Xt.rows >> 1 : Xt.rows, a5 = Wt.canvas;
        a5.width !== t3 || a5.height !== n4 ? (a5.width = t3, a5.height = n4) : Wt.clearRect(0, 0, t3, n4);
        const r3 = Te2 || 1, o3 = ke2 || 1;
        Wt.drawImage(pe2, On.offset[0] * r3, On.offset[1] * o3, On.scale[0] * r3, On.scale[1] * o3, 0, 0, t3, n4), zt = (function(e3, t4, n5, a6, r4 = e3) {
          const o4 = t4 * n5, i4 = a6?.length === o4 * ve ? a6 : new Float32Array(o4 * ve);
          if (!o4) return i4;
          const l3 = Math.min(t4, n5), s4 = new Float32Array(o4), c5 = new Float32Array(o4), u3 = new Float32Array(o4), h4 = new Float32Array(o4), f3 = new Float32Array(o4), d5 = new Float32Array(o4);
          for (let t5 = 0; t5 < o4; t5++) {
            const n6 = e3[4 * t5 + 3] / 255;
            s4[t5] = (0.299 * e3[4 * t5] + 0.587 * e3[4 * t5 + 1] + 0.114 * e3[4 * t5 + 2]) / 255 * n6;
          }
          c5.set(s4), me(c5, d5, t4, n5, Math.max(1, Math.round(0.012 * l3))), u3.set(s4), me(u3, d5, t4, n5, Math.max(1, Math.round(0.03 * l3)));
          for (let e4 = 0; e4 < o4; e4++) {
            h4[e4] = Math.abs(s4[e4] - c5[e4]);
            const t5 = Math.max(0, s4[e4] - 0.55) / 0.45;
            f3[e4] = t5 * t5;
          }
          me(h4, d5, t4, n5, Math.max(1, Math.round(0.02 * l3)));
          const m5 = 1 / Math.max(0.02, ye(h4, 0.95));
          me(f3, d5, t4, n5, Math.max(1, Math.round(0.05 * l3)));
          const p4 = 1 / Math.max(0.03, ye(f3, 0.98)), g4 = Math.max(1, Math.ceil(Math.sqrt(o4 / 12e3))), v5 = Math.max(1, Math.floor(t4 / g4)), x3 = Math.max(1, Math.floor(n5 / g4)), M5 = v5 * x3;
          let y4 = e3, w4 = r4;
          if (g4 > 1) {
            const n6 = new Uint8ClampedArray(4 * M5), a7 = r4 === e3 ? n6 : new Uint8ClampedArray(4 * M5);
            for (let o5 = 0; o5 < x3; o5++) for (let i5 = 0; i5 < v5; i5++) {
              const l4 = [0, 0, 0, 0, 0, 0, 0];
              for (let s6 = o5 * g4; s6 < (o5 + 1) * g4; s6++) for (let o6 = i5 * g4; o6 < (i5 + 1) * g4; o6++) {
                const i6 = 4 * (s6 * t4 + o6);
                for (let t5 = 0; t5 < 4; t5++) l4[t5] += e3[i6 + t5];
                if (a7 !== n6) for (let e4 = 0; e4 < 3; e4++) l4[4 + e4] += r4[i6 + e4];
              }
              const s5 = 4 * (o5 * v5 + i5), c6 = g4 * g4;
              for (let e4 = 0; e4 < 4; e4++) n6[s5 + e4] = l4[e4] / c6;
              if (a7 !== n6) {
                for (let e4 = 0; e4 < 3; e4++) a7[s5 + e4] = l4[4 + e4] / c6;
                a7[s5 + 3] = n6[s5 + 3];
              }
            }
            y4 = n6, w4 = a7;
          }
          be?.n !== M5 && (be = new we(M5)), be.reset();
          const { depth: b3, water: E3, sky: T3, falls: k3 } = Ae(y4, w4, v5, x3, be), R5 = ye(b3, 0.03), A4 = ye(b3, 0.97), F4 = Math.max(0.05, A4 - R5);
          let S4 = 0, _4 = 0, L3 = 0;
          const C5 = new Float32Array(o4);
          for (let e4 = 0; e4 < n5; e4++) for (let a7 = 0; a7 < t4; a7++) {
            const r5 = e4 * t4 + a7, o5 = r5 * ve, l4 = xe((Fe(b3, v5, x3, a7, e4, t4, n5) - R5) / F4);
            i4[o5 + 1] = l4, i4[o5 + 8] = xe(Fe(E3, v5, x3, a7, e4, t4, n5)), i4[o5 + 9] = xe(Fe(T3, v5, x3, a7, e4, t4, n5)), i4[o5 + 10] = xe(Fe(k3, v5, x3, a7, e4, t4, n5));
            const c6 = l4 * l4 * l4 * (0.25 + s4[r5]);
            S4 += (a7 + 0.5) / t4 * c6, _4 += (e4 + 0.5) / n5 * c6, L3 += c6, C5[r5] = Math.hypot(u3[e4 * t4 + Math.min(t4 - 1, a7 + 1)] - u3[e4 * t4 + Math.max(0, a7 - 1)], u3[Math.min(n5 - 1, e4 + 1) * t4 + a7] - u3[Math.max(0, e4 - 1) * t4 + a7]);
          }
          S4 = L3 > 0 ? Math.max(0.3, Math.min(0.7, S4 / L3)) : 0.5, _4 = L3 > 0 ? Math.max(0.3, Math.min(0.7, _4 / L3)) : 0.5;
          const P5 = 1 / Math.max(4e-3, ye(C5, 0.97));
          for (let e4 = 0; e4 < n5; e4++) for (let a7 = 0; a7 < t4; a7++) {
            const r5 = e4 * t4 + a7, o5 = r5 * ve, l4 = (u3[e4 * t4 + Math.min(t4 - 1, a7 + 1)] - u3[e4 * t4 + Math.max(0, a7 - 1)]) * P5, s5 = (u3[Math.min(n5 - 1, e4 + 1) * t4 + a7] - u3[Math.max(0, e4 - 1) * t4 + a7]) * P5;
            i4[o5] = u3[r5], i4[o5 + 2] = Math.min(1, f3[r5] * p4), i4[o5 + 3] = Math.min(1, h4[r5] * m5), i4[o5 + 4] = Math.max(-1, Math.min(1, -l4)), i4[o5 + 5] = Math.max(-1, Math.min(1, -s5)), i4[o5 + 6] = S4, i4[o5 + 7] = _4;
          }
          return i4;
        })(Wt.getImageData(0, 0, t3, n4).data, t3, n4, zt), Yt[0] = t3, Yt[1] = n4, (function(e3, t4, n5 = [-0.5, -0.8], a6 = e3.cols, r4 = e3.rows) {
          const { cols: o4, rows: i4, speed: l3, damp: s4, wall: c5 } = e3, u3 = ve;
          if (t4.length !== a6 * r4 * u3) return n5;
          let h4 = 0, f3 = 0, d5 = 0;
          for (let e4 = 0, n6 = 0; e4 < i4; e4++) {
            const m5 = Math.min(r4 - 1, e4 * r4 / i4 | 0);
            for (let p4 = 0; p4 < o4; p4++, n6++) {
              const g4 = Math.min(a6 - 1, p4 * a6 / o4 | 0), v5 = (m5 * a6 + g4) * u3, x3 = t4[v5 + 3], M5 = t4[v5 + 8], y4 = t4[v5 + 9], w4 = t4[v5 + 2], b3 = t4[v5 + 1], E3 = g4 < a6 - 1 ? u3 : 0, T3 = g4 > 0 ? -u3 : 0, k3 = m5 < r4 - 1 ? a6 * u3 : 0, R5 = m5 > 0 ? -a6 * u3 : 0, A4 = Math.hypot(t4[v5 + 1 + E3] - t4[v5 + 1 + T3], t4[v5 + 1 + k3] - t4[v5 + 1 + R5]), F4 = Math.hypot(t4[v5 + 4], t4[v5 + 5]), S4 = Math.max(M5, 0.9 * y4), _4 = 1 - Se(0.2, 0.8, x3), L3 = Math.max(0.12, Math.max(S4, 0.2 + 0.65 * _4) * (1 - 0.45 * Se(0.55, 0.95, b3) * (1 - M5)));
              l3[n6] = L3 * L3;
              const C5 = Math.max(0, 1 - S4);
              s4[n6] = 0.9 * M5 + 1.6 * y4 * (1 - M5) + C5 * (1.4 + 6.5 * Se(0.25, 0.9, x3)), c5[n6] = Math.min(0.4, 0.35 * Se(0.12, 0.35, A4) * (1 - 0.6 * M5) + 0.1 * Se(0.6, 1, F4) * (1 - S4)), h4 += (p4 / (o4 - 1) - 0.5) * w4, f3 += (e4 / (i4 - 1) - 0.5) * w4, d5 += w4;
            }
          }
          if (Le(l3, o4, i4, 2), Le(s4, o4, i4, 1), d5 > 0.5) {
            const e4 = Math.hypot(h4, f3);
            e4 / d5 > 0.02 && (n5[0] = h4 / e4, n5[1] = f3 / e4);
          }
        })(Xt, zt, jt, t3, n4);
      } catch {
      }
    }, $t = (e2, t3, n4) => {
      if (!ne3 || !ae3) return;
      const a5 = ne3 / ae3, r3 = Math.round(a5 >= 1 ? 128 : 128 * a5), o3 = Math.round(a5 >= 1 ? 128 / a5 : 128);
      Xt && Xt.cols === r3 && Xt.rows === o3 || (Xt = new _e(r3, o3), zt = null, Ot = new Uint8Array(r3 * o3 * 4), qt ?? (qt = un(S3.LINEAR)), S3.bindTexture(S3.TEXTURE_2D, qt), S3.texImage2D(S3.TEXTURE_2D, 0, S3.RGBA8, r3, o3, 0, S3.RGBA, S3.UNSIGNED_BYTE, null)), Xt.base = 1.1 * Math.min(r3, o3), Xt.mass = 0, Xt.calm = 7, Xt.fade = 1.6, Kt(), Vt = Ie2, Xt.drop(e2 * (r3 - 1), t3 * (o3 - 1), n4, 2.2), Qn();
    }, Qt = (e2) => {
      if (!Xt?.live || !qt) return !!Ht && (Ht = false, true);
      pe2 instanceof HTMLVideoElement && Vt !== Ie2 && (Kt(), Vt = Ie2), Xt.step(e2, 0.45 + 0.55 * Math.exp(-Xt.age / 0.7));
      const t3 = Math.min(1, Math.exp(-(Xt.age - 0.9) / 0.5));
      return t3 < 0.02 ? (Xt.clear(), Ht = false, true) : ((function(e3, t4, n4, a5, r3 = 1, o3 = e3.cols, i4 = e3.rows) {
        const { cols: l3, rows: s4, h: c5, trace: u3 } = e3, h4 = r3 / Math.max(0.01, e3.front), f3 = n4[0], d5 = n4[1], m5 = t4.length === o3 * i4 * 11;
        for (let e4 = 0, n5 = 0; e4 < s4; e4++) {
          const r4 = Math.min(i4 - 1, e4 * i4 / s4 | 0);
          for (let i5 = 0; i5 < l3; i5++, n5++) {
            const p4 = c5[n5] * h4, g4 = 11 * (r4 * o3 + Math.min(o3 - 1, i5 * o3 / l3 | 0)), v5 = m5 ? t4[g4 + 9] : 0, x3 = m5 ? Math.max(t4[g4 + 8], 0.75 * (1 - Se(0.1, 0.45, t4[g4 + 3])) * (1 - v5)) : 0, M5 = Math.max(0, 1 - Math.max(x3, v5)), y4 = 0.5 * (c5[i5 < l3 - 1 ? n5 + 1 : n5] - c5[i5 > 0 ? n5 - 1 : n5]) * h4, w4 = 0.5 * (c5[e4 < s4 - 1 ? n5 + l3 : n5] - c5[e4 > 0 ? n5 - l3 : n5]) * h4, b3 = (6 * -y4 + (m5 ? 0.35 * t4[g4 + 4] : 0)) * f3 + (6 * -w4 + (m5 ? 0.35 * t4[g4 + 5] : 0)) * d5, E3 = Math.max(-1, Math.min(1, b3)), T3 = p4 > 0 ? p4 : 0.45 * p4;
            let k3 = x3 * (0.8 * T3 + 0.4 * E3 * Math.min(1, 4 * Math.abs(p4))) + v5 * (0.3 * Math.min(1, u3[n5] * h4) + 0.15 * T3) + M5 * (0.55 * T3 + 0.25 * E3 * Math.min(1, 4 * Math.abs(p4)));
            const R5 = x3 * Math.max(0, E3) ** 3 * Math.min(1, 3 * Math.max(0, p4)) * 0.9 + M5 * Math.max(0, E3) ** 4 * Math.min(1, 3 * Math.max(0, p4)) * 0.25;
            k3 = Math.max(-1, Math.min(1, k3));
            const A4 = Math.round(32767 * k3 + 32768);
            a5[4 * n5] = A4 >>> 8, a5[4 * n5 + 1] = 255 & A4, a5[4 * n5 + 2] = Math.round(255 * Math.min(1, R5)), a5[4 * n5 + 3] = 255;
          }
        }
      })(Xt, zt ?? new Float32Array(0), jt, Ot, t3, Yt[0], Yt[1]), S3.bindTexture(S3.TEXTURE_2D, qt), S3.pixelStorei(S3.UNPACK_FLIP_Y_WEBGL, false), S3.pixelStorei(S3.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false), S3.texSubImage2D(S3.TEXTURE_2D, 0, 0, 0, Xt.cols, Xt.rows, S3.RGBA, S3.UNSIGNED_BYTE, Ot), Ht = true, true);
    };
    let Jt = 0;
    const Zt = "function" == typeof matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null, en = () => M4.respectReducedMotion && !!Zt?.matches;
    let tn;
    const nn = new Promise((e2) => {
      tn = e2;
    });
    let an = true;
    const rn = (e2) => y3?.(e2 instanceof Error ? e2 : new Error(String(e2))), on = (e2, t3) => {
      const n4 = S3.createShader(e2);
      return $4.push(n4), S3.shaderSource(n4, t3), S3.compileShader(n4), n4;
    }, ln = (e2) => {
      if (A3) return b2.program(e2);
      K3 ?? (K3 = on(S3.VERTEX_SHADER, "#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}"));
      const t3 = S3.createProgram(), n4 = on(S3.FRAGMENT_SHADER, e2);
      return S3.attachShader(t3, K3), S3.attachShader(t3, n4), S3.linkProgram(t3), { program: t3, locations: null, fragment: n4 };
    }, sn = (e2, t3 = false) => {
      if (e2.locations) return true;
      if (A3) return b2.linked(e2, t3);
      const { program: n4, fragment: a5 } = e2;
      if (!t3 && C4 && !S3.getProgramParameter(n4, C4.COMPLETION_STATUS_KHR)) return false;
      if (!S3.getProgramParameter(n4, S3.LINK_STATUS)) {
        if (S3.isContextLost()) return false;
        throw new Error(S3.getShaderInfoLog(a5) || S3.getProgramInfoLog(n4) || "Glyph field program failed to link.");
      }
      const r3 = {};
      for (let e3 = S3.getProgramParameter(n4, S3.ACTIVE_UNIFORMS) - 1; e3 >= 0; e3--) {
        const t4 = S3.getActiveUniform(n4, e3).name.replace(/\[0\]$/, "");
        r3[t4] = S3.getUniformLocation(n4, t4);
      }
      return e2.locations = r3, true;
    }, cn = (e2 = false) => !!U3 && !!I3 && sn(U3, e2) && sn(I3, e2), un = (e2) => {
      const t3 = S3.createTexture();
      return S3.bindTexture(S3.TEXTURE_2D, t3), S3.texParameteri(S3.TEXTURE_2D, S3.TEXTURE_MIN_FILTER, e2), S3.texParameteri(S3.TEXTURE_2D, S3.TEXTURE_MAG_FILTER, e2 === S3.LINEAR_MIPMAP_LINEAR ? S3.LINEAR : e2), S3.texParameteri(S3.TEXTURE_2D, S3.TEXTURE_WRAP_S, S3.CLAMP_TO_EDGE), S3.texParameteri(S3.TEXTURE_2D, S3.TEXTURE_WRAP_T, S3.CLAMP_TO_EDGE), t3;
    }, hn = () => {
      G3 && (S3.deleteTexture(G3.ink), S3.deleteTexture(G3.under), S3.deleteFramebuffer(G3.buffer), G3 = null);
    }, fn = () => (function(e2, t3, n4, a5, r3, o3, i4) {
      if ("fill" !== e2 || !(r3 > 0 && o3 > 0)) return [i4.width, i4.height];
      const l3 = t3 * a5, s4 = l3 * n4;
      return [r3 / Math.max(1, Math.floor(r3 / s4 + 1e-6)), o3 / Math.max(1, Math.floor(o3 / l3 + 1e-6))];
    })(M4.cellFit, M4.cellSize, M4.cellAspect, re3, ne3, ae3, ie3), dn = () => !!M4.fluid && "fluid" === Je(M4), mn = () => {
      O4?.release(), H4 = false, X3.forEach((e2) => S3.deleteTexture(e2)), q3.forEach((e2) => S3.deleteFramebuffer(e2)), X3 = [], q3 = [];
    };
    function pn() {
      B2 && !A3 && S3.deleteProgram(B2.program), B2 = ln(((e2) => `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uPrevious;
uniform vec2 uSize;
uniform float uAspect, uDt, uDecay, uEnergyDecay, uRadius, uSplat;
uniform vec2 uFrom, uTo, uForce;
out vec4 outColor;
${t(e2)}
float segment(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-8),0.,1.);return length(pa-ba*h);}
void main(){
  vec2 uv=gl_FragCoord.xy/uSize;
  vec4 here=decodeFluid(texture(uPrevious,uv));
  vec4 state=decodeFluid(texture(uPrevious,uv-uDt*here.xy*vec2(1./uAspect,1.)));
  state.xy*=exp(-uDt*uDecay);
  state.z*=exp(-uDt*uEnergyDecay);
  if(uSplat>.5){
    vec2 scale=vec2(uAspect,1.);
    float d=segment(uv*scale,uFrom*scale,uTo*scale);
    float g=exp(-d*d/(uRadius*uRadius));
    state.xy+=uForce*g;
    state.z=min(1.,state.z+g*min(1.,length(uForce)*.5+.08));
  }
  float speed=length(state.xy);
  if(speed>5.)state.xy*=5./speed;
  outColor=encodeFluid(state);
}`)(_3)), A3 ? O4?.release() : O4?.dispose(), O4 = _3 ? null : (function(e2, t3, n4) {
        const a5 = { splat: t3(o), curl: t3(i), vorticity: t3(l), divergence: t3(s), fade: t3(c), pressure: t3(u), gradient: t3(h), advect: t3(f) }, r3 = Object.values(a5);
        let d5 = 0, m5 = 0, p4 = [], g4 = [], v5 = null, x3 = null;
        const M5 = (t4) => {
          const n5 = e2.createTexture();
          e2.bindTexture(e2.TEXTURE_2D, n5), e2.texParameteri(e2.TEXTURE_2D, e2.TEXTURE_MIN_FILTER, t4), e2.texParameteri(e2.TEXTURE_2D, e2.TEXTURE_MAG_FILTER, t4), e2.texParameteri(e2.TEXTURE_2D, e2.TEXTURE_WRAP_S, e2.CLAMP_TO_EDGE), e2.texParameteri(e2.TEXTURE_2D, e2.TEXTURE_WRAP_T, e2.CLAMP_TO_EDGE), e2.texImage2D(e2.TEXTURE_2D, 0, e2.RGBA16F, d5, m5, 0, e2.RGBA, e2.HALF_FLOAT, null);
          const a6 = e2.createFramebuffer();
          return e2.bindFramebuffer(e2.FRAMEBUFFER, a6), e2.framebufferTexture2D(e2.FRAMEBUFFER, e2.COLOR_ATTACHMENT0, e2.TEXTURE_2D, n5, 0), e2.checkFramebufferStatus(e2.FRAMEBUFFER) !== e2.FRAMEBUFFER_COMPLETE ? (e2.deleteFramebuffer(a6), e2.deleteTexture(n5), null) : (e2.viewport(0, 0, d5, m5), e2.clearColor(0, 0, 0, 1), e2.clear(e2.COLOR_BUFFER_BIT), { texture: n5, buffer: a6 });
        }, y4 = (t4) => {
          t4 && (e2.deleteTexture(t4.texture), e2.deleteFramebuffer(t4.buffer));
        }, w4 = () => {
          [...p4, ...g4, v5, x3].forEach(y4), p4 = [], g4 = [], v5 = x3 = null;
        }, b3 = (t4, n5) => {
          const a6 = t4.locations;
          return e2.useProgram(t4.program), e2.bindFramebuffer(e2.FRAMEBUFFER, n5.buffer), e2.uniform2f(a6.uTexel, 1 / d5, 1 / m5), a6;
        }, E3 = (t4, n5, a6, r4) => {
          e2.activeTexture(e2.TEXTURE0 + a6), e2.bindTexture(e2.TEXTURE_2D, r4), e2.uniform1i(t4[n5], a6);
        }, T3 = () => e2.drawArrays(e2.TRIANGLES, 0, 3), k3 = (e3) => {
          const t4 = e3[0];
          e3[0] = e3[1], e3[1] = t4;
        };
        return { resize(t4, n5) {
          w4(), d5 = t4, m5 = n5;
          const a6 = [M5(e2.LINEAR), M5(e2.LINEAR), M5(e2.NEAREST), M5(e2.NEAREST), M5(e2.NEAREST), M5(e2.NEAREST)];
          return e2.bindFramebuffer(e2.FRAMEBUFFER, null), a6.some((e3) => !e3) ? (a6.forEach(y4), false) : (p4 = [a6[0], a6[1]], g4 = [a6[2], a6[3]], v5 = a6[4], x3 = a6[5], true);
        }, ready: () => r3.every(n4), step(t4, n5) {
          if (!p4.length || !v5 || !x3) return;
          let r4;
          e2.viewport(0, 0, d5, m5), t4 && (r4 = b3(a5.splat, p4[1]), E3(r4, "uVelocity", 0, p4[0].texture), e2.uniform2f(r4.uFrom, t4.from[0], t4.from[1]), e2.uniform2f(r4.uTo, t4.to[0], t4.to[1]), e2.uniform2f(r4.uForce, t4.force[0], t4.force[1]), e2.uniform1f(r4.uAspect, n5.aspect), e2.uniform1f(r4.uRadius, n5.radius), T3(), k3(p4)), n5.curl > 0 && (r4 = b3(a5.curl, x3), E3(r4, "uVelocity", 0, p4[0].texture), T3(), r4 = b3(a5.vorticity, p4[1]), E3(r4, "uVelocity", 0, p4[0].texture), E3(r4, "uCurl", 1, x3.texture), e2.uniform1f(r4.uStrength, n5.curl), e2.uniform1f(r4.uDt, n5.dt), T3(), k3(p4)), r4 = b3(a5.divergence, v5), E3(r4, "uVelocity", 0, p4[0].texture), T3(), r4 = b3(a5.fade, g4[1]), E3(r4, "uSource", 0, g4[0].texture), e2.uniform1f(r4.uAmount, 0.8), T3(), k3(g4);
          for (let e3 = 0; e3 < 20; e3++) r4 = b3(a5.pressure, g4[1]), E3(r4, "uPressure", 0, g4[0].texture), E3(r4, "uDivergence", 1, v5.texture), T3(), k3(g4);
          r4 = b3(a5.gradient, p4[1]), E3(r4, "uPressure", 0, g4[0].texture), E3(r4, "uVelocity", 1, p4[0].texture), T3(), k3(p4), r4 = b3(a5.advect, p4[1]), E3(r4, "uVelocity", 0, p4[0].texture), e2.uniform1f(r4.uDt, n5.dt), e2.uniform1f(r4.uDissipation, n5.dissipation), T3(), k3(p4), e2.bindFramebuffer(e2.FRAMEBUFFER, null);
        }, get velocity() {
          return p4[0]?.texture ?? null;
        }, get size() {
          return [d5, m5];
        }, release: w4, dispose() {
          w4(), r3.forEach(({ program: t4 }) => e2.deleteProgram(t4));
        } };
      })(S3, ln, (e2) => sn(e2));
    }
    const gn = () => {
      mn();
      const e2 = M4.fluid;
      if (!(e2 && dn() && ne3 && ae3)) return;
      B2 || pn();
      const t3 = e2.resolution, n4 = ne3 / ae3;
      if (ue3 = n4 >= 1 ? t3 : Math.max(8, Math.round(t3 * n4)), he3 = n4 >= 1 ? Math.max(8, Math.round(t3 / n4)) : t3, H4 = !!O4 && O4.resize(ue3, he3), H4) return void (fe2 = 0);
      const a5 = () => {
        mn();
        for (let e3 = 0; e3 < 2; e3++) {
          const e4 = un(S3.LINEAR);
          S3.texImage2D(S3.TEXTURE_2D, 0, _3 ? S3.RGBA8 : S3.RGBA16F, ue3, he3, 0, S3.RGBA, _3 ? S3.UNSIGNED_BYTE : S3.HALF_FLOAT, null);
          const t4 = S3.createFramebuffer();
          S3.bindFramebuffer(S3.FRAMEBUFFER, t4), S3.framebufferTexture2D(S3.FRAMEBUFFER, S3.COLOR_ATTACHMENT0, S3.TEXTURE_2D, e4, 0), X3.push(e4), q3.push(t4);
        }
        return S3.checkFramebufferStatus(S3.FRAMEBUFFER) === S3.FRAMEBUFFER_COMPLETE;
      };
      if (!a5()) {
        if (_3) throw new Error("The glyph field could not allocate its fluid buffers.");
        _3 = true, vn(), pn(), a5();
      }
      for (const e3 of q3) S3.bindFramebuffer(S3.FRAMEBUFFER, e3), S3.viewport(0, 0, ue3, he3), S3.clearColor(_3 ? 0.5 : 0, _3 ? 0.5 : 0, 0, 1), S3.clear(S3.COLOR_BUFFER_BIT);
      S3.bindFramebuffer(S3.FRAMEBUFFER, null), fe2 = 0;
    };
    function vn() {
      U3 && !A3 && S3.deleteProgram(U3.program), I3 && !A3 && S3.deleteProgram(I3.program), hn(), U3 = ln(n(_3)), I3 = ln(a), (A3 ? b2.canCompileInParallel : C4) || cn(true);
    }
    const xn = () => rt(M4, ie3), Mn = () => {
      at2 = true, Qn();
    }, yn = () => ot(M4, ie3), wn = () => {
      const e2 = He(M4.charset);
      if (se3 = e2.length, ie3 = Ke(M4.cellSize, M4.cellAspect, re3, se3), oe3 = re3, A3) {
        const e3 = yn();
        if (N3?.key !== e3) {
          const t4 = N3;
          N3 = b2.atlas(e3, bn, Mn), b2.releaseAtlas(t4, Mn), P4 = N3.texture;
        }
        return void (at2 = true);
      }
      const { image: t3 } = bn();
      S3.bindTexture(S3.TEXTURE_2D, P4), S3.pixelStorei(S3.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false), S3.texImage2D(S3.TEXTURE_2D, 0, S3.RGBA8, S3.RGBA, S3.UNSIGNED_BYTE, t3), t3.width = t3.height = 1, at2 = true;
    };
    function bn() {
      return lt(M4, ie3, A3);
    }
    const En = "undefined" == typeof document ? void 0 : document.fonts, Tn = () => {
      if (!En?.load) return;
      const e2 = xn();
      En.load(e2, He(M4.charset).join("")).then(() => {
        if (!st2 && !ct2 && xn() === e2) return A3 ? void (N3 && !N3.final && N3.key === yn() && b2.paintAtlas(N3, bn)) : (wn(), void Qn());
      }, () => {
      });
    }, kn = (e2) => e2.trim().replace(/^["']|["']$/g, "").toLowerCase(), Rn = () => {
      if (Ge2 = [0, 1], pe2 && "none" !== M4.levels) try {
        const e2 = document.createElement("canvas");
        e2.width = e2.height = 64;
        const t3 = e2.getContext("2d", { willReadFrequently: true });
        pe2 === Ce2 && (t3.imageSmoothingQuality = "medium"), t3.drawImage(pe2, 0, 0, 64, 64), Ge2 = Qe(t3.getImageData(0, 0, 64, 64).data);
      } catch {
        Ge2 = [0, 1];
      }
    };
    let An = null, Fn = null, Sn = false, _n = -1 / 0, Ln = new Uint8Array(0), Cn = null;
    const Pn = () => {
      if (Sn = false, !pe2 || "all" === M4.scope) return;
      const e2 = Te2 || 1, t3 = ke2 || 1, n4 = Math.max(8, Math.round(e2 >= t3 ? 96 : 96 * e2 / t3)), a5 = Math.max(8, Math.round(t3 >= e2 ? 96 : 96 * t3 / e2));
      try {
        if (Cn ?? (Cn = document.createElement("canvas").getContext("2d", { willReadFrequently: true })), !Cn) return;
        const e3 = Cn.canvas;
        e3.width !== n4 || e3.height !== a5 ? (e3.width = n4, e3.height = a5) : Cn.clearRect(0, 0, n4, a5), Cn.drawImage(pe2, 0, 0, n4, a5), Fn = ge(Cn.getImageData(0, 0, n4, a5).data, n4, a5, null, Fn);
      } catch {
        return;
      }
      if ("none" !== Fn.key) {
        Ln.length !== n4 * a5 * 4 && (Ln = new Uint8Array(n4 * a5 * 4));
        for (let e3 = 0; e3 < n4 * a5; e3++) Ln[4 * e3 + 3] = Math.round(255 * Fn.subject[e3]);
        An ?? (An = un(S3.LINEAR)), S3.bindTexture(S3.TEXTURE_2D, An), S3.pixelStorei(S3.UNPACK_FLIP_Y_WEBGL, false), S3.pixelStorei(S3.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false), S3.texImage2D(S3.TEXTURE_2D, 0, S3.RGBA8, n4, a5, 0, S3.RGBA, S3.UNSIGNED_BYTE, Ln), Sn = true;
      }
    }, Dn = () => {
      if (!pe2) return;
      const e2 = performance.now();
      pe2 instanceof HTMLVideoElement && !(e2 - Xe2 > 1500) || (Rn(), Xe2 = e2), pe2 instanceof HTMLVideoElement && !(e2 - _n > 160) || (Pn(), _n = e2), S3.bindTexture(S3.TEXTURE_2D, D3), S3.pixelStorei(S3.UNPACK_FLIP_Y_WEBGL, false), S3.pixelStorei(S3.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      try {
        S3.texImage2D(S3.TEXTURE_2D, 0, S3.RGBA8, S3.RGBA, S3.UNSIGNED_BYTE, pe2), S3.generateMipmap(S3.TEXTURE_2D);
        const e3 = pe2;
        Ue2 = (e3.videoWidth || e3.naturalWidth || e3.width) * (e3.videoHeight || e3.naturalHeight || e3.height) * 4 * 4 / 3;
      } catch (e3) {
        rn(e3);
      }
    }, Un = () => {
      _3 = !S3.getExtension("EXT_color_buffer_float") && !S3.getExtension("EXT_color_buffer_half_float"), vn(), Y3 = A3 ? b2.vertexArray() : S3.createVertexArray(), A3 || (P4 = un(S3.NEAREST)), D3 = un(S3.LINEAR_MIPMAP_LINEAR), S3.bindTexture(S3.TEXTURE_2D, D3), S3.texImage2D(S3.TEXTURE_2D, 0, S3.RGBA8, 1, 1, 0, S3.RGBA, S3.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255])), S3.generateMipmap(S3.TEXTURE_2D), ne3 = ae3 = 0, oe3 = 0, In(), Tn(), pe2 && Dn();
    };
    function In() {
      const e2 = r2.clientWidth || r2.clientHeight ? { width: r2.clientWidth, height: r2.clientHeight } : r2.getBoundingClientRect();
      Oe2 = !e2.width || !e2.height;
      const t3 = it(M4, e2.width, e2.height, A3 ? b2.scale : 1), n4 = Math.max(1, Math.round(e2.width * t3)), a5 = Math.max(1, Math.round(e2.height * t3));
      if (n4 === ne3 && a5 === ae3 && t3 === re3) return false;
      const o3 = !ne3 || Math.abs(n4 / a5 - ne3 / ae3) > 0.01;
      return re3 = t3, ne3 = n4, ae3 = a5, r2.width = ne3, r2.height = ae3, oe3 !== re3 && wn(), (o3 || dn() && !X3.length && !H4) && gn(), at2 = true, true;
    }
    let Bn = null;
    const Nn = new Float32Array(18);
    let Gn = [0, 0, 0], Xn = [1, 1, 1], qn = [0, 0, 0, 0], On = Ye(1, 1, 1, 1, "cover"), Hn = null, zn = 0, Wn = 0, Vn = 0, jn = 0;
    const Yn = () => {
      Bn !== M4 && (Bn = M4, Gn = $e(M4.ink), Xn = $e("auto" === M4.highlight ? "#ffffff" : M4.highlight), qn = "transparent" === M4.background ? [0, 0, 0, 0] : [...$e(M4.background), 1], Nn.fill(0), M4.ramp.forEach((e2, t4) => Nn.set($e(e2), 3 * t4))), Hn === M4 && zn === ne3 && Wn === ae3 && Vn === Te2 && jn === ke2 || (Hn = M4, zn = ne3, Wn = ae3, Vn = Te2, jn = ke2, On = Ye(ne3, ae3, Te2 || 1, ke2 || 1, M4.fit, M4.focus)), A3 && b2.begin(ne3, ae3);
      const t3 = M4.fluid, n4 = pe2 && Pe2 ? ie3.height / ae3 * Pe2 * On.scale[1] : 1, a5 = (() => {
        const [e2, t4] = fn(), n5 = Math.ceil(ne3 / e2 - 1e-4), a6 = Math.ceil(ae3 / t4 - 1e-4);
        if (G3 && G3.columns === n5 && G3.rows === a6) return G3;
        hn();
        const r4 = () => {
          const e3 = un(S3.NEAREST);
          return S3.texStorage2D(S3.TEXTURE_2D, 1, _3 ? S3.RGBA8 : S3.RGBA16F, n5, a6), e3;
        }, o4 = r4(), i5 = r4(), l4 = S3.createFramebuffer();
        return S3.bindFramebuffer(S3.FRAMEBUFFER, l4), S3.framebufferTexture2D(S3.FRAMEBUFFER, S3.COLOR_ATTACHMENT0, S3.TEXTURE_2D, o4, 0), S3.framebufferTexture2D(S3.FRAMEBUFFER, S3.COLOR_ATTACHMENT1, S3.TEXTURE_2D, i5, 0), S3.drawBuffers([S3.COLOR_ATTACHMENT0, S3.COLOR_ATTACHMENT1]), G3 = { ink: o4, under: i5, buffer: l4, columns: n5, rows: a6 };
      })(), r3 = U3.locations, o3 = I3.locations, i4 = Je(M4), l3 = !en();
      S3.bindFramebuffer(S3.FRAMEBUFFER, a5.buffer), S3.viewport(0, 0, a5.columns, a5.rows), S3.useProgram(U3.program), S3.activeTexture(S3.TEXTURE0), S3.bindTexture(S3.TEXTURE_2D, D3), S3.uniform1i(r3.uSource, 0), S3.activeTexture(S3.TEXTURE2), S3.bindTexture(S3.TEXTURE_2D, (H4 ? O4?.velocity : X3[fe2]) ?? D3), S3.uniform1i(r3.uFluid, 2), S3.activeTexture(S3.TEXTURE3), S3.bindTexture(S3.TEXTURE_2D, Bt ?? D3), S3.uniform1i(r3.uTrailMap, 3), S3.activeTexture(S3.TEXTURE6), S3.bindTexture(S3.TEXTURE_2D, An ?? D3), S3.uniform1i(r3.uScope, 6), S3.activeTexture(S3.TEXTURE7), S3.bindTexture(S3.TEXTURE_2D, qt ?? D3), S3.uniform1i(r3.uTapMap, 7), S3.uniform1f(r3.uTapOn, Ht && pe2 && Me2 ? 1 : 0), S3.uniform1f(r3.uScopeMode, Sn && "all" !== M4.scope ? "subject" === M4.scope ? 1 : 2 : 0), S3.uniform1f(r3.uFluidMode, H4 ? 1 : 0), S3.uniform1i(r3.uHoverMode, "fluid" === i4 ? 1 : "lantern" === i4 ? 2 : "trail" === i4 && Nt ? 3 : "loupe" === i4 ? 4 : "reveal" === i4 ? 5 : 0), S3.uniform1f(r3.uTrailAmount, M4.trail.strength), S3.uniform3f(r3.uLight, Dt.at?.[0] ?? -1, Dt.at?.[1] ?? -1, Pt(i4) ? Dt.strength : 0), S3.uniform3fv(r3.uTrail, Ut), S3.uniform1f(r3.uLightRadius, M4.lantern.radius), S3.uniform1f(r3.uLightGain, M4.lantern.strength), S3.uniform1f(r3.uClock, performance.now() / 1e3), S3.uniform1f(r3.uFlicker, l3 ? 1 : 0), S3.uniform2f(r3.uFluidTexel, 1 / Math.max(1, ue3), 1 / Math.max(1, he3)), S3.uniform2f(r3.uResolution, ne3, ae3);
      const [s4, c5] = fn();
      var u3;
      S3.uniform2f(r3.uCell, s4, c5), S3.uniform1f(r3.uCount, se3), S3.uniform1f(r3.uBlend, "on" === M4.blend || se3 <= 9 && ("coarse" === M4.blend || "auto" === M4.blend && Me2) ? 1 : 0), S3.uniform4f(r3.uSourceMap, On.scale[0], On.scale[1], On.offset[0], On.offset[1]), S3.uniform1i(r3.uScene, pe2 ? 0 : (u3 = M4.scene, e[u3] ?? 3)), S3.uniform1i(r3.uMark, De.indexOf(M4.mark)), S3.uniform1f(r3.uOrder, "text" === M4.glyphOrder ? 1 : "scatter" === M4.glyphOrder && "glyph" === M4.mark ? 2 : 0);
      const h4 = "text" === M4.glyphOrder && "row" === M4.textRepeat ? (function(e2) {
        const t4 = He(e2), n5 = [];
        for (let e3 = 0; e3 < t4.length && n5.length < 16; ) {
          if (!t4[e3].trim()) {
            e3++;
            continue;
          }
          const a6 = e3;
          for (; e3 < t4.length && t4[e3].trim(); ) e3++;
          n5.push(a6, e3 - a6);
        }
        return n5;
      })(M4.charset) : [];
      We2.fill(0), We2.set(h4), S3.uniform2fv(r3.uWords, We2), S3.uniform1f(r3.uWordCount, h4.length / 2), S3.uniform1f(r3.uScale, M4.scale);
      const f3 = M4.clear;
      S3.uniform4f(r3.uClear, f3 ? f3.x : 0, f3 ? f3.y : 0, f3 ? f3.width : 0, f3 ? f3.height : 0), S3.uniform1f(r3.uClearFeather, f3 ? f3.feather : 0.1), S3.uniform1f(r3.uClearShape, f3 && "rect" === f3.shape ? 1 : 0), S3.activeTexture(S3.TEXTURE8), S3.bindTexture(S3.TEXTURE_2D, wt ?? D3), S3.uniform1i(r3.uClearMap, 8);
      const d5 = kt && !!x2 && !!wt;
      S3.uniform1f(r3.uClearMapOn, d5 ? Math.min(1, Math.max(0, x2.strength ?? 0.85)) : 0), S3.uniform1f(r3.uClearBend, d5 ? 0.035 * Math.min(1, Math.max(0, x2.bend ?? 0.5)) : 0), S3.uniform2f(r3.uClearTexel, 1 / Math.max(1, Et), 1 / Math.max(1, Tt));
      const m5 = performance.now();
      Mt.fill(0);
      for (let e2 = 0; e2 < xt.length; e2++) {
        const t4 = xt[e2], n5 = 4 * e2;
        Mt[n5] = t4.x, Mt[n5 + 1] = t4.y, Mt[n5 + 2] = (m5 - t4.born) / 1e3, Mt[n5 + 3] = t4.strength;
      }
      S3.uniform4fv(r3.uPulse, Mt), S3.uniform3fv(r3.uInk, Gn), S3.uniform3fv(r3.uRamp, Nn), S3.uniform1f(r3.uRampCount, "source" === M4.color ? 0 : M4.ramp.length), S3.uniform3fv(r3.uHighlight, Xn), S3.uniform1f(r3.uHighlightAuto, "auto" === M4.highlight ? 1 : 0), S3.uniform4fv(r3.uBackground, qn), S3.uniform1f(r3.uBrightness, M4.brightness), S3.uniform1f(r3.uContrast, M4.contrast), S3.uniform1f(r3.uGamma, M4.gamma), S3.uniform1f(r3.uInvert, M4.invert ? 1 : 0), S3.uniform1f(r3.uVignette, M4.vignette), S3.uniform1f(r3.uSourceColor, "source" === M4.color ? 1 : 0), S3.uniform1f(r3.uRefraction, t3 ? t3.refraction * (l3 ? 1 : 0.25) : 0), S3.uniform1f(r3.uGlow, t3 ? t3.glow : 0), S3.uniform1f(r3.uTime, nt2), S3.uniform1f(r3.uDrift, l3 ? M4.drift : 0), S3.uniform1f(r3.uFluidOn, t3 && "fluid" === i4 && (X3.length || H4) ? 1 : 0), S3.uniform1f(r3.uLod, "point" === M4.sample ? 0 : Math.max(0, Math.log2(Math.max(1, n4)) - 0.5)), S3.uniform1f(r3.uSaturation, M4.saturation), S3.uniform1f(r3.uShade, M4.shade), S3.uniform1f(r3.uBackdrop, pe2 ? M4.backdrop : 0), S3.uniform2f(r3.uLevels, pe2 && "auto" === M4.levels ? Ge2[0] : 0, pe2 && "auto" === M4.levels ? Ge2[1] : 1), S3.bindVertexArray(Y3), S3.drawArrays(S3.TRIANGLES, 0, 3), S3.bindFramebuffer(S3.FRAMEBUFFER, null), S3.viewport(0, 0, ne3, ae3), S3.useProgram(I3.program), S3.activeTexture(S3.TEXTURE1), S3.bindTexture(S3.TEXTURE_2D, P4), S3.uniform1i(o3.uAtlas, 1), S3.activeTexture(S3.TEXTURE4), S3.bindTexture(S3.TEXTURE_2D, a5.ink), S3.uniform1i(o3.uCells, 4), S3.activeTexture(S3.TEXTURE5), S3.bindTexture(S3.TEXTURE_2D, a5.under), S3.uniform1i(o3.uUnder, 5), S3.uniform2f(o3.uResolution, ne3, ae3), S3.uniform2f(o3.uCell, ie3.width, ie3.height), S3.uniform2f(o3.uPitch, s4, c5), S3.uniform1f(o3.uColumns, ie3.columns), S3.uniform1f(o3.uDotScale, M4.dotScale), S3.uniform2f(o3.uDir, Math.cos(M4.markAngle * Math.PI / 180), Math.sin(M4.markAngle * Math.PI / 180)), S3.uniform1i(o3.uMark, De.indexOf(M4.mark)), S3.uniform4f(o3.uLine, M4.linePitch, M4.lineWeight, M4.sparkle, 0), S3.uniform4f(o3.uInlay, M4.accents, M4.shuffle, Math.floor(7 * nt2), He(M4.charset).length), S3.uniform1f(o3.uSourceColor, "source" === M4.color ? 1 : 0), S3.uniform3fv(o3.uRamp, Nn), S3.uniform1f(o3.uRampCount, "source" === M4.color ? 0 : M4.ramp.length), S3.uniform4f(o3.uFade, Gn[0], Gn[1], Gn[2], "inlay" === M4.mark || "tone" !== M4.glyphOrder && "glyph" === M4.mark ? 1 : 0), S3.drawArrays(S3.TRIANGLES, 0, 3), A3 && b2.present(R4, ne3, ae3);
    }, Kn = () => !st2 && !ct2 && !ut2 && !Oe2 && (ft || an) && !("undefined" != typeof document && document.hidden), $n = (e2) => {
      if (Ve2 = false, !Kn()) return;
      const t3 = (e2 - et2) / 1e3, n4 = Math.min(1 / 30, Math.max(1 / 480, t3));
      et2 = e2, pt = 0.9 * pt + 0.1 * Math.min(t3, 0.25), gt = pt > 1 / 24 ? gt + 1 : 0;
      try {
        A3 && b2.overloaded && vt < 2 && gt > 10 && (vt = 2), gt > 45 && vt < 2 && (!A3 || b2.atMinimum) && (gt = 0, vt++, 1 === vt && re3 > 1 ? (M4 = { ...M4, maxPixelRatio: 1 }, In()) : vt = 2);
        const t4 = cn(), a5 = !(ht2 || vt >= 2 && !(pe2 instanceof HTMLVideoElement) || (!(pe2 instanceof HTMLVideoElement) || pe2.paused || pe2.ended) && (en() || !(!pe2 && "none" !== M4.scene || M4.drift > 0)));
        a5 && (nt2 += n4 * M4.speed), pe2 instanceof HTMLVideoElement && pe2.readyState >= 2 && Be2 && (Be2 = !("requestVideoFrameCallback" in pe2), Dn(), Ie2++, at2 = true);
        const r3 = Je(M4);
        let o3 = "fluid" === r3 && (null !== mt || e2 < Jt);
        if (o3 ? ((e3, t5) => {
          const n5 = M4.fluid;
          if (!n5 || !q3.length && !H4) return;
          if (H4 ? !O4?.ready() : !B2 || !sn(B2)) return;
          const a6 = ne3 / ae3, r4 = mt;
          if (mt = null, H4 && O4) {
            const o5 = 5200 * n5.force * (en() ? 0.35 : 1);
            return r4 && (Jt = t5 + 1e3 * Math.min(9, 6 / Math.max(0.3, n5.dissipation))), void O4.step(r4 ? { from: r4.from, to: r4.to, force: [(r4.to[0] - r4.from[0]) * o5, (r4.to[1] - r4.from[1]) * o5] } : null, { dt: Math.min(e3, 1 / 60), radius: 1.1 * n5.radius, curl: n5.curl, dissipation: n5.dissipation, aspect: a6 });
          }
          let o4 = 0, i4 = 0;
          if (r4) {
            const e4 = (en() ? 1 : 3) * n5.force;
            o4 = (r4.to[0] - r4.from[0]) * a6 * e4 * 4, i4 = (r4.to[1] - r4.from[1]) * e4 * 4, Jt = t5 + 7 / Math.min(n5.dissipation, 1.1 * n5.dissipation) * 1e3;
          }
          const l3 = B2.locations;
          S3.bindFramebuffer(S3.FRAMEBUFFER, q3[1 - fe2]), S3.viewport(0, 0, ue3, he3), S3.useProgram(B2.program), S3.activeTexture(S3.TEXTURE0), S3.bindTexture(S3.TEXTURE_2D, X3[fe2]), S3.uniform1i(l3.uPrevious, 0), S3.uniform2f(l3.uSize, ue3, he3), S3.uniform1f(l3.uAspect, a6), S3.uniform1f(l3.uDt, e3), S3.uniform1f(l3.uDecay, n5.dissipation), S3.uniform1f(l3.uEnergyDecay, 1.1 * n5.dissipation), S3.uniform1f(l3.uRadius, n5.radius), S3.uniform1f(l3.uSplat, r4 ? 1 : 0), S3.uniform2f(l3.uFrom, r4?.from[0] ?? 0, r4?.from[1] ?? 0), S3.uniform2f(l3.uTo, r4?.to[0] ?? 0, r4?.to[1] ?? 0), S3.uniform2f(l3.uForce, o4, i4), S3.drawArrays(S3.TRIANGLES, 0, 3), fe2 = 1 - fe2;
        })(n4, e2) : mt = null, Pt(r3) && (o3 = ((e3, t5) => {
          const n5 = M4.lantern, a6 = Dt.target;
          if (a6) {
            const r5 = Dt.at;
            if (r5) if (en()) r5[0] = a6[0], r5[1] = a6[1];
            else {
              const t6 = 1 - Math.exp(-n5.follow * e3);
              r5[0] += (a6[0] - r5[0]) * t6, r5[1] += (a6[1] - r5[1]) * t6;
            }
            else Dt.at = [a6[0], a6[1]];
            const o4 = Dt.at, i4 = Dt.trail[Dt.trail.length - 1];
            n5.trail > 0 && (!i4 || t5 - i4.born > 28 && Math.hypot(o4[0] - i4.x, o4[1] - i4.y) > 4e-3) && (Dt.trail.push({ x: o4[0], y: o4[1], born: t5 }), Dt.trail.length > 12 && Dt.trail.shift());
          }
          Dt.strength += ((a6 ? 1 : 0) - Dt.strength) * (1 - Math.exp(-e3 * (a6 ? 9 : 5)));
          const r4 = Dt.trail;
          for (let e4 = r4.length - 1; e4 >= 0; e4--) n5.trail > 0 && t5 - r4[e4].born < 4e3 * n5.trail || r4.splice(e4, 1);
          Ut.fill(0);
          for (let e4 = 0; e4 < r4.length; e4++) {
            const a7 = r4[e4];
            Ut[3 * e4] = a7.x, Ut[3 * e4 + 1] = a7.y, Ut[3 * e4 + 2] = 0.55 * Math.exp(-(t5 - a7.born) / 1e3 / Math.max(0.01, n5.trail));
          }
          return Dt.strength > 3e-3 || r4.length > 0;
        })(n4, e2) || o3), "trail" === r3) {
          const e3 = !!It?.active;
          o3 = ((e4) => {
            const t5 = Gt();
            return !(!t5 || !t5.active || (t5.step(e4), S3.bindTexture(S3.TEXTURE_2D, Bt), S3.texSubImage2D(S3.TEXTURE_2D, 0, 0, 0, t5.width, t5.height, S3.RGBA, S3.UNSIGNED_BYTE, t5.pixels), Nt = true, 0));
          })(n4) || o3, e3 && !It?.active && (at2 = true);
        }
        if ((Xt?.live || Ht) && (o3 = Qt(n4) || o3, Ht || (at2 = true)), xt.length) {
          for (let t5 = xt.length - 1; t5 >= 0; t5--) e2 - xt[t5].born >= 2400 && xt.splice(t5, 1);
          o3 = true, xt.length || (at2 = true);
        }
        x2 && St(), t4 && (o3 || at2 || a5 && e2 - qe2 >= ze2 * E()) && (Yn(), qe2 = e2, at2 = false, !an || Re2 && !pe2 || (an = false, tn())), (a5 || o3 || mt || !t4) && (Ve2 = true, T($n));
      } catch (e3) {
        ut2 = true, rn(e3);
      }
    };
    function Qn() {
      !Ve2 && Kn() && (et2 = performance.now(), Ve2 = true, T($n));
    }
    const Jn = (e2, t3) => {
      const n4 = r2.getBoundingClientRect();
      if (!n4.width || !n4.height) return null;
      const a5 = (e2 - n4.left) / n4.width, o3 = (t3 - n4.top) / n4.height;
      return a5 < -0.05 || a5 > 1.05 || o3 < -0.05 || o3 > 1.05 ? null : [a5, 1 - o3];
    }, Zn = (e2) => {
      const t3 = Je(M4);
      if ("none" === t3 || ht2) return dt = null, void (Dt.target = null);
      if (Pt(t3)) return Dt.target = e2 ? [e2[0], 1 - e2[1]] : null, dt = null, void Qn();
      if ("trail" === t3) {
        const t4 = Gt();
        if (!t4) return;
        return e2 ? t4.move(e2[0], 1 - e2[1], M4.trail.radius, performance.now()) : t4.leave(), dt = null, void Qn();
      }
      e2 ? (dt && (mt = mt ? { from: mt.from, to: e2 } : { from: dt, to: e2 }), dt = e2, Qn()) : dt = null;
    }, ea = d4.interactionTarget ?? window, ta = { target: ea, move: (e2) => {
      "pointerdown" === e2.type && (function(e3) {
        if ("none" === M4.tap || !pe2 || !Me2 || ht2 || st2 || en() || 0 !== e3.button) return;
        if ("undefined" != typeof Element && e3.target instanceof Element && e3.target.closest("button, a, input, select, summary, textarea, label")) return;
        const t4 = Jn(e3.clientX, e3.clientY);
        if (!t4 || t4[0] < 0 || t4[0] > 1 || t4[1] < 0 || t4[1] > 1) return;
        "surface" === M4.tap ? $t(t4[0], 1 - t4[1], 1) : (xt = [...xt, { x: t4[0], y: 1 - t4[1], born: performance.now(), strength: 1 }].slice(-4), Qn());
      })(e2);
      const t3 = Jn(e2.clientX, e2.clientY);
      ea === window && (ta.inside = !!t3), Zn(t3);
    }, leave: () => {
      dt = null, It?.leave(), Dt.target && (Dt.target = null, Qn());
    }, near: () => ft }, na = [W(ta)];
    const aa = () => {
      const e2 = In();
      yt(), x2 && (Ft = true, at2 = true), (e2 || at2) && Qn();
    };
    let ra = v4 ? te(v4.element, aa) : () => {
    };
    na.push(te(r2, aa), () => ra()), na.push((function(e2, t3, n4) {
      if ("function" != typeof IntersectionObserver) return () => {
      };
      let a5 = Q.get(t3);
      if (!a5) {
        const e3 = /* @__PURE__ */ new Map();
        a5 = { observer: new IntersectionObserver(J(e3), { rootMargin: t3 }), watch: e3 }, Q.set(t3, a5);
      }
      const { observer: r3, watch: o3 } = a5;
      return Z(o3, e2, n4) || r3.unobserve(e2), r3.observe(e2), () => {
        ee(o3, e2, n4) && r3.unobserve(e2), o3.size || (r3.disconnect(), Q.delete(t3));
      };
    })(r2, "25% 0px", (e2) => {
      ft = e2.isIntersecting, ft && (at2 = true, Qn());
    })), na.push(V(() => {
      document.hidden || (at2 = true, Qn());
    })), na.push(j(() => {
      at2 = true, Qn();
    })), na.push(z(L, (e2) => {
      const t3 = e2.fontfaces ?? [], n4 = M4.font.split(",").map(kn);
      t3.some((e3) => n4.includes(kn(e3.family))) && Tn();
    })), Ct(), na.push(() => {
      x2 = null, Ct();
    });
    const oa = (e2) => {
      e2?.preventDefault(), ct2 = true, Ve2 && k($n), Ve2 = false;
    }, ia = () => {
      ct2 = false, A3 && (S3 = b2.gl), $4.length = 0, K3 = null, N3 = null, U3 = I3 = B2 = null, G3 = null, X3 = [], q3 = [], O4 = null, H4 = false, Bt = null, It = null, Nt = false, An = null, Sn = false, qt = null, Xt = null, Ht = false, wt = null, kt = false, Et = Tt = 0, Ft = true;
      try {
        Un(), at2 = true, Qn();
      } catch (e2) {
        rn(e2);
      }
    }, la = { lost: () => oa(), restored: ia, rescale: () => {
      In() && Qn();
    }, size: () => [ne3, ae3], bytes: () => {
      const e2 = _3 ? 4 : 8;
      return ne3 * ae3 * 4 + Ue2 + (G3 ? G3.columns * G3.rows * e2 * 2 : 0) + ue3 * he3 * e2 * (H4 ? 6 : X3.length) + (It ? It.width * It.height * 4 : 0);
    } };
    A3 ? b2.join(la) : (r2.addEventListener("webglcontextlost", oa), r2.addEventListener("webglcontextrestored", ia));
    const sa = () => {
      Ee2 && (Ee2.pause(), Ee2.removeAttribute("src"), Ee2.load(), Ee2 = null), Ne2 && pe2 instanceof HTMLVideoElement && "cancelVideoFrameCallback" in pe2 && pe2.cancelVideoFrameCallback(Ne2), Ne2 = 0;
    }, ca = () => {
      Ce2?.close(), Ce2 = null;
    }, ua = async (e2) => {
      const t3 = await createImageBitmap(e2, { premultiplyAlpha: "none" }), n4 = [t3.width, t3.height], a5 = (function(e3, t4, n5, a6, r3, o3, i4 = 8) {
        if (!(n5 >= 16 && a6 >= 16 && e3 > 0 && t4 > 0 && r3 > 0)) return 1;
        const l3 = i4 / r3 / ("cover" === o3 ? Math.min(e3 / n5, t4 / a6) : Math.max(e3 / n5, t4 / a6));
        return l3 > 0.5 ? 1 : 2 ** -Math.floor(Math.log2(1 / l3));
      })(t3.width, t3.height, ne3, ae3, ie3.height, M4.fit);
      if (1 === a5) return { element: t3, owned: true, natural: n4 };
      try {
        return { element: await createImageBitmap(t3, { resizeWidth: Math.max(1, Math.round(t3.width * a5)), resizeHeight: Math.max(1, Math.round(t3.height * a5)), resizeQuality: "medium", premultiplyAlpha: "none" }), owned: true, natural: n4 };
      } finally {
        t3.close();
      }
    }, ha = (e2) => new Promise((t3, n4) => {
      const a5 = new Image();
      a5.crossOrigin = "anonymous", a5.decoding = "async", a5.onload = () => t3({ element: a5, owned: false }), a5.onerror = () => n4(new Error("The glyph field could not load this image.")), a5.src = e2;
    }), fa = (e2, t3, n4) => {
      const { element: a5, owned: r3 } = e2;
      if (st2 || n4 !== Re2) return void (r3 && a5 instanceof HTMLVideoElement ? (a5.pause(), a5.removeAttribute("src"), a5.load()) : r3 && a5.close());
      a5 !== pe2 && (sa(), ca()), Ee2 = r3 && a5 instanceof HTMLVideoElement ? a5 : null, !r3 || a5 instanceof HTMLVideoElement || (Ce2 = a5);
      const o3 = a5 !== pe2;
      pe2 = a5, Me2 = "string" == typeof t3 || t3 instanceof HTMLImageElement || t3 instanceof HTMLVideoElement, Pe2 = a5 instanceof HTMLVideoElement ? a5.videoHeight : a5 instanceof HTMLImageElement ? a5.naturalHeight : a5.height, Te2 = e2.natural?.[0] ?? (a5 instanceof HTMLVideoElement ? a5.videoWidth : a5 instanceof HTMLImageElement ? a5.naturalWidth : a5.width), ke2 = e2.natural?.[1] ?? Pe2, Be2 = true, a5 instanceof HTMLVideoElement && o3 && ((e3) => {
        const t4 = e3;
        if (!t4.requestVideoFrameCallback) return;
        const n5 = () => {
          st2 || pe2 !== e3 || (Be2 = true, Qn(), Ne2 = t4.requestVideoFrameCallback(n5));
        };
        Ne2 = t4.requestVideoFrameCallback(n5);
      })(a5), ct2 || Dn(), at2 = true, Qn();
    }, da = (e2, t3) => {
      an && e2 === Re2 && (an = false, tn()), rn(t3);
    }, ma = (e2) => {
      const t3 = ++Re2;
      if (!e2) return sa(), ca(), pe2 = null, Te2 = ke2 = Pe2 = Ue2 = 0, Me2 = false, at2 = true, Qn(), Promise.resolve();
      if (((e3) => !("string" == typeof e3 || e3 instanceof HTMLImageElement && !e3.complete || e3 instanceof HTMLVideoElement && e3.readyState < 2))(e2)) {
        try {
          fa({ element: e2, owned: false }, e2, t3);
        } catch (e3) {
          da(t3, e3);
        }
        return Promise.resolve();
      }
      return (async (e3) => {
        if ("string" != typeof e3) return e3 instanceof HTMLImageElement && !e3.complete ? e3.decode().then(() => ({ element: e3, owned: false })) : e3 instanceof HTMLVideoElement && e3.readyState < 2 ? new Promise((t5, n5) => {
          e3.addEventListener("loadeddata", () => t5({ element: e3, owned: false }), { once: true }), e3.addEventListener("error", () => n5(new Error("The glyph field could not load this video.")), { once: true });
        }) : { element: e3, owned: false };
        if (tt.test(e3)) return new Promise((t5, n5) => {
          const a5 = document.createElement("video");
          a5.crossOrigin = "anonymous", a5.muted = true, a5.loop = true, a5.playsInline = true, a5.preload = "auto", a5.addEventListener("loadeddata", () => {
            a5.play().catch(() => {
            }), t5({ element: a5, owned: true });
          }, { once: true }), a5.addEventListener("error", () => n5(new Error("The glyph field could not load this video.")), { once: true }), a5.src = e3;
        });
        if ("function" != typeof createImageBitmap || "function" != typeof fetch) return ha(e3);
        let t4;
        try {
          t4 = await (await fetch(e3).then((e4) => {
            if (!e4.ok) throw new Error("The glyph field could not load this image.");
            return e4;
          })).blob();
        } catch (t5) {
          if (t5 instanceof Error && t5.message.startsWith("The glyph field")) throw t5;
          return ha(e3);
        }
        if (!/svg/i.test(t4.type)) try {
          return await ua(t4);
        } catch {
        }
        const n4 = URL.createObjectURL(t4);
        try {
          return await ha(n4);
        } finally {
          URL.revokeObjectURL(n4);
        }
      })(e2).then((n4) => fa(n4, e2, t3), (e3) => da(t3, e3));
    };
    Un(), yt();
    const pa = d4.source ?? null;
    return pa ? (Re2 = 1, ma(pa)) : Qn(), { canvas: r2, ready: nn, get settings() {
      return M4;
    }, update(e2) {
      const t3 = M4, { element: n4, rest: a5 } = p3(e2);
      if ("clear" in e2 && v4?.element !== n4?.element ? (ra(), v4 = n4, ra = n4 ? te(n4.element, aa) : () => {
      }) : "clear" in e2 && (v4 = n4), "clear" in e2) {
        const t4 = g3(e2.clear) ? e2.clear : null;
        t4 !== x2 && (x2 = t4, Ft = true, at2 = true, Ct(), Qn());
      }
      M4 = je(n4 ? { ...a5, clear: M4.clear } : a5, M4), yt(), e2.label && r2.setAttribute("aria-label", e2.label), M4.maxPixelRatio !== t3.maxPixelRatio && In(), M4.charset === t3.charset && M4.cellSize === t3.cellSize && M4.cellAspect === t3.cellAspect && M4.font === t3.font && M4.fontWeight === t3.fontWeight && M4.glyphScale === t3.glyphScale || (wn(), Tn()), M4.levels !== t3.levels && Rn(), M4.scope === t3.scope || ct2 || (Pn(), _n = performance.now());
      ((!!t3.fluid && "fluid" === Je(t3)) !== dn() || M4.fluid && t3.fluid && M4.fluid.resolution !== t3.fluid.resolution) && gn(), "source" in e2 && ma(e2.source ?? null), at2 = true, Qn();
    }, setSource: ma, pointer(e2, t3 = 0) {
      if (null === e2) return void Zn(null);
      const n4 = r2.getBoundingClientRect();
      Zn(Jn(n4.left + e2, n4.top + t3));
    }, redraw() {
      if (!(st2 || ct2 || ut2) && ne3) try {
        cn(!(an && (A3 ? b2.canCompileInParallel : C4))) && (Yn(), an || (at2 = false));
      } catch (e2) {
        ut2 = true, rn(e2);
      }
    }, pulse(e2 = {}) {
      if (st2 || en()) return;
      const t3 = r2.getBoundingClientRect();
      if (!t3.width || !t3.height) return;
      let n4 = e2.x ?? t3.width / 2, a5 = e2.y ?? t3.height / 2;
      if (e2.element) {
        const r3 = e2.element.getBoundingClientRect();
        n4 = r3.left + r3.width / 2 - t3.left, a5 = r3.top + r3.height / 2 - t3.top;
      }
      const o3 = Math.max(0, Math.min(2, e2.strength ?? 1));
      "surface" === M4.tap && pe2 && Me2 ? $t(n4 / t3.width, a5 / t3.height, o3) : (xt = [...xt, { x: n4 / t3.width, y: a5 / t3.height, born: performance.now(), strength: o3 }].slice(-4), Qn());
    }, play() {
      ht2 = false, pe2 instanceof HTMLVideoElement && pe2.play().catch(() => {
      }), at2 = true, Qn();
    }, pause() {
      ht2 = true, pe2 instanceof HTMLVideoElement && pe2.pause();
    }, resize() {
      In() && Qn();
    }, destroy() {
      if (!st2) {
        if (st2 = true, Ve2 && k($n), Ve2 = false, na.forEach((e2) => e2()), A3 ? b2.leave(la) : (r2.removeEventListener("webglcontextlost", oa), r2.removeEventListener("webglcontextrestored", ia)), sa(), ca(), pe2 = null, !ct2) if (mn(), hn(), S3.deleteTexture(D3), Bt && S3.deleteTexture(Bt), An && S3.deleteTexture(An), wt && S3.deleteTexture(wt), A3) b2.releaseAtlas(N3, Mn), O4?.release();
        else {
          S3.deleteTexture(P4);
          for (const e2 of [U3, I3, B2]) e2 && S3.deleteProgram(e2.program);
          O4?.dispose(), $4.forEach((e2) => S3.deleteShader(e2)), Y3 && S3.deleteVertexArray(Y3);
        }
        N3 = null;
      }
    } };
  }

  // node_modules/asciify-engine/dist/kit/chunk-IPYPFSYJ.js
  var a2 = { standard: { label: "Classic ASCII", chars: " .:-=+*#%@" }, asciify: { label: "Asciify", chars: " .:-=+YCIFSA#@" }, minimal: { label: "Minimal", chars: " .:+" }, detailed: { label: "Detailed", chars: " .,:;-~=+*xX#%@" }, letters: { label: "Letters", chars: " .liLTYCFSAWM" }, technical: { label: "Technical", chars: " ._:;+/>=][{}*$#@" }, blocks: { label: "Tonal blocks", chars: " \u2591\u2592\u2593\u2588" }, braille: { label: "Braille", chars: " \u2801\u2803\u2807\u2847\u28C7\u28E7\u28F7\u28FF" }, fish: { label: "Fish", chars: " .'-,:;txoSX%#8@" }, kanji: { label: "Kanji (Japanese)", chars: " \u4E00\u4E8C\u4EBA\u5C0F\u5927\u4E2D\u65E5\u672C\u76EE\u7530\u9577\u9593\u8A9E\u66F8\u66DC\u9A5A\u9727" } };
  function o2(e2) {
    if (e2) return Object.prototype.hasOwnProperty.call(a2, e2) ? a2[e2].chars : e2.startsWith(" ") ? e2 : " " + e2;
  }
  var s2 = { ascii: { mark: "glyph", charset: " .:-=+*#%@" }, blocks: { mark: "glyph", charset: " \u2591\u2592\u2593\u2588" }, braille: { mark: "glyph", charset: " \u2801\u2803\u2807\u2847\u28C7\u28E7\u28F7\u28FF" }, dots: { mark: "dot" }, lines: { mark: "glyph", charset: " -\u2550\u256A\u256C" }, cross: { mark: "glyph", charset: " \xB7+xX#" }, diagonal: { mark: "glyph", charset: " /\u2571\u2573" }, diamond: { mark: "glyph", charset: " \xB7\u25C7\u25C8\u25C6" }, mixed: { mark: "glyph", charset: " .:+/\u25C7#@" }, pixel: { mark: "pixel" }, mosaic: { mark: "mosaic" }, lego: { mark: "lego" }, voxel: { mark: "voxel" }, disco: { mark: "disco" }, dither: { mark: "dither" }, hex: { mark: "hex" }, led: { mark: "led" }, cmyk: { mark: "cmyk" }, stipple: { mark: "stipple" }, engraving: { mark: "engraving" }, crosshatch: { mark: "crosshatch" }, woodblock: { mark: "woodblock" }, risograph: { mark: "risograph" }, pointillism: { mark: "pointillism" } };
  var i2 = /\p{L}/u;
  var c2 = new Set(Object.values(a2).map((e2) => e2.chars));
  var h2 = /* @__PURE__ */ new Set(["glyph", "inlay"]);
  var m2 = (e2) => h2.has(e2 ?? "glyph");
  var d2 = (e2) => ({ cellSize: Math.max(7, e2.cellSize ?? 8), cellAspect: 0.62, glyphScale: 0.9 });
  var f2 = /* @__PURE__ */ new WeakSet();
  var p2 = (e2) => {
    f2.add(e2);
  };
  var g2 = (e2) => e2 && !f2.has(e2) ? e2.current.charset : void 0;
  function y2(e2, t3) {
    const r2 = o2(t3);
    if (!r2) return e2;
    if (m2(e2.mark)) return { ...e2, charset: r2, ...le2(r2, e2) };
    const n4 = { ...e2, ...d2(e2) };
    return { ...n4, mark: "glyph", charset: r2, ...le2(r2, n4) };
  }
  var v2 = null;
  var k2 = /* @__PURE__ */ new Set();
  var C2 = 12;
  var E2 = /* @__PURE__ */ new Set();
  var A2 = null;
  var M2 = null;
  var P2 = 0;
  var W2 = -1e9;
  var L2 = 0;
  var F2 = 0;
  var I2 = false;
  var O2 = false;
  var T2 = () => {
    const e2 = M2?.timeline?.currentTime;
    return "number" == typeof e2 ? e2 : null;
  };
  var R2 = () => "undefined" != typeof performance ? performance.now() : Date.now();
  var q2 = () => "number" == typeof innerHeight ? innerHeight : 0;
  function z2(e2, t3 = e2.getBoundingClientRect()) {
    if (false === e2.isConnected) return 1 / 0;
    if ("function" == typeof e2.getClientRects && 0 === e2.getClientRects().length) return 1 / 0;
    const r2 = t3.bottom < 0 ? -t3.bottom : t3.top - q2();
    return r2 > 0 ? r2 : 0;
  }
  function $2() {
    try {
      const e2 = M2?.querySelectorAll?.("dialog:modal");
      return e2?.length ? e2[e2.length - 1] : null;
    } catch {
      return null;
    }
  }
  var Y2 = 1e8;
  function X2(e2, t3) {
    if (e2.eager) return void (e2.wanted = true);
    const r2 = q2(), n4 = z2(e2.host, t3);
    !r2 || n4 <= 2 * r2 ? e2.wanted = true : n4 > 3 * r2 && (e2.wanted = false);
  }
  function D2(e2) {
    let t3 = false;
    for (const r2 of e2) if (r2?.target) for (const e3 of E2) e3.host === r2.target && (X2(e3, r2.boundingClientRect ?? void 0), t3 = true);
    t3 && re2();
  }
  var _2 = () => re2();
  var H2 = 0;
  var N2 = 0;
  var V2 = () => {
    const e2 = "number" == typeof scrollY ? scrollY : 0;
    e2 !== N2 && (H2 = e2 > N2 ? 1 : -1), N2 = e2;
  };
  function G2(e2, t3) {
    if (!t3 || !H2) return t3;
    return e2.getBoundingClientRect().top > 0 === H2 > 0 ? t3 : 2 * t3;
  }
  var J2 = null;
  var K2 = (e2) => {
    J2 !== e2 && (J2?.removeEventListener?.("close", _2, true), J2?.removeEventListener?.("scroll", V2, true), e2?.addEventListener?.("close", _2, true), e2?.addEventListener?.("scroll", V2, { capture: true, passive: true }), J2 = e2);
  };
  var Q2 = /* @__PURE__ */ new WeakSet();
  var U2 = 0;
  function Z2() {
    U2 || "function" != typeof requestIdleCallback || (U2 = requestIdleCallback(ee2, { timeout: 2e3 }));
  }
  function ee2(e2) {
    U2 = 0;
    const t3 = [...E2].filter((e3) => !e3.live && e3.prewarm && !Q2.has(e3)).sort((e3, t4) => z2(e3.host) - z2(t4.host));
    for (const r2 of t3) {
      if (e2.timeRemaining() < 2 && !e2.didTimeout) return void Z2();
      Q2.add(r2);
      try {
        r2.prewarm();
      } catch {
      }
    }
  }
  function te2(e2) {
    M2 !== e2.doc && (M2 = e2.doc, E2.clear(), P2 = L2 = F2 = H2 = 0, W2 = -1e9, N2 = "number" == typeof scrollY ? scrollY : 0), K2(M2), E2.add(e2);
    const t3 = (function() {
      const e3 = "function" == typeof IntersectionObserver ? IntersectionObserver : null;
      if (!e3) return null;
      if (A2?.ctor !== e3) {
        A2?.list.forEach((e4) => e4.disconnect()), A2 = { ctor: e3, list: ["200% 0px", "300% 0px", "0px"].map((t4) => new e3(D2, { rootMargin: t4 })) };
        for (const e4 of E2) A2.list.forEach((t4) => t4.observe(e4.host));
      }
      return A2.list;
    })();
    t3?.forEach((t4) => t4.observe(e2.host)), t3 ? X2(e2) : e2.wanted = true, re2(), e2.live || Z2();
  }
  function re2(t3 = false) {
    if (I2) O2 = true;
    else {
      I2 = true;
      try {
        do {
          O2 = false;
          const r2 = R2(), n4 = T2();
          (t3 || (null === n4 ? r2 - W2 > 16 || r2 < W2 : n4 !== W2)) && (W2 = n4 ?? r2, L2 = F2 = 0);
          for (const e2 of E2) false === e2.host.isConnected && (e2.wanted = false);
          for (const e2 of E2) e2.live && !e2.wanted && e2.release();
          const a5 = [...E2].filter((e2) => e2.live && !e2.shared), o3 = $2(), s4 = (e2) => !!o3 && !o3.contains(e2.host), l3 = (e2) => z2(e2.host) + (s4(e2) ? Y2 : 0), i4 = (e2) => e2.eager && !s4(e2), c5 = () => a5.filter((e2) => e2.live && !e2.shared).map((e2) => [e2, l3(e2) + (i4(e2) ? 0 : 1e9)]).sort((e2, t4) => t4[1] - e2[1]);
          for (let e2 = a5.length - C2, t4 = e2 > 0 ? c5() : []; e2 > 0; e2--) t4.shift()?.[0].release();
          const u3 = se(), h4 = 1 * q2(), m4 = () => [...E2].filter((e2) => e2.live && e2.shared && l3(e2) > h4).sort((e2, t4) => l3(t4) - l3(e2));
          if (u3?.overBudget) for (const e2 of m4()) {
            if (!u3.overBudget) break;
            e2.release();
          }
          const d4 = [...E2].filter((e2) => e2.wanted && !e2.live).map((e2) => [e2, e2.eager ? -1 : l3(e2)]).map(([e2, t4]) => [e2, t4, t4 > 0 ? G2(e2.host, t4) : t4]).sort((e2, t4) => e2[2] - t4[2]);
          let f3 = 0;
          for (const [e2, r3] of d4) {
            if (!E2.has(e2) || e2.live) continue;
            if (u3 && !u3.roomy) {
              const t4 = m4()[0];
              if (!t4 || l3(t4) <= l3(e2)) break;
              if (t4.release(), !u3.roomy) break;
            }
            if (!e2.eager && (L2 >= 4 || F2 >= 2) && (!t3 || f3)) {
              P2 || (P2 = requestAnimationFrame(() => {
                P2 = 0, re2(true);
              }));
              break;
            }
            if (a5.filter((e3) => e3.live && !e3.shared).length >= C2) {
              const t4 = c5()[0]?.[0];
              if (!t4 || (i4(t4) ? !e2.eager || l3(t4) <= l3(e2) : !e2.eager && l3(t4) <= r3)) break;
              t4.release();
            }
            const n5 = R2();
            e2.mount(), L2 += R2() - n5, f3++, e2.eager || F2++, e2.live && !e2.shared && a5.push(e2);
          }
        } while (O2);
      } finally {
        I2 = false;
      }
    }
  }
  var ne2 = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  var ae2 = /* @__PURE__ */ new Map();
  var oe2 = ".:-=+*#%@";
  function se2(e2, t3 = ne2) {
    const r2 = `${t3}\0${e2}`, n4 = ae2.get(r2);
    if (n4) return n4;
    let a5 = { max: 1, mean: 1 };
    try {
      const r3 = "undefined" == typeof document ? null : Object.assign(document.createElement("canvas"), { width: 48, height: 48 }).getContext("2d", { willReadFrequently: true });
      if (r3 && "function" == typeof r3.getImageData) {
        r3.font = `500 36px ${t3}`, r3.textAlign = "center", r3.textBaseline = "middle";
        const n5 = (e3) => {
          r3.clearRect(0, 0, 48, 48), r3.fillStyle = "#000", r3.fillText(e3, 24, 25);
          const t4 = r3.getImageData(0, 0, 48, 48).data;
          let n6 = 0;
          for (let e4 = 3; e4 < t4.length; e4 += 4) n6 += t4[e4];
          return n6 / 255;
        }, o3 = (e3) => [...e3].filter((e4) => e4.trim()).map(n5), s4 = (e3) => e3.reduce((e4, t4) => e4 + t4, 0) / Math.max(1, e3.length), l3 = o3(e2), i4 = o3(oe2), c5 = n5("@");
        l3.length && c5 > 0 && s4(i4) > 0 && (a5 = { max: Math.max(...l3) / c5, mean: s4(l3) / s4(i4) });
      }
    } catch {
    }
    return ae2.set(r2, a5), a5;
  }
  function le2(e2, t3) {
    const { max: r2, mean: n4 } = se2(e2, t3.font ?? ne2), a5 = t3.glyphScale ?? 0.8, o3 = t3.gamma ?? 1, s4 = t3.fontWeight ?? 500;
    return r2 > 1.15 ? { glyphScale: Math.max(0.3, a5 * Math.max(0.62, r2 ** -0.36)), gamma: o3, fontWeight: s4 } : n4 > 1.5 ? { glyphScale: Math.max(0.3, a5 * n4 ** -0.25), gamma: o3, fontWeight: s4 } : r2 < 0.85 ? { glyphScale: Math.min(1.6, a5 * Math.min(1.3, r2 ** -0.3)), gamma: o3, fontWeight: r2 < 0.6 ? Math.max(s4, 700) : s4 } : { glyphScale: a5, gamma: o3, fontWeight: s4 };
  }
  var ie2 = /* @__PURE__ */ new WeakMap();
  function ce2(e2, t3) {
    for (const r2 of ie2.get(e2)?.keys() ?? []) r2.getAttribute("src") !== t3 && (r2.src = t3);
  }
  function ue2(e2) {
    const t3 = ie2.get(e2);
    ie2.delete(e2), t3?.forEach((e3) => e3());
  }
  function he2(e2, t3, r2, n4, a5) {
    const o3 = document.createElement("img");
    o3.alt = "", o3.decoding = "async", o3.setAttribute("aria-hidden", "true"), o3.setAttribute("style", `${r2};object-fit:cover`), o3.style.opacity = "1", o3.dataset.asciiPoster = "", o3.src = t3;
    const s4 = e2.style.getPropertyValue("position"), l3 = "function" == typeof getComputedStyle && "static" === getComputedStyle(e2).position;
    l3 && e2.style.setProperty("position", "relative");
    const i4 = e2.style.getPropertyValue("isolation"), c5 = /z-index:\s*-1/.test(r2) && "function" == typeof getComputedStyle && "auto" === getComputedStyle(e2).isolation;
    c5 && e2.style.setProperty("isolation", "isolate"), a5?.parentElement === e2 ? e2.insertBefore(o3, a5) : e2.appendChild(o3);
    let u3 = false;
    const h4 = () => {
      u3 || (u3 = true, o3.remove(), ie2.get(n4)?.delete(o3), l3 && (s4 ? e2.style.setProperty("position", s4) : e2.style.removeProperty("position")), c5 && (i4 ? e2.style.setProperty("isolation", i4) : e2.style.removeProperty("isolation")));
    }, m4 = ie2.get(n4) ?? /* @__PURE__ */ new Map();
    return m4.set(o3, h4), ie2.set(n4, m4), { show(e3) {
      o3.style.opacity = e3 ? "1" : "0";
    }, remove: h4 };
  }
  function me2(e2) {
    const t3 = document.createElement("canvas");
    for (const r2 of e2.getAttributeNames?.() ?? []) "width" !== r2 && "height" !== r2 && t3.setAttribute(r2, e2.getAttribute(r2));
    return t3.style.cssText = e2.style.cssText, Object.assign(t3.dataset, e2.dataset), e2.replaceWith ? e2.replaceWith(t3) : e2.parentElement && (e2.parentElement.insertBefore(t3, e2), e2.remove()), t3;
  }
  function de2(e2) {
    const { host: a5, kit: o3 } = e2;
    let l3, u3 = e2.canvas, h4 = null, d4 = false, f3 = false, p3 = false, g3 = false, y3 = {}, b2 = {}, w3 = e2.source, x2 = false, S3 = {}, C4 = null, M4 = null, P4 = false, W4 = null, L3 = () => {
    };
    const F3 = !e2.ownPoster && o3?.current.poster ? he2(a5, o3.current.poster, e2.place, o3, u3) : null, I3 = () => {
      if (!v2 || false === o3?.current.globalLook || o3?.current.charset) return;
      if (!m2(b2.mark) && !e2.glyphs || "scatter" !== b2.glyphOrder && !c2.has(b2.charset ?? "") && i2.test(b2.charset ?? "")) return;
      const t3 = v2.style ? s2[v2.style] : void 0, r2 = t3?.mark ?? (m2(b2.mark) ? b2.mark ?? "glyph" : "glyph"), n4 = m2(r2) ? v2.charset || (t3 && "charset" in t3 ? t3.charset : void 0) : void 0;
      return t3 || n4 ? { mark: r2, charset: n4 } : void 0;
    }, O4 = () => ({ ...e2.glyphs ? Object.fromEntries(Object.keys(e2.glyphs()).map((e3) => [e3, b2[e3]]).filter(([, e3]) => void 0 !== e3)) : {}, mark: b2.mark ?? "glyph", charset: b2.charset ?? " .,:-=+*#%@", glyphScale: b2.glyphScale ?? 0.8, gamma: b2.gamma ?? 1, fontWeight: b2.fontWeight ?? 500 }), T3 = (t3) => {
      if (!t3.charset) return { ...O4(), mark: t3.mark };
      const r2 = e2.glyphs && !m2(b2.mark) ? e2.glyphs() : {};
      return { ...r2, mark: t3.mark, charset: t3.charset, ...le2(t3.charset, { ...b2, ...r2 }) };
    }, j2 = () => {
      const e3 = I3(), t3 = e3 && `${e3.mark}\0${e3.charset ?? ""}`;
      return t3 === l3 ? null : (l3 = t3, e3 ? T3(e3) : O4());
    }, B2 = { host: a5, doc: document, eager: false === o3?.current.lazy, wanted: false, live: false, poster: !!F3 || !!e2.ownPoster, mount() {
      if (f3 || h4) return;
      d4 && (u3 = e2.canvas = me2(u3)), d4 = true, b2 = { ...e2.options(), ...y3 }, l3 = void 0;
      const t3 = j2();
      let a6;
      try {
        a6 = ht(u3, { ...b2, ...t3, ...void 0 === w3 ? {} : { source: w3 }, onError: () => {
          h4 === a6 && R4();
        } });
      } catch {
        return void R4();
      }
      h4 = a6, B2.live = true, B2.shared = ue(u3);
      const o4 = u3;
      if (B2.shared) L3 = () => {
      };
      else {
        let e3 = 0;
        const t4 = () => {
          h4 === a6 && (F3?.show(true), clearTimeout(e3), e3 = setTimeout(() => {
            h4 === a6 && u3 === o4 && (B2.release(), re2());
          }, 1e3));
        }, r2 = () => {
          clearTimeout(e3), requestAnimationFrame(() => requestAnimationFrame(() => {
            h4 === a6 && F3?.show(false);
          }));
        };
        o4.addEventListener?.("webglcontextlost", t4), o4.addEventListener?.("webglcontextrestored", r2), L3 = () => {
          clearTimeout(e3), o4.removeEventListener?.("webglcontextlost", t4), o4.removeEventListener?.("webglcontextrestored", r2);
        };
      }
      x2 && a6.pause(), a6.ready.then(() => {
        h4 === a6 && (P4 = true, F3?.show(false), C4?.(), C4 = M4 = null);
      }, () => {
      }), e2.onMount?.(a6, u3);
    }, release() {
      if (!h4) return;
      const t3 = h4;
      h4 = null, B2.live = false, P4 = false, L3(), W4?.clear(), W4 = null, S3 = t3.settings, t3.destroy(), B2.shared ? f3 || (u3.width = u3.width, d4 = false) : (((e3) => {
        try {
          const t4 = e3.getContext("webgl2");
          t4 && !t4.isContextLost?.() && t4.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
        }
      })(u3), f3 || (u3 = e2.canvas = me2(u3), d4 = false)), F3?.show(true), e2.onRelease?.();
    }, prewarm() {
      if (f3 || h4) return;
      b2 = { ...e2.options(), ...y3 };
      const r2 = I3();
      ct(u3, { ...b2, ...r2 ? T3(r2) : {} });
    } };
    function R4() {
      p3 || (p3 = true, q3(), g3 || e2.onFail());
    }
    function q3() {
      f3 || (f3 = true, B2.release(), (function(e3) {
        E2.delete(e3) && ([...E2].some((t3) => t3.host === e3.host) || A2?.list.forEach((t3) => t3.unobserve(e3.host)), !E2.size && A2 && (A2.list.forEach((e4) => e4.disconnect()), A2 = null), E2.size || (K2(null), U2 && "function" == typeof cancelIdleCallback && cancelIdleCallback(U2), U2 = 0), re2());
      })(B2), k2.delete(z3), u3.remove(), p3 ? F3?.show(true) : F3?.remove());
    }
    const z3 = { relook() {
      h4 || ((e3) => {
        Q2.delete(e3), E2.has(e3) && Z2();
      })(B2);
      const t3 = j2();
      if (!t3 || !h4) return;
      const r2 = h4, n4 = P4 && !(o3?.current.reducedMotion ?? ("function" == typeof matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches));
      W4?.clear(), W4 = null, n4 && (r2.redraw(), W4 = (function(e3, t4) {
        if (!e3.width || !e3.height || "undefined" == typeof document) return null;
        const r3 = document.createElement("canvas");
        r3.width = e3.width, r3.height = e3.height;
        const n5 = r3.getContext("2d");
        if (!n5 || "function" != typeof r3.animate) return null;
        try {
          n5.drawImage(e3, 0, 0);
        } catch {
          return null;
        }
        r3.setAttribute("aria-hidden", "true"), r3.dataset.asciiSweep = "", r3.setAttribute("style", t4);
        const a7 = document.createElement("span");
        let o4, s4;
        a7.setAttribute("aria-hidden", "true"), a7.dataset.asciiSweep = "", a7.setAttribute("style", `${t4};right:auto;width:2px;margin-left:-1px;opacity:0;background:var(--ascii-sweep, #f3ba32);box-shadow:0 0 10px 1px color-mix(in srgb, var(--ascii-sweep, #f3ba32) 40%, transparent)`), e3.after(r3, a7);
        const l4 = () => {
          o4?.cancel(), s4?.cancel(), r3.remove(), a7.remove();
        };
        return { clear: l4, reveal() {
          if (!r3.isConnected) return;
          const t5 = { duration: 200, delay: 40, easing: "cubic-bezier(.23,1,.32,1)", fill: "both" };
          o4 = r3.animate([{ clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 100%)" }], t5);
          const n6 = e3.clientWidth || e3.getBoundingClientRect().width;
          s4 = a7.animate([{ transform: "translateX(0px)", opacity: 0.35 }, { opacity: 0.35, offset: 0.7 }, { transform: `translateX(${n6}px)`, opacity: 0 }], t5), o4.onfinish = l4;
        } };
      })(u3, e2.place)), r2.update(t3);
      const a6 = W4;
      a6 && requestAnimationFrame(() => requestAnimationFrame(() => {
        W4 === a6 && h4 === r2 ? a6.reveal() : a6.clear();
      }));
    } };
    return { field: { get canvas() {
      return u3;
    }, get ready() {
      return h4 ? h4.ready : M4 ?? (M4 = new Promise((e3) => {
        C4 = e3;
      }));
    }, get settings() {
      return h4?.settings ?? S3;
    }, update(e3) {
      if (y3 = { ...y3, ...e3 }, b2 = { ...b2, ...e3 }, !h4) return;
      const t3 = j2(), r2 = I3();
      h4.update(r2 ? { ...e3, ...T3(r2) } : t3 ? { ...e3, ...t3 } : e3);
    }, setSource: (e3) => (w3 = e3, h4 ? h4.setSource(e3) : Promise.resolve()), pointer(e3, t3) {
      h4?.pointer(e3, t3);
    }, redraw() {
      h4?.redraw();
    }, pulse(e3) {
      h4?.pulse(e3);
    }, play() {
      x2 = false, h4?.play();
    }, pause() {
      x2 = true, h4?.pause();
    }, resize() {
      h4?.resize();
    }, destroy() {
      q3();
    } }, get canvas() {
      return u3;
    }, get live() {
      return !!h4;
    }, get failed() {
      return p3;
    }, start() {
      k2.add(z3), g3 = true;
      try {
        te2(B2);
      } finally {
        g3 = false;
      }
    }, destroy: q3 };
  }

  // node_modules/asciify-engine/dist/kit/chunk-3WSUMOZD.js
  var m3 = (e2, t3 = 0, n4 = 1) => Math.min(n4, Math.max(t3, e2));
  var w2;
  var M3 = () => "function" == typeof matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C3 = { scene: "none", background: "transparent", color: "ink", levels: "none", fit: "cover", focus: { x: 0.5, y: 0.5 }, vignette: 0, drift: 0, hover: "none", shade: 0, contrast: 1, brightness: 0, gamma: 1, maxPixelRatio: 2, clear: false };
  function R3(e2, t3, n4) {
    let o3 = (e2 ?? "").trim();
    const r2 = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(o3);
    if (r2 ? o3 = S2(t3, r2[1]) || (r2[2] ?? "").trim() : o3.startsWith("--") && (o3 = S2(t3, o3)), !o3) return n4 ? R3(n4, t3) : null;
    if (/^#[\da-f]{6}$/i.test(o3)) return o3.toLowerCase();
    if (/^#[\da-f]{3}$/i.test(o3)) return `#${[...o3.slice(1)].map((e3) => e3 + e3).join("")}`.toLowerCase();
    const i4 = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(o3);
    if (i4) return $3([+i4[1], +i4[2], +i4[3]]);
    if (void 0 === w2) try {
      w2 = "undefined" == typeof document ? null : Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true });
    } catch {
      w2 = null;
    }
    if (!w2) return n4 ? R3(n4, t3) : null;
    w2.clearRect(0, 0, 1, 1), w2.fillStyle = "#000", w2.fillStyle = o3, w2.fillRect(0, 0, 1, 1);
    const [a5, s4, c5] = w2.getImageData(0, 0, 1, 1).data;
    return $3([a5, s4, c5]);
  }
  var S2 = (e2, t3) => "function" == typeof getComputedStyle ? getComputedStyle(e2).getPropertyValue(t3).trim() : "";
  var $3 = (e2) => `#${e2.map((e3) => Math.round(m3(e3, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
  var O3 = (e2) => {
    const t3 = parseInt(e2.slice(1, 7), 16);
    return [t3 >> 16 & 255, t3 >> 8 & 255, 255 & t3];
  };
  function P3(e2) {
    const t3 = "function" == typeof getComputedStyle ? getComputedStyle(e2) : null, n4 = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?/i.exec(t3?.backgroundColor ?? "");
    if (n4) {
      if ((void 0 === n4[4] ? 1 : n4[4].endsWith("%") ? parseFloat(n4[4]) / 100 : parseFloat(n4[4])) >= 0.5) return 0.2126 * +n4[1] + 0.7152 * +n4[2] + 0.0722 * +n4[3] < 128;
    }
    const o3 = R3(t3?.color ?? "", e2);
    if (!o3) return "function" == typeof matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
    const [r2, i4, a5] = O3(o3);
    return 0.2126 * r2 + 0.7152 * i4 + 0.0722 * a5 > 140;
  }
  function W3() {
    const e2 = [];
    return { set(t3, n4, o3) {
      e2.some(([e3, o4]) => e3 === t3 && o4 === n4) || e2.push([t3, n4, t3.style.getPropertyValue(n4)]), t3.style.setProperty(n4, o3);
    }, restore() {
      for (const [t3, n4, o3] of e2.reverse()) o3 ? t3.style.setProperty(n4, o3) : t3.style.removeProperty(n4);
      e2.length = 0;
    } };
  }
  function H3(e2, t3) {
    const n4 = { ...e2, ...t3 }, o3 = e2.look, r2 = t3.look;
    return r2 && (n4.look = Object.fromEntries(Object.entries({ ...o3, ...r2 }).filter(([, e3]) => void 0 !== e3))), n4;
  }

  // node_modules/asciify-engine/dist/kit/chunk-LRICD7AF.js
  var i3 = (e2, t3, r2, o3) => "number" == typeof e2 && Number.isFinite(e2) ? Math.min(o3, Math.max(r2, e2)) : t3;
  function c3(e2) {
    return "dots" === e2 ? " \xB7\u2219\u2022\u25CF" : o2(e2);
  }
  function a3(r2, a5) {
    if (!a5 || !a5.preset || "function" != typeof a5.preset.mount) throw new TypeError("background() needs a preset, such as `aurora` imported from asciify-engine/kit.");
    const u3 = a5.preset;
    let p3 = a5.poster;
    const l3 = (e2) => ({ ...e2, poster: e2.preset === u3 ? p3 : void 0 }), y3 = { current: l3({ ...a5 }) };
    p2(y3);
    let d4 = null, f3 = false, m4 = false;
    const g3 = /* @__PURE__ */ new Set(), h4 = () => {
      const e2 = y3.current, t3 = e2.preset;
      return { speed: i3(e2.speed, t3.speed, 0, 5), cellSize: i3(e2.cellSize, t3.cellSize, 3, 96), charset: c3(e2.charset), cursor: "none" !== e2.look?.hover && (e2.cursor ?? t3.cursor), tap: "ring" === e2.tap || "surface" === e2.tap ? e2.tap : void 0, mark: "glyph" === e2.mark || "dot" === e2.mark ? e2.mark : void 0, clear: e2.clear ?? false, clearMap: { padding: i3(e2.clearPadding, 8, 0, 400), softness: i3(e2.clearSoftness, 28, 0, 600), strength: i3(e2.clearStrength, 0.85, 0, 1) }, dither: i3(e2.dither, 0, 0, 1), accent: e2.accent, text: e2.text?.trim() || "ASCIIFY", look: e2.look };
    }, k3 = (e2) => {
      const t3 = y3.current, r3 = t3.palette;
      return ("string" == typeof r3 ? r3 : r3?.[e2 ? "dark" : "light"]) ?? t3.color ?? t3.ink;
    }, v4 = () => String(i3(y3.current.opacity, y3.current.preset.opacity ?? 1, 0, 1)), S3 = () => !!(y3.current.reducedMotion ?? M3()), P4 = (e2) => {
      let t3 = null;
      if (t3 = y3.current.preset.mount({ host: r2, kit: y3, settings: h4, ink: k3, reducedMotion: () => y3.current.reducedMotion, onFail: () => {
        d4 === t3 && (d4 = null);
      } }), !t3) return null;
      const o3 = t3.canvas.style;
      return e2 && (o3.opacity = "0", o3.transition = "opacity 320ms cubic-bezier(.16, 1, .3, 1)", t3.canvas.offsetWidth), o3.opacity = v4(), f3 && t3.pause(), t3;
    }, M4 = { position: r2.style.getPropertyValue("position"), isolation: r2.style.getPropertyValue("isolation") }, b2 = (e2, t3) => {
      t3 ? r2.style.setProperty(e2, t3) : r2.style.removeProperty(e2);
    };
    let z3 = false;
    const x2 = (e2) => {
      z3 = true, e2.destroy(), d4 && !m4 && ("function" == typeof getComputedStyle && "static" === getComputedStyle(r2).position && r2.style.setProperty("position", "relative"), r2.style.setProperty("isolation", "isolate"));
    }, F3 = (e2) => {
      if (m4 || !e2 || "function" != typeof e2.mount || e2 === y3.current.preset) return;
      y3.current = l3({ ...y3.current, preset: e2 });
      const t3 = d4;
      d4 = P4(!!t3 && !S3()), t3 && ((e3) => {
        if (S3()) return void x2(e3);
        e3.canvas.style.transition = "opacity 320ms cubic-bezier(.16, 1, .3, 1)", e3.canvas.style.opacity = "0";
        const t4 = { run: e3, timer: setTimeout(() => {
          g3.delete(t4), x2(e3);
        }, 340) };
        g3.add(t4);
      })(t3);
    };
    d4 = P4(false);
    return { get supported() {
      return !!d4 && !m4;
    }, get field() {
      return m4 ? null : d4?.field ?? null;
    }, get preset() {
      return y3.current.preset;
    }, update(t3) {
      if (m4 || !t3) return;
      const { preset: r3, ...o3 } = t3;
      "poster" in o3 && (p3 = o3.poster), y3.current = l3(H3(y3.current, o3)), o3.poster && y3.current.poster && ce2(y3, o3.poster), r3 && r3 !== y3.current.preset ? F3(r3) : d4 && (d4.canvas.style.opacity = v4(), d4.refresh());
    }, play() {
      !m4 && f3 && (f3 = false, d4?.play());
    }, pause() {
      m4 || (f3 = true, d4?.pause());
    }, setPreset: F3, destroy() {
      if (!m4) {
        m4 = true;
        for (const e2 of g3) clearTimeout(e2.timer), e2.run.destroy(), z3 = true;
        g3.clear(), d4?.destroy(), d4 = null, z3 && (b2("position", M4.position), b2("isolation", M4.isolation)), ue2(y3);
      }
    } };
  }
  function u2(e2, t3, r2 = false) {
    const o3 = e2.clear;
    return "function" == typeof o3 || Array.isArray(o3) ? { rects: o3, ...e2.clearMap } : o3 ? { element: o3, ...t3 } : r2;
  }

  // node_modules/asciify-engine/dist/kit/chunk-3AKXSVWP.js
  function v3(i4) {
    const { host: a5, layer: c5 = "under", kit: m4 } = i4;
    if ("undefined" == typeof document) return null;
    const v4 = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:inherit;z-index:${"under" === c5 ? -1 : "auto"}`;
    if (!ut()) return m4?.current.poster && !i4.ownPoster && he2(a5, m4.current.poster, v4, m4), null;
    const y3 = W3(), b2 = document.createElement("canvas");
    "static" === getComputedStyle(a5).position && y3.set(a5, "position", "relative"), "under" === c5 && y3.set(a5, "isolation", "isolate"), b2.dataset.asciiKit = "", b2.setAttribute("style", v4), a5.appendChild(b2);
    let k3 = P3(a5), P4 = false;
    const w3 = () => {
      const e2 = i4.reducedMotion();
      return true === e2 ? { speed: 0, drift: 0, respectReducedMotion: true } : { respectReducedMotion: false !== e2 };
    }, M4 = () => R3(i4.ink(k3), a5, k3 ? "#d8d6cf" : "#1d1d1b") ?? "#888888", R4 = de2({ host: a5, canvas: b2, kit: m4, place: v4, ownPoster: i4.ownPoster, glyphs: i4.glyphs, source: i4.source ?? null, options: () => ({ ...y2({ ...C3, ...i4.look(k3) }, g2(m4)), ...w3(), ink: M4(), interactionTarget: a5, label: i4.label ?? "" }), onMount: (e2, t3) => {
      i4.label || (t3.removeAttribute("role"), t3.removeAttribute("aria-label"), t3.setAttribute("aria-hidden", "true")), i4.onMount?.();
    }, onRelease: i4.onRelease, onFail: () => {
      S3(), i4.onFail?.();
    } }), j2 = R4.field;
    let x2 = false;
    const C4 = () => {
      P4 || (k3 = P3(a5), j2.update({ ...y2({ ...C3, ...i4.look(k3) }, g2(m4)), ...w3(), ink: M4() }));
    }, O4 = () => {
      x2 = false, C4();
    }, A3 = Y(() => {
      x2 || P4 || (x2 = true, T(O4));
    });
    function S3() {
      P4 || (P4 = true, x2 && k(O4), A3(), R4.destroy(), y3.restore());
    }
    return R4.start(), R4.failed ? (S3(), null) : { field: j2, get canvas() {
      return R4.canvas;
    }, get live() {
      return R4.live;
    }, dark: () => k3, still: () => !!(i4.reducedMotion() ?? M3()), refresh: C4, destroy: S3 };
  }

  // node_modules/asciify-engine/dist/kit/chunk-TIDLQIUB.js
  var t2 = (e2, r2) => false === e2.cursor ? "none" : "string" == typeof e2.cursor ? e2.cursor : r2;
  function n2(e2, t3, n4, o3) {
    let l3 = null;
    if (l3 = v3({ host: e2.host, kit: e2.kit, layer: "under", glyphs: o3 && (() => o3(e2.settings())), look: (r2) => {
      const n5 = e2.settings();
      return { ...t3(n5, r2), ...n5.look };
    }, ink: (r2) => e2.ink(r2) ?? (r2 ? n4.dark : n4.light), reducedMotion: e2.reducedMotion, onFail: () => {
      l3 = null, e2.onFail();
    } }), !l3) return null;
    const i4 = l3.canvas;
    return { get field() {
      return l3?.field ?? null;
    }, get canvas() {
      return l3?.canvas ?? i4;
    }, refresh() {
      l3?.refresh();
    }, play() {
      l3?.field.play();
    }, pause() {
      l3?.field.pause();
    }, destroy() {
      l3?.destroy(), l3 = null;
    } };
  }
  var l2 = { light: "#86847e", dark: "#7c7a74" };
  var s3 = (e2, r2) => e2.mark ?? (e2.charset || e2.look?.charset ? "glyph" : r2);
  var a4 = (e2) => ({ font: '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace', fontWeight: 400, cellSize: e2.cellSize, cellAspect: 0.62, glyphScale: 0.86 });
  var c4 = (e2) => ({ cellSize: e2.cellSize, cellAspect: 1, dotScale: 0.68 });
  var d3 = { x: 0.18, y: 0.2, width: 0.64, height: 0.6, feather: 0.3, shape: "ellipse" };
  function h3(r2) {
    const { scene: o3, charset: i4, hover: h4, middle: u3 = d3, feather: p3 = 0.3, graphite: f3 = l2 } = r2, g3 = r2.mark ?? "glyph";
    return { id: r2.id, name: r2.name, description: r2.description, cellSize: r2.cellSize, speed: r2.speed ?? 1, cursor: r2.cursor ?? true, opacity: r2.opacity, mount(l3) {
      const d4 = n2(l3, (n4, l4) => {
        const d5 = s3(n4, g3);
        return { scene: o3, color: "ink", shade: 0, background: "transparent", vignette: 0, speed: n4.speed, maxPixelRatio: 2, levels: "none", blend: "on", ..."dot" === d5 ? { mark: "dot", ...c4(n4) } : { mark: "glyph", charset: n4.charset ?? i4, ...a4(n4) }, hover: t2(n4, h4), lantern: { radius: 0.14, strength: 0.45, trail: 0.8, follow: 9 }, trail: { strength: 0.8, radius: 0.35 }, fluid: { radius: 0.09, refraction: 0.03, glow: 0.6 }, clear: u2(n4, { padding: 0, feather: p3, shape: "ellipse" }, u3), ...r2.tune?.(n4, l4) };
      }, f3, "dot" === g3 ? (e2) => ({ ...a4(e2), charset: i4 }) : void 0);
      if (!d4 || !r2.extra) return d4;
      const k3 = r2.extra(l3, d4), y3 = d4.destroy.bind(d4);
      return Object.assign(d4, { destroy() {
        k3(), y3();
      } });
    } };
  }

  // node_modules/asciify-engine/dist/kit/chunk-BDYANRQA.js
  var n3 = h3({ id: "constellation", name: "Constellation", description: "Points wander and neighbours close enough are linked by fine lines that come and go.", cellSize: 11, scene: "constellation", charset: " .\xB7:+*#", hover: "lantern", tune: () => ({ blend: "off" }) });

  // main.js
  var bg = null;
  function initAsciify() {
    if (bg) return bg;
    const hero = document.querySelector("#hero");
    const copy = document.querySelector("#hero .copy");
    if (!hero) {
      console.warn("[Asciify] #hero element not found.");
      return null;
    }
    try {
      bg = a3(hero, {
        preset: n3,
        clear: copy || void 0,
        palette: "#8fd3c7",
        charset: " CARDEMIR",
        cursor: false,
        cellSize: 11,
        speed: 1,
        opacity: 1,
        mark: "glyph"
      });
      window.__asciifyBg = bg;
      return bg;
    } catch (error) {
      console.warn("[Asciify] Initialization failed gracefully:", error);
      return null;
    }
  }
  function destroyAsciify() {
    if (bg) {
      bg.destroy();
      bg = null;
      window.__asciifyBg = null;
    }
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initAsciify, { once: true });
    } else {
      initAsciify();
    }
    document.addEventListener("visibilitychange", () => {
      if (!bg) return;
      if (document.hidden) {
        bg.pause();
      } else {
        bg.play();
      }
    });
    if (typeof window !== "undefined" && window.matchMedia) {
      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      motionQuery.addEventListener("change", (e2) => {
        bg?.update({ reducedMotion: e2.matches });
      });
    }
    window.addEventListener("pagehide", destroyAsciify, { once: true });
    window.addEventListener("beforeunload", destroyAsciify, { once: true });
  }
})();
