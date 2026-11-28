// Original Dream City implementation: analytical river bank and baked ground contact.
// No XCity source, assets, shader or numeric tuning copied.
export const RIVER_SURFACE_Y = -0.65;
export const TERRAIN_OFFSET = -0.06;
// The surface extends beneath the terrain on both banks; depth testing clips it.
export const RIVER_SURFACE_WIDTH = 44;
const CELL = 16;
const RANGE = 4;
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp(x); return t*t*(3-2*t); };
export function bankWetness(x,y) {
  // Restrict the wet tint to the river corridor, not unrelated hills.
  return (1-smooth((Math.abs(x)-21)/5)) *
    (1-smooth(Math.abs(y-RIVER_SURFACE_Y)/2.1));
}
export function createGroundContact(lots) {
  const grid = new Map();
  for (const lot of lots) {
    const a = {x:lot.x,z:lot.z,hw:lot.w/2+1,hd:lot.d/2+1};
    for(let i=Math.floor((a.x-a.hw-RANGE)/CELL);i<=Math.floor((a.x+a.hw+RANGE)/CELL);i++)
      for(let j=Math.floor((a.z-a.hd-RANGE)/CELL);j<=Math.floor((a.z+a.hd+RANGE)/CELL);j++){
        const key=i+','+j;
        if(!grid.has(key))grid.set(key,[]);
        grid.get(key).push(a);
      }
  }
  return (x,z) => {
    let weight=0;
    for(const a of grid.get(Math.floor(x/CELL)+','+Math.floor(z/CELL))||[]){
      const d=Math.hypot(Math.max(0,Math.abs(x-a.x)-a.hw),Math.max(0,Math.abs(z-a.z)-a.hd));
      weight=Math.max(weight,1-smooth(d/RANGE));
    }
    return weight;
  };
}
export function groundDetailColor(base,wet,contact){
  const shade=1-.17*clamp(contact),w=clamp(wet);
  return [base[0]*shade*(1-.19*w),base[1]*shade*(1-.23*w),base[2]*shade*(1-.12*w)];
}
