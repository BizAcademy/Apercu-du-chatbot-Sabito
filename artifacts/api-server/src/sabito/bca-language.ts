import { bcaCurrentRoutes } from "./bca-current-questions";

// Authored translations only. Never translate amounts, member identifiers or
// backend statuses by guessing. Custom references retain their original wording.
const support="https://bcachat.bizconnectacademy.com";
export const bcaEnglish:Record<string,string>={
  "current-onboarding":"You can explore BCA training, sell digital content you have the right to sell, refer interested people, or check accessible WhatsApp campaigns. Their current availability and conditions must be checked; income is not guaranteed. Which path interests you: learning, selling, referrals or campaigns?",
  "current-seller":"Open Digital Store and your seller area. Use the actual product form, provide the required information and delivery link, then review current conditions and fees before submitting. Only sell content you have the rights to. Submission guarantees neither approval nor sales. Can you see the seller area, or are you stuck in the form?",
  "current-referral":"Open Parrainage to find your own referral code and link, and Mes gains for your recorded referrals and commissions. To request your actual code through an authenticated check, say “Mon code parrainage”. Fixed commissions are 1,500 F at level 1, 500 F at level 2 and 300 F at level 3. Level 1 is direct referral, then levels 2 and 3 follow the chain. Attribution depends on BCA conditions and the backend trigger; registration or sharing a link alone does not guarantee a commission.",
  "current-campaign-guide":"In BCA Ads Network, choose the publisher path, open an accessible campaign, read its conditions and join only if eligible. Publish the requested content on your WhatsApp status, then follow submission and verification in BCA. WhatsApp views, validated views and credited amounts are different. Publication does not guarantee payment; use current campaign rates and conditions. Do you need publication guidance or a check of a specific publication day?",
  "current-status-choice":"Do you mean publishing BCA campaigns on your WhatsApp status, or monetizing your own content? These are different paths. No campaign availability or income is guaranteed.",
  "current-learning":"What skill and goal interest you? Check the current BCA training list. I cannot rank worldwide demand or guarantee earnings. To request the currently published catalogue through the available service, say “Consulter le catalogue actuel”. Old catalogue entries do not prove current availability or free access.",
  "current-withdrawal-fees":"Open the withdrawal form in your BCA wallet and review the currently available methods, currency, limits, fees and net amount before confirming. I do not have a connected service that provides current withdrawal fees and limits, and I cannot withdraw for you. For an existing request, say “Vérifier mon retrait”. Never share a PIN or OTP. If the form does not show the fees, contact "+support+".",
  "current-upload-error":"What error appears, or what happens when you try to send the image? Use only the attachment button actually present in that step and check your connection. I cannot confirm receipt or assume this widget supports images. Hide unnecessary personal and financial data and never send passwords, PINs, OTPs or tokens. If needed, contact "+support+".",
  "current-alleged-debit":"I understand your concern. I have not checked your account and cannot confirm theft. Review your own wallet movements; to examine a specific entry, say “vérifier un mouvement de mon solde” from your recognized account. Never send a password, PIN or OTP. Secure your account through official settings and contact "+support+" promptly. I cannot change your balance.",
  "current-transfer-choice":"Do you mean a deposit, a withdrawal request or a BCA-to-BCA transfer, and what would you like checked? I have not consulted any transaction and cannot infer receipt or loss from this incomplete message. Do not send confidential codes.",
  "current-phone-privacy":"Do you mean your own data, your referral list or other members’ contact details? I cannot provide bulk extraction or other people’s private numbers. I can only explain an existing official function that your account is authorized to use, without exposing contacts here.",
  "current-chariow":"Do you mean selling directly on Chariow or delivering a product already paid for in BCA through a Chariow link? Consult Chariow’s official information for its own fees and payments; no sale or income is guaranteed. For BCA delivery, the owner requires the external Chariow or Maketou product to be free so the buyer does not pay twice. Which path do you mean?",
  "current-fraud":"What happened: a payment problem, account access or a suspicious message? I cannot confirm fraud without verified facts. Do not send passwords, PINs, OTPs or tokens, and do not make another payment to unlock the situation. Keep useful evidence and contact "+support+".",
  "current-publish-price":"I do not have a connected service providing current publication fees. In Digital Store, check the seller form and its current summary before confirming. Creation, publication, changes, seller subscriptions and sales fees are distinct. I cannot confirm a price or free access from an old archive. If the information is missing, contact "+support+".",
  "current-price-choice":"Which price or fee do you mean: training, product publication, seller subscription, campaign or withdrawal? The current price must be checked in the relevant process; I will not guess an amount.",
};
export function englishBcaAnswer(answer:string):string {
  const route=bcaCurrentRoutes.find(item=>item.answer===answer);
  if(route&&bcaEnglish[route.key])return bcaEnglish[route.key];
  if(answer==="Excellent")return "Excellent";
  if(answer==="Excellent ! Heureux d’avoir pu vous aider.")return "Excellent";
  if(answer.startsWith("Je suis disponible dans cette conversation."))
    return "I’m available in this conversation. I cannot confirm what caused the earlier interruption. What question would you like to resume?";
  if(answer==="Très bien. De quelle aide avez-vous besoin sur BCA ?")
    return "Glad to hear it. What would you like help with in BCA?";
  if(answer.startsWith("Quelle rubrique cherchez-vous :"))
    return "Which section are you looking for: Parrainage, campaigns, the seller area or something else?";
  if(answer.startsWith("Dans le menu des trois tirets de votre espace BCA,"))
    return "Open the three-line menu in BCA, then Mes gains to see your referrals and commissions. For your own code or link, look for Parrainage. If these labels are missing, tell me what your menu shows, without private contact details.";
  if(answer.startsWith("Ouvrez la liste « Formations » de BCA."))
    return "Open the Formations list in BCA. To request the currently published catalogue, say “Consulter le catalogue actuel”. Which menu label can you see?";
  if(answer.startsWith("Ouvrez la rubrique « BCA Ads Network »"))
    return "Open BCA Ads Network or BCA Ads and choose the publisher path. If you cannot find it, tell me which menu labels you can see; I cannot confirm a button missing from your screen.";
  if(answer.startsWith("Copiez votre code et votre lien depuis votre propre espace"))
    return bcaEnglish["current-referral"];
  if(answer.startsWith("Bien sûr, posez votre question"))return "Of course. What would you like help with in BCA?";
  // Backend/custom text stays verbatim: translating unknown fields or a status
  // would risk changing their meaning. Do not call this a verified result.
  return "Service message (original wording preserved):\n\n"+answer;
}
export function originalBcaAnswer(answer:string):string {
  const key=Object.keys(bcaEnglish).find(key=>bcaEnglish[key]===answer);
  if(key)return bcaCurrentRoutes.find(route=>route.key===key)?.answer??answer;
  const prefix="Service message (original wording preserved):\n\n";
  return answer.startsWith(prefix)?answer.slice(prefix.length):answer;
}
