import type { AccessClaims } from "./security";
export function isVerifiedMember(claims:AccessClaims) {
  return claims.scope.includes("member:verified") && !/^(?:widget-)?guest:/.test(claims.externalUserId)
    && claims.externalUserId!=="sabito-admin-preview";
}
// Literal replacement, never eval, HTML interpolation or generated prose.
export function renderTemplate(template:string,values:Record<string,unknown>):string|null {
  let valid=true;
  const result=template.replace(/\{([a-z][a-z0-9_]*)\}/g,(_match,key:string)=>{
    if(!Object.hasOwn(values,key)||values[key]===null||values[key]===undefined) {valid=false;return "";}
    return String(values[key]);
  });
  return valid?result:null;
}
