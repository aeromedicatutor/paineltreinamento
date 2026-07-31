import fs from 'node:fs/promises';

const SUPABASE_URL = 'https://tvvblflltrymiujcxqbt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QF_gEOhaPweouCUAyO8k0Q_WNHcsywK';
const REST_URL = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';

const doc = JSON.parse(await fs.readFile(new URL('../dados.json', import.meta.url), 'utf8'));

const r = await fetch(`${REST_URL}/iris_dados?on_conflict=id`, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal'
  },
  body: JSON.stringify([{id: 'principal', doc}])
});

if(!r.ok){
  const detalhe = await r.text();
  throw new Error(`Seed falhou (${r.status}): ${detalhe}`);
}

console.log(`Seed enviado: ${doc.fornecedores?.length || 0} fornecedores e ${doc.contratantes?.length || 0} contratantes.`);
