(function(){
  const SUPABASE_URL = 'https://tvvblflltrymiujcxqbt.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QF_gEOhaPweouCUAyO8k0Q_WNHcsywK';

  const configurado = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
  const REST_URL = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';

  function cabecalhos(extra){
    return Object.assign({
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  async function requisitar(path, opcoes){
    if(!configurado) throw new Error('Supabase nao configurado.');
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 5000);
    let r;
    try{
      r = await fetch(REST_URL + path, Object.assign({
        headers: cabecalhos(),
        signal: controle.signal
      }, opcoes || {}));
      if(!r.ok){
        let detalhe = '';
        try{
          const e = await r.json();
          detalhe = e.message || e.details || e.hint || '';
        }catch(e){}
        throw new Error((detalhe || 'Falha no Supabase') + ' (' + r.status + ')');
      }
    }catch(e){
      if(e.name === 'AbortError') throw new Error('Tempo esgotado ao chamar o Supabase.');
      throw e;
    }finally{
      clearTimeout(limite);
    }
    if(r.status === 204) return null;
    return r.json();
  }

  async function carregarDoc(){
    const linhas = await requisitar('/iris_dados?id=eq.principal&select=doc,updated_at&limit=1');
    return linhas && linhas[0] ? linhas[0].doc : null;
  }

  async function salvarDoc(doc){
    const linhas = await requisitar('/iris_dados?on_conflict=id', {
      method: 'POST',
      headers: cabecalhos({Prefer: 'resolution=merge-duplicates,return=representation'}),
      body: JSON.stringify([{id:'principal', doc}])
    });
    return linhas && linhas[0] ? linhas[0].doc : doc;
  }

  async function listarChamados(){
    const chamados = await requisitar('/sys4web_chamados?select=*&order=updated_at.desc');
    if(!chamados.length) return [];

    const filtro = chamados.map(c => c.id).join(',');
    const atualizacoes = await requisitar('/sys4web_chamado_atualizacoes?select=*&chamado_id=in.(' + filtro + ')&order=created_at.asc');
    const porChamado = atualizacoes.reduce((acc, item) => {
      (acc[item.chamado_id] ||= []).push(item);
      return acc;
    }, {});

    return chamados.map(c => Object.assign({}, c, {atualizacoes: porChamado[c.id] || []}));
  }

  async function salvarChamado(chamado){
    const corpo = {
      numero: chamado.numero || '',
      titulo: chamado.titulo || '',
      descricao: chamado.descricao || '',
      status: chamado.status || 'Aberto'
    };
    const metodo = chamado.id ? 'PATCH' : 'POST';
    const caminho = chamado.id ? '/sys4web_chamados?id=eq.' + encodeURIComponent(chamado.id) : '/sys4web_chamados';
    const linhas = await requisitar(caminho, {
      method: metodo,
      headers: cabecalhos({Prefer: 'return=representation'}),
      body: JSON.stringify(chamado.id ? corpo : [corpo])
    });
    return Array.isArray(linhas) ? linhas[0] : linhas;
  }

  async function excluirChamado(id){
    return requisitar('/sys4web_chamados?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: cabecalhos({Prefer: 'return=minimal'})
    });
  }

  async function adicionarAtualizacao(chamadoId, mensagem){
    const linhas = await requisitar('/sys4web_chamado_atualizacoes', {
      method: 'POST',
      headers: cabecalhos({Prefer: 'return=representation'}),
      body: JSON.stringify([{chamado_id: chamadoId, mensagem}])
    });
    return linhas && linhas[0] ? linhas[0] : null;
  }

  window.IRIS_DB = {
    configurado,
    carregarDoc,
    salvarDoc,
    listarChamados,
    salvarChamado,
    excluirChamado,
    adicionarAtualizacao
  };
})();
