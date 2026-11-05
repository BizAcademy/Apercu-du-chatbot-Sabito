export const requestedClosing="À la prochaine ! N'hésitez pas à revenir si vous avez un souci.";

/** Only decorate final, approved public answers; never interrupt a private check. */
export function publicReplyPresentation<T extends {reliable:boolean;closing_message:string;
  suggestions:unknown[];suggestions_label:string}>(reply:T,blocked:boolean):T {
  if(blocked)return {...reply,suggestions:[],suggestions_label:"",closing_message:""};
  if(!reply.reliable)return {...reply,closing_message:""};
  return {...reply,suggestions:reply.suggestions.slice(0,3),
    suggestions_label:"",closing_message:requestedClosing};
}
