export const legal = {
  draftTitle: "Rascunho sem revisão jurídica",
  draftText:
    "Este texto descreve como o Ticketfy funciona hoje. Ele não afirma conformidade com a LGPD, com o Código de Defesa do Consumidor nem com outra lei, e precisa de revisão jurídica antes de valer como documento oficial.",
  updated: "Última atualização: outubro de 2026.",
  footerTerms: "Termos de uso",
  footerPrivacy: "Privacidade",
  footerContact: "Contato sobre seus dados",
  registerConsent: {
    before: "Ao criar a conta, você concorda com os ",
    terms: "Termos de uso",
    middle: " e declara que leu a ",
    privacy: "Política de privacidade",
    after: ".",
  },
  terms: {
    pageTitle: "Termos de uso",
    title: "Termos de uso",
    subtitle: "As regras de uso do Ticketfy para quem compra e para quem organiza eventos.",
    sections: [
      {
        title: "O que é o Ticketfy",
        paragraphs: [
          "O Ticketfy é uma plataforma de venda de ingressos para eventos. Organizadores publicam eventos e lotes de ingresso, e compradores reservam, pagam e recebem ingressos com código único.",
          "Este ambiente é de demonstração: o pagamento é simulado e nenhum valor é cobrado de verdade.",
        ],
      },
      {
        title: "Conta",
        paragraphs: [
          "Para comprar, transferir ou organizar é preciso ter uma conta, com nome, e-mail e senha. Cada pessoa é responsável por manter a senha em segredo.",
          "A sessão termina depois de 30 minutos sem uso e, no máximo, 12 horas depois do login. Trocar a senha encerra as sessões nos outros aparelhos.",
          "A equipe do Ticketfy pode suspender uma conta. A conta suspensa não consegue entrar, os pedidos pendentes dela são cancelados e os ingressos já pagos continuam válidos.",
        ],
      },
      {
        title: "Compra e ingressos",
        paragraphs: [
          "Ao confirmar o pedido, os ingressos ficam reservados por alguns minutos (hoje, 15). Se o pagamento não for feito nesse prazo, o pedido expira e os ingressos voltam à venda.",
          "O preço de cada ingresso fica registrado no pedido no momento da compra e não muda depois. Cupons de desconto valem conforme as regras definidas pelo organizador.",
          "Cada ingresso tem um código que vale uma única entrada. Quem apresentar o código primeiro entra, então ele não deve ser compartilhado.",
          "As vendas de um evento terminam quando ele começa.",
        ],
      },
      {
        title: "Reembolso e cancelamento",
        paragraphs: [
          "O comprador pode pedir o reembolso de um pedido pago até o prazo configurado antes do início do evento (hoje, 48 horas). O reembolso vale para o pedido inteiro e cancela todos os ingressos dele.",
          "Não é possível reembolsar pedidos com ingresso já utilizado ou transferido.",
          "Se o organizador cancelar o evento, os pedidos pagos são reembolsados e os ingressos cancelados, sem prazo.",
        ],
      },
      {
        title: "Transferência de ingresso",
        paragraphs: [
          "Um ingresso válido pode ser transferido para outra pessoa com conta no Ticketfy, até o início do evento e até um limite de transferências por ingresso (hoje, 3).",
          "Na transferência, o código antigo deixa de valer e quem recebe ganha um código novo. Quem transferiu não pode mais pedir reembolso daquele pedido.",
        ],
      },
      {
        title: "Organizadores",
        paragraphs: [
          "Qualquer conta pode se tornar organizadora, sem aprovação. O organizador é responsável pelas informações do evento, pelos lotes e por cumprir o que anuncia.",
          "Sobre cada venda paga incide a taxa da plataforma (hoje, 5% do valor pago). O saldo fica disponível alguns dias depois do término do evento e pode ser sacado por Pix, respeitando o valor mínimo.",
          "Saques podem passar por análise antes do envio. A equipe do Ticketfy pode bloquear os saques de um organizador, e trocar a chave Pix bloqueia os saques por 48 horas.",
        ],
      },
      {
        title: "Uso proibido",
        paragraphs: [
          "Não é permitido usar o Ticketfy para fraude, revenda abusiva, golpes, testes de invasão sem autorização ou qualquer atividade ilegal. Contas envolvidas nesses usos podem ser suspensas.",
        ],
      },
      {
        title: "Disponibilidade e mudanças",
        paragraphs: [
          "O serviço pode ficar indisponível para manutenção ou por falhas. Estes termos podem mudar, e a data da última atualização fica no topo da página.",
        ],
      },
    ],
  },
  privacy: {
    pageTitle: "Política de privacidade",
    title: "Política de privacidade",
    subtitle: "Quais dados o Ticketfy guarda, para quê e o que você pode fazer com eles.",
    sections: [
      {
        title: "Dados que guardamos",
        paragraphs: [
          "Da conta: nome, e-mail, senha (só em forma de hash, nunca o texto), endereço da foto de perfil, se você informar um, e o idioma preferido.",
          "Das compras: pedidos, itens, valores, cupons usados, pagamentos, ingressos e transferências enviadas e recebidas.",
          "De quem organiza: eventos, lotes, cupons, saldo, extrato, saques e dados de recebimento. O documento (CPF ou CNPJ) e a chave Pix são guardados cifrados.",
          "O Ticketfy não recebe dados de cartão de crédito.",
        ],
      },
      {
        title: "Para que usamos",
        paragraphs: [
          "Para criar e proteger sua conta, processar pedidos, emitir e validar ingressos, repassar o dinheiro das vendas aos organizadores e mostrar o site no idioma que você escolheu.",
          "Ações sensíveis, como saques, troca de senha, transferências e exclusão de conta, ficam num registro de auditoria que não pode ser alterado.",
        ],
      },
      {
        title: "Quem vê seus dados",
        paragraphs: [
          "O organizador de um evento vê o nome e o e-mail de quem comprou e, na lista de participantes, o nome de quem tem o ingresso e os últimos 4 caracteres do código.",
          "Numa transferência, quem recebe não vê seus dados e você não vê os dados de quem recebeu.",
          "A equipe de administração do Ticketfy acessa dados quando precisa analisar saques, suspensões e a auditoria. O sistema roda em provedores de hospedagem e banco de dados contratados.",
        ],
      },
      {
        title: "Cookies e armazenamento no navegador",
        paragraphs: [
          "Usamos um cookie de sessão, acessível só pelo servidor, para renovar o login com segurança.",
          "No armazenamento do navegador ficam o tema (claro ou escuro), o idioma escolhido, um aviso de que há sessão aberta e o horário da última atividade, para encerrar a sessão por inatividade. Não usamos cookies de publicidade.",
        ],
      },
      {
        title: "Registros técnicos",
        paragraphs: [
          "Cada requisição recebe um código de identificação, usado para investigar erros. Os registros não guardam senhas, tokens nem o conteúdo dos formulários.",
        ],
      },
      {
        title: "Seus direitos na prática",
        paragraphs: [
          "Em Minha conta, aba Privacidade, você pode baixar todos os seus dados num arquivo JSON, confirmando a senha. Há um limite de exportações por período (hoje, 3 a cada 24 horas).",
          "Na mesma aba, você pode excluir a conta. Nome, e-mail, foto e senha são substituídos, as sessões são encerradas e os dados de recebimento são apagados. A exclusão é recusada enquanto houver saldo, saque em andamento ou bloqueado, evento com vendas ou ingresso válido para evento futuro.",
          "Você pode corrigir a foto, a senha e o idioma a qualquer momento em Minha conta.",
        ],
      },
      {
        title: "Por quanto tempo guardamos",
        paragraphs: [
          "Pedidos, pagamentos, extrato, saques e auditoria continuam guardados depois da exclusão da conta, ligados à conta anonimizada, porque os registros financeiros precisam fechar. Ainda não existe uma rotina que apague esses dados depois de um prazo definido; esse ponto está pendente de revisão jurídica.",
        ],
      },
    ],
    contact: {
      title: "Contato do responsável pelos dados",
      paragraphs: [
        "Pelo e-mail abaixo, você fala com o responsável pelos dados pessoais do Ticketfy. Por ele, você pode pedir acesso, correção, exportação e exclusão dos seus dados, além de tirar dúvidas sobre esta política.",
        "O canal vale também quando não for possível usar as telas do site, inclusive se a sua conta estiver suspensa. Escreva a partir do e-mail cadastrado na conta ou informe esse e-mail na mensagem; podemos pedir uma confirmação de identidade antes de atender o pedido, para proteger os seus dados.",
      ],
      emailLabel: "E-mail do responsável pelos dados:",
    },
  },
};
