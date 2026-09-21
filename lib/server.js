const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const {getConfig,setConfig,getSecret,setSecret}=require('./runtime-store');

// Shared JSON response helpers used by the API handlers.
function ok(res,payload={ok:true}){
  res.statusCode=200;
  if(typeof res.setHeader==='function')res.setHeader('Content-Type','application/json');
  if(typeof res.end==='function')res.end(JSON.stringify(payload));
  else if(typeof res.json==='function')res.json(payload);
  return res;
}
function fail(res,status=500,message='Request failed'){
  res.statusCode=status;
  const payload={ok:false,error:message};
  if(typeof res.setHeader==='function')res.setHeader('Content-Type','application/json');
  if(typeof res.end==='function')res.end(JSON.stringify(payload));
  else if(typeof res.json==='function')res.json(payload);
  return res;
}
let clientPromise=null;
async function resolveDbConfig(){
  return {url:String(process.env.SUPABASE_URL||'').trim().replace(/\/$/,''),key:String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim()};
}

async function getSupabaseClient(){
  const c=await resolveDbConfig();
  if(!c.url||!c.key)throw new Error('Supabase is not configured yet. Open Master Admin → Master Command → Service Setup.');
  return createClient(c.url,c.key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function queryProxy(path=[]){
  let p;
  const then=async(resolve,reject)=>{try{const c=await getSupabaseClient();let q=c;for(const step of path){q=q[step.name](...step.args)}const out=await q;resolve(out)}catch(e){reject(e)}};
  p=new Proxy({}, {get(_t,prop){if(prop==='then')return then;if(prop==='catch')return (fn)=>then(v=>v,fn);if(prop==='finally')return (fn)=>then(v=>{fn();return v},e=>{fn();throw e});return (...args)=>queryProxy(path.concat({name:prop,args}))}});
  return p;
}
const supabase=queryProxy();
let runtimeCache={loaded:false,expires:0,values:{}};
function clearRuntimeCache(){runtimeCache={loaded:false,expires:0,values:{}};}
async function loadRuntimeSecrets(){
  if(runtimeCache.loaded&&Date.now()<runtimeCache.expires)return runtimeCache.values;
  const values={};
  try{
    const {data}=await supabase.from('system_settings').select('key,value_json').in('key',['gmail_sender','gmail_app_password','twilio_account_sid','twilio_auth_token','twilio_from','email_verification_secret','public_base_url','sms_provider','msg91_auth_key','msg91_template_id','msg91_sender_id']);
    for(const row of(data||[])){if(row?.key)values[row.key]=row.value_json;}
  }catch{}
  const envMap={gmail_sender:'GMAIL_SENDER',gmail_app_password:'GMAIL_APP_PASSWORD',twilio_account_sid:'TWILIO_ACCOUNT_SID',twilio_auth_token:'TWILIO_AUTH_TOKEN',twilio_from:'TWILIO_FROM',email_verification_secret:'EMAIL_VERIFICATION_SECRET',public_base_url:'PUBLIC_BASE_URL'};
  for(const [k,e] of Object.entries(envMap)){if((values[k]==null||values[k]==='')&&process.env[e])values[k]={value:process.env[e]};}
  runtimeCache={loaded:true,expires:Date.now()+30000,values};return values;
}

function encryptionKey(){const secret=String(process.env.CONFIG_ENCRYPTION_SECRET||'').trim();if(!secret)throw new Error('CONFIG_ENCRYPTION_SECRET is not configured');return crypto.createHash('sha256').update(secret).digest();}
function encryptSecret(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);const ciphertext=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);return {encrypted:true,iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),data:ciphertext.toString('base64url')}}
function decryptSecret(obj){if(!obj||obj.encrypted!==true)return obj?.value??obj?.secret??null;try{const d=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(obj.iv,'base64url'));d.setAuthTag(Buffer.from(obj.tag,'base64url'));return Buffer.concat([d.update(Buffer.from(obj.data,'base64url')),d.final()]).toString('utf8')}catch{return null}}
async function getRuntimeSecret(k,fallback=''){const values=await loadRuntimeSecrets();const raw=values[k];if(raw&&typeof raw==='object'&&raw.encrypted)return decryptSecret(raw)||fallback;return raw==null||raw===''?fallback:String(raw)}
async function getMailer(){const sender=await getRuntimeSecret('gmail_sender',process.env.GMAIL_SENDER||'');const pass=await getRuntimeSecret('gmail_app_password',process.env.GMAIL_APP_PASSWORD||'');if(!sender||!pass)return null;return nodemailer.createTransport({service:'gmail',auth:{user:sender,pass}})}
async function getSms(){const sid=await getRuntimeSecret('twilio_account_sid',process.env.TWILIO_ACCOUNT_SID||'');const auth=await getRuntimeSecret('twilio_auth_token',process.env.TWILIO_AUTH_TOKEN||'');return sid&&auth?twilio(sid,auth):null}
async function sendSms(to,body){const provider=String(await getRuntimeSetting('sms_provider','twilio')).toLowerCase();if(provider==='msg91'){const authkey=await getRuntimeSecret('msg91_auth_key',process.env.MSG91_AUTH_KEY||'');const flow=await getRuntimeSecret('msg91_template_id',process.env.MSG91_TEMPLATE_ID||'');if(!authkey||!flow)throw new Error('MSG91 Auth Key and Flow ID must be configured');const otp=(String(body).match(/\b(\d{6})\b/)||[])[1]||'';const sender=String(await getRuntimeSecret('msg91_sender_id',process.env.MSG91_SENDER_ID||'')).trim();const payload={flow_id:flow,mobiles:String(to).replace(/^\+/,'')};if(sender)payload.sender=sender;if(otp)payload.VAR1=otp;const r=await fetch('https://api.msg91.com/api/v5/flow/',{method:'POST',headers:{'Content-Type':'application/json','authkey':authkey},body:JSON.stringify(payload)});if(!r.ok)throw new Error('MSG91 rejected the SMS request');return {provider:'msg91'};}const sms=await getSms();if(!sms)throw new Error('Twilio is not configured');const from=await getRuntimeSecret('twilio_from',process.env.TWILIO_FROM||'');if(!from)throw new Error('Twilio From number is not configured');await sms.messages.create({from,to,body});return {provider:'twilio'};}
function otp(){return String(crypto.randomInt(100000,1000000))}
async function createOtp(channel,destination){const code=otp(),expires=new Date(Date.now()+5*60*1000).toISOString();await supabase.from('otp_challenges').update({used_at:new Date().toISOString()}).eq('channel',channel).eq('destination',destination).is('used_at',null);const {error}=await supabase.from('otp_challenges').insert({channel,destination,otp_hash:crypto.createHash('sha256').update(code).digest('hex'),expires_at:expires});if(error)throw error;return code}
async function verifyOtp(channel,destination,code){const hash=crypto.createHash('sha256').update(code).digest('hex');const {data,error}=await supabase.from('otp_challenges').select('id').eq('channel',channel).eq('destination',destination).eq('otp_hash',hash).is('used_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(!data)return false;const {data:claimed,error:claimError}=await supabase.from('otp_challenges').update({used_at:new Date().toISOString()}).eq('id',data.id).is('used_at',null).select('id').maybeSingle();if(claimError)throw claimError;return !!claimed}
function base64url(input){return Buffer.from(input).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function signEmailToken(email){const payload=base64url(JSON.stringify({email,exp:Date.now()+15*60*1000,nonce:crypto.randomBytes(16).toString('hex')}));const secret=await getRuntimeSecret('email_verification_secret',process.env.EMAIL_VERIFICATION_SECRET||'');if(!secret)throw new Error('EMAIL_VERIFICATION_SECRET is not configured');const sig=crypto.createHmac('sha256',secret).update(payload).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');return payload+'.'+sig}
async function verifyEmailToken(token){const secret=await getRuntimeSecret('email_verification_secret',process.env.EMAIL_VERIFICATION_SECRET||'');if(!secret)throw new Error('EMAIL_VERIFICATION_SECRET is not configured');const parts=String(token||'').split('.');if(parts.length!==2)return null;const expected=crypto.createHmac('sha256',secret).update(parts[0]).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');if(parts[1].length!==expected.length||!crypto.timingSafeEqual(Buffer.from(parts[1]),Buffer.from(expected)))return null;let payload;try{payload=JSON.parse(Buffer.from(parts[0].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'))}catch{return null}if(!payload.email||!payload.exp||Date.now()>payload.exp||!/^[a-z0-9._%+-]+@gmail\.com$/i.test(payload.email))return null;return payload}
async function createEmailVerification(email){const token=await signEmailToken(email),hash=crypto.createHash('sha256').update(token).digest('hex'),expires=new Date(Date.now()+15*60*1000).toISOString();await supabase.from('email_verifications').update({used_at:new Date().toISOString()}).eq('email',email).is('used_at',null);const {error}=await supabase.from('email_verifications').insert({email,token_hash:hash,expires_at:expires});if(error)throw error;return token}
async function consumeEmailVerification(token){const payload=await verifyEmailToken(token);if(!payload)return null;const hash=crypto.createHash('sha256').update(token).digest('hex');const {data,error}=await supabase.from('email_verifications').select('id,email').eq('token_hash',hash).eq('email',payload.email).is('used_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();if(error)throw error;if(!data)return null;await supabase.from('email_verifications').update({used_at:new Date().toISOString()}).eq('id',data.id);return data.email}
async function signProof(kind,data,ttlMs=10*60*1000){const secret=await getRuntimeSecret('email_verification_secret',process.env.EMAIL_VERIFICATION_SECRET||'');if(!secret)throw new Error('EMAIL_VERIFICATION_SECRET is not configured');const payload=base64url(JSON.stringify({kind,...data,exp:Date.now()+ttlMs,nonce:crypto.randomBytes(12).toString('hex')}));const sig=crypto.createHmac('sha256',secret).update(payload).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');return payload+'.'+sig}
async function verifyProof(token,expectedKind){const secret=await getRuntimeSecret('email_verification_secret',process.env.EMAIL_VERIFICATION_SECRET||'');if(!secret)throw new Error('EMAIL_VERIFICATION_SECRET is not configured');const parts=String(token||'').split('.');if(parts.length!==2)return null;const expected=crypto.createHmac('sha256',secret).update(parts[0]).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');if(parts[1].length!==expected.length||!crypto.timingSafeEqual(Buffer.from(parts[1]),Buffer.from(expected)))return null;let payload;try{payload=JSON.parse(Buffer.from(parts[0].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'))}catch{return null}if(payload.kind!==expectedKind||!payload.exp||Date.now()>payload.exp)return null;return payload}
module.exports={supabase,ok,fail,getMailer,getSms,sendSms,encryptSecret,decryptSecret,getRuntimeSecret,clearRuntimeCache,createOtp,verifyOtp,createEmailVerification,consumeEmailVerification,verifyEmailToken,signProof,verifyProof,getSupabaseClient,resolveDbConfig,getConfig,setConfig,setSecret,getSecret};
const RUNTIME_DEFAULTS={master_otp_enabled:false,master_session_minutes:60,master_admin_phone:'',phone_otp_enabled:false,gmail_verification_enabled:true,access_session_hours:1,phone_otp_minutes:5,gmail_link_minutes:15};
async function getRuntimeConfig(){
  const out={...RUNTIME_DEFAULTS};
  try{const {data}=await supabase.from('system_settings').select('key,value_json');for(const row of data||[]){const v=row.value_json;out[row.key]=v&&Object.prototype.hasOwnProperty.call(v,'value')?v.value:v}}catch{}
  return out;
}
async function getRuntimeSetting(key,fallback){try{const {data,error}=await supabase.from('system_settings').select('value_json').eq('key',key).maybeSingle();if(!error&&data){const v=data.value_json;return v&&Object.prototype.hasOwnProperty.call(v,'value')?v.value:v}}catch{}return fallback}
module.exports={supabase,ok,fail,getMailer,getSms,sendSms,encryptSecret,decryptSecret,getRuntimeSecret,clearRuntimeCache,createOtp,verifyOtp,createEmailVerification,consumeEmailVerification,verifyEmailToken,signProof,verifyProof,getSupabaseClient,resolveDbConfig,getConfig,setConfig,setSecret,getSecret,getRuntimeConfig,getRuntimeSetting};
