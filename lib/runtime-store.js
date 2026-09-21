const crypto=require('crypto');
// V42.v7 deliberately does not use Netlify Blobs. Persistent secrets live in
// Supabase system_settings after the initial Supabase connection is configured.
// Supabase URL + service-role key are bootstrap server environment variables.
const FALLBACK_KEY=process.env.MASTER_ADMIN_PASSWORD_HASH||'excelsior26-v42v7-bootstrap-key';
function key(){return crypto.createHash('sha256').update(String(process.env.CONFIG_ENCRYPTION_SECRET||FALLBACK_KEY)).digest()}
function enc(v){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([c.update(JSON.stringify(v),'utf8'),c.final()]);return {iv:iv.toString('base64url'),tag:c.getAuthTag().toString('base64url'),data:data.toString('base64url')}}
function dec(x){try{const d=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(x.iv,'base64url'));d.setAuthTag(Buffer.from(x.tag,'base64url'));return JSON.parse(Buffer.concat([d.update(Buffer.from(x.data,'base64url')),d.final()]).toString('utf8'))}catch{return null}}
// Kept as a compatibility API for legacy modules. It intentionally has no persistent
// fallback: configuration must be persisted in Supabase, never in browser storage.
async function getConfig(){return {}}
async function setConfig(){throw new Error('Persistent fallback storage is disabled in V42.v7. Configure Supabase in Netlify, then use Master Control for runtime services.')}
async function getSecret(_keyName,fallback=''){return fallback}
async function setSecret(){throw new Error('Persistent fallback storage is disabled in V42.v7.')}
async function hasPersistentStore(){return false}
module.exports={getConfig,setConfig,getSecret,setSecret,hasPersistentStore,enc,dec};
