// Responsive controls, keyboard-accessible clean view and QA-friendly state.
export function initViewControls({root=document.body,panel=document.getElementById('panel'),toggle=document.getElementById('panel-toggle'),hide=document.getElementById('hide')}={}){
 const mobile=matchMedia('(max-width:650px)');let expanded=!mobile.matches;
 function setPanel(value){expanded=!!value;root.classList.toggle('panel-collapsed',!expanded);toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'Thu gọn':'Điều khiển';}
 function setClean(value){root.classList.toggle('clean',!!value);hide.setAttribute('aria-pressed',String(!!value));hide.setAttribute('aria-label',value?'Hiện giao diện':'Ẩn giao diện');}
 toggle.addEventListener('click',()=>setPanel(!expanded));hide.addEventListener('click',()=>setClean(!root.classList.contains('clean')));
 mobile.addEventListener('change',e=>setPanel(!e.matches));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('clean'))setClean(false)});
 setPanel(expanded);setClean(false);
 return {setPanel,setClean,report:()=>({expanded,clean:root.classList.contains('clean'),mobile:mobile.matches,panelVisible:getComputedStyle(panel).display!=='none'})};
}
