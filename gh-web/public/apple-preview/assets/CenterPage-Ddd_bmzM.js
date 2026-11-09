import{n as e}from"./rolldown-runtime-CbXtAM7H.js";import{g as t,r as n,t as r}from"./vendor-bM4LRIQF.js";import{d as i,n as a}from"./support-extra-Cv3Rr3P8.js";var o=e(t(),1);function s(e,t){if(t(),typeof ResizeObserver<`u`){let n=new ResizeObserver(t);return n.observe(e),()=>n.disconnect()}return window.addEventListener(`resize`,t),()=>window.removeEventListener(`resize`,t)}function c(e,t){if(typeof IntersectionObserver>`u`)return t(!0),()=>{};let n=new IntersectionObserver(([e])=>t(e.isIntersecting),{threshold:0});return n.observe(e),()=>n.disconnect()}function l(){try{return typeof window.matchMedia==`function`&&window.matchMedia(`(prefers-reduced-motion: reduce)`).matches}catch{return!1}}var u=r(),d=`
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`,f=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv - 0.5;
  p.x *= uRes.x / uRes.y;
  float t = uTime;

  // 深海军蓝底色
  vec3 top = vec3(0.004, 0.008, 0.020);
  vec3 mid = vec3(0.014, 0.034, 0.078);
  vec3 sky = mix(top, mid, smoothstep(0.0, 0.95, uv.y));

  // 极光：两层低频噪声缓慢横向漂移，肉眼可见的流动感
  float a1 = fbm(vec2(uv.x * 2.1 + t * 0.045 + uPointer.x * 0.12, uv.y * 1.7 - t * 0.030 + uPointer.y * 0.08));
  float a2 = fbm(vec2(uv.x * 3.6 - t * 0.034, uv.y * 2.5 + t * 0.040));
  vec3 aurora = mix(vec3(0.03, 0.18, 0.62), vec3(0.06, 0.62, 0.86), a2);
  sky += aurora * smoothstep(0.48, 0.92, a1) * 0.20;
  sky += aurora * smoothstep(0.62, 0.98, a2) * 0.10;

  // 穹顶：圆心在画面下方，弧线随时间和鼠标呼吸
  float wob = 0.012 * sin(uv.x * 6.283 + t * 0.45) + 0.007 * sin(uv.x * 13.0 - t * 0.3);
  vec2 center = vec2(0.5 + uPointer.x * 0.035, 1.30 + 0.008 * sin(t * 0.18) + uPointer.y * 0.025);
  vec2 q = (uv - center) * vec2(1.0, 0.60);
  float d = length(q) - (0.62 + wob);

  float arc = exp(-abs(d) * 34.0);
  float halo = exp(-abs(d) * 7.5);
  float inside = smoothstep(0.03, -0.02, d);

  vec3 glowCool = vec3(0.05, 0.22, 0.70);
  vec3 glowWarm = vec3(0.12, 0.66, 1.0);
  vec3 glow = mix(glowCool, glowWarm, smoothstep(-0.22, 0.20, d));

  // 沿弧线的亮度流动，让光带像在缓慢呼吸
  float flow = 0.72 + 0.28 * sin(atan(q.y, q.x) * 4.0 - t * 1.2);

  vec3 col = sky;
  col += glow * arc * 0.95 * flow;
  col += glow * halo * 0.30;
  col += vec3(0.008, 0.026, 0.062) * inside;

  // 沿弧线横向扫过的一道高光
  float sweep = exp(-pow((uv.x - (0.5 + 0.42 * sin(t * 0.18))) * 3.2, 2.0)) * exp(-abs(d) * 4.5);
  col += vec3(0.18, 0.48, 1.0) * sweep * 0.28;

  // 空气尘埃 + 跟手光斑
  float dust = smoothstep(0.58, 0.95, fbm(uv * 3.4 + vec2(t * 0.02, 0.0)));
  col += vec3(0.06, 0.15, 0.32) * dust * inside * 0.18;
  float mouse = exp(-length((uv - (uPointer * 0.5 + 0.5)) * vec2(uRes.x / uRes.y, 1.0)) * 2.1);
  col += vec3(0.06, 0.16, 0.34) * mouse * 0.45;

  // 暗角
  float vig = smoothstep(1.18, 0.24, length(p * vec2(0.92, 1.05)));
  col *= 0.58 + 0.52 * vig;

  // 抖动噪点，消除 8-bit 色带
  float grain = hash(gl_FragCoord.xy + fract(t) * 431.0) - 0.5;
  col += grain * 0.012;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;function p({className:e}){let t=(0,o.useRef)(null);return(0,o.useEffect)(()=>{let e=t.current;if(!e)return;let n=null;try{n=e.getContext(`webgl`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`low-power`})}catch{e.dataset.fallback=`true`;return}if(!n){e.dataset.fallback=`true`;return}let r=n,i=(e,t)=>{let n=r.createShader(e);return n?(r.shaderSource(n,t),r.compileShader(n),r.getShaderParameter(n,r.COMPILE_STATUS)?n:(r.deleteShader(n),null)):null},a=i(r.VERTEX_SHADER,d),o=i(r.FRAGMENT_SHADER,f);if(!a||!o){e.dataset.fallback=`true`;return}let u=r.createProgram();if(!u)return;if(r.attachShader(u,a),r.attachShader(u,o),r.linkProgram(u),!r.getProgramParameter(u,r.LINK_STATUS)){e.dataset.fallback=`true`;return}r.useProgram(u);let p=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,p),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW);let m=r.getAttribLocation(u,`aPos`);r.enableVertexAttribArray(m),r.vertexAttribPointer(m,2,r.FLOAT,!1,0,0);let h=r.getUniformLocation(u,`uRes`),g=r.getUniformLocation(u,`uTime`),_=r.getUniformLocation(u,`uPointer`),v=l(),y=0,b=0,x=0,S=!0,C=0,w=0,T=0,E=0,D=performance.now(),O=()=>{let t=e.getBoundingClientRect(),n=Math.min(window.devicePixelRatio||1,1.5);y=Math.max(1,Math.round(t.width*n)),b=Math.max(1,Math.round(t.height*n)),e.width=y,e.height=b,r.viewport(0,0,y,b)},k=e=>{C+=(T-C)*.04,w+=(E-w)*.04,r.uniform2f(h,y,b),r.uniform1f(g,v?0:(e-D)/1e3),r.uniform2f(_,C,w),r.drawArrays(r.TRIANGLES,0,3),!v&&S&&!document.hidden&&(x=requestAnimationFrame(k))},A=e=>{T=(e.clientX/window.innerWidth-.5)*2,E=(e.clientY/window.innerHeight-.5)*2},j=s(e,O),M=c(e,e=>{S=e,cancelAnimationFrame(x),S&&(x=requestAnimationFrame(k))}),N=()=>{cancelAnimationFrame(x),!document.hidden&&S&&(x=requestAnimationFrame(k))};return window.addEventListener(`pointermove`,A,{passive:!0}),document.addEventListener(`visibilitychange`,N),x=requestAnimationFrame(k),()=>{cancelAnimationFrame(x),j(),M(),window.removeEventListener(`pointermove`,A),document.removeEventListener(`visibilitychange`,N),r.deleteProgram(u),r.deleteBuffer(p),r.deleteShader(a),r.deleteShader(o)}},[]),(0,u.jsx)(`canvas`,{ref:t,className:e,"aria-hidden":`true`})}function m(e,t=`--p`){(0,o.useEffect)(()=>{let n=e.current;if(!n)return;let r=0,i=()=>{r=0;let e=n.getBoundingClientRect(),i=Math.max(1,n.offsetHeight-window.innerHeight),a=Math.min(1,Math.max(0,-e.top/i));n.style.setProperty(t,a.toFixed(4))},a=()=>{r||=requestAnimationFrame(i)};return i(),window.addEventListener(`scroll`,a,{passive:!0}),window.addEventListener(`resize`,a),()=>{cancelAnimationFrame(r),window.removeEventListener(`scroll`,a),window.removeEventListener(`resize`,a)}},[e,t])}var h={width:24,height:24,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,strokeWidth:1.6,strokeLinecap:`round`,strokeLinejoin:`round`,"aria-hidden":!0};function g({className:e}){return(0,u.jsxs)(`svg`,{...h,className:e,children:[(0,u.jsx)(`path`,{d:`M12 3v12`}),(0,u.jsx)(`path`,{d:`M7 10l5 5 5-5`}),(0,u.jsx)(`path`,{d:`M4 19h16`})]})}function _({className:e}){return(0,u.jsxs)(`svg`,{...h,className:e,children:[(0,u.jsx)(`path`,{d:`M5 12h14`}),(0,u.jsx)(`path`,{d:`M13 6l6 6-6 6`})]})}var v=[{tab:`basic`,no:`01`,title:`基础显示`,desc:`亮度、对比度、方向与 8 档预设模式，一屏调完。`},{tab:`gaming`,no:`02`,title:`电竞增强`,desc:`暗部增强、辅助准心、刷新率显示，按游戏切换。`},{tab:`pro`,no:`03`,title:`专业色彩`,desc:`色域、色温、伽马、RGB 增益与六轴饱和度 / 色调。`},{tab:`image`,no:`04`,title:`图像调节`,desc:`HDR、DSC、清晰度与动态亮度，按面板能力开放。`},{tab:`input`,no:`05`,title:`输入与双模`,desc:`DP / HDMI / USB-C 切换，双模高刷一键换挡。`},{tab:`system`,no:`06`,title:`设备与升级`,desc:`灯效、语言、音量与固件 OTA，都在同一个窗口。`}],y=[`27X1QE-500`,`27X1QE-Q32`,`32X1UE-Q24`,`27X1QE-W54`],b={version:`v1.3.3`,size:`4.5 MB`,date:`2026-11-04`,os:`Windows 10 / 11（64 位）`,url:`/uploads/Center-1.3.3-win64-setup.exe`,sha256:`C9AE23AE8F61C1AE1769A33071C480D4C0367506EB08511FA838C7A71C3D7EAF`},x=[{q:`显示器接上后 Center 没有识别到，怎么办？`,a:`请用 DP 或 USB-C 直连（不要经转接坞），确认显示器处于对应输入源，并在显示器 OSD 菜单里开启 DDC/CI；开启后回到 Center 点一次刷新。`},{q:`支持哪些操作系统？`,a:`Windows 10 / 11 64 位。当前暂不提供 macOS 版本，更早的 Windows 版本不保证可用。`},{q:`应用联动是怎么工作的？`,a:`选择一个 Windows 进程和对应预设模式后，该程序进入前台时 Center 自动切换模式，离开或退出后恢复原模式；也可以选择「运行模式」，只按进程是否运行来切换。`},{q:`固件升级中途失败，显示器还能用吗？`,a:`可以。升级中断不会清空原固件，显示器仍可正常使用；重新连接后 Center 会提示重试，升级过程中请保持连接与供电。`}],S=[{key:`basic`,no:`01`,title:`一个进程，一套预设`,desc:`游戏进入前台，Center 自动切到对应模式；退出后恢复原样。不用再手动改一遍。`,image:`/media/center/app/basic.webp`},{key:`pro`,no:`02`,title:`色准，不用猜`,desc:`色域、色温、伽马、六轴饱和度，按这块面板的真实能力逐项开放。`,image:`/media/center/app/pro.webp`},{key:`system`,no:`03`,title:`固件升级，交给它`,desc:`检查、下载、校验、安装都在一个窗口里完成。中途失败，原有固件保留。`,image:`/media/center/app/system.webp`}],C=[{value:`6`,unit:`个`,label:`功能模块`,text:`基础显示 · 电竞增强 · 专业色彩 · 图像调节 · 输入源 · 设备升级`},{value:`8`,unit:`档`,label:`预设模式`,text:`标准 · E-SPORTS · FPS · RTS · MAC · 低蓝光 · 玩家 1 · 玩家 2`},{value:`40+`,unit:`项`,label:`可调参数`,text:`亮度、对比度、色域、色温、伽马、六轴、HDR、DSC、刷新率、输入源`}];function w({download:e}){return(0,u.jsxs)(`section`,{className:`cp3-hero`,"aria-labelledby":`cp3-hero-title`,children:[(0,u.jsx)(p,{className:`cp3-hero__dome`}),(0,u.jsx)(`span`,{className:`cp3-hero__word`,"aria-hidden":`true`,children:`Center`}),(0,u.jsx)(`div`,{className:`cp3-hero__stage`,"aria-hidden":`true`,children:(0,u.jsxs)(`div`,{className:`cp3-device`,children:[(0,u.jsxs)(`div`,{className:`cp3-device__bezel`,children:[(0,u.jsx)(`img`,{src:`/media/center/app/basic.webp`,alt:``,loading:`eager`,decoding:`async`}),(0,u.jsx)(`span`,{className:`cp3-device__glare`})]}),(0,u.jsx)(`div`,{className:`cp3-device__neck`}),(0,u.jsx)(`div`,{className:`cp3-device__base`}),(0,u.jsx)(`div`,{className:`cp3-device__reflection`,children:(0,u.jsx)(`img`,{src:`/media/center/app/basic.webp`,alt:``,loading:`lazy`,decoding:`async`})})]})}),(0,u.jsxs)(`div`,{className:`cp3-wrap cp3-hero__bottom`,children:[(0,u.jsxs)(`div`,{className:`cp3-hero__copy`,children:[(0,u.jsx)(`p`,{className:`cp3-kicker`,children:`光魂 Center · 显示控制软件`}),(0,u.jsx)(`h1`,{id:`cp3-hero-title`,children:`一块屏，六种活法。`})]}),(0,u.jsxs)(`div`,{className:`cp3-hero__cta`,children:[(0,u.jsxs)(`a`,{className:`cp3-btn`,href:e.url,download:!0,children:[(0,u.jsx)(g,{className:`cp3-btn__icon`}),`下载 Windows 版`]}),(0,u.jsxs)(`p`,{children:[e.version,` · `,e.size,` · Windows 10 / 11`]})]})]})]})}function T(){return(0,u.jsx)(`section`,{className:`cp3-section cp3-statement`,"aria-labelledby":`cp3-statement-title`,children:(0,u.jsxs)(`div`,{className:`cp3-wrap`,children:[(0,u.jsx)(`h2`,{id:`cp3-statement-title`,children:`屏幕，应该跟着你变。`}),(0,u.jsx)(`p`,{className:`cp3-statement__lead`,children:`Center 把亮度、色彩、刷新率和固件收进一个窗口。打开它，这块屏才是你的。`}),(0,u.jsxs)(`dl`,{className:`cp3-stats`,children:[(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`dd`,{children:`6`}),(0,u.jsx)(`dt`,{children:`功能模块`})]}),(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`dd`,{children:`8`}),(0,u.jsx)(`dt`,{children:`预设模式`})]}),(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`dd`,{children:`40+`}),(0,u.jsx)(`dt`,{children:`可调参数`})]})]})]})})}function E(){let e=(0,o.useRef)(null),t=(0,o.useRef)(null),[n,r]=(0,o.useState)(0);return m(e,`--cp3-p`),(0,o.useEffect)(()=>{let n=e.current;if(!n)return;let i=0,a=()=>{i=0;let e=n.getBoundingClientRect(),a=Math.max(1,n.offsetHeight-window.innerHeight),o=Math.min(1,Math.max(0,-e.top/a));t.current?.style.setProperty(`--cp3-p`,o.toFixed(4)),r(o<.34?0:o<.67?1:2)},o=()=>{i||=requestAnimationFrame(a)};return a(),window.addEventListener(`scroll`,o,{passive:!0}),window.addEventListener(`resize`,o),()=>{cancelAnimationFrame(i),window.removeEventListener(`scroll`,o),window.removeEventListener(`resize`,o)}},[]),(0,u.jsxs)(`section`,{className:`cp3-acts`,ref:e,"aria-labelledby":`cp3-acts-title`,children:[(0,u.jsx)(`h2`,{id:`cp3-acts-title`,className:`cp3-visually-hidden`,children:`Center 的三件事`}),(0,u.jsx)(`div`,{className:`cp3-acts__desktop`,children:(0,u.jsx)(`div`,{className:`cp3-acts__sticky`,children:(0,u.jsxs)(`div`,{className:`cp3-wrap cp3-acts__inner`,children:[(0,u.jsxs)(`div`,{className:`cp3-acts__copy`,children:[S.map((e,t)=>(0,u.jsxs)(`div`,{className:`cp3-act${t===n?` is-active`:``}`,"aria-hidden":t!==n,children:[(0,u.jsxs)(`span`,{className:`cp3-acts__no`,children:[e.no,` / 03`]}),(0,u.jsx)(`h3`,{children:e.title}),(0,u.jsx)(`p`,{children:e.desc})]},e.key)),(0,u.jsx)(`div`,{className:`cp3-acts__rail`,"aria-hidden":`true`,children:S.map((e,t)=>(0,u.jsx)(`span`,{className:t===n?`is-active`:``},e.key))})]}),(0,u.jsx)(`div`,{className:`cp3-acts__stage`,ref:t,children:(0,u.jsx)(`div`,{className:`cp3-acts__frame`,children:S.map((e,t)=>(0,u.jsx)(`img`,{src:e.image,alt:`Center ${e.title}界面`,className:t===n?`is-active`:``,loading:`lazy`,decoding:`async`},e.key))})})]})})}),(0,u.jsx)(`div`,{className:`cp3-acts__mobile`,children:S.map(e=>(0,u.jsxs)(`article`,{className:`cp3-act-block`,children:[(0,u.jsxs)(`span`,{className:`cp3-acts__no`,children:[e.no,` / 03`]}),(0,u.jsx)(`h3`,{children:e.title}),(0,u.jsx)(`p`,{children:e.desc}),(0,u.jsx)(`img`,{src:e.image,alt:`Center ${e.title}界面`,loading:`lazy`,decoding:`async`})]},e.key))})]})}function D(){return(0,u.jsx)(`section`,{className:`cp3-section cp3-specs`,"aria-labelledby":`cp3-specs-title`,children:(0,u.jsxs)(`div`,{className:`cp3-wrap`,children:[(0,u.jsx)(`p`,{className:`cp3-kicker`,children:`规格`}),(0,u.jsx)(`h2`,{id:`cp3-specs-title`,children:`该有的，都在。`}),(0,u.jsx)(`div`,{className:`cp3-specs__list`,children:C.map(e=>(0,u.jsxs)(`div`,{className:`cp3-spec`,children:[(0,u.jsxs)(`div`,{className:`cp3-spec__value`,children:[e.value,(0,u.jsx)(`span`,{children:e.unit})]}),(0,u.jsxs)(`div`,{className:`cp3-spec__body`,children:[(0,u.jsx)(`b`,{children:e.label}),(0,u.jsx)(`p`,{children:e.text})]})]},e.label))})]})})}function O(){let e=(0,o.useRef)(null),t=t=>{let n=e.current;n&&n.scrollBy({left:t*(n.clientWidth/2+12),behavior:`smooth`})};return(0,u.jsx)(`section`,{className:`cp3-section cp3-caps`,id:`modules`,"aria-labelledby":`cp3-caps-title`,children:(0,u.jsxs)(`div`,{className:`cp3-wrap`,children:[(0,u.jsxs)(`div`,{className:`cp3-caps__head`,children:[(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{className:`cp3-kicker`,children:`六个模块`}),(0,u.jsx)(`h2`,{id:`cp3-caps-title`,children:`一个窗口，全部调完。`})]}),(0,u.jsxs)(`div`,{className:`cp3-caps__arrows`,children:[(0,u.jsx)(`button`,{type:`button`,"aria-label":`上一组`,onClick:()=>t(-1),children:(0,u.jsx)(_,{})}),(0,u.jsx)(`button`,{type:`button`,"aria-label":`下一组`,onClick:()=>t(1),children:(0,u.jsx)(_,{})})]})]}),(0,u.jsx)(`div`,{className:`cp3-caps__scroller`,ref:e,tabIndex:0,"aria-label":`功能模块，可横向滚动`,children:v.map(e=>(0,u.jsxs)(`article`,{className:`cp3-cap`,children:[(0,u.jsx)(`img`,{src:`/media/center/app/${e.tab}.webp`,alt:`Center ${e.title}界面`,loading:`lazy`,decoding:`async`}),(0,u.jsxs)(`p`,{children:[(0,u.jsxs)(`b`,{children:[e.title,`.`]}),e.desc]})]},e.no))})]})})}function k(){return(0,u.jsx)(`section`,{className:`cp3-quote`,"aria-label":`设计主张`,children:(0,u.jsx)(`p`,{children:`屏幕不该只有一种样子。`})})}function A(){return(0,u.jsx)(`section`,{className:`cp3-section cp3-devices`,id:`devices`,"aria-labelledby":`cp3-devices-title`,children:(0,u.jsxs)(`div`,{className:`cp3-wrap`,children:[(0,u.jsxs)(`div`,{className:`cp3-devices__head`,children:[(0,u.jsxs)(`div`,{children:[(0,u.jsx)(`p`,{className:`cp3-kicker`,children:`兼容`}),(0,u.jsx)(`h2`,{id:`cp3-devices-title`,children:`连上，就能认出来。`})]}),(0,u.jsx)(`p`,{children:`用 DDC/CI 读取型号与面板能力，只显示这台显示器真正支持的调节项。`})]}),(0,u.jsx)(`div`,{className:`cp3-devices__grid`,children:y.map((e,t)=>(0,u.jsxs)(`div`,{className:`cp3-device-card`,children:[(0,u.jsx)(`span`,{className:`cp3-device-icon cp3-device-icon--${t%4}`,"aria-hidden":`true`,children:(0,u.jsx)(`i`,{})}),(0,u.jsx)(`b`,{children:e}),(0,u.jsx)(`span`,{children:`全面支持`})]},e))}),(0,u.jsxs)(`p`,{className:`cp3-devices__note`,children:[(0,u.jsx)(`b`,{children:`识别不到？`}),`在显示器 OSD 里开启 DDC/CI，用 DP 或 USB-C 直连，不要经过转接坞，再回到 Center 刷新。`]})]})})}function j({download:e}){return(0,u.jsx)(`section`,{className:`cp3-section cp3-download`,id:`download`,"aria-labelledby":`cp3-download-title`,children:(0,u.jsxs)(`div`,{className:`cp3-wrap`,children:[(0,u.jsxs)(`div`,{className:`cp3-download__card`,children:[(0,u.jsxs)(`div`,{className:`cp3-download__copy`,children:[(0,u.jsx)(`p`,{className:`cp3-kicker`,children:`下载`}),(0,u.jsx)(`h2`,{id:`cp3-download-title`,children:`把 Center 装进你的屏。`}),(0,u.jsx)(`p`,{children:`安装包 4.5 MB，不驻留后台，不采集使用数据。`})]}),(0,u.jsxs)(`div`,{className:`cp3-download__action`,children:[(0,u.jsx)(`span`,{children:e.os}),(0,u.jsx)(`b`,{children:e.version}),(0,u.jsxs)(`a`,{className:`cp3-btn`,href:e.url,download:!0,children:[(0,u.jsx)(g,{className:`cp3-btn__icon`}),`下载 Center`]}),(0,u.jsxs)(`small`,{children:[e.size,` · 更新于 `,e.date]})]})]}),(0,u.jsxs)(`ol`,{className:`cp3-steps`,children:[(0,u.jsxs)(`li`,{children:[(0,u.jsx)(`span`,{children:`01`}),(0,u.jsx)(`b`,{children:`下载并安装`}),(0,u.jsx)(`p`,{children:`运行安装包，按提示完成安装。`})]}),(0,u.jsxs)(`li`,{children:[(0,u.jsx)(`span`,{children:`02`}),(0,u.jsx)(`b`,{children:`连接显示器`}),(0,u.jsx)(`p`,{children:`用 DP 或 USB-C 直连，确认输入源。`})]}),(0,u.jsxs)(`li`,{children:[(0,u.jsx)(`span`,{children:`03`}),(0,u.jsx)(`b`,{children:`开始调校`}),(0,u.jsx)(`p`,{children:`识别到型号后，参数改动即时写入。`})]})]}),(0,u.jsx)(`p`,{className:`cp3-note`,children:`暂不提供 macOS 版本。Windows 10 / 11 需为 64 位系统。`})]})})}function M({download:e}){let[t,r]=(0,o.useState)(0);return(0,u.jsx)(`section`,{className:`cp3-section cp3-meta`,id:`changelog`,"aria-labelledby":`cp3-log-title`,children:(0,u.jsxs)(`div`,{className:`cp3-wrap cp3-meta__grid`,children:[(0,u.jsxs)(`div`,{className:`cp3-log`,children:[(0,u.jsx)(`p`,{className:`cp3-kicker`,children:`版本`}),(0,u.jsx)(`h2`,{id:`cp3-log-title`,children:`一直在更新。`}),(0,u.jsxs)(`div`,{className:`cp3-log__item`,children:[(0,u.jsxs)(`div`,{className:`cp3-log__head`,children:[(0,u.jsx)(`b`,{children:e.version}),(0,u.jsx)(`span`,{children:e.date})]}),(0,u.jsx)(`p`,{children:`与演示台一致的六个功能模块；固件升级支持校验与中断重试。`}),(0,u.jsxs)(n,{to:`/downloads`,children:[`更早版本与固件更新`,(0,u.jsx)(_,{})]})]})]}),(0,u.jsxs)(`div`,{className:`cp3-faq`,id:`faq`,children:[(0,u.jsx)(`p`,{className:`cp3-kicker`,children:`常见问题`}),(0,u.jsx)(`h2`,{children:`安装与使用`}),(0,u.jsx)(`div`,{className:`cp3-faq__list`,children:x.map((e,n)=>(0,u.jsxs)(`div`,{className:`cp3-faq__item${t===n?` is-open`:``}`,children:[(0,u.jsxs)(`button`,{type:`button`,"aria-expanded":t===n,onClick:()=>r(t===n?null:n),children:[(0,u.jsx)(`span`,{children:e.q}),(0,u.jsx)(`i`,{"aria-hidden":`true`})]}),(0,u.jsx)(`div`,{className:`cp3-faq__answer`,children:(0,u.jsx)(`p`,{children:e.a})})]},e.q))})]})]})})}function N({download:e}){return(0,u.jsxs)(`footer`,{className:`cp3-footer`,children:[(0,u.jsx)(`div`,{className:`cp3-footer__glow`,"aria-hidden":`true`}),(0,u.jsxs)(`div`,{className:`cp3-wrap cp3-footer__cta`,children:[(0,u.jsx)(`h2`,{children:`现在，开始调校。`}),(0,u.jsxs)(`a`,{className:`cp3-btn`,href:e.url,download:!0,children:[(0,u.jsx)(g,{className:`cp3-btn__icon`}),`下载 Windows 版`]})]}),(0,u.jsx)(`div`,{className:`cp3-footer__word`,"aria-hidden":`true`,children:`SVDC`}),(0,u.jsxs)(`div`,{className:`cp3-wrap cp3-footer__bottom`,children:[(0,u.jsx)(`span`,{children:`© 2026 光魂科技`}),(0,u.jsxs)(`span`,{children:[e.version,` · `,e.size]}),(0,u.jsx)(n,{to:`/downloads`,children:`下载中心`})]})]})}function P({download:e}){return(0,u.jsxs)(`div`,{className:`cp3`,children:[(0,u.jsx)(w,{download:e}),(0,u.jsx)(T,{}),(0,u.jsx)(E,{}),(0,u.jsx)(D,{}),(0,u.jsx)(O,{}),(0,u.jsx)(k,{}),(0,u.jsx)(A,{}),(0,u.jsx)(j,{download:e}),(0,u.jsx)(M,{download:e}),(0,u.jsx)(N,{download:e})]})}function F(){let[e,t]=(0,o.useState)(b);return(0,o.useEffect)(()=>{let e=new AbortController;return a(e.signal).then(e=>{let n=e.items.find(e=>e.id===`center-win`);n&&t({version:n.version||b.version,size:n.size||b.size,date:n.date||b.date,os:n.os||n.platform||b.os,url:i(n)&&n.fileUrl?n.fileUrl:`/downloads/center-win`,sha256:b.sha256})}).catch(()=>{}),()=>e.abort()},[]),(0,u.jsx)(`div`,{className:`center-page`,children:(0,u.jsx)(P,{download:e})})}export{F as CenterPage};